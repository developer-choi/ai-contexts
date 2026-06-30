import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { readPayload, getCwd, getSessionId, addContext } from "./hook-utils.mjs";

// Edit/Write 직전, 편집 대상 파일이 "짝꿍 묶음"에 속하면 같은 묶음의 다른 파일을
// 컨텍스트에 띄운다(실측 surface-claude-md과 동일한 PreToolUse additionalContext 경로).
// 데이터는 레포별 meta/coupling.json. 훅은 전역 1개이고, 짝꿍 파일을 대신 고쳐주지
// 않는다 — "이것도 같이 봐라"까지만 한다(판단·수정은 AI). 도구는 차단하지 않는다.

const MARKER_PREFIX = "coupling-surface-";
const CLEANUP_SENTINEL = path.join(os.tmpdir(), `${MARKER_PREFIX}last-cleanup`);
const STALE_MS = 7 * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

// file_path가 속한 레포 루트(.git 보유)를 위로 올라가며 찾는다.
function findRepoRoot(start) {
  let d = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(d, ".git"))) return d;
    const parent = path.dirname(d);
    if (parent === d) return null;
    d = parent;
  }
}

// 단순 glob(*, **, ?) → 정규식. **는 / 포함 임의, *는 세그먼트 내 임의, ?는 1자.
// sentinel 없이 한 글자씩 파싱한다(임시 치환문자가 파일에 NUL로 박혀 git 바이너리화되는 것 방지).
function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        re += ".*";
        i++;
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/, "\\$&");
    }
  }
  return new RegExp(`^${re}$`);
}

function matchesPattern(pattern, rel) {
  if (pattern === rel) return true;
  if (/[*?]/.test(pattern)) return globToRegExp(pattern).test(rel);
  return false;
}

// 세션·(경로::묶음)당 1회만 주입한다(노이즈 방지). 마커는 tmpdir + 세션ID로 자연 무효화.
function takeUnseen(key, sessionId) {
  const hash = crypto.createHash("sha1").update(key).digest("hex").slice(0, 16);
  const marker = path.join(os.tmpdir(), `${MARKER_PREFIX}${sessionId}-${hash}`);
  try {
    if (fs.existsSync(marker)) return false;
    fs.writeFileSync(marker, key);
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
  // codex는 PreToolUse를 '*'로 통합 등록하므로 대상 도구가 아니면 self-skip.
  if (payload.tool_name !== "Edit" && payload.tool_name !== "Write") process.exit(0);
  const input = payload.tool_input || {};
  if (typeof input.file_path !== "string" || !input.file_path) process.exit(0);

  const cwd = getCwd(payload) || ".";
  const abs = path.resolve(cwd, input.file_path);
  const root = findRepoRoot(path.dirname(abs));
  if (!root) process.exit(0);

  const dataFile = path.join(root, "meta", "coupling.json");
  if (!fs.existsSync(dataFile)) process.exit(0);

  let data;
  try {
    data = JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch (_e) {
    process.exit(0); // 데이터 깨짐이 편집을 막아선 안 된다.
  }
  const groups = Array.isArray(data.groups) ? data.groups : [];
  if (!groups.length) process.exit(0);

  const rel = path.relative(root, abs).split(path.sep).join("/");
  const hits = [];
  for (const g of groups) {
    const files = Array.isArray(g.files) ? g.files : [];
    if (!files.some((f) => matchesPattern(f, rel))) continue;
    const others = files.filter((f) => !matchesPattern(f, rel));
    if (others.length) hits.push({ name: g.name || "(이름 없음)", note: g.note, others });
  }
  if (!hits.length) process.exit(0);

  const sessionId = getSessionId(payload) || "nosession";
  const fresh = hits.filter((h) => takeUnseen(`${rel}::${h.name}`, sessionId));
  if (!fresh.length) process.exit(0);
  cleanupStaleMarkers();

  const blocks = fresh.map(
    (h) =>
      `- 묶음 "${h.name}"${h.note ? ` — ${h.note}` : ""}\n` +
      h.others.map((o) => `    ${o}`).join("\n"),
  );
  addContext(
    `[짝꿍 동기화] 지금 수정하려는 ${rel} 에는 같이 수정해야 할 짝꿍이 등록돼 있다:\n` +
      blocks.join("\n") +
      `\n이번 수정을 끝낸 뒤, 위 짝꿍 파일들도 이 변경에 맞춰 갱신이 필요한지 직접 열어 확인한다 ` +
      `(필요 없으면 넘어간다). 도구는 차단하지 않는다.`,
    "PreToolUse",
  );
} catch (_e) {
  // 표면화 실패가 편집을 막아서는 안 된다.
  process.exit(0);
}
