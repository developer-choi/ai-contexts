import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { readPayload, getCwd, getSessionId, addContext } from "./hook-utils.mjs";

// X.md를 Read하면 같은 폴더의 짝 파일 X.sub.md 경로를 알린다. 도구는 차단하지 않는다.
//
// X.sub.md는 X.md에서 덜 중요한 내용을 떼어 둔 파일이다. 그동안은 X.md를 읽으라고 적은 문서마다
// sub까지 이름으로 적어 줘야 함께 읽혔고, 한 곳이라도 빠지면 그 자리에서 sub의 내용이 조용히 빠졌다.
// 실측(2026-10-01, sonnet, 3회씩): 안내 없이 X.md만 읽으라고 하면 3/3 sub를 안 읽었고,
// 짝 파일 경로를 한 줄 붙이자 3/3 읽었다 — 그래서 본문 없이 경로만 준다.
//
// 이름은 `.sub.md`만 잡는다. `X.*.md`로 넓히면 `README.ko.md`처럼 다른 뜻의 이름까지 걸린다.

const MARKER_PREFIX = "sub-file-surface-";
const CLEANUP_SENTINEL = path.join(os.tmpdir(), `${MARKER_PREFIX}last-cleanup`);
const STALE_MS = 7 * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

function subFileOf(file) {
  if (!/\.md$/i.test(file) || /\.sub\.md$/i.test(file)) return null;
  const sub = file.replace(/\.md$/i, ".sub.md");
  return fs.existsSync(sub) ? sub : null;
}

// 세션·경로당 1회만 주입한다(노이즈 방지). 마커는 tmpdir에 두고 세션ID로 자연 무효화.
function takeUnseen(file, sessionId) {
  const hash = crypto.createHash("sha1").update(file.toLowerCase()).digest("hex").slice(0, 16);
  const marker = path.join(os.tmpdir(), `${MARKER_PREFIX}${sessionId}-${hash}`);
  try {
    if (fs.existsSync(marker)) return false;
    fs.writeFileSync(marker, file);
    return true;
  } catch (_e) {
    // 마커 기록 실패 시 누락보다 중복 주입이 낫다.
    return true;
  }
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
  const input = payload.tool_input || {};
  if (payload.tool_name !== "Read" || typeof input.file_path !== "string" || !input.file_path) process.exit(0);

  const file = path.resolve(getCwd(payload) || process.cwd(), input.file_path);
  const sub = subFileOf(file);
  if (!sub) process.exit(0);
  if (!takeUnseen(file, getSessionId(payload) || "nosession")) process.exit(0);
  cleanupStaleMarkers();

  addContext(
    `[짝 파일] 방금 읽은 파일 옆에 짝 파일이 있다:\n  ${sub}\n` +
      `${path.basename(file)}에서 덜 중요한 내용을 떼어 둔 파일이라, 이 파일을 근거로 무언가를 할 때는 짝 파일도 함께 Read한다.`,
    "PostToolUse",
  );
} catch (_e) {
  // 표면화 실패가 도구 호출을 막아서는 안 된다.
  process.exit(0);
}
