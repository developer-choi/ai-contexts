import { COMMIT_VALUED_FLAGS, findGitInvocations, partitionArgs } from "./git-command-parser.mjs";
import { deny, getCommand, readPayload } from "./hook-utils.mjs";

// 커밋 명령 자체의 정책. staging 대상 지정(add/-a)은 check-git-staging-policy.mjs 담당.
// 인접 정규식(`git\s+commit`)으로 보면 `git -C <path> commit`을 통째로 놓치므로 파서로 호출을 찾는다.
const cmd = getCommand(readPayload());
const commits = findGitInvocations(cmd, "commit");
if (commits.length === 0) process.exit(0);

for (const inv of commits) {
  const { options, positionals } = partitionArgs(inv.args, COMMIT_VALUED_FLAGS);

  if (options.includes("--no-verify") || options.includes("-n")) {
    deny("--no-verify 금지. pre-commit hook을 우회하지 마세요.");
  }

  // 파일 경로 없이 메시지만 주면 그 시점 staging area 전체가 커밋된다 —
  // 병렬 세션·훅이 끼워 넣은 변경까지 딸려 들어간다(race). 경로 지정을 강제한다.
  // 순서는 안 본다: `git commit -m msg file` / `git commit file -m msg` 모두 경로가 지정된 것이다.
  const hasMessage = options.some((t) => t === "-m" || t === "--message" || t.startsWith("--message="));
  if (hasMessage && positionals.length === 0) {
    deny("bare git commit 금지. staging area race condition 방지를 위해 파일을 직접 지정하세요: git commit <files> -m msg");
  }
}

// U+FFFD는 인코딩이 깨진 흔적이라 메시지·경로 어디에 있든 커밋에 남으면 안 된다 — 명령 전체를 본다.
if (cmd.includes("�")) {
  deny("커밋 메시지에 깨진 문자(U+FFFD)가 포함되어 있습니다. 메시지를 다시 작성하세요.");
}
