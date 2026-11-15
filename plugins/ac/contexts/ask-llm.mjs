// 사용법: ask-llm.md (같은 폴더)
//
// gemini는 Antigravity CLI(agy)로 보낸다. gemini CLI의 Google 계정 경로는 서버가
// "This client is no longer supported ... migrate to the Antigravity suite"로 거절한다(2026-11-14 실측).
// Gemini API 키 경로는 Google AI 구독과 별도 과금이고 무료 등급은 보낸 내용이 학습에 쓰여, 구독 계정으로 도는 agy를 쓴다.
//
// 호출마다 `agy -p`를 띄우면 짧은 답에도 9초 중 6초 넘게 기동에 들어(2026-11-15 실측),
// `agy acp`를 상주시키는 ask-llm-daemon.mjs에 named pipe로 묻는다. 데몬이 없으면 띄운다.
// 데몬은 30분 동안 요청이 없으면 내려간다. 도구 차단·세션 분리·모델 선택은 데몬 쪽 주석에 있다.
//
// agy 함정(실측):
//   - agy는 PATH에 안 잡힌다. 설치 위치 %LOCALAPPDATA%\agy\bin\agy.exe를 직접 실행한다.
//   - 받는 모델이 도구를 사용하면 보낸 내용(웹 문서 원문 등)에 섞인 지시대로 명령을 실행하거나
//     파일을 쓴다. 사용자 settings.json이 command(*)·write_file(*)을 허용하고 있다.
//     --settings의 permissions.deny는 search_web을 못 막아서, 작업 폴더의 .agents/hooks.json에 도구를 거부하는 훅을 둔다.
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const USAGE_DOC = path.join(import.meta.dirname, "ask-llm.md");
const USAGE_HINT = `사용법: ${USAGE_DOC.replace(/\\/g, "/")}`;
const DAEMON_SCRIPT_PATH = path.join(import.meta.dirname, "ask-llm-daemon.mjs");
const DAEMON_LOG_PATH = path.join(os.tmpdir(), "ask-llm-daemon.log");

// 실패를 받은 호출 쪽 AI가 직접 대신 해 버리지 않게, 실패할 때마다 stderr 끝에 붙인다.
const FAILURE_INSTRUCTION = "이 사유를 사용자에게 보이고 멈춘다. 이 일을 직접 대신하면 사용자는 다른 회사 모델이 사용되지 않은 것을 모른다.";

// 모델은 버전 없이 이름과 effort만 적고, 데몬이 요청마다 agy 모델 목록에서 그 이름의 가장 높은 버전을 선택한다.
// agy에는 Claude의 sonnet처럼 최신 버전을 가리키는 별칭이 없다(--model flash는 "not recognized").
const VENDORS = {
  gemini: { family: "Hydrogen", effort: "Medium" },
};

const AGY_EXECUTABLE_PATH = path.join(process.env.LOCALAPPDATA ?? "", "agy", "bin", "agy.exe");

// 한 번 묻는 데 쓸 시간 한도. ask-llm.md 머리말의 대기 시간(100초)과 같은 값이다. 바꾸면 그 문서도 같이 고친다.
const ANSWER_TIMEOUT_MS = 100_000;
// 데몬 기동까지 합친 전체 한도. Claude Code Bash 도구의 기본 타임아웃(120초)보다 짧게 둬서,
// 도구가 프로세스를 먼저 죽여 사유 없이 끝나는 일이 없게 한다. 기동이 길어지면 답 한도를 그만큼 줄인다.
const TOTAL_TIMEOUT_MS = 112_000;
// 데몬이 없을 때 띄워서 pipe가 열리기까지 기다리는 한도. 데몬의 initialize 한도(10초)보다 조금 길게 둔다.
// 보통은 1초 안에 열린다(2026-11-15 실측: 데몬을 띄우는 첫 호출 전체 4~5초).
const DAEMON_START_TIMEOUT_MS = 12_000;
const startedAt = Date.now();

function fail(message) {
  console.error(`${message}\n${FAILURE_INSTRUCTION}`);
  process.exit(1);
}

const VALUE_OPTIONS = ["--vendor", "--schema"];

function readOption(argv, name) {
  const optionIndex = argv.indexOf(name);
  if (optionIndex === -1) return undefined;
  const value = argv[optionIndex + 1];
  if (value === undefined || value.startsWith("--")) fail(`${name} 뒤에 값이 없다.\n${USAGE_HINT}`);
  argv.splice(optionIndex, 2);
  return value;
}

function typeOf(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  if (typeof value === "number" && Number.isInteger(value)) return "integer";
  return typeof value;
}

