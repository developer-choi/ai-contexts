import path from "node:path";
import { findGitInvocations, partitionArgs } from "./git-command-parser.mjs";
import { deny, getCommand, getToolName, readPayload } from "./hook-utils.mjs";

// 새로 만드는 브랜치·워크트리 이름에 한글이 들어가지 못하게 막는다.
//
// git은 한글 브랜치를 오류 없이 받아서, 틀려도 그 자리에서 아무것도 드러나지 않는다. 이름이 영문 슬러그여야
// 하는 이유는 [식별자 자리에는 영문 슬러그](deploy/contexts/prompt-standards/file-layout.md#식별자-자리에는-영문-슬러그)가 정본이다.
// 이미 있는 브랜치로 옮기거나 지우는 호출은 관여하지 않는다 — 막으면 옛 한글 브랜치를 정리할 길도 막힌다.
const payload = readPayload();
const HANGUL = /[ㄱ-ㆎ가-힣]/;
const MSG = (name) =>
  `브랜치·워크트리 이름 \`${name}\`에 한글이 들어 있어 차단했습니다. ` +
  "영문 슬러그(소문자 + 하이픈, 예: `scw-file-layout-diet`)로 다시 만드세요.";

const check = (name) => {
  if (typeof name === "string" && HANGUL.test(name)) deny(MSG(name));
};

if (getToolName(payload) === "EnterWorktree") {
  check(payload.tool_input?.name);
  process.exit(0);
}

const cmd = getCommand(payload);
if (!HANGUL.test(cmd)) process.exit(0);

// `git branch`에서 이 옵션이 있으면 새 이름을 만드는 호출이 아니다(목록·삭제·upstream 설정).
const BRANCH_NOT_CREATE = /^(-d|-D|--delete|-l|--list|-a|--all|-r|--remotes|-v|-vv|--verbose|--show-current|--contains|--no-contains|--merged|--no-merged|--points-at|-u|--set-upstream-to|--unset-upstream|--edit-description)(=|$)/;
// 이 옵션이 있으면 마지막 positional이 새 이름이다(이름 바꾸기·복사).
const BRANCH_RENAME = new Set(["-m", "-M", "-c", "-C", "--move", "--copy"]);

for (const inv of findGitInvocations(cmd, "branch")) {
  const { options, positionals } = partitionArgs(inv.args);
  if (options.some((o) => BRANCH_NOT_CREATE.test(o))) continue;
  check(options.some((o) => BRANCH_RENAME.has(o)) ? positionals.at(-1) : positionals[0]);
}

// 값으로 새 이름을 받는 플래그. `--orphan=<name>`처럼 붙여 쓴 꼴도 본다.
const NEW_NAME_FLAGS = {
  checkout: new Set(["-b", "-B", "--orphan"]),
  switch: new Set(["-c", "-C", "--create", "--force-create", "--orphan"]),
};
for (const [sub, flags] of Object.entries(NEW_NAME_FLAGS)) {
  for (const inv of findGitInvocations(cmd, sub)) checkFlagValues(inv.args, flags);
}

const WORKTREE_VALUED = new Set(["-b", "-B", "--reason"]);
for (const inv of findGitInvocations(cmd, "worktree")) {
  if (inv.args[0] !== "add") continue;
  const rest = inv.args.slice(1);
  checkFlagValues(rest, new Set(["-b", "-B"]));
  const target = partitionArgs(rest, WORKTREE_VALUED).positionals[0];
  if (target) check(path.basename(target));
}

process.exit(0);

function checkFlagValues(args, flags) {
  for (let i = 0; i < args.length; i += 1) {
    const [flag, inline] = args[i].split(/=(.*)/s);
    if (!flags.has(flag)) continue;
    check(inline !== undefined ? inline : args[i + 1]);
  }
}
