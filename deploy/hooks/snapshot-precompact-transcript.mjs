// compaction(대화 요약 압축) 직전에 transcript를 AC 자기소유 경로로 verbatim 복사한다.
//
// compact는 full tool outputs·intermediate reasoning을 버려서, /pre-exit 회고가
// compaction 이전의 세밀한 사용자 교정을 자동으로 못 본다. PreCompact hook이 매
// compaction마다(manual·auto) transcript 파일을 통째 스냅샷해두면 /pre-exit가
// 스냅샷 존재 여부로 검출해 pre-compact 교정을 회수할 수 있다.
//
// transcript jsonl 줄별 스키마는 미문서화 = 직접 파싱 unsupported. 그래서 스냅샷은
// 파일 통째 복사(스키마 의존 0)로 한다. blockable hook이지만 차단 의도 없으므로
// 어떤 경로에서도 정상 종료(exit 0)한다 — 스냅샷 실패가 compaction을 막지 않는다.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readPayload, getSessionId } from "./hook-utils.mjs";

const SNAPSHOT_DIR = path.join(os.homedir(), ".claude", "precompact-snapshots");
// 무한 누적 방지용 경량 housekeeping: 이보다 오래된 스냅샷은 정리한다.
const RETENTION_DAYS = 30;

main();

function main() {
  let payload;
  try {
    payload = readPayload();
  } catch {
    process.exit(0); // stdin 파싱 실패 — 차단하지 않고 통과
  }

  const transcriptPath = typeof payload.transcript_path === "string" ? payload.transcript_path : "";
  const sessionId = getSessionId(payload) || "unknown-session";

  if (transcriptPath && fs.existsSync(transcriptPath)) {
    try {
      fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const dest = path.join(SNAPSHOT_DIR, `${sessionId}-${timestamp}.jsonl`);
      fs.copyFileSync(transcriptPath, dest);
    } catch {
      // 스냅샷 실패는 무시한다 — compaction을 막지 않는다.
    }
  }

  pruneOldSnapshots();
  process.exit(0);
}

// RETENTION_DAYS 지난 스냅샷을 정리한다. best-effort.
function pruneOldSnapshots() {
  try {
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    for (const name of fs.readdirSync(SNAPSHOT_DIR)) {
      if (!name.endsWith(".jsonl")) continue;
      const full = path.join(SNAPSHOT_DIR, name);
      try {
        if (fs.statSync(full).mtimeMs < cutoff) fs.unlinkSync(full);
      } catch {
        // 개별 파일 정리 실패는 무시
      }
    }
  } catch {
    // 디렉토리 없음 등 — 무시
  }
}
