// 사용법: ask-llm.md (같은 폴더)
//
// gemini는 Antigravity CLI(agy)로 보낸다. gemini CLI의 Google 계정 경로는 서버가
// "This client is no longer supported ... migrate to the Antigravity suite"로 거절한다(2026-11-14 실측).
//
// agy 함정(같은 날 실측):
//   - agy는 PATH에 안 잡힌다. 설치 위치 %LOCALAPPDATA%\agy\bin\agy.exe를 직접 실행한다.
//   - 프롬프트를 -p 인자로 넘기면 Windows 명령줄 길이(약 32K자)에 걸린다. text 입력은 stdin을
//     읽지 않으므로 stream-json 입력으로 `{"event":"user","message":{...}}` 한 줄을 넘긴다.
//   - --mode plan은 프롬프트 앞에 "/plan "을 붙여 모델에게 그대로 보인다. 사용하지 않는다.
//   - 받는 모델이 도구를 사용하면 보낸 내용(웹 문서 원문 등)에 섞인 지시대로 명령을 실행하거나
//     파일을 쓴다. 사용자 settings.json이 command(*)·write_file(*)을 허용하고 있다.
//     --settings의 permissions.deny는 search_web을 못 막는다("*"·"search_web(*)"·"search_web" 모두 통과).
//     그래서 작업 폴더의 .agents/hooks.json에 도구를 거부하는 PreToolUse 훅을 둔다(아래 TOOL_GATE_SCRIPT).
//     훅을 두면 search_web·write_file·run_command가 모두 "denied by pre-tool hook"으로 막히고,
//     두지 않으면 파일이 써지는 것을 대조로 확인했다.
//   - 작업 폴더는 매번 빈 임시 폴더로 둔다. 호출한 쪽 레포가 워크스페이스로 잡히지 않고, 위 훅도 여기 둔다.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const USAGE_DOC = path.join(import.meta.dirname, "ask-llm.md");
const USAGE_HINT = `사용법: ${USAGE_DOC.replace(/\\/g, "/")}`;

// 실패를 받은 호출 쪽 AI가 직접 대신 해 버리지 않게, 실패할 때마다 stderr 끝에 붙인다.
const FAILURE_INSTRUCTION = "이 사유를 사용자에게 보이고 멈춘다. 이 일을 직접 대신하면 사용자는 다른 회사 모델이 사용되지 않은 것을 모른다.";

// 모델은 버전 없이 이름과 effort만 적고, 호출마다 `agy models`에서 그 이름의 가장 높은 버전을 선택한다.
// agy에는 Claude의 sonnet처럼 최신 버전을 가리키는 별칭이 없다(--model flash는 "not recognized").
// custom agent의 model: flash 같은 급 지정도 서브에이전트에만 먹고 -p 메인 세션에는 안 먹는다(2026-11-15 실측).
const VENDORS = {
  gemini: { family: "Hydrogen", effort: "Medium" },
};

const AGY_EXECUTABLE_PATH = path.join(process.env.LOCALAPPDATA ?? "", "agy", "bin", "agy.exe");

// `agy models` 줄 꼴: "gemini-4-hydrogen-medium\tGemini 4 Hydrogen (Medium)".
// 버전은 점으로 나눠 숫자로 비교한다. 문자열로 비교하면 4.10이 4.9보다 낮게 나온다.
function pickLatestModel(listing, family, effort) {
  const linePattern = new RegExp(`^(\\S+)\\s+Gemini (\\d+(?:\\.\\d+)*) ${family} \\(${effort}\\)\\s*$`);
  const candidates = listing
    .split(/\r?\n/)
    .map((line) => line.match(linePattern))
    .filter(Boolean)
    .map(([, id, version]) => ({ id, version: version.split(".").map(Number) }));
  const compare = (a, b) => {
    for (let index = 0; index < Math.max(a.length, b.length); index++) {
      const diff = (a[index] ?? 0) - (b[index] ?? 0);
      if (diff) return diff;
    }
    return 0;
  };
  return candidates.sort((a, b) => compare(b.version, a.version))[0]?.id;
}

