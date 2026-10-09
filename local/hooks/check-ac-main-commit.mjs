// AC 프로젝트 로컬 정책 훅: AC 메인 워크트리의 master/main에 에이전트가 바로 커밋하지 못하게 한다.
// 사유 줄이 없으면 막고 워크트리로 돌려보내며, 사유 줄이 있으면 그 사유를 실어 승인 창을 띄운다.
//
// 리뷰 회차가 「master이고 깨끗하면 워크트리 불필요」 조건을 따라 메인 master에 커밋 27개를 바로 넣은 적이
// 있다(2026-10-09). 커밋은 되돌릴 수 있어도 사용자가 그 사이 master를 기준으로 다른 일을 시작하면 엉킨다.
//
// 이 파일은 `local/hooks/`의 원본이며, `npm run sync:local-system`이 repo-local `.claude/hooks/`·
// `.codex/hooks/`로 배포한다. 두 자리 모두 `../../deploy/hooks`가 같은 레포의 공용 파서를 가리킨다.
// codex 호출은 description이 없어 늘 막힌다 — codex를 안 쓰기로 한 결정(check-git-merge-policy 주석)과 같다.
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findGitInvocations, invocationCwd } from "../../deploy/hooks/git-command-parser.mjs";
import { ask, deny, getCommand, getCwd, readPayload } from "../../deploy/hooks/hook-utils.mjs";

const REASON_PREFIX = "메인 커밋 사유:";
const PROTECTED = new Set(["master", "main"]);

const DENY_MSG =
  "AC 메인 워크트리의 master에 바로 커밋하려 했습니다. 사용자가 이 세션에서 메인 레포 커밋을 명시적으로 승인한 게 아니면 " +
  "진행하지 말고, `git worktree add .claude/worktrees/<이름> -b <브랜치>`로 워크트리를 만들어 거기서 커밋하세요. " +
  `사용자가 명시 승인했다면 description에 \`${REASON_PREFIX}\`로 시작하는 줄로 그 승인과 사유를 적어 다시 실행하세요.`;
const ASK_MSG = (reason) => `AC 메인 레포 master에 직접 커밋합니다 — ${reason}`;

// 판정만 하는 순수 함수. homeMain은 AC 메인 체크아웃 루트 — 커밋이 도는 폴더의 메인 루트가 이것과 같고,
// 그 폴더가 연결 워크트리가 아닌 메인 워크트리이며, 브랜치가 master/main일 때만 대상이다.
// 돌려주는 값: { decision: "deny" | "ask" | "pass", reason }
export function judgeMainCommit({ cmd, sessionCwd, description, homeMain }) {
  if (!homeMain || typeof cmd !== "string" || !/\bcommit\b/.test(cmd)) return { decision: "pass" };
  const hit = findGitInvocations(cmd, "commit").some((inv) => {
    const cwd = invocationCwd(inv, sessionCwd) || sessionCwd;
    // fail-open: 폴더를 못 정하면(셸 변수 등) 어느 레포인지 모른다. 레포가 아니면 git이 거부한다.
    if (!cwd || !path.isAbsolute(cwd)) return false;
    const mainRoot = findMainRoot(cwd);
    if (!mainRoot || !samePath(mainRoot, homeMain)) return false;
    const top = runGit("git rev-parse --show-toplevel", cwd);
    if (!top || !samePath(top, mainRoot)) return false; // 연결 워크트리 안의 커밋
    return PROTECTED.has(runGit("git rev-parse --abbrev-ref HEAD", cwd));
  });
  if (!hit) return { decision: "pass" };
  const line = (description ?? "")
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith(REASON_PREFIX) && l.length > REASON_PREFIX.length);
  return line ? { decision: "ask", reason: ASK_MSG(line) } : { decision: "deny", reason: DENY_MSG };
}

// 워크트리 안에서 불려도 메인 체크아웃 루트를 돌려준다(check-git-worktree-policy의 findMainRoot와 같은 방식).
// `--path-format=absolute`는 git 2.31+라 실패하면 플래그 없이 받아 cwd 기준으로 절대화한다.
export function findMainRoot(cwd) {
  const commonDir =
    runGit("git rev-parse --path-format=absolute --git-common-dir", cwd) ?? runGit("git rev-parse --git-common-dir", cwd);
  return commonDir ? path.dirname(path.resolve(cwd, commonDir)) : null;
}

function runGit(command, cwd) {
  try {
    return execSync(command, { encoding: "utf8", cwd, stdio: "pipe" }).trim() || null;
  } catch {
    return null;
  }
}

function samePath(a, b) {
  return path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const payload = readPayload();
  // 이 훅이 놓인 레포(<repo>/local/hooks 또는 <repo>/.claude/hooks)의 메인 루트가 AC다.
  const homeMain = findMainRoot(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".."));
  const { decision, reason } = judgeMainCommit({
    cmd: getCommand(payload),
    sessionCwd: getCwd(payload),
    description: typeof payload.tool_input?.description === "string" ? payload.tool_input.description : "",
    homeMain,
  });
  if (decision === "deny") deny(reason);
  if (decision === "ask") ask(reason);
  process.exit(0);
}
