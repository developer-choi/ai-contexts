// 로컬 HTML을 만들어 브라우저로 열고, 사용자가 채운 값을 클립보드로 되받는 왕복 절차.
//
// 다섯 스킬(KA exam·KA digest·PP routine-summary·PP routine-start·AC pre-exit)이 같은 절차를
// 각자 산문으로 다시 적고 있었고, 옮겨 적는 사이에 이미 어긋났다 — schtasks 우회가 exam에만
// 있고 나머지 넷에는 없었다. 이 절차에는 LLM 판단이 없으므로(인코딩·오픈 명령·회수·신선도
// 검증) 산문 정본화 대신 여기 코드 한 곳에 둔다. 스킬에는 HTML 본문·payload 스키마·회수값
// 해석만 남는다.
//
// 환경 분기를 두지 않는다. 2026-08-29 실측:
//   Start-Process <로컬 .html>  → Claude Code 뜸 / Antigravity 안 뜸(종료코드는 0)
//   schtasks /it + .cmd 래퍼    → 양쪽 다 뜸
// 양쪽 다 통하는 칸이 하나 있으므로 그것만 쓴다. 분기를 두면 아는 환경변수 목록에 없는
// 제3의 에이전트가 Start-Process 쪽으로 떨어져 "종료코드 0인데 창만 안 뜨는" 조용한 실패를
// 한다 — Antigravity에서 실제로 관측된 모양이다.
//
// 따옴표 함정(같은 실측):
//   cmd /c start "" "<경로>" 를 작업 명령에 직접 넣으면 인자 파싱에서 깨진다.
//   explorer.exe <경로> 는 창은 뜨지만 종료코드가 1이라 성공 판정에 못 쓴다.
//   경로를 박은 .cmd를 만들어 그 파일만 넘기는 방식만 둘 다 만족한다.
//
// 배터리 함정(2026-09-01 실측, 노트북):
//   예약작업은 기본값이 "AC 전원일 때만 실행"이라, 배터리로 돌면 만들어만 지고 Queued로
//   남아 영영 안 돈다. 그런데 **한 번도 안 돈 작업의 Last Result는 0**이라, 그 값만 보면
//   성공으로 읽힌다 — 실측: Status=Queued / Last Result=0 / 창은 안 뜸. 로그만 남고
//   브라우저가 안 뜨는 조용한 실패가 여기서 나왔다.
//   그래서 (1) 배터리에서도 돌도록 설정을 얹고, (2) 실행 여부를 Last Result가 아니라
//   "이번 호출 뒤에 실제로 돈 시각(LastRunTime)"으로 판정한다. 안 돌았으면 실패로 낸다.
//   schtasks.exe에는 배터리 설정을 켜는 스위치가 없어 등록을 PowerShell 쪽으로 옮겼다.
//
// 사용:
// (부르는 쪽은 `{{contexts}}/local-html-roundtrip.mjs`로 적는다 — 배포가 그 에이전트의 절대경로로
//  채운다. 여기 홈 경로를 박아두면 codex·gemini에서 그대로 따라 친 사람이 없는 경로를 친다.)
//   node <이 파일> open <마커> <html경로|-> [--slug <슬러그>]
//   node <이 파일> collect <마커> [--max-age-ms N] [--out <경로>]
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// 클립보드 payload가 이 나이를 넘으면 이전 회차·다른 세션의 잔여로 본다.
// PP routine/scripts/cli/saveWeeklyForm.ts의 MAX_AGE_MS와 같은 값이다.
const DEFAULT_MAX_AGE_MS = 30 * 60 * 1000;

// 작업이 대화형 데스크톱으로 넘어가 실제로 돌 때까지 기다리는 한도와 확인 간격.
const RUN_TIMEOUT_MS = 15000;
const RUN_POLL_MS = 250;

const USAGE = `사용:
  open <마커> <html경로|-> [--slug <슬러그>]
      HTML을 BOM 없는 UTF-8로 임시 폴더에 쓰고 기본 브라우저로 연다.
      html경로가 '-'이면 표준입력에서 읽는다. 성공 시 열린 절대경로를 stdout에 낸다.

  collect <마커> [--max-age-ms N] [--out <경로>]
      클립보드를 읽어 JSON으로 파싱하고 __skill 마커와 ts 신선도를 확인한다.
      성공 시 payload를 stdout(또는 --out 파일)에 낸다.
      실패 시 사용자에게 그대로 보여줄 안내 문구를 stderr에 내고 종료코드로 사유를 가른다:
        2 = JSON 파싱 실패   3 = 마커 불일치   4 = 오래된 payload`;

