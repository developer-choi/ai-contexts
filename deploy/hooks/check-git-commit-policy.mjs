import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  COMMIT_VALUED_FLAGS,
  commitShortFlagChars,
  findGitInvocations,
  normalizeCwd,
  partitionArgs,
  stripRedirections,
} from "./git-command-parser.mjs";
import { ask, deny, getCommand, getCwd, readPayload } from "./hook-utils.mjs";

// 커밋 명령 자체의 정책. staging 대상 지정(add/-a)은 check-git-staging-policy.mjs 담당.
// 인접 정규식(`git\s+commit`)으로 보면 `git -C <path> commit`을 통째로 놓치므로 파서로 호출을 찾는다.
const payload = readPayload();
const cmd = getCommand(payload);
const commits = findGitInvocations(cmd, "commit");
if (commits.length === 0) process.exit(0);

// 메시지를 넘기는 통로 전부. `-m`만 보면 나머지 형태가 검사를 통째로 빠져나간다 —
// 2026-08-05 PP 사고가 정확히 `git commit -F -`(표준입력 heredoc)였고, 경로 검사를
// `-m`이 있을 때만 돌리던 탓에 남의 staged 파일 2개가 딸려 들어갔다.
//
// 긴 옵션만 목록으로 보고 짧은 옵션은 글자 단위로 본다. 짧은 옵션은 값을 붙여 쓰거나(`-F-`)
// 다른 짧은 옵션과 묶어 쓸 수 있어(`-sF-`) 토큰이 그때마다 달라지고, 목록에 없는 모양이
// 되는 순간 "메시지 없음"으로 떨어져 멀쩡한 커밋이 거부된다
// (2026-08-29 실측: `git commit <경로> -F-`가 그렇게 막혔다).
const LONG_MESSAGE_FLAGS = new Set([
  "--message", "--file", "--reuse-message", "--reedit-message", "--squash", "--fixup",
]);
const MESSAGE_EQ_RE = /^--(message|file|reuse-message|reedit-message|squash|fixup)=/;
const SHORT_MESSAGE_CHARS = new Set(["m", "F", "c", "C"]);

// 병합·체리픽·리버트 진행 중에는 git이 부분 커밋 자체를 거부한다
// ("fatal: cannot do a partial commit during a merge"). 경로를 줄 방법이 없으므로 이때만
// 경로 필수를 면제한다. 조회 실패는 "진행 중 아님"으로 보고 검사를 유지한다.
function isSequenceInProgress(cwd) {
  try {
    const gitDir = execSync("git rev-parse --absolute-git-dir", {
      cwd: cwd || undefined,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    return ["MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD"].some((f) => fs.existsSync(path.join(gitDir, f)));
  } catch {
    return false;
  }
}

// 경로를 지정해도 아직 git에 등록되지 않은 파일은 커밋에 안 들어간다 — git이 조용히
// 건너뛰고 에러도 안 낸다. 새 파일만 담은 커밋이 통째로 빈 채 성공하는 형태라 출력을
// 안 세면 못 잡는다. auto-stage-new-file.mjs가 Write 경로는 막아주지만 셸로 만든 파일은
// 그물 밖이라 여기서 한 번 더 본다.
function untrackedUnder(cwd, paths) {
  try {
    const quoted = paths.map((p) => JSON.stringify(p)).join(" ");
    const out = execSync(`git status --porcelain --untracked-files=normal -- ${quoted}`, {
      cwd: cwd || undefined,
      stdio: ["ignore", "pipe", "ignore"],
    }).toString();
    return out
      .split("\n")
      .filter((line) => line.startsWith("?? "))
      .map((line) => line.slice(3).trim());
  } catch {
    return [];
  }
}

for (const inv of commits) {
  // 리다이렉션을 먼저 걷어낸다 — `<<'MSG'`·`> out.txt`가 남으면 파일 경로로 세어져
  // "경로를 지정했다"고 오판한다(경로 필수 검사가 heredoc 표식 하나로 무력화됨).
  const { options, positionals } = partitionArgs(stripRedirections(inv.args), COMMIT_VALUED_FLAGS);

  // `-n`도 글자 단위로 본다 — `-sn`·`-nm x`처럼 묶어 쓰면 정확 일치를 그대로 빠져나간다.
  if (options.includes("--no-verify") || options.some((t) => commitShortFlagChars(t).includes("n"))) {
    deny("--no-verify 금지. pre-commit hook을 우회하지 마세요.");
  }

  // 메시지 없는 커밋은 에디터를 띄운다 — 비대화형 셸에서 멈추거나 빈 메시지로 끝난다.
  // 기존 메시지를 그대로 쓰는 `--amend --no-edit` 형태만 예외.
  const hasMessage = options.some(
    (t) =>
      LONG_MESSAGE_FLAGS.has(t) ||
      MESSAGE_EQ_RE.test(t) ||
      commitShortFlagChars(t).some((ch) => SHORT_MESSAGE_CHARS.has(ch)),
  );
  if (!hasMessage && !options.includes("--no-edit")) {
    deny("메시지 없는 git commit 금지. -m 또는 -F로 커밋 메시지를 직접 작성하세요.");
  }

  // 경로 없이 커밋하면 그 시점 staging area 전체가 커밋된다 — 병렬 세션과
  // auto-stage-new-file 훅이 올려둔 남의 변경까지 딸려 들어간다(race).
  // 메시지를 어떤 형태로 넘겼는지와 무관하게 경로를 강제한다.
  // 순서는 안 본다: `git commit -m msg file` / `git commit file -m msg` 모두 경로가 지정된 것이다.
  const hasPathspecFile = options.some(
    (t) => t === "--pathspec-from-file" || t.startsWith("--pathspec-from-file="),
  );
  const needsPath =
    positionals.length === 0 && !hasPathspecFile && !options.includes("--allow-empty");
  if (needsPath && !isSequenceInProgress(normalizeCwd(inv.cwd) || getCwd(payload))) {
    deny(
      "경로 없는 git commit 금지. staging area race condition 방지를 위해 파일을 직접 지정하세요: " +
        "git commit <files> -m msg. -m·-F·--amend 등 메시지를 넘기는 형태와 무관하게 적용됩니다.",
    );
  }

  if (positionals.length > 0) {
    const untracked = untrackedUnder(normalizeCwd(inv.cwd) || getCwd(payload), positionals);
    if (untracked.length > 0) {
      const shown = untracked.slice(0, 5).join(", ");
      ask(
        `지정한 경로에 git에 등록되지 않은 파일이 ${untracked.length}개 있습니다 — 이대로 커밋하면 ` +
          `조용히 빠집니다: ${shown}${untracked.length > 5 ? " 외" : ""}. ` +
          "포함하려면 먼저 git add로 등록하세요. 일부러 빼는 것이면 승인하고 진행하세요.",
      );
    }
  }
}

// U+FFFD는 인코딩이 깨진 흔적이라 메시지·경로 어디에 있든 커밋에 남으면 안 된다 — 명령 전체를 본다.
if (cmd.includes("�")) {
  deny("커밋 메시지에 깨진 문자(U+FFFD)가 포함되어 있습니다. 메시지를 다시 작성하세요.");
}