// --json-schema의 구조화 응답은 모델이 finish 도구를 호출해 넘긴다. finish까지 막으면
// structured_output이 비어 끝난다(2026-11-14 실측). 그래서 finish만 통과시키고 나머지는 거부한다.
// matcher는 RE2라 "finish 빼고"를 못 적으므로, 도구 이름을 보고 판정하는 스크립트를 훅으로 둔다.
const TOOL_GATE_SCRIPT = `
const call = JSON.parse(require("fs").readFileSync(0, "utf8")).toolCall ?? {};
process.stdout.write(JSON.stringify(call.name === "finish"
  ? { decision: "allow" }
  : { decision: "deny", reason: "tools are disabled for this request" }));
`;
const TOOL_GATE_HOOKS = {
  "deny-tools-except-finish": {
    PreToolUse: [
      {
        matcher: "*",
        hooks: [{ type: "command", command: `"${process.execPath}" tool-gate.cjs`, timeout: 10 }],
      },
    ],
  },
};

// 한 번 묻는 데 쓸 시간 한도. Claude Code Bash 도구의 기본 타임아웃(120초)보다 짧게 둬서,
// 도구가 프로세스를 먼저 죽여 사유 없이 끝나는 일이 없게 한다.
// ask-llm.md 머리말의 대기 시간(100초)과 같은 값이다. 바꾸면 그 문서도 같이 고친다.
// agy 기동·훅·정리에 8초쯤 더 걸린다(110초 한도에서 전체 118초 실측). 그만큼 여유를 둔다.
// 하루 캐시가 비어 `agy models`를 다시 실행하는 호출은 4초쯤 더 걸린다(2026-11-15 실측). 그래도 120초 안이다.
const PRINT_TIMEOUT = "100s";

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

// 작업 폴더를 임시 폴더로 옮기므로 상대 경로는 여기서 절대 경로로 바꿔 둔다.
let schemaPath;
let schema;
if (schemaArgument) {
  schemaPath = path.resolve(schemaArgument);
  try {
    schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  } catch (error) {
    fail(`스키마 파일을 읽지 못했다: ${schemaPath}\n${error.message}\n${USAGE_HINT}`);
  }
}

if (!fs.existsSync(AGY_EXECUTABLE_PATH)) {
  fail(`Antigravity CLI가 없다: ${AGY_EXECUTABLE_PATH}\nhttps://antigravity.google 에서 설치하고 agy로 Google 계정에 로그인한다.`);
}

// `agy models`는 4초쯤 걸려(2026-11-15 실측) 결과를 하루 동안 tmp에 캐시한다.
// 캐시가 없거나 하루가 지났거나, 캐시에 맞는 모델이 없으면 다시 조회한다.
const MODELS_CACHE_PATH = path.join(os.tmpdir(), "ask-llm-agy-models.txt");
const MODELS_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function fetchModelListing() {
  // 멈추면 PRINT_TIMEOUT 밖에서 기다리게 되므로 따로 한도를 둔다.
  const modelsProcess = spawnSync(AGY_EXECUTABLE_PATH, ["models"], { encoding: "utf8", windowsHide: true, timeout: 15_000 });
  if (modelsProcess.error) fail(`agy models를 실행하지 못했다: ${modelsProcess.error.message}`);
  if (modelsProcess.status !== 0) {
    fail(`agy models가 실패했다 (종료코드 ${modelsProcess.status}).\n${(modelsProcess.stderr || modelsProcess.stdout || "").trim().slice(-2000)}`);
  }
  const listing = modelsProcess.stdout ?? "";
  try { fs.writeFileSync(MODELS_CACHE_PATH, listing); } catch { /* 캐시를 못 써도 이번 호출은 진행한다 */ }
  return listing;
}

function readCachedModelListing() {
  try {
    if (Date.now() - fs.statSync(MODELS_CACHE_PATH).mtimeMs > MODELS_CACHE_MAX_AGE_MS) return undefined;
    return fs.readFileSync(MODELS_CACHE_PATH, "utf8");
  } catch {
    return undefined;
  }
}

