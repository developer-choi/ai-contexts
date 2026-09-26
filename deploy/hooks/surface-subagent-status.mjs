import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { readPayload, getSessionId, addContext } from "./hook-utils.mjs";
import { killCommand, leftoverShells } from "./subagent-shells.mjs";
import { readAgents, stuckNotice, subagentsDirOf, STALE_IDLE_MS, STATE_DIR } from "./subagent-status.mjs";
import { watch } from "./subagent-watcher.mjs";

// 이 세션이 띄운 백그라운드 서브에이전트의 상태를 기록 파일 기준으로 알린다.
//
// - UserPromptSubmit: 에이전트별 상태와 새로 보낸 SendMessage 본문을 주입하고, 감시기를 살려 둔다.
//   "기록 파일을 볼지"를 메인에게 맡기면 running만 보고 "작업 중"이라 답한다 — 판단 재료를 미리 박는다.
//   SendMessage 본문을 따로 싣는 것은 전송이 success여도 메인 대화에 안 나타날 수 있어서다.
// - PostToolUse(Agent): 감시기만 살린다. 한 턴이 길게 이어지다 에이전트를 새로 띄우면
//   그사이 감시기가 스스로 끝나 있을 수 있다.
//
// 멈춤을 프롬프트 없이 알리는 것은 감시기가 맡는다. 감시기는 이 파일을 `--watch <폴더> <세션>`으로
// 다시 띄운 분리 프로세스이고, 본체는 subagent-watcher.mjs의 watch()다.

const SELF = import.meta.filename;

function pidFile(sessionId) {
  return path.join(STATE_DIR, `${sessionId}.pid`);
}

function watcherAlive(sessionId) {
  try {
    const pid = Number(fs.readFileSync(pidFile(sessionId), "utf8"));
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function ensureWatcher(dir, sessionId) {
  // 검증 스크립트가 훅을 수십 번 띄울 때 감시기가 따라 뜨지 않게 한다.
  if (process.env.SUBAGENT_WATCH_DISABLE === "1") return;
  if (!fs.existsSync(dir) || watcherAlive(sessionId)) return;
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const child = childProcess.spawn(process.execPath, [SELF, "--watch", dir, sessionId], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  fs.writeFileSync(pidFile(sessionId), String(child.pid));
}

// 이미 보인 SendMessage는 다시 싣지 않는다. 매 프롬프트마다 같은 본문이 쌓이면 소음이 된다.
function takeUnseenSends(agents, sessionId) {
  const file = path.join(STATE_DIR, `${sessionId}.seen.json`);
  let seen = [];
  try {
    seen = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    /* 첫 주입 */
  }
  const fresh = [];
  for (const a of agents) {
    for (const s of a.sends) {
      if (!seen.includes(s.id)) {
        fresh.push({ agent: a.name, ...s });
        seen.push(s.id);
      }
    }
  }
  if (fresh.length) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(seen));
  }
  return fresh;
}

function describe(a) {
  if (a.state === "stuck") return `- ${stuckNotice(a)}`;
  if (a.state === "working") return `- ${a.name}: 일하는 중 (마지막 기록 ${a.minutes}분 전${a.lastTool ? `, ${a.lastTool.name} 대기` : ""})`;
  return `- ${a.name}: 쉬는 중 (마지막 기록 ${a.minutes}분 전, 도구 호출 아님 — 보낼 것을 다 보냈거나 메시지를 기다린다)`;
}

// 쉬는 에이전트가 남긴 셸은 메인이 치운다. 그 에이전트의 결과를 받았는지, 더 쓸지는 메인만 안다 —
// 기록에는 종료 여부가 안 남아 기계로는 "끝난 에이전트"와 "셸 결과를 기다리는 에이전트"를 못 가른다.
function describeShells(agents, sessionId) {
  const lines = leftoverShells(agents, sessionId).map((s) => {
    const cmd = s.command.replace(/\s+/g, " ").slice(0, 120);
    // PowerShell 셸은 명령이 명령줄에 없어, PID를 못 가렸으면 메인도 명령으로 찾을 수 없다.
    const unknown =
      s.tool === "PowerShell"
        ? "어느 셸인지 못 가렸다 — 끝내지 말고 사용자에게 알린다"
        : "PID 조회 실패 — 앞 명령이 명령줄에 든 프로세스를 찾아 트리째 끝낸다";
    const kill = s.pids ? s.pids.map(killCommand).join(" ; ") : unknown;
    return `- ${s.agent}: ${cmd} → ${kill}`;
  });
  if (!lines.length) return "";
  return (
    `\n[쉬는 서브에이전트가 남긴 셸 — 턴 뒤에도 도는 것은 설계지만, 에이전트를 종료해도 트리가 안 죽는다]\n` +
    `${lines.join("\n")}\n` +
    `그 에이전트의 결과를 이미 받았거나 더 쓰지 않으면, 사용자에게 묻지 말고 이번 턴에 위 명령으로 끝낸다.`
  );
}

function surface() {
  const payload = readPayload();
  const sessionId = getSessionId(payload);
  const dir = subagentsDirOf(payload.transcript_path, sessionId);
  if (!dir) process.exit(0);

  ensureWatcher(dir, sessionId);
  if (payload.hook_event_name === "PostToolUse") process.exit(0);

  const agents = readAgents(dir);
  if (!agents.length) process.exit(0);

  const shown = agents.filter((a) => !(a.state === "idle" && a.ageMs > STALE_IDLE_MS));
  const staleCount = agents.length - shown.length;
  const order = { stuck: 0, working: 1, idle: 2 };
  shown.sort((x, y) => order[x.state] - order[y.state] || x.ageMs - y.ageMs);

  const lines = shown.map(describe);
  if (staleCount) lines.push(`- 그 밖에 30분 넘게 쉬는 에이전트 ${staleCount}개 (끝난 것으로 보인다)`);

  const sends = takeUnseenSends(agents, sessionId);
  const sendBlock = sends.length
    ? `\n[서브에이전트가 보낸 메시지 — 메인 대화에 안 보였어도 기록에는 있다]\n` +
      sends.map((s) => `- ${s.agent} → ${s.to}: ${s.preview}`).join("\n")
    : "";

  let shellBlock = "";
  try {
    shellBlock = describeShells(agents, sessionId);
  } catch {
    /* 셸 조회가 깨져도 상태 주입은 낸다 */
  }

  if (!lines.length && !sendBlock) process.exit(0);
  addContext(
    `[서브에이전트 상태 — 기록 파일 기준, ListAgents의 running보다 이것을 믿는다]\n` +
      `${lines.join("\n")}${sendBlock}${shellBlock}\n` +
      `사용자가 에이전트 상태를 물으면 위 상태로 답한다. 멈춘 에이전트에게 SendMessage로 진행 상황을 묻지 않는다.`,
  );
}

if (process.argv[2] === "--watch") {
  watch(process.argv[3], process.argv[4]);
} else {
  try {
    surface();
  } catch {
    // 상태 주입 실패가 프롬프트 처리를 막아서는 안 된다.
    process.exit(0);
  }
}