// 스키마의 type·enum·required·properties·additionalProperties(false)·items만 본다. 답의 필드를 꺼내 쓰는 쪽이 깨지는 것은 이 범위에서 난다.
function schemaMismatch(value, schema, jsonPath = "$") {
  const actual = typeOf(value);
  if (schema.type) {
    const allowed = [schema.type].flat();
    // integer는 number의 한 갈래라, number를 허용하는 스키마에 정수가 와도 맞다.
    const matches = allowed.includes(actual) || (actual === "integer" && allowed.includes("number"));
    if (!matches) return `${jsonPath}: ${allowed.join("|")}여야 하는데 ${actual}다`;
  }
  if (schema.enum && !schema.enum.some((option) => JSON.stringify(option) === JSON.stringify(value))) {
    return `${jsonPath}: ${JSON.stringify(schema.enum)} 중 하나여야 하는데 ${JSON.stringify(value)}다`;
  }
  if (actual === "object") {
    for (const key of schema.required ?? []) if (!(key in value)) return `${jsonPath}.${key}: 필수 필드가 없다`;
    if (schema.additionalProperties === false) {
      const extraKey = Object.keys(value).find((key) => !(key in (schema.properties ?? {})));
      if (extraKey) return `${jsonPath}.${extraKey}: 스키마에 없는 필드다`;
    }
    for (const [key, child] of Object.entries(schema.properties ?? {})) {
      if (key in value) {
        const childMismatch = schemaMismatch(value[key], child, `${jsonPath}.${key}`);
        if (childMismatch) return childMismatch;
      }
    }
  }
  if (actual === "array" && schema.items) {
    for (const [index, item] of value.entries()) {
      const childMismatch = schemaMismatch(item, schema.items, `${jsonPath}[${index}]`);
      if (childMismatch) return childMismatch;
    }
  }
  return null;
}

const argv = process.argv.slice(2);
// 옵션 값 자리의 "-h"(예: --schema -h)는 도움말 요청이 아니다. 도움말로 읽으면 exit 0으로 끝나 답처럼 보인다.
const wantsHelp = argv.some((token, index) => (token === "--help" || token === "-h") && !VALUE_OPTIONS.includes(argv[index - 1]));
if (wantsHelp) {
  process.stdout.write(fs.readFileSync(USAGE_DOC, "utf8"));
  process.exit(0);
}

const vendorName = readOption(argv, "--vendor");
const schemaArgument = readOption(argv, "--schema");
const promptSource = argv[0];

if (!vendorName) fail(`--vendor가 없다.\n${USAGE_HINT}`);
const vendor = VENDORS[vendorName];
if (!vendor) fail(`모르는 벤더: ${vendorName} (지원: ${Object.keys(VENDORS).join(", ")})\n${USAGE_HINT}`);
if (!promptSource) fail(`보낼 내용이 없다. 파일 경로나 -(stdin)를 준다.\n${USAGE_HINT}`);
if (argv.length > 1) fail(`모르는 인자: ${argv.slice(1).join(" ")}\n${USAGE_HINT}`);

let prompt;
try {
  prompt = (promptSource === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(promptSource, "utf8")).replace(/^﻿/, "");
} catch (error) {
  fail(`보낼 내용을 읽지 못했다: ${promptSource}\n${error.message}`);
}
if (!prompt.trim()) fail(`보낼 내용이 비어 있다.\n${USAGE_HINT}`);

let schema;
if (schemaArgument) {
  const schemaPath = path.resolve(schemaArgument);
  try {
    schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  } catch (error) {
    fail(`스키마 파일을 읽지 못했다: ${schemaPath}\n${error.message}\n${USAGE_HINT}`);
  }
}

if (!fs.existsSync(AGY_EXECUTABLE_PATH)) {
  fail(`Antigravity CLI가 없다: ${AGY_EXECUTABLE_PATH}\nhttps://antigravity.google 에서 설치하고 agy로 Google 계정에 로그인한다.`);
}

// ACP에는 agy -p의 --json-schema에 해당하는 것이 없다. 스키마를 프롬프트에 붙여 JSON만 답하게 하고,
// 강제가 아니라 부탁이므로 아래 schemaMismatch 검사가 어긴 답을 실패로 걸러 낸다.
const requestPrompt = schema
  ? `${prompt}\n\n---\nReply with ONLY a single JSON value that conforms to the JSON Schema below. No code fence, no prose before or after.\n${JSON.stringify(schema)}`
  : prompt;

