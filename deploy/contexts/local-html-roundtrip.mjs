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
// schtasks 따옴표 함정(같은 실측):
//   /tr "cmd /c start \"\" \"<경로>\"" → ERROR: Invalid argument/option 으로 깨진다
//   /tr "explorer.exe <경로>"          → 창은 뜨지만 Last Result 1이라 성공 판정에 못 쓴다
//   경로를 박은 .cmd를 만들어 /tr에 그 파일만 넘기는 방식만 둘 다 만족한다.
//
// 사용:
//   node ~/.claude/contexts/local-html-roundtrip.mjs open <마커> <html경로|-> [--slug <슬러그>]
//   node ~/.claude/contexts/local-html-roundtrip.mjs collect <마커> [--max-age-ms N] [--out <경로>]
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// 클립보드 payload가 이 나이를 넘으면 이전 회차·다른 세션의 잔여로 본다.
// PP routine/scripts/cli/saveWeeklyForm.ts의 MAX_AGE_MS와 같은 값이다.
const DEFAULT_MAX_AGE_MS = 30 * 60 * 1000;

// schtasks /run이 대화형 데스크톱으로 작업을 넘기고 Last Result가 갱신될 때까지의 여유.
const RUN_SETTLE_MS = 3000;

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

  // 실패해도 예약작업은 반드시 지우고 나간다. fail()은 process.exit이라 finally를 건너뛰므로
  // try 안에서 부르지 않고, 사유만 들고 나와 정리 뒤에 낸다.
  const taskName = `LHR_${marker}_${process.pid}`;
  let reason = null;
  try {
    run(["/create", "/tn", taskName, "/tr", cmdPath, "/sc", "ONCE", "/st", "23:59", "/it", "/f"]);
    run(["/run", "/tn", taskName]);
    sleepSync(RUN_SETTLE_MS);

    const result = lastResult(taskName);
    if (result !== 0) {
      reason = `브라우저를 띄우지 못했다 (schtasks Last Result: ${result}). 열려던 파일: ${htmlPath}`;
    }
  } catch (error) {
    // 작업 스케줄러 사용이 정책으로 막힌 기기에서 여기로 온다. 스택 대신 무엇이 막혔는지 낸다.
    reason = `예약작업으로 브라우저를 열지 못했다 (schtasks 실행 실패). 열려던 파일: ${htmlPath}\n${error.message}`;
  }

  try {
    run(["/delete", "/tn", taskName, "/f"]);
  } catch {
    // 지우기 실패가 오픈 자체를 무르지는 않는다. 다음 실행이 /f로 덮어쓰지만 흔적은 남으므로 알린다.
    console.error(`경고: 임시 예약작업 ${taskName}을 지우지 못했다. 작업 스케줄러에서 확인할 것.`);
  }

  if (reason) fail(1, reason);
  console.log(htmlPath);
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function run(args) {
  return execFileSync("schtasks", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

// schtasks /query의 출력은 로케일에 따라 "Last Result"·"마지막 결과"로 갈린다.
// 라벨을 맞히는 대신 /fo LIST에서 값이 정수 하나인 줄을 찾는다.
function lastResult(taskName) {
  const out = execFileSync("schtasks", ["/query", "/tn", taskName, "/fo", "LIST", "/v"], {
    encoding: "utf8",
  });
  for (const line of out.split(/\r?\n/)) {
    const match = /^(?:Last Result|마지막 결과)\s*:\s*(-?\d+)\s*$/.exec(line);
    if (match) return Number(match[1]);
  }
  return null;
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
