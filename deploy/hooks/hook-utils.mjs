import fs from "node:fs";
import path from "node:path";

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

// md 편집을 보는 훅들이 공유하는 발동 조건. 프롬프트·스킬 문서만 보고, 인용된 코드는 걷어낸 뒤
// 본문만 본다. 두 훅이 각자 갖고 있으면 한쪽만 넓혀도 다른 쪽이 조용히 안 걸린다.

// 프롬프트·스킬 문서만 본다. 일반 문서까지 걸면 소음이 된다.
export function isPromptDoc(file) {
  const posix = file.replace(/\\/g, "/");
  if (/\/(skills|rules|contexts)\//.test(posix)) return true;
  return /^(CLAUDE|AGENTS|GEMINI)\.md$/i.test(path.basename(posix));
}

// 위로 올라가며 `.git`을 만나는 첫 폴더가 그 파일의 레포다.
export function repoNameOf(file) {
  let dir = path.dirname(path.resolve(file));
  for (;;) {
    if (fs.existsSync(path.join(dir, ".git"))) return path.basename(dir);
    const up = path.dirname(dir);
    if (up === dir) return "";
    dir = up;
  }
}

// 코드블록·인라인코드는 걷어낸 뒤 본다. 금지 예시로 명령어·규칙을 인용하는 자리가 많아,
// 안 걷어내면 인용만 있는 편집에도 뜬다.
export function prose(src) {
  return src
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/`[^`\n]*`/g, " ");
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
