// ask-llm.mjs가 띄우는 상주 프로세스. 직접 실행하지 않는다.
//
// `agy -p`를 호출마다 띄우면 짧은 답에도 전체 9초 중 6초 넘게 기동에 든다(2026-11-15 실측).
// 그래서 `agy acp`(ACP stdio 서버)를 한 번 띄워 두고, 요청마다 새 세션을 열어 묻고 닫는다.
// 세션이 매번 새것이라 앞 요청의 대화가 섞이지 않는다(비밀 단어를 다음 세션이 모르는 것을 확인).
//
// 요청: named pipe에 JSON 한 줄 {prompt, family, effort, timeoutMs}
// 응답: JSON 한 줄 {ok: true, text, model} 또는 {ok: false, reason}
//
// 함정(2026-11-15 실측):
//   - 모델을 지정하지 않으면 Argon으로 돈다. 세션마다 session/set_model로 지정한다.
//   - ACP에는 --json-schema에 해당하는 것이 없다. 스키마는 ask-llm.mjs가 프롬프트에 붙이고 직접 검사한다.
//   - 도구 차단은 -p와 같이 작업 폴더 .agents/hooks.json의 PreToolUse 훅으로 걸린다(run_command 거부 확인).
//   - agy를 끈 직후 작업 폴더를 지우면 아직 잡고 있어 EPERM이 난다. 종료를 기다린 뒤 지운다.
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const [, , PIPE_PATH, LOG_PATH] = process.argv;
const AGY_EXECUTABLE_PATH = path.join(process.env.LOCALAPPDATA ?? "", "agy", "bin", "agy.exe");
// 이만큼 요청이 없으면 내려간다. 다음 호출이 다시 띄운다.
const IDLE_EXIT_MS = 30 * 60 * 1000;

// 로그는 데몬이 뜰 때마다 덧붙여 쌓이므로, 1MB를 넘으면 비우고 시작한다.
try { if (fs.statSync(LOG_PATH).size > 1024 * 1024) fs.truncateSync(LOG_PATH); } catch { /* 로그가 없으면 그대로 */ }

function log(message) {
  try { fs.appendFileSync(LOG_PATH, `${new Date().toISOString()} [${process.pid}] ${message}\n`); } catch { /* 로그를 못 써도 계속한다 */ }
}

// matcher "*"로 모든 도구 호출에 이 판정을 건다. 받는 모델은 어떤 도구도 사용하지 못한다.
const TOOL_GATE_SCRIPT = `process.stdout.write(JSON.stringify({ decision: "deny", reason: "tools are disabled for this request" }));`;
const TOOL_GATE_HOOKS = {
  "deny-all-tools": {
    PreToolUse: [{ matcher: "*", hooks: [{ type: "command", command: `"${process.execPath}" tool-gate.cjs`, timeout: 10 }] }],
  },
};

// 작업 폴더는 빈 임시 폴더다. 호출한 쪽 레포가 워크스페이스로 잡히지 않고, 위 훅도 여기 둔다.
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "ask-llm-"));
fs.mkdirSync(path.join(workDir, ".agents"));
fs.writeFileSync(path.join(workDir, ".agents", "hooks.json"), JSON.stringify(TOOL_GATE_HOOKS));
fs.writeFileSync(path.join(workDir, ".agents", "tool-gate.cjs"), TOOL_GATE_SCRIPT);