let modelListing = readCachedModelListing();
let model = modelListing === undefined ? undefined : pickLatestModel(modelListing, vendor.family, vendor.effort);
if (!model) {
  modelListing = fetchModelListing();
  model = pickLatestModel(modelListing, vendor.family, vendor.effort);
}
// 다른 이름(Argon·Flash 등)으로 조용히 넘어가지 않는다. 이름이 바뀌었으면 사람이 VENDORS를 고친다.
if (!model) {
  fail(`agy models에 "Gemini <버전> ${vendor.family} (${vendor.effort})" 모델이 없다.\n${modelListing.trim().slice(-2000)}`);
}
// 선택한 모델을 사람이 볼 수 있게 남긴다. stdout은 호출한 쪽이 답으로 읽으므로 stderr에 출력한다.
console.error(`ask-llm: ${vendorName} 모델 ${model}`);

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "ask-llm-"));
fs.mkdirSync(path.join(workDir, ".agents"));
fs.writeFileSync(path.join(workDir, ".agents", "hooks.json"), JSON.stringify(TOOL_GATE_HOOKS));
fs.writeFileSync(path.join(workDir, ".agents", "tool-gate.cjs"), TOOL_GATE_SCRIPT);

const agyArgs = [
  "-p=",
  "--input-format", "stream-json",
  "--output-format", "stream-json",
  "--model", model,
  "--print-timeout", PRINT_TIMEOUT,
];
if (schemaPath) agyArgs.push("--json-schema", schemaPath);

const stdinPayload = JSON.stringify({
  event: "user",
  message: { role: "user", content: [{ type: "text", text: prompt }] },
}) + "\n";

const agyProcess = spawnSync(AGY_EXECUTABLE_PATH, agyArgs, {
  cwd: workDir,
  input: stdinPayload,
  encoding: "utf8",
  windowsHide: true,
  maxBuffer: 64 * 1024 * 1024,
});
fs.rmSync(workDir, { recursive: true, force: true });

if (agyProcess.error) fail(`agy를 실행하지 못했다: ${agyProcess.error.message}`);

// stream-json 출력은 이벤트마다 한 줄이다. 마지막 result 이벤트만 사용한다.
const result = agyProcess.stdout
  .split("\n")
  .map((line) => {
    try { return JSON.parse(line); } catch { return null; }
  })
  .filter((event) => event?.event === "result")
  .at(-1)?.result;

if (!result) {
  fail(`agy가 결과 없이 끝났다 (종료코드 ${agyProcess.status}).\n${(agyProcess.stderr || agyProcess.stdout).trim().slice(-2000)}`);
}
if (result.status !== "SUCCESS") {
  fail(`${vendorName} 응답 실패 (${result.status}): ${result.error ?? "사유 없음"}`);
}
// 시간 한도에 걸려도 status는 SUCCESS이고 답만 비어 온다(finished_reason: print_timeout, 2026-11-14 실측).
if (result.finished_reason === "print_timeout") {
  fail(`${vendorName}가 ${PRINT_TIMEOUT} 안에 답하지 않았다.`);
}
// 정상으로 끝난 답에는 finished_reason이 없었다. 다른 값(출력 한도 잘림 등)이면 답이 온전하다고 볼 수 없다.
if (result.finished_reason) {
  fail(`${vendorName} 답이 정상 종료가 아니다 (finished_reason: ${result.finished_reason}).`);
}
if (!schema && !result.response?.trim()) {
  fail(`${vendorName}가 빈 답을 보냈다.`);
}

if (schema) {
  if (result.structured_output === undefined) fail(`스키마를 줬지만 구조화된 응답이 없다.\n응답: ${result.response}`);
  const mismatch = schemaMismatch(result.structured_output, schema);
  if (mismatch) fail(`응답이 스키마에 맞지 않는다: ${mismatch}\n응답: ${JSON.stringify(result.structured_output).slice(0, 2000)}`);
  process.stdout.write(JSON.stringify(result.structured_output) + "\n");
} else {
  process.stdout.write(result.response);
}
