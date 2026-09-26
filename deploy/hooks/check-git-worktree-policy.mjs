import { execSync } from "node:child_process";
import path from "node:path";
import { findGitInvocations, invocationCwd, partitionArgs } from "./git-command-parser.mjs";
import { deny, getCommand, getCwd, readPayload } from "./hook-utils.mjs";

// 워크트리를 `<메인레포>/.claude/worktrees/` 밖에 만들지 못하게 막는다.
//
// 그 밖에 만들면 EnterWorktree가 들어갈 때마다 권한 프롬프트를 띄우는데, 이 ask는 걷을 수단이 없다:
// 도구의 checkPermissions가 관리 위치 밖 경로에 `{behavior:"ask", decisionReason:{type:"safetyCheck"}}`를
// 반환하고, 권한 파이프라인이 safetyCheck ask를 도구 전체 allow 규칙보다 먼저 반환한다. permissions.allow에
// 도구 이름을 넣어도, PreToolUse hook이 allow를 줘도(다시 safetyCheck를 만나 전체 파이프라인으로 되돌아간다)
// 안 걷히고 bypassPermissions 모드에서만 통과한다. 그래서 위치를 창구 하나로 모으는 쪽에서 막는다.
//
// 레포 등급으로 면제하지 않는다 — repo-tiers.mjs는 브랜치 정책(merge·push·reset)의 강도를 가르는 목록이고,
// 거기 FREE로 올라 있는 레포들이야말로 워크트리를 형제 경로에 쌓아 온 곳이다.
const payload = readPayload();
const cmd = getCommand(payload);
if (typeof cmd !== "string" || !/\bworktree\b/.test(cmd)) process.exit(0);

const MANAGED = path.join(".claude", "worktrees");
// 올바른 형태를 첫 문장에 둔다 — check-md-hook-restatement가 이 메시지를 md 작성 화면에 주입할 때
// 160자에서 자르므로, 뒤에 두면 해야 할 일이 잘려나간다(check-git-merge-policy.mjs가 같은 배치를 쓴다).
const MSG = (target, expected) =>
  `워크트리는 \`<레포>/${MANAGED.replace(/\\/g, "/")}/<이름>\` 밑에만 만듭니다 — ` +
  `\`git worktree add ${expected}/<이름> -b <브랜치>\` 형태로 다시 실행하세요. ` +
  `지정한 \`${target}\`은 그 밖이라 차단했습니다. ` +
  "관리 위치 밖 워크트리는 EnterWorktree로 들어갈 때마다 권한 프롬프트를 띄웁니다 — " +
  "그 ask는 도구 자신이 내는 safetyCheck라 permissions.allow에 도구 이름을 넣어도, PreToolUse hook으로 allow를 줘도 걷히지 않습니다. " +
  "지금 따르는 스킬·절차가 `../<이름>` 같은 형제 경로를 지시하고 있다면 그 절차도 이 위치로 고쳐 두세요.";

// `git worktree add`에서 다음 토큰을 값으로 먹는 플래그. 값을 positional로 세면 브랜치명이 경로로 오인된다.
const VALUED = new Set(["-b", "-B", "--reason"]);

for (const inv of findGitInvocations(cmd, "worktree")) {
  if (inv.args[0] !== "add") continue;
  const { positionals } = partitionArgs(inv.args.slice(1), VALUED);
  const target = positionals[0];
  if (!target) continue; // 경로 없는 `worktree add`는 git이 거부한다

  const runCwd = invocationCwd(inv, getCwd(payload)) || getCwd(payload);
  const mainRoot = findMainRoot(runCwd);
  // fail-open: git 레포가 아니면 git 자신이 거부하므로 훅이 더 할 일이 없다.
  if (!mainRoot) continue;

  const expected = path.join(mainRoot, MANAGED);
  if (!isInside(path.resolve(runCwd, target), expected)) deny(MSG(target, expected.replace(/\\/g, "/")));
}

process.exit(0);

// --- helpers ---

// 워크트리 안에서 실행돼도 메인 체크아웃 루트를 돌려준다. Claude Code의 관리 위치 판정도 메인 루트
// 기준(`<mainRoot>/.claude/worktrees`)이라, 여기서 워크트리 루트를 쓰면 기준이 어긋난다.
//
// `--path-format=absolute`는 git 2.31+다. 이 플래그 없이 `--git-common-dir`만 부르면 상대경로 `.git`이
// 돌아와 dirname이 `"."`이 되고 판정이 통째로 어긋난다. 그렇다고 플래그만 쓰면 구버전 git에서 명령이
// 에러가 나 catch로 흘러 정책이 **조용히 꺼진다**. 그래서 플래그로 먼저 시도하고, 실패하면 플래그 없이
// 받아 cwd 기준으로 절대화한다 — 둘 다 실패할 때만 fail-open.
function findMainRoot(cwd) {
  const commonDir =
    runGit("git rev-parse --path-format=absolute --git-common-dir", cwd) ??
    runGit("git rev-parse --git-common-dir", cwd);
  if (!commonDir) return null;
  return path.dirname(path.resolve(cwd, commonDir));
}

function runGit(command, cwd) {
  try {
    const out = execSync(command, { encoding: "utf8", cwd, stdio: "pipe" }).toString().trim();
    return out || null;
  } catch {
    return null;
  }
}

function isInside(target, dir) {
  const rel = path.relative(dir, target);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}
