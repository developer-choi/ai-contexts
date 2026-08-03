import { COMMIT_VALUED_FLAGS, findGitInvocations, partitionArgs } from "./git-command-parser.mjs";
import { deny, getCommand, readPayload } from "./hook-utils.mjs";

// 일괄 staging 금지 — 내가 건드리지 않은 변경까지 딸려 들어가는 것을 막는다.
// 명령 문자열을 통째로 정규식으로 보면 커밋 메시지 안의 단어가 오탐을 만들고,
// 반대로 `git -C <path> add .`처럼 전역 옵션이 끼면 놓친다. 파서로 실제 git 호출을 본다.
const cmd = getCommand(readPayload());

for (const inv of findGitInvocations(cmd, "add")) {
  // 위치 무관하게 본다 — `git add -f .`처럼 플래그가 앞에 와도 잡아야 한다.
  const { options, positionals } = partitionArgs(inv.args);
  if (options.includes("-A") || options.includes("--all") || positionals.includes(".")) {
    deny("git add . / git add -A 금지. 파일을 개별 지정하세요.");
  }
}

for (const inv of findGitInvocations(cmd, "commit")) {
  // commit -a 단독, short option bundle(-am, -vam 등 a 포함), --all을 모두 차단.
  // --amend / --allow-empty는 두 번째 글자가 '-'라 아래 패턴에 안 걸린다.
  const { options } = partitionArgs(inv.args, COMMIT_VALUED_FLAGS);
  if (options.some((t) => /^-[a-zA-Z]*a[a-zA-Z]*$/.test(t) || t === "--all")) {
    deny("git commit -a (auto-stage 옵션) 금지. 파일을 개별 지정하세요.");
  }
}
