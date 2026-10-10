// 브라우저 탭 URL 기록의 위치·차단 도메인. 받아 적는 훅과 판정하는 훅이 같은 값을 봐야 해서
// 한 벌만 둔다 — 각자 들고 있으면 한쪽만 고쳐도 조용히 어긋난다.
import os from "node:os";
import path from "node:path";

// ── 사용자 조정 지점 ──────────────────────────────────────────────────────────
// 이 배열에 도메인을 넣고 빼는 것만으로 차단 대상이 바뀐다. 서브도메인은 자동 포함이다
// (`example.com`을 넣으면 `a.example.com`도 차단).
export const BLOCKED_DOMAINS = ["securities.miraeasset.com"];

// 기록이 이보다 오래됐으면 "지금 어느 사이트인지 모른다"로 본다. 사용자가 주소창에 직접 다른
// 사이트를 띄우면 도구 호출이 없어 기록이 갱신되지 않으므로, 오래된 기록을 믿으면 차단 도메인에
// 있는 탭을 다른 사이트로 오인한다.
export const MAX_AGE_MS = 2 * 60 * 1000;
// ─────────────────────────────────────────────────────────────────────────────

// 검증 스크립트가 실제 기록을 건드리지 않고 돌 수 있게 환경변수로 갈아끼운다.
export function stateFilePath() {
  return process.env.CLAUDE_BROWSER_TAB_URLS_FILE || path.join(os.homedir(), ".claude", "state", "browser-tab-urls.json");
}

// 사용자가 평소 쓰는 dev 서버 주소. 사용자의 로그인 쿠키가 여기 붙어 있어, 서브에이전트가 이 탭에서
// 누르면 사용자 계정에 조용히 쓴다. 서브에이전트는 `<이름>.localhost`처럼 자기 호스트를 받으므로
// 서브도메인은 넣지 않는다(정확히 이 호스트만).
const USER_LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function isUserLoopbackUrl(url) {
  return USER_LOOPBACK_HOSTS.has(hostOf(url));
}

// 호스트가 그 도메인이거나 그 아래 서브도메인이면 차단. `endsWith(domain)`만 보면
// `evil-securities.miraeasset.com.attacker.net` 같은 꼴을 못 가른다.
export function isBlockedUrl(url) {
  const host = hostOf(url);
  if (!host) return false;
  return BLOCKED_DOMAINS.some((d) => {
    const domain = d.toLowerCase();
    return host === domain || host.endsWith(`.${domain}`);
  });
}

// navigate는 프로토콜 없는 주소도 받아 https://를 붙여 연다(`localhost:3917/x`). 그대로 `new URL`에
// 넣으면 호스트가 비어 판정을 비켜가므로 같은 꼴로 풀고, 끝의 점(`localhost.`)도 떼어 같은 호스트로 본다.
function hostOf(url) {
  if (typeof url !== "string" || !url) return "";
  for (const candidate of [url, `https://${url}`]) {
    try {
      const host = new URL(candidate).hostname.toLowerCase().replace(/\.$/, "");
      if (host) return host;
    } catch {
      // 다음 꼴로 다시 푼다
    }
  }
  return "";
}
