import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { readAgents, stuckNotice, STALE_IDLE_MS, STATE_DIR } from "./subagent-status.mjs";

// surface-subagent-status.mjs가 세션마다 하나 띄우는 분리 프로세스의 본체. 사용자가 아무것도 묻지
// 않아도 멈춤을 윈도우 알림으로 띄운다 — 주입 훅은 프롬프트가 와야 돌아서, 그것만으로는 사람이 물어야 드러난다.
// 훅이 자기 자신을 `--watch`로 다시 띄워 watch()를 부른다. 이 파일을 따로 실행 진입점으로 두지 않는
// 이유는, 어디서도 import되지 않는 .mjs를 verify:settings가 "등록 안 된 훅 본체"로 보기 때문이다.

// 두 값 다 검증에서 줄여 돌리려고 환경변수로 연다.
const POLL_MS = Number(process.env.SUBAGENT_WATCH_POLL_MS) || 30 * 1000;
const QUIET_MS = Number(process.env.SUBAGENT_WATCH_QUIET_MS) || STALE_IDLE_MS;

// Windows PowerShell 5.1의 WinRT 토스트. PowerShell 7은 WinRT 형식을 못 불러 powershell.exe를 쓴다.
// 문구는 명령행이 아니라 환경변수로 넘긴다 — 명령 원문에 따옴표·XML 특수문자가 섞인다.
const TOAST_PS = `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
$x = New-Object Windows.Data.Xml.Dom.XmlDocument
$x.LoadXml('<toast><visual><binding template="ToastGeneric"><text/><text/></binding></visual></toast>')
$t = $x.GetElementsByTagName('text')
$t.Item(0).InnerText = $env:TOAST_TITLE
$t.Item(1).InnerText = $env:TOAST_BODY
$app = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe'
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($app).Show([Windows.UI.Notifications.ToastNotification]::new($x))
`;

function toast(title, body) {
  if (process.platform !== "win32") return "skip";
  const r = childProcess.spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", TOAST_PS], {
    env: { ...process.env, TOAST_TITLE: title, TOAST_BODY: body },
    windowsHide: true,
    timeout: 20 * 1000,
  });
  return r.status ?? "err";
}

function lastChangeMs(dir) {
  let latest = 0;
  try {
    for (const n of fs.readdirSync(dir)) latest = Math.max(latest, fs.statSync(path.join(dir, n)).mtimeMs);
  } catch {
    /* 폴더가 아직 없다 */
  }
  return latest;
}

export function watch(dir, sessionId) {
  const logFile = path.join(STATE_DIR, `${sessionId}.log`);
  const pidFile = path.join(STATE_DIR, `${sessionId}.pid`);
  const log = (line) => {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.appendFileSync(logFile, `${new Date().toISOString()} ${line}\n`);
  };
  // 같은 멈춤(같은 tool_use)으로는 한 번만 알린다.
  const notified = new Set();
  const startedAt = Date.now();

  const tick = () => {
    const now = Date.now();
    let pendingStuck = false;
    for (const a of readAgents(dir, now)) {
      if (a.state !== "stuck") continue;
      const key = `${a.file}#${a.lastTool?.id}`;
      if (notified.has(key)) continue;
      pendingStuck = true;
      const status = toast(`에이전트 ${a.name} ${a.minutes}분째 멈춤`, stuckNotice(a));
      log(`STUCK ${a.name} ${a.minutes}m ${a.lastTool?.name ?? ""}: ${a.lastTool?.input ?? ""} toast=${status}`);
      notified.add(key);
    }
    // 폴더가 30분 넘게 조용하면 끝낸다. 다음 프롬프트나 Agent 호출이 다시 띄운다.
    const quietSince = Math.max(lastChangeMs(dir), startedAt);
    if (!pendingStuck && now - quietSince > QUIET_MS) {
      log("EXIT quiet");
      try {
        if (fs.readFileSync(pidFile, "utf8") === String(process.pid)) fs.unlinkSync(pidFile);
      } catch {
        /* 이미 없다 */
      }
      process.exit(0);
    }
  };

  log(`START ${dir}`);
  tick();
  setInterval(tick, POLL_MS);
}
