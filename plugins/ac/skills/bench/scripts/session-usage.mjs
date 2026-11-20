#!/usr/bin/env node
// 사용법: session-usage.md (같은 폴더)
// Claude Code 세션 로그(jsonl)에서 사용자 입력 단위 구간의 Claude 토큰·걸린 시간을 집계한다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DOC = path.join(import.meta.dirname, 'session-usage.md');

function fail(message) {
  process.stderr.write(`${message}\n사용법: ${DOC}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const options = { target: null, list: false, turn: null, stopAtTool: null };
  const valueAfter = (index, name) => {
    const value = argv[index];
    if (value === undefined || value.startsWith('--')) fail(`${name} 뒤에 값이 없다`);
    return value;
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--list') options.list = true;
    else if (arg === '--turn') options.turn = valueAfter(++index, arg);
    else if (arg === '--stop-at-tool') options.stopAtTool = valueAfter(++index, arg);
    else if (arg.startsWith('--')) fail(`모르는 옵션: ${arg}`);
    else if (!options.target) options.target = arg;
    else fail(`인자가 너무 많다: ${arg}`);
  }
  if (!options.target) fail('세션 로그 경로나 세션 id가 없다');
  if (options.list === (options.turn !== null)) fail('--list와 --turn 중 하나만 준다');
  if (options.list && options.stopAtTool) fail('--stop-at-tool은 --turn과 함께 준다');
  return options;
}

function resolveLog(target) {
  if (fs.existsSync(target)) return target;
  const root = path.join(os.homedir(), '.claude', 'projects');
  const hits = fs.existsSync(root)
    ? fs.readdirSync(root).map((directory) => path.join(root, directory, `${target}.jsonl`)).filter((file) => fs.existsSync(file))
    : [];
  if (hits.length === 0) fail(`세션 로그를 못 찾았다: ${target}`);
  if (hits.length > 1) fail(`같은 id의 로그가 여럿이다. 경로로 준다:\n${hits.join('\n')}`);
  return hits[0];
}

const readEntries = (file) => fs.readFileSync(file, 'utf8').split('\n').filter((line) => line.trim()).map((line) => {
  try { return JSON.parse(line); } catch { return null; }
}).filter(Boolean);

const textOf = (entry) => {
  const content = entry.message?.content;
  if (typeof content === 'string') return content;
  return (content || []).filter((block) => block.type === 'text').map((block) => block.text).join('\n');
};

// 사람이 입력한 줄만 구간 경계로 사용한다. 도구 결과·시스템이 넣은 줄(<태그>로 시작)·다른 세션 메시지·작업 알림·중단 표시는 뺀다.
function isUserTurn(entry) {
  if (entry.type !== 'user' || entry.isMeta || entry.isSidechain) return false;
  const content = entry.message?.content;
  if (Array.isArray(content) && content.some((block) => block.type === 'tool_result')) return false;
  const text = textOf(entry).trim();
  if (!text || text.startsWith('[Request interrupted')) return false;
  return text.includes('<command-name>') || !text.startsWith('<');
}

function turnLabel(entry) {
  const text = textOf(entry);
  const command = text.match(/<command-name>([^<]*)<\/command-name>/);
  const commandArgs = text.match(/<command-args>([^<]*)<\/command-args>/);
  const label = command ? `${command[1]} ${commandArgs ? commandArgs[1] : ''}` : text;
  return label.replace(/\s+/g, ' ').trim().slice(0, 80);
}

const emptyUsage = () => ({ calls: 0, input: 0, cacheCreate: 0, cacheRead: 0, output: 0, models: [] });

// 같은 API 호출이 content 블록마다 줄로 나뉘어 usage가 반복되므로 message.id로 한 번만 센다.
function sumUsage(entries, from, to) {
  const seen = new Set();
  const total = emptyUsage();
  const models = new Set();
  for (const entry of entries) {
    if (entry.type !== 'assistant' || !entry.message?.usage) continue;
    const timestamp = Date.parse(entry.timestamp);
    if (timestamp < from || timestamp >= to) continue;
    if (seen.has(entry.message.id)) continue;
    seen.add(entry.message.id);
    const usage = entry.message.usage;
    total.calls++;
    total.input += usage.input_tokens || 0;
    total.cacheCreate += usage.cache_creation_input_tokens || 0;
    total.cacheRead += usage.cache_read_input_tokens || 0;
    total.output += usage.output_tokens || 0;
    if (entry.message.model) models.add(entry.message.model);
  }
  return { ...total, models: [...models] };
}

function addUsage(left, right) {
  return {
    calls: left.calls + right.calls,
    input: left.input + right.input,
    cacheCreate: left.cacheCreate + right.cacheCreate,
    cacheRead: left.cacheRead + right.cacheRead,
    output: left.output + right.output,
    models: [...new Set([...left.models, ...right.models])],
  };
}

function parseRange(spec, max) {
  const match = String(spec).match(/^(\d+)(?:-(\d+))?$/);
  if (!match) fail(`--turn 꼴이 틀렸다: ${spec} (예: 3 또는 3-5)`);
  const first = Number(match[1]);
  const last = match[2] ? Number(match[2]) : first;
  if (first < 1 || last < first || last > max) fail(`--turn 범위가 맞지 않다: ${spec} (입력은 1~${max})`);
  return [first, last];
}

const options = parseArgs(process.argv.slice(2));
const logPath = resolveLog(options.target);
const mainEntries = readEntries(logPath);
const turns = mainEntries.filter(isUserTurn);

if (options.list) {
  if (turns.length === 0) fail('사용자 입력이 없는 로그다');
  turns.forEach((entry, index) => process.stdout.write(`${index + 1}\t${entry.timestamp}\t${turnLabel(entry)}\n`));
  process.exit(0);
}

const [first, last] = parseRange(options.turn, turns.length);
const from = Date.parse(turns[first - 1].timestamp);
const nextTurn = turns[last];
const limit = nextTurn ? Date.parse(nextTurn.timestamp) : Infinity;

// 구간 끝: 다음 사용자 입력 직전의 마지막 기록. --stop-at-tool이면 그 도구를 처음 호출한 응답 직전.
let to = from;
let stoppedAt = null;
for (const entry of mainEntries) {
  const timestamp = Date.parse(entry.timestamp);
  if (!Number.isFinite(timestamp) || timestamp < from || timestamp >= limit) continue;
  if (options.stopAtTool && entry.type === 'assistant'
    && (entry.message?.content || []).some((block) => block.type === 'tool_use' && block.name === options.stopAtTool)) {
    to = timestamp;
    stoppedAt = entry.timestamp;
    break;
  }
  if (entry.type === 'assistant' || entry.type === 'user') to = Math.max(to, timestamp);
}
if (options.stopAtTool && !stoppedAt) fail(`구간 안에 ${options.stopAtTool} 호출이 없다`);
const end = stoppedAt ? to : to + 1; // 마지막 기록을 포함하도록 끝을 1ms 민다

const subagentDir = path.join(logPath.replace(/\.jsonl$/, ''), 'subagents');
const subagentFiles = fs.existsSync(subagentDir) ? fs.readdirSync(subagentDir).filter((file) => file.endsWith('.jsonl')) : [];
const subagents = subagentFiles
  .map((file) => sumUsage(readEntries(path.join(subagentDir, file)), from, end))
  .filter((usage) => usage.calls > 0)
  .reduce(addUsage, emptyUsage());
const main = sumUsage(mainEntries, from, end);

const result = {
  log: logPath,
  turns: `${first}${last !== first ? `-${last}` : ''}`,
  from: new Date(from).toISOString(),
  to: new Date(to).toISOString(),
  stoppedAtTool: stoppedAt ? options.stopAtTool : null,
  seconds: Number(((to - from) / 1000).toFixed(1)),
  main,
  subagents,
  total: addUsage(main, subagents),
};
process.stdout.write(`${JSON.stringify(result, null, 1)}\n`);