// ---------------------------------------------------------------- 공용

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

// PowerShell 자식 프로세스의 stdout은 콘솔 코드페이지(한국어 윈도우면 CP949)로 나온다.
// Node가 그걸 utf8로 읽으면 한글이 통째로 깨진다(2026-08-29 실측: "가나다" → "������").
// 명령 앞에 OutputEncoding을 UTF-8로 못박아야 왕복이 성립한다.
function powershell(command) {
  return execFileSync(
    "powershell",
    ["-NoProfile", "-Command", `[Console]::OutputEncoding=[Text.Encoding]::UTF8; ${command}`],
    { encoding: "utf8", windowsHide: true }
  );
}

// 마커를 파일명·작업이름에 넣으므로 경로·명령에서 의미를 갖는 문자를 걸러낸다.
function safeMarker(marker) {
  if (!marker || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(marker)) {
    fail(1, `마커는 영숫자·하이픈·밑줄만 쓴다 (받은 값: ${JSON.stringify(marker)})`);
  }
  return marker;
}

function safeSlug(slug) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(slug)) {
    fail(1, `슬러그는 영숫자·점·하이픈·밑줄만 쓴다 (받은 값: ${JSON.stringify(slug)})`);
  }
  return slug;
}

// ---------------------------------------------------------------- open

function open(argv) {
  const marker = safeMarker(argv[0]);
  const source = argv[1];
  if (!source) fail(1, `열 HTML 경로가 없다.\n\n${USAGE}`);

  // 슬러그도 파일명이 되므로 마커와 같게 걸러낸다. 거르지 않으면 `--slug ../../x`가
  // 임시 폴더 밖에 파일을 쓴다.
  const slug = safeSlug(readOption(argv, "--slug") ?? String(Date.now()));

  let raw;
  try {
    raw = source === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(source, "utf8");
  } catch (error) {
    fail(1, `HTML을 읽지 못했다: ${source}\n${error.message}`);
  }

  // BOM이 섞이면 브라우저에서 한글이 깨진다. 들어온 것이 무엇이든 여기서 떼고 다시 쓴다.
  const html = raw.replace(/^﻿/, "");
  const htmlPath = path.join(os.tmpdir(), `${marker}-${slug}.html`);
  fs.writeFileSync(htmlPath, html, { encoding: "utf8" });

  const cmdPath = path.join(os.tmpdir(), `${marker}-${slug}-open.cmd`);
  fs.writeFileSync(cmdPath, `start "" "${htmlPath}"\r\n`, { encoding: "utf8" });

  // fail()은 process.exit이라 finally를 건너뛴다. 정리는 PowerShell 쪽 finally가 맡고,
  // 여기서는 사유만 들고 나와 마지막에 낸다.
  const taskName = `LHR_${marker}_${process.pid}`;
  let reason = null;
  try {
    const verdict = runTask(taskName, cmdPath);
    if (verdict.startsWith("NEVER_RAN")) {
      reason =
        `예약작업이 등록됐지만 실행되지 않았다 (상태: ${verdict.slice(10) || "알 수 없음"}).\n` +
        `열려던 파일: ${htmlPath}\n` +
        `브라우저에서 위 경로를 직접 열면 내용은 그대로 볼 수 있다.`;
    } else if (verdict.startsWith("TIMEOUT")) {
      reason = `예약작업이 ${RUN_TIMEOUT_MS}ms 안에 끝나지 않았다 (상태: ${verdict.slice(8)}). 열려던 파일: ${htmlPath}`;
    } else if (verdict !== "OK 0") {
      reason = `브라우저를 띄우지 못했다 (작업 종료코드: ${verdict.replace(/^OK /, "")}). 열려던 파일: ${htmlPath}`;
    }
  } catch (error) {
    // 작업 스케줄러 사용이 정책으로 막힌 기기에서 여기로 온다. 스택 대신 무엇이 막혔는지 낸다.
    reason = `예약작업으로 브라우저를 열지 못했다 (등록·실행 실패). 열려던 파일: ${htmlPath}\n${error.message}`;
  }

  if (reason) fail(1, reason);
  console.log(htmlPath);
}