const agy = spawn(AGY_EXECUTABLE_PATH, ["acp"], { cwd: workDir, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
let server;
let exiting = false;

function shutdown(reason) {
  if (exiting) return;
  exiting = true;
  log(`종료: ${reason}`);
  server?.close();
  if (agy.exitCode === null) agy.kill();
  const removeWorkDir = () => {
    try { fs.rmSync(workDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch (error) { log(`작업 폴더를 못 지웠다: ${error.message}`); }
    process.exit(0);
  };
  if (agy.exitCode === null) agy.once("exit", removeWorkDir);
  else removeWorkDir();
}

agy.on("error", (error) => shutdown(`agy를 실행하지 못했다: ${error.message}`));
agy.on("exit", (code) => shutdown(`agy acp가 끝났다 (종료코드 ${code})`));
agy.stderr.on("data", (data) => log(`agy stderr: ${data.toString().trim().slice(0, 500)}`));
// agy가 먼저 죽은 뒤 쓰면 EPIPE가 난다. 잡지 않으면 데몬이 shutdown 없이 죽어 작업 폴더가 남는다. 종료는 exit 처리가 맡는다.
agy.stdin.on("error", (error) => log(`agy stdin: ${error.message}`));
// 한글 한 글자가 두 조각에 걸쳐 와도 깨지지 않게 스트림에서 디코딩한다.
agy.stdout.setEncoding("utf8");

// ---- ACP(JSON-RPC 2.0, 줄 단위) ----
let nextId = 1;
const pendingCalls = new Map();
const sessions = new Map(); // sessionId → 답 조각 배열
let stdoutBuffer = "";

agy.stdout.on("data", (data) => {
  stdoutBuffer += data;
  let newline;
  while ((newline = stdoutBuffer.indexOf("\n")) >= 0) {
    const line = stdoutBuffer.slice(0, newline);
    stdoutBuffer = stdoutBuffer.slice(newline + 1);
    if (line.trim()) handleMessage(line);
  }
});

function handleMessage(line) {
  let message;
  try { message = JSON.parse(line); } catch { return; }
  if (message.id !== undefined && pendingCalls.has(message.id) && !message.method) {
    pendingCalls.get(message.id)(message);
    pendingCalls.delete(message.id);
    return;
  }
  if (message.method === "session/update") {
    const { sessionId, update } = message.params ?? {};
    if (update?.sessionUpdate === "agent_message_chunk" && sessions.has(sessionId)) sessions.get(sessionId).push(update.content?.text ?? "");
    return;
  }
  // 도구 실행 허가 요청은 모두 거절한다. 훅이 먼저 막지만 이중으로 둔다.
  if (message.method === "session/request_permission") {
    send({ jsonrpc: "2.0", id: message.id, result: { outcome: { outcome: "cancelled" } } });
  }
}

function send(message) {
  agy.stdin.write(JSON.stringify(message) + "\n");
}

function call(method, params) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pendingCalls.set(id, (message) => (message.error ? reject(new Error(`${method}: ${JSON.stringify(message.error)}`)) : resolve(message.result)));
    send({ jsonrpc: "2.0", id, method, params });
  });
}

// session/new가 주는 모델 이름 꼴: "Gemini 4 Hydrogen (Medium)".
// 버전은 점으로 나눠 숫자로 비교한다. 문자열로 비교하면 4.10이 4.9보다 낮게 나온다.
function pickLatestModel(availableModels, family, effort) {
  const namePattern = new RegExp(`^Gemini (\\d+(?:\\.\\d+)*) ${family} \\(${effort}\\)$`);
  const candidates = availableModels
    .map((model) => ({ id: model.modelId, match: model.name?.match(namePattern) }))
    .filter(({ match }) => match)
    .map(({ id, match }) => ({ id, version: match[1].split(".").map(Number) }));
  const compare = (a, b) => {
    for (let index = 0; index < Math.max(a.length, b.length); index++) {
      const diff = (a[index] ?? 0) - (b[index] ?? 0);
      if (diff) return diff;
    }
    return 0;
  };
  return candidates.sort((a, b) => compare(b.version, a.version))[0]?.id;
}

async function ask({ prompt, family, effort, timeoutMs }) {
  const session = await call("session/new", { cwd: workDir, mcpServers: [] });
  const { sessionId } = session;
  sessions.set(sessionId, []);
  try {
    const availableModels = session.models?.availableModels ?? [];
    const model = pickLatestModel(availableModels, family, effort);
    // 요청받은 이름이 없으면 다른 이름(Flash 등)으로 조용히 넘어가지 않는다. 이름이 바뀌었으면 사람이 ask-llm.mjs의 VENDORS를 고친다.
    if (!model) {
      return { ok: false, reason: `agy 모델 목록에 "Gemini <버전> ${family} (${effort})"가 없다.\n${availableModels.map((m) => m.name).join("\n")}` };
    }
    await call("session/set_model", { sessionId, modelId: model });

    let timer;
    const timedOut = new Promise((resolve) => { timer = setTimeout(() => resolve("timeout"), timeoutMs); });
    let outcome;
    try {
      outcome = await Promise.race([call("session/prompt", { sessionId, prompt: [{ type: "text", text: prompt }] }), timedOut]);
    } finally {
      clearTimeout(timer);
    }
    if (outcome === "timeout") {
      send({ jsonrpc: "2.0", method: "session/cancel", params: { sessionId } });
      return { ok: false, reason: "timeout", model };
    }
    if (outcome.stopReason !== "end_turn") return { ok: false, reason: `답이 정상 종료가 아니다 (stopReason: ${outcome.stopReason})`, model };
    return { ok: true, text: sessions.get(sessionId).join(""), model };
  } finally {
    sessions.delete(sessionId);
    call("session/close", { sessionId }).catch((error) => log(`세션을 못 닫았다: ${error.message}`));
  }
}

// ---- 유휴 종료 ----
let activeRequests = 0;
let idleTimer;
function armIdleTimer() {
  clearTimeout(idleTimer);
  if (activeRequests === 0) idleTimer = setTimeout(() => shutdown("유휴 한도"), IDLE_EXIT_MS);
}

// ---- 기동: initialize가 성공한 뒤에야 pipe를 연다. 연결되면 바로 물을 수 있는 상태라는 뜻이다 ----
// 한도는 ask-llm.mjs의 DAEMON_START_TIMEOUT_MS보다 짧게 둔다. 평소 0.2초쯤 걸린다(2026-11-15 실측).
let initTimer;
try {
  const initialized = await Promise.race([
    call("initialize", { protocolVersion: 1, clientCapabilities: {} }),
    new Promise((_, reject) => { initTimer = setTimeout(() => reject(new Error("initialize가 10초 안에 끝나지 않았다")), 10_000); }),
  ]);
  log(`agy acp 준비됨 (${initialized.agentInfo?.name} ${initialized.agentInfo?.version})`);
} catch (error) {
  shutdown(error.message);
} finally {
  clearTimeout(initTimer);
}

if (!exiting) startServer();

function startServer() {
  server = net.createServer((socket) => {
    activeRequests++;
    clearTimeout(idleTimer);
    let requestBuffer = "";
    let started = false;
    let answered = false;
    const reply = (response) => {
      if (answered) return;
      answered = true;
      socket.end(JSON.stringify(response) + "\n");
      activeRequests--;
      armIdleTimer();
    };
    socket.on("error", () => reply({ ok: false, reason: "연결이 끊겼다" }));
    socket.on("close", () => reply({ ok: false, reason: "연결이 끊겼다" }));
    socket.on("data", async (data) => {
      if (started) return;
      requestBuffer += data.toString("utf8");
      const newline = requestBuffer.indexOf("\n");
      if (newline < 0) return;
      started = true;
      let request;
      try { request = JSON.parse(requestBuffer.slice(0, newline)); } catch { return reply({ ok: false, reason: "요청을 읽지 못했다" }); }
      try {
        reply(await ask(request));
      } catch (error) {
        log(`요청 실패: ${error.message}`);
        reply({ ok: false, reason: error.message });
      }
    });
  });
  // 두 호출이 동시에 데몬을 띄우면 나중 것은 pipe를 못 잡는다. 먼저 뜬 데몬을 쓰면 되므로 조용히 내려간다.
  server.on("error", (error) => shutdown(`pipe를 열지 못했다: ${error.code ?? error.message}`));
  server.listen(PIPE_PATH, () => {
    log(`대기: ${PIPE_PATH}`);
    armIdleTimer();
  });
}
