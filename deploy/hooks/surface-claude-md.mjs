import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { readPayload, getCwd, getSessionId, addContext } from "./hook-utils.mjs";

// 하위 디렉터리 CLAUDE.md는 그 폴더 파일을 Read할 때만 로드된다(실측 2026-06-12~13:
// Glob/Grep·Write·서브에이전트로는 미로드). 배치·네이밍을 결정하는 계획 단계의 주력
// 도구가 Glob/Grep이라 폴더 규칙이 결정보다 늦게 도착한다 — 탐색 시점에 대상 경로의
// 미로드 CLAUDE.md "경로만" 주입해(본문 0) 선읽기를 유도한다. 도구는 차단하지 않는다.

const MARKER_PREFIX = "claude-md-surface-";
const CLEANUP_SENTINEL = path.join(os.tmpdir(), `${MARKER_PREFIX}last-cleanup`);
const STALE_MS = 7 * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

// Glob pattern에서 와일드카드(*?[{) 등장 전까지의 정적 디렉터리 접두.
// 루트에서 "apps/examples/**"처럼 탐색하면 path 조상만으로는 apps/examples/CLAUDE.md를
// 못 잡으므로, 접두를 결합해 실제 탐색 대상 깊이까지 내려간다.
function staticPrefix(pattern) {
  const segs = String(pattern).replace(/\\/g, "/").split("/");
  const out = [];
  for (const s of segs) {
    if (!s || /[*?[{]/.test(s)) break;
    out.push(s);
  }
  return out.join("/");
}

function resolveTarget(payload) {
  const cwd = getCwd(payload);
  const input = payload.tool_input || {};
  let base = typeof input.path === "string" && input.path ? input.path : cwd;
  if (!path.isAbsolute(base)) base = path.resolve(cwd, base);
  // Grep의 pattern은 내용 정규식이라 경로 결합 대상이 아니다 — Glob만 결합.
  if (payload.tool_name === "Glob" && typeof input.pattern === "string") {
    const prefix = staticPrefix(input.pattern);
    if (prefix) base = path.resolve(base, prefix);
  }
  return base;
}

// target부터 위로 올라가며 실재하는 CLAUDE.md를 모은다.
// - cwd와 그 조상의 CLAUDE.md는 세션 시작 시 이미 로드되므로 제외 (실측 확인)
// - 상한은 .git 보유 디렉터리(프로젝트 루트). cwd 밖(다른 레포) 탐색이면 그 레포의
//   루트 CLAUDE.md까지 포함된다 — cwd 밖은 세션이 자동 로드하지 않으므로 의도된 동작.
function collectClaudeMds(target, cwd) {
  const loaded = new Set();
  let d = path.resolve(cwd);
  while (true) {
    loaded.add(path.join(d, "CLAUDE.md").toLowerCase());
    const parent = path.dirname(d);
    if (parent === d) break;
    d = parent;
  }

  const found = [];
  let dir = path.resolve(target);
  try {
    if (fs.statSync(dir).isFile()) dir = path.dirname(dir);
  } catch (_e) {
    // 존재하지 않는 깊이(예: 패턴 접두가 실제 폴더가 아님)면 실재하는 조상까지 올라간다.
    while (!fs.existsSync(dir)) {
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  while (true) {
    const md = path.join(dir, "CLAUDE.md");
    if (fs.existsSync(md) && !loaded.has(md.toLowerCase())) found.push(md);
    const isProjectRoot = fs.existsSync(path.join(dir, ".git"));
    const parent = path.dirname(dir);
    if (isProjectRoot || parent === dir) break;
    dir = parent;
  }
  return found;
}

// 세션·경로당 1회만 주입한다(노이즈 방지). 마커는 tmpdir에 두고 세션ID로 자연 무효화.
function takeUnseen(mds, sessionId) {
  const out = [];
  for (const md of mds) {
    const hash = crypto.createHash("sha1").update(md.toLowerCase()).digest("hex").slice(0, 16);
    const marker = path.join(os.tmpdir(), `${MARKER_PREFIX}${sessionId}-${hash}`);
    try {
      if (fs.existsSync(marker)) continue;
      fs.writeFileSync(marker, md);
      out.push(md);
    } catch (_e) {
      // 마커 기록 실패 시 누락보다 중복 주입이 낫다.
      out.push(md);
    }
  }
  return out;
}

// 마커 누적 청소: 하루 1회만 tmpdir을 훑어 7일 경과 마커를 지운다.
function cleanupStaleMarkers() {
  try {
    const now = Date.now();
    try {
      if (now - fs.statSync(CLEANUP_SENTINEL).mtimeMs < CLEANUP_INTERVAL_MS) return;
    } catch (_e) {
      // sentinel 없음 — 청소 진행
    }
    fs.writeFileSync(CLEANUP_SENTINEL, "");
    for (const name of fs.readdirSync(os.tmpdir())) {
      if (!name.startsWith(MARKER_PREFIX)) continue;
      const p = path.join(os.tmpdir(), name);
      try {
        if (now - fs.statSync(p).mtimeMs > STALE_MS) fs.unlinkSync(p);
      } catch (_e) {
        continue;
      }
    }
  } catch (_e) {
    // 청소 실패는 무해
  }
}

try {
  const payload = readPayload();
  // codex는 PreToolUse를 '*'로 통합 등록하므로 대상 도구가 아니면 self-skip.
  if (payload.tool_name !== "Glob" && payload.tool_name !== "Grep") process.exit(0);
  const cwd = getCwd(payload);
  if (!cwd) process.exit(0);

  const mds = collectClaudeMds(resolveTarget(payload), cwd);
  if (!mds.length) process.exit(0);
  const fresh = takeUnseen(mds, getSessionId(payload) || "nosession");
  if (!fresh.length) process.exit(0);
  cleanupStaleMarkers();

  addContext(
    `[폴더 규칙] 탐색 대상 경로에 적용되는 CLAUDE.md가 있다 (하위 디렉터리 CLAUDE.md는 Read 전까지 자동 로드되지 않는다):\n` +
      fresh.map((p) => `  ${p}`).join("\n") +
      `\n이 폴더 하위에 파일을 만들거나 배치·네이밍·구조를 결정하기 전에 위 파일을 Read로 읽는다. ` +
      `내용이 다른 문서를 가리키는 포인터면 그 문서를 끝까지 따라가 본문 규칙을 확인한다 — 한 줄 포인터에서 멈추지 않는다.`,
    "PreToolUse",
  );
} catch (_e) {
  // 표면화 실패가 탐색을 막아서는 안 된다.
  process.exit(0);
}
