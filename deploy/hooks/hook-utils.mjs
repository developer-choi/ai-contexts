import fs from "node:fs";

export function readPayload() {
  return JSON.parse(fs.readFileSync(0, "utf8"));
}

export function getCommand(payload) {
  return payload.tool_input && typeof payload.tool_input.command === "string" ? payload.tool_input.command : "";
}

export function getToolName(payload) {
  return typeof payload.tool_name === "string" ? payload.tool_name : "";
}

export function getCwd(payload) {
  return typeof payload.cwd === "string" ? payload.cwd : "";
}

export function getSessionId(payload) {
  return typeof payload.session_id === "string" ? payload.session_id : "";
}

function decide(permissionDecision, reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision,
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

export function deny(reason) {
  decide("deny", reason);
}

// 주의: allowlist에 괄호 없는 도구 이름("Bash")이 있으면 이 ask는 "이미 승인됨"으로 흡수되어 권한
// 프롬프트가 뜨지 않는다. 괄호형("Bash(*)"·"Bash(git:*)")은 흡수하지 않으므로 ask가 정상 발동한다
// (2026-08-05 실측). allowlist를 손볼 때 이 형태를 깨뜨리지 말 것.
export function ask(reason) {
  decide("ask", reason);
}

export function addContext(context, hookEventName = "UserPromptSubmit") {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName,
        additionalContext: context,
      },
    }),
  );
  process.exit(0);
}
