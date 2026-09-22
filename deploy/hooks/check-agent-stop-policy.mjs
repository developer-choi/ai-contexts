import { deny, readPayload } from "./hook-utils.mjs";

// TaskStop은 배경 작업뿐 아니라 팀 에이전트도 이름·ID로 끝낸다(v2.1.198+). 오래 살려두고 여러
// 라운드를 시키려고 띄운 팀원이 여기서 조용히 사라지면, 그 팀원이 쥔 대화 맥락이 함께 없어진다 —
// 다시 띄워도 처음부터다. 그래서 종료는 AI가 단독으로 정하지 못하게 한다.
//
// 메시지로 재우는 경로(SendMessage의 shutdown_request)는 check-team-message-policy.mjs가 이미
// deny로 막는다. 이 훅은 남은 한쪽인 TaskStop을 맡는다.
//
// ask가 아니라 deny인 이유: allowlist에 괄호 없는 "TaskStop"이 있으면 ask는 「이미 승인됨」으로
// 흡수되어 프롬프트가 아예 안 뜬다(hook-utils.mjs의 ask 주석, 2026-09-22 재현). 권한 목록은
// 세션 시작 사본을 쓰는데 훅은 실시간으로 다시 읽혀, 목록을 고쳐도 그 세션은 안 지켜진다.
// deny는 흡수되지 않아 목록 상태와 무관하게 막힌다. 정말 끝내야 하면 사용자가 직접 끝낸다.

// 대상은 `task_id` 한 자리로 온다 — 팀원 이름·`이름@팀`·배경 작업 ID가 모두 이 칸에 실린다
// (2026-09-22 실측). `shell_id`는 같은 자리의 옛 이름이다.
const input = readPayload().tool_input ?? {};
const target = input.task_id ?? input.shell_id ?? "(대상 미상)";

deny(`에이전트 종료 금지(TaskStop → ${target}). 팀 에이전트를 끝내면 그 팀원이 쥔 대화 맥락이 사라지고 다시 띄워도 이어받지 못합니다. 끝낼지는 사용자가 정합니다 — 필요하면 사용자에게 알리고 /tasks에서 직접 종료하도록 안내하세요.`);
