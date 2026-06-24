// AI 설정 배포 산출물을 Edit/Write로 직접 수정하려 하면 권한 프롬프트(ask)를 띄운다.
// 수정은 AC 원본(deploy/·local/)에서 하고 sync로 배포해야 하며, 산출물을 직접 고치면
// 다음 sync에 덮여 사라진다.
//
// 차단 대상:
//   - 홈 배포 루트 하위: ~/.claude, ~/.codex, ~/.gemini
//   - 레포 배포 산출물 세그먼트: .agents, .codex, .claude/skills, .claude/hooks,
//     .claude/settings.json
//
// ask(deny 아님)인 이유: "사용자가 명시 허용하면 테스트 목적 직접 수정 가능"이라는 예외가
// 규칙에 있어, 그 순간 사용자가 승인할 수 있어야 한다.
//
// 경로 트랩: AC 워크트리는 …\ai-contexts\.claude\worktrees\<name>\… 라 'path에 .claude
// 포함'으로 막으면 워크트리 작업 전체가 막힌다. 그래서 .claude는 바로 다음 세그먼트가
// skills·hooks이거나 settings.json 파일일 때만 잡는다(.claude\worktrees\…\deploy\… 통과).
const os = require("os");
const path = require("path");
const { ask, readPayload } = require("./hook-utils");

// 파일을 생성·수정하는 도구. codex는 PreToolUse를 '*'로 통합하므로 여기서 self-filter한다.
const EDIT_TOOLS = new Set(["Edit", "Write"]);

const HOME_DEPLOY_DIRS = [".claude", ".codex", ".gemini"].map((d) => norm(path.join(os.homedir(), d)));

const payload = readPayload();
const toolName = typeof payload.tool_name === "string" ? payload.tool_name : "";
const filePath =
  payload.tool_input && typeof payload.tool_input.file_path === "string" ? payload.tool_input.file_path : "";

if (EDIT_TOOLS.has(toolName) && filePath && isArtifact(filePath)) {
  ask(
    "AI 설정 배포 산출물을 직접 수정하려 합니다. 원본(AC deploy/·local/)에서 고친 뒤 " +
      "sync로 배포하세요. 테스트 목적 등으로 직접 수정이 필요하면 승인하세요.",
  );
}
process.exit(0);

function isArtifact(file) {
  const abs = norm(path.resolve(file));
  for (const root of HOME_DEPLOY_DIRS) {
    if (abs === root || abs.startsWith(root + path.sep)) return true;
  }
  const segs = abs.split(path.sep);
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    if (seg === ".agents" || seg === ".codex") return true;
    if (seg === ".claude") {
      const next = segs[i + 1];
      if (next === "skills" || next === "hooks" || next === "settings.json") return true;
    }
  }
  return false;
}

// win32는 대소문자 무시.
function norm(p) {
  const n = path.normalize(p);
  return process.platform === "win32" ? n.toLowerCase() : n;
}