// PowerShell 리터럴로 안전하게 넘긴다. 임시 폴더 경로에 공백·작은따옴표가 섞여도 깨지지 않는다.
function psLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * 예약작업을 등록·실행하고 실제로 돌았는지까지 확인한 뒤 지운다.
 *
 * 등록·실행·판정·삭제를 PowerShell 한 번에 묶는다. 프로세스를 네 번 나눠 띄우면 중간에
 * 세션이 끊겼을 때 작업만 기기에 남는다.
 *
 * 판정은 종료코드가 아니라 LastRunTime으로 한다 — 한 번도 안 돈 작업도 종료코드는 0이라,
 * 그것만 보면 배터리로 막혀 대기 중인 작업을 성공으로 읽는다.
 *
 * @returns `OK <종료코드>` | `NEVER_RAN <상태>` | `TIMEOUT <상태>`
 */
function runTask(taskName, cmdPath) {
  return powershell(`
    $ErrorActionPreference = 'Stop'
    $name = ${psLiteral(taskName)}
    $action = New-ScheduledTaskAction -Execute ${psLiteral(cmdPath)}
    # 로그온한 사용자로 돌아야 창이 사용자 데스크톱에 뜬다(schtasks의 /it에 해당).
    $principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive
    # 기본값은 "AC 전원일 때만 실행"이라 배터리에서는 Queued로 남아 영영 안 돈다.
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    Register-ScheduledTask -TaskName $name -Action $action -Principal $principal -Settings $settings -Force | Out-Null
    try {
      # 안 돈 작업의 LastRunTime은 아주 먼 과거다. 이 시각보다 뒤면 이번 호출로 돈 것이다.
      $startedAt = (Get-Date).AddSeconds(-5)
      Start-ScheduledTask -TaskName $name
      $deadline = (Get-Date).AddMilliseconds(${RUN_TIMEOUT_MS})
      do {
        Start-Sleep -Milliseconds ${RUN_POLL_MS}
        $state = (Get-ScheduledTask -TaskName $name).State
        $info = Get-ScheduledTaskInfo -TaskName $name
      } while ($state -ne 'Ready' -and (Get-Date) -lt $deadline)

      if ($info.LastRunTime -lt $startedAt) { "NEVER_RAN $state" }
      elseif ($state -ne 'Ready') { "TIMEOUT $state" }
      else { "OK $($info.LastTaskResult)" }
    } finally {
      Unregister-ScheduledTask -TaskName $name -Confirm:$false
    }
  `).trim();
}

// ---------------------------------------------------------------- collect

function collect(argv) {
  const marker = safeMarker(argv[0]);
  const maxAgeMs = Number(readOption(argv, "--max-age-ms") ?? DEFAULT_MAX_AGE_MS);
  const outPath = readOption(argv, "--out");

  // 클립보드에 BOM이 섞여 들어오면 JSON.parse가 그 한 글자 때문에 통째로 실패한다.
  const clipboard = powershell("Get-Clipboard -Raw").replace(/^﻿/, "");

  let payload;
  try {
    payload = JSON.parse(clipboard);
  } catch {
    fail(2, "클립보드가 JSON이 아니다 — 폼의 [복사하기]를 다시 눌러줘.");
  }

  if (payload?.__skill !== marker) {
    fail(
      3,
      `클립보드에 담긴 것이 이 폼의 값이 아니다 (기대: ${marker}, 실제: ${JSON.stringify(payload?.__skill)}) — 폼의 [복사하기]를 다시 눌러줘.`
    );
  }

  if (typeof payload.ts === "number" && Date.now() - payload.ts > maxAgeMs) {
    fail(4, "클립보드에 담긴 값이 오래됐다 (이전 회차·다른 세션의 잔여) — 폼의 [복사하기]를 다시 눌러줘.");
  }

  const json = JSON.stringify(payload);
  if (outPath) {
    fs.writeFileSync(outPath, json, { encoding: "utf8" });
    console.log(outPath);
  } else {
    console.log(json);
  }
}

// ---------------------------------------------------------------- 진입점

function readOption(argv, name) {
  const at = argv.indexOf(name);
  return at === -1 ? undefined : argv[at + 1];
}

const [subcommand, ...rest] = process.argv.slice(2);
if (!subcommand || subcommand === "--help" || subcommand === "-h") {
  console.log(USAGE);
  process.exit(subcommand ? 0 : 1);
}

if (subcommand === "open") open(rest);
else if (subcommand === "collect") collect(rest);
else fail(1, `모르는 서브커맨드: ${subcommand}\n\n${USAGE}`);
