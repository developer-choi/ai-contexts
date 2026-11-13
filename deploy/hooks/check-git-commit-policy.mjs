import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  COMMIT_VALUED_FLAGS,
  commitShortFlagChars,
  findGitInvocations,
  invocationCwd,
  normalizeCwd,
  partitionArgs,
  splitSegments,
  stripRedirections,
} from "./git-command-parser.mjs";
import { ask, deny, getCommand, getCwd, readPayload } from "./hook-utils.mjs";
import { findLeaks, isUnderRecruitment } from "./recruitment-commit-guard.mjs";

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

  // 채용 레포 커밋의 두 번째 그물 — 첫 그물은 전역 git 훅(recruitment-commit-guard.mjs)이다.
  // 메시지 통로가 여럿이라 메시지만 골라내지 않고 명령 전체를 본다. 메시지·경로 어디에 있든
  // 채용 레포 커밋에 실려 나가면 안 되는 문자열이기 때문이다. 한국어 검사는 git 훅에만 둔다 —
  // `--amend --no-edit`처럼 명령에 메시지가 안 실리는 형태를 오탐한다.
  // `git -C sub`처럼 상대 경로면 세션 폴더 기준으로 푼다.
  if (isUnderRecruitment(path.resolve(getCwd(payload) || ".", normalizeCwd(inv.cwd) || ""))) {
    const leaks = findLeaks(cmd);
    if (leaks.length > 0) {
      const labels = [...new Set(leaks.flatMap(({ labels: found }) => found))].join(", ");
      deny(`채용 레포 커밋에 로컬 맥락(${labels})이 들어 있습니다. 메시지와 경로에서 빼고 다시 커밋하세요.`);
    }
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

// 사용자가 반려한 표현(금지 표현 목록 중 scope가 DOC·BOTH인 행)이 AI가 쓴 커밋 메시지에 남는 것을 막는다.
// 글 게시와 달리 레인을 가리지 않는다 — NEEDS_REVIEW 레인도 막는다(2026-11-09 사용자 결정: "커밋에서는 둘다 막게 하자").
//
// 메시지를 볼 수 있는 자리는 둘이다. 명령 글자(`-m "…"`, heredoc, here-string)는 첫 `git … commit` 호출부터
// 명령 끝까지에서 찾되 경로 인자는 지우고 본다 — 백로그 파일명처럼 한국어 경로가 반려 표현을 품을 수 있다.
// 앞부분을 안 보는 것은 같은 체인의 `git add <경로>` 등을 잡지 않기 위해서다. `-F <파일>`은 파일을 열어 찾는다.
//
// 보지 못하는 것: 다른 명령이 넘겨주는 메시지(`--message "$(cat x)"`, `-F - < x`), 셸 변수로 쓴 파일 경로,
// `-c`/`-C`로 재사용하는 기존 커밋 메시지.
const MESSAGE_FILE_FLAGS = new Set(["-F", "--file"]);

function messageFiles(args) {
  const files = [];
  args.forEach((t, i) => {
    if (MESSAGE_FILE_FLAGS.has(t) && args[i + 1]) files.push(args[i + 1]);
    else if (t.startsWith("--file=")) files.push(t.slice("--file=".length));
    else if (/^-[^-]*F./.test(t) && commitShortFlagChars(t).includes("F")) files.push(t.slice(t.indexOf("F") + 1));
  });
  return files.filter((f) => f !== "-");
}

async function rejectedInMessage() {
  let rows;
  let findListHits;
  try {
    // 소스(deploy/hooks)와 배포본(<타겟>/hooks) 둘 다 한 단계 위가 skills의 부모다. 정적 import로 두면 write-doc이
    // 없는 기기에서 훅 전체가 죽어 위의 커밋 정책까지 함께 꺼진다 — 그래서 이 검사만 건너뛰게 동적으로 읽는다.
    const mod = await import("../skills/write-doc/scripts/rejected.mjs");
    rows = mod.loadDocRows().rows;
    findListHits = mod.findListHits;
  } catch {
    rows = null;
  }
  // 목록이 없는 기기(배포 전)에서 커밋을 통째로 막지 않는다. 꼴 검사는 AC pre-commit이 맡는다.
  if (!rows) return [];
  // 세그먼트는 명령 글자를 그대로 자른 조각이라 indexOf로 자리를 되찾는다. 같은 줄의 `git add … && git commit`에서
  // 정규식으로 찾으면 앞의 `git add`부터 잡힌다.
  let callAt = -1;
  let cursor = 0;
  for (const seg of splitSegments(cmd)) {
    const at = cmd.indexOf(seg, cursor);
    if (findGitInvocations(seg, "commit").length > 0) {
      callAt = at;
      break;
    }
    cursor = at + seg.length;
  }
  let scope = callAt < 0 ? cmd : cmd.slice(callAt);
  const texts = [];
  for (const inv of commits) {
    const { positionals } = partitionArgs(stripRedirections(inv.args), COMMIT_VALUED_FLAGS);
    for (const p of positionals) scope = scope.split(p).join(" ");
    const base = invocationCwd(inv, getCwd(payload)) || getCwd(payload);
    for (const file of messageFiles(inv.args)) {
      const normalized = normalizeCwd(file);
      const full = path.isAbsolute(normalized) || !base ? normalized : path.resolve(base, normalized);
      try {
        texts.push(fs.readFileSync(full, "utf8"));
      } catch {
        // 못 읽는 파일은 git도 못 읽어 커밋이 실패하므로 여기서 막을 것이 없다.
      }
    }
  }
  texts.unshift(scope);
  const lines = texts.flatMap((t) => t.split(/\r?\n|\\n|`n/)).map((ln, i) => [i + 1, ln]);
  return findListHits(lines, rows);
}

const rejectedHits = await rejectedInMessage();
if (rejectedHits.length > 0) {
  const shown = [...new Map(rejectedHits.map((h) => [h.word, `「${h.word}」 → ${h.swap}`])).values()];
  deny(
    `커밋 메시지에 사용자가 반려한 표현이 있습니다: ${shown.join(", ")}. ` +
      "대신 쓸 말로 바꾸거나 문장을 고쳐 같은 명령을 다시 실행하세요. 메시지 파일이면 파일을 고친 뒤 다시 실행합니다.",
  );
}

// U+FFFD는 인코딩이 깨진 흔적이라 메시지·경로 어디에 있든 커밋에 남으면 안 된다 — 명령 전체를 본다.
if (cmd.includes("�")) {
  deny("커밋 메시지에 깨진 문자(U+FFFD)가 포함되어 있습니다. 메시지를 다시 작성하세요.");
}
