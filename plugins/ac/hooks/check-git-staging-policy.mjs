import {
  COMMIT_VALUED_FLAGS,
  commitShortFlagChars,
  findGitInvocations,
  partitionArgs,
} from "./git-command-parser.mjs";
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
  // --amend / --allow-empty는 두 번째 글자가 '-'라 짧은 옵션으로 안 읽힌다.
  // 글자 단위로 보는 이유: 값이 붙은 묶음(`-aF-`, `-am"메시지"`)은 토큰이 통짜 글자가
  // 아니라서 "전부 알파벳" 패턴으로는 안 걸리고 auto-stage 금지를 그대로 빠져나간다.
  const { options } = partitionArgs(inv.args, COMMIT_VALUED_FLAGS);
  if (options.some((t) => commitShortFlagChars(t).includes("a") || t === "--all")) {
    deny("git commit -a (auto-stage 옵션) 금지. 파일을 개별 지정하세요.");
  }
}
