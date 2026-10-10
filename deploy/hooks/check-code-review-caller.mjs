import { deny, getToolName, readPayload } from "./hook-utils.mjs";

// code-review는 호출한 세션의 메인이 돈다. 서브에이전트가 이 스킬을 돌리면 스킬대로 띄운
// 리뷰어 팀원의 메시지·완료 알림이 띄운 서브에이전트가 아니라 메인으로 가서, 서브에이전트는
// 오지 않을 결과를 기다리다 「기다리는 중」으로 끝난다(2026-10-10 두 번, claude 2.1.296 재현).
// 스킬이 사용자에게 묻는 단계(대상 확인·추가 컨벤션·충돌 결정)도 서브에이전트에선 닿지 않는다.
// 서브에이전트·in-process 팀원의 도구 호출에만 payload에 agent_id가 실려 오므로 그것으로 가른다.
// 이름은 정확히 맞춘다 — 접두(플러그인·디렉터리 범위)가 붙은 code-review는 이 레포 스킬이 아니다.
const SKILL = "code-review";

const payload = readPayload();
const skill = String(payload.tool_input?.skill ?? "").trim().replace(/^\//, "");

if (getToolName(payload) === "Skill" && skill === SKILL && payload.agent_id) {
  deny(
    `code-review는 메인 세션이 직접 진행합니다. 서브에이전트가 띄운 리뷰어의 결과는 메인으로 가서 ` +
      `이 서브에이전트에게 돌아오지 않습니다. 리뷰하지 말고(스킬 파일을 Read로 열어 대신 따르지도 말고) ` +
      `「code-review는 메인이 /code-review로 직접 불러야 한다」고 최종 답에 적어 끝내세요.`,
  );
}