// pipe 이름에 데몬 스크립트 내용의 해시를 넣는다. 데몬을 고치면 새 이름으로 새 데몬이 뜨고, 옛 데몬은 유휴 한도에 내려간다.
const daemonHash = crypto.createHash("sha256").update(fs.readFileSync(DAEMON_SCRIPT_PATH)).digest("hex").slice(0, 12);
const pipePath = `\\\\.\\pipe\\ask-llm-agy-${os.userInfo().username}-${daemonHash}`;

function connect() {
  return new Promise((resolve) => {
    const socket = net.connect(pipePath);
    socket.once("connect", () => resolve(socket));
    socket.once("error", () => resolve(null));
  });
}

function readDaemonLogTail() {
  try { return fs.readFileSync(DAEMON_LOG_PATH, "utf8").trim().split("\n").slice(-10).join("\n"); } catch { return "(로그 없음)"; }
}

async function connectOrStartDaemon() {
  const existing = await connect();
  if (existing) return existing;
  const daemon = spawn(process.execPath, [DAEMON_SCRIPT_PATH, pipePath, DAEMON_LOG_PATH], { detached: true, stdio: "ignore", windowsHide: true });
  // 띄운 데몬이 끝나면(agy 실패, 또는 동시에 뜬 다른 데몬에 pipe를 뺏김) 한 번만 더 붙어 보고 한도를 다 기다리지 않는다.
  let daemonExited = false;
  daemon.once("exit", () => { daemonExited = true; });
  daemon.unref();
  const deadline = Date.now() + DAEMON_START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const exitedBeforeTry = daemonExited;
    const socket = await connect();
    if (socket) return socket;
    if (exitedBeforeTry) break;
  }
  fail(`agy 상주 프로세스를 띄우지 못했다.\n${DAEMON_LOG_PATH} 끝부분:\n${readDaemonLogTail()}`);
}

function request(socket, payload) {
  return new Promise((resolve) => {
    let buffer = "";
    // 데몬이 멈춰 답을 영영 안 주는 경우를 대비한 한도. 데몬 쪽 시간 한도가 먼저 걸리게 조금 길게 둔다.
    const timer = setTimeout(() => { socket.destroy(); resolve({ ok: false, reason: "상주 프로세스가 답을 돌려주지 않았다" }); }, payload.timeoutMs + 3_000);
    // 한글 한 글자가 두 조각에 걸쳐 와도 깨지지 않게 스트림에서 디코딩한다.
    socket.setEncoding("utf8");
    socket.on("data", (data) => { buffer += data; });
    socket.on("close", () => {
      clearTimeout(timer);
      try { resolve(JSON.parse(buffer)); } catch { resolve({ ok: false, reason: `상주 프로세스와의 연결이 답 없이 끊겼다.\n${DAEMON_LOG_PATH} 끝부분:\n${readDaemonLogTail()}` }); }
    });
    socket.on("error", () => {});
    socket.write(JSON.stringify(payload) + "\n");
  });
}

const socket = await connectOrStartDaemon();
const answerTimeoutMs = Math.min(ANSWER_TIMEOUT_MS, TOTAL_TIMEOUT_MS - (Date.now() - startedAt));
const response = await request(socket, { prompt: requestPrompt, family: vendor.family, effort: vendor.effort, timeoutMs: answerTimeoutMs });

// 선택한 모델을 사람이 볼 수 있게 남긴다. stdout은 호출한 쪽이 답으로 읽으므로 stderr에 출력한다.
if (response.model) console.error(`ask-llm: ${vendorName} 모델 ${response.model}`);
if (!response.ok) {
  if (response.reason === "timeout") fail(`${vendorName}가 ${Math.round(answerTimeoutMs / 1000)}초 안에 답하지 않았다.`);
  fail(`${vendorName} 응답 실패: ${response.reason}`);
}
if (!response.text?.trim()) fail(`${vendorName}가 빈 답을 보냈다.`);

if (schema) {
  // 부탁을 어기고 코드 펜스로 감싸 오는 경우만 벗긴다. 그 밖의 군더더기는 JSON 파싱에서 실패로 걸린다.
  const jsonText = response.text.trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/, "$1");
  let structured;
  try {
    structured = JSON.parse(jsonText);
  } catch {
    fail(`스키마를 줬지만 답이 JSON이 아니다.\n응답: ${response.text.slice(0, 2000)}`);
  }
  const mismatch = schemaMismatch(structured, schema);
  if (mismatch) fail(`응답이 스키마에 맞지 않는다: ${mismatch}\n응답: ${JSON.stringify(structured).slice(0, 2000)}`);
  process.stdout.write(JSON.stringify(structured) + "\n");
} else {
  process.stdout.write(response.text);
}
