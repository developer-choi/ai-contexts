const fs = require("fs");
const os = require("os");
const path = require("path");
const { readPayload, getCwd, getSessionId, addContext } = require("./hook-utils");

// 백로그는 master가 아니라 ai-contexts-backlog 워크트리(backlog 브랜치)에 있다.
// 워크트리가 없는 기기에서는 조용히 no-op 한다.
const BACKLOG_ROOT = path.join(
  os.homedir(),
  "WebstormProjects",
  "main",
  "ai-contexts-backlog",
  "backlog",
);

// 세션당 폴더당 1회만 안내하기 위한 상태 저장 위치.
const STATE_DIR = path.join(os.tmpdir(), "claude-backlog-surfaced");

// cwd: .../WebstormProjects/<group>/<project>/... → <project>
function projectFromCwd(cwd) {
  const segs = String(cwd).replace(/\\/g, "/").split("/").filter(Boolean);
  const i = segs.findIndex((s) => s.toLowerCase() === "webstormprojects");
  return i >= 0 && segs.length > i + 2 ? segs[i + 2] : "";
}

function hasMarkdown(dir) {
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch (_e) {
      continue;
    }
    for (const e of entries) {
      if (e.isDirectory()) stack.push(path.join(d, e.name));
      else if (e.isFile() && e.name.endsWith(".md")) return true;
    }
  }
  return false;
}

function seenFile(sessionId) {
  return path.join(STATE_DIR, `${sessionId}.json`);
}

function alreadySurfaced(sessionId, key) {
  try {
    const seen = JSON.parse(fs.readFileSync(seenFile(sessionId), "utf8"));
    return Array.isArray(seen) && seen.includes(key);
  } catch (_e) {
    return false;
  }
}

function markSurfaced(sessionId, key) {
  let seen = [];
  try {
    const prev = JSON.parse(fs.readFileSync(seenFile(sessionId), "utf8"));
    if (Array.isArray(prev)) seen = prev;
  } catch (_e) {
    /* 첫 안내 */
  }
  if (!seen.includes(key)) seen.push(key);
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(seenFile(sessionId), JSON.stringify(seen));
}

try {
  const payload = readPayload();
  const project = projectFromCwd(getCwd(payload));
  if (!project) process.exit(0);

  // cwd 프로젝트 → 백로그 폴더. AC 본체는 this/, 그 외는 projects/<project>/.
  const rel = project === "ai-contexts" ? "this" : path.join("projects", project);
  const folder = path.join(BACKLOG_ROOT, rel);
  if (!fs.existsSync(folder) || !hasMarkdown(folder)) process.exit(0);

  const sessionId = getSessionId(payload);
  const relPosix = rel.split(path.sep).join("/");
  if (sessionId) {
    if (alreadySurfaced(sessionId, relPosix)) process.exit(0);
    markSurfaced(sessionId, relPosix);
  }

  addContext(
    `[백로그 표면화] 현재 작업 디렉터리(${project})에 연결된 미해결 백로그 폴더가 있다:\n` +
      `  ${folder}\n` +
      `지금 사용자 요청이 이 폴더의 백로그와 관련될 수 있으면, 폴더를 훑어(Glob/ls) 해당 항목을 확인하고 "이 백로그도 같이 해결할까요?"로 제안한다. 무관하면 조용히 무시한다. (이 세션에서 ${relPosix}는 한 번만 안내된다.)`,
  );
} catch (_e) {
  // 표면화 실패가 프롬프트 처리를 막아서는 안 된다.
  process.exit(0);
}
