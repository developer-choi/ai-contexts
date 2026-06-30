import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readPayload, getCwd, getSessionId, addContext } from "./hook-utils.mjs";

// 백로그는 master가 아니라 ai-contexts-backlog 워크트리(backlog 브랜치)에 있다.
// 워크트리가 없는 기기에서는 조용히 no-op 한다.
const BACKLOG_ROOT = path.join(
  os.homedir(),
  "WebstormProjects",
  "main",
  "ai-contexts-backlog",
  "backlog",
);

// 세션당 폴더당 "전체 블록"은 1회만 주입하기 위한 상태 저장 위치.
const STATE_DIR = path.join(os.tmpdir(), "claude-backlog-surfaced");

// 상세 안내문은 hook 옆에 배포되는 .md에 둔다(유지보수). 주입은 경로만 가리킨다.
const RULES_FILE = path.join(import.meta.dirname, "surface-backlog-rules.md");

// 거절 기록 캐시. 메인 LLM이 거절 시 항목별 파일을 쓰고, hook은 만료 전 항목을
// "재제안 금지" 목록으로 주입한다. AC 레포 내부(cache/는 gitignore).
const CACHE_ROOT = path.join(
  os.homedir(),
  "WebstormProjects",
  "main",
  "ai-contexts",
  "cache",
  "backlog",
  "surface-backlog",
);

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

// 거절 캐시를 읽어 (rel 폴더에 속한) 만료 전 항목 경로를 모은다.
// 만료(오늘 > invalidated-date)된 파일은 그 자리에서 삭제한다. ISO 날짜라 문자열 비교가 곧 시간순.
function readExclusions(rel) {
  let entries;
  try {
    entries = fs.readdirSync(CACHE_ROOT).filter((f) => f.endsWith(".md"));
  } catch (_e) {
    return [];
  }
  const today = new Date().toISOString().slice(0, 10);
  const relPosix = rel.split(path.sep).join("/");
  const excluded = [];
  for (const name of entries) {
    const file = path.join(CACHE_ROOT, name);
    let text;
    try {
      text = fs.readFileSync(file, "utf8");
    } catch (_e) {
      continue;
    }
    const item = (text.match(/^item:\s*(.+)$/m) || [])[1]?.trim();
    const date = (text.match(/^invalidated-date:\s*(.+)$/m) || [])[1]?.trim();
    if (!item || !date) continue;
    if (today > date) {
      try {
        fs.unlinkSync(file);
      } catch (_e) {
        /* 다음 발동에서 재시도 */
      }
      continue;
    }
    if (item === relPosix || item.startsWith(`${relPosix}/`)) excluded.push(item);
  }
  return excluded;
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

  // cwd 프로젝트 → 백로그 폴더. 모든 프로젝트(ai-contexts 포함)가 projects/<project>/active/.
  // active/ 하위만 표면화한다(inactive/는 배제). 규칙은 SKILL.md 「projects 영역」.
  const rel = path.join("projects", project, "active");
  const folder = path.join(BACKLOG_ROOT, rel);
  if (!fs.existsSync(folder) || !hasMarkdown(folder)) process.exit(0);

  // 전체 블록은 세션당 폴더당 1회만 주입한다. 폴더는 cwd에서 파생되어 세션 내내 고정이므로
  // 첫 주입이 "무관한 프롬프트에 낭비"되는 일은 없다. 이미 안내한 폴더는 이후 턴에 아무것도
  // 주입하지 않고 빠져, 전체 블록을 매 턴 주입할 때 생기던 과잉 priming(관련 없는
  // "저장할까요?" 제안 반복)을 완전히 제거한다. session_id가 없으면(폴백) 매 턴 전체 블록.
  const sessionId = getSessionId(payload);
  const relPosix = rel.split(path.sep).join("/");
  if (sessionId) {
    if (alreadySurfaced(sessionId, relPosix)) process.exit(0);
    markSurfaced(sessionId, relPosix);
  }

  const excluded = readExclusions(rel);
  const exclusionLine = excluded.length
    ? `[최근 거절 — 재제안 금지] 다음 항목은 사용자가 최근 거절했으니 다시 제안하지 마라: ${excluded.join(", ")}`
    : `[최근 거절] 없음`;

  addContext(
    `[백로그 표면화] 현재 작업 디렉터리(${project})에 연결된 백로그 폴더가 있다:\n` +
      `  ${folder}\n` +
      `이 세션에서 아직 안 봤으면 폴더를 Glob해 항목을 확인하고, 현재 작업과 겹치면 "이 백로그도 같이 다룰까요?"로 ` +
      `먼저 제안한 뒤 허락받고 반영한다. 허락 없이 흡수 금지 — 직접 입력물처럼 보여도 예외 아님. 겹치는 게 없으면 조용히 넘어간다.\n` +
      `상세 규칙(훑기·제안·거절 기록 방법)은 반드시 이 파일을 읽고 따른다: ${RULES_FILE}\n` +
      `${exclusionLine}\n` +
      `거절 기록 위치(거절 시 여기에 항목별 기록을 쓴다): ${CACHE_ROOT}`,
  );
} catch (_e) {
  // 표면화 실패가 프롬프트 처리를 막아서는 안 된다.
  process.exit(0);
}
