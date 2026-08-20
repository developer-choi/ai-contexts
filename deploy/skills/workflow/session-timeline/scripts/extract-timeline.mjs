#!/usr/bin/env node
// 세션 로그(jsonl)를 평면 타임라인 md로 바꾼다.
//
// 이 파일이 존재하는 이유: jsonl을 직접 열어보지 않으면 모르는 함정들(메타 주입, tool_result만 든
// user 엔트리, 래퍼 태그째 들어오는 슬래시 명령, 입력창 재전송, 한 턴이 여러 엔트리로 쪼개짐,
// 백그라운드 알림의 두 가지 래핑)이 회차마다 같은 자리에서 재발했다. 매번 새로 짜면 매번 그중
// 몇 개를 빠뜨린다.
//
// 사용: node <이 파일> <session.jsonl> [--out <파일>] [--tz <IANA 타임존>]
// 표준출력으로 블록 통계를 찍는다 — 후처리 스크립트가 보존을 검증할 기준선이다.

import fs from 'node:fs';

const RESEND_WINDOW_MS = 5 * 60 * 1000;
const COMPACT_PREFIX = 'This session is being continued from a previous conversation';

function parseArgs(argv) {
  const args = { tz: 'Asia/Seoul' };
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out') args.out = argv[++i];
    else if (argv[i] === '--tz') args.tz = argv[++i];
    else rest.push(argv[i]);
  }
  args.input = rest[0];
  return args;
}

function stamp(iso, tz) {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    month: 'numeric',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('month')}/${get('day')} ${get('hour')}:${get('minute')}`;
}

function textOf(message) {
  if (!message) return '';
  const content = typeof message === 'string' ? message : message.content;
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n\n');
}

// CLI가 그 자리에서 돌린 명령의 출력·주의문이 user 엔트리로 들어온다. 발화가 아니라 도구 반환이다.
const LOCAL_COMMAND_TAGS = /<local-command-(stdout|stderr|caveat)>[\s\S]*?<\/local-command-\1>/g;

function stripLocalCommandOutput(text) {
  return text.replace(LOCAL_COMMAND_TAGS, '').trim();
}

// 슬래시 명령은 래퍼 태그째 들어온다. 명령과 인자만 남긴다.
function unwrapCommand(text) {
  const name = text.match(/<command-name>([\s\S]*?)<\/command-name>/);
  if (!name) return null;
  const argsMatch = text.match(/<command-args>([\s\S]*?)<\/command-args>/);
  const args = argsMatch ? argsMatch[1].trim() : '';
  return `\`${name[1].trim()}${args ? ` ${args}` : ''}\``;
}

// 백그라운드 task 완료 알림은 래핑이 두 가지다 —
// (a) `[SYSTEM NOTIFICATION - NOT USER INPUT]`로 감싸 오는 형태,
// (b) 큐로 들어와 래핑 없이 곧장 `<task-notification>`으로 시작하는 형태.
// (a)만 잡으면 (b)의 XML이 "사용자" 발화로 통째 새어나간다.
function unwrapTaskNotification(text) {
  if (!text.includes('<task-notification>')) return null;
  const summary = text.match(/<summary>([\s\S]*?)<\/summary>/);
  const label = summary ? summary[1].trim().replace(/\s+/g, ' ') : '요약 없음';
  return `[백그라운드 task 완료 알림 — ${label}. 결과 본문 생략]`;
}

function readEntries(file) {
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}

function toBlocks(entries, tz) {
  const blocks = [];
  for (const entry of entries) {
    if (entry.type !== 'user' && entry.type !== 'assistant') continue;
    if (entry.isMeta) continue; // 대화가 아니라 시스템 주입이다
    if (entry.isSidechain) continue; // 서브에이전트 내부 턴이라 이 세션의 발화가 아니다
    if (!entry.timestamp) continue;

    const text = textOf(entry.message).trim();
    if (!text) continue; // tool_result·tool_use만 든 엔트리 — 도구 반환이 발화로 잡힌다

    if (entry.type === 'assistant') {
      blocks.push({ speaker: 'AI', at: entry.timestamp, text });
      continue;
    }

    const raw = stripLocalCommandOutput(text);
    if (!raw) continue; // 명령 출력만 들어 있던 엔트리

    const notification = unwrapTaskNotification(raw);
    if (notification) {
      blocks.push({ speaker: '시스템', at: entry.timestamp, text: notification });
      continue;
    }
    if (raw.startsWith(COMPACT_PREFIX)) {
      blocks.push({ speaker: '시스템', at: entry.timestamp, text: '[이전 대화 압축 요약]' });
      continue;
    }
    blocks.push({ speaker: '사용자', at: entry.timestamp, text: unwrapCommand(raw) ?? raw });
  }
  return blocks;
}

// 입력창 재전송은 별개 발화로 쌓인다. 5분 안에 앞것이 뒷것의 앞부분이면 최종본만 남긴다.
function mergeResends(blocks) {
  const merged = [];
  for (const block of blocks) {
    const prev = merged.at(-1);
    const isResend =
      prev &&
      prev.speaker === '사용자' &&
      block.speaker === '사용자' &&
      new Date(block.at) - new Date(prev.at) <= RESEND_WINDOW_MS &&
      (block.text.startsWith(prev.text) || prev.text.startsWith(block.text));
    if (!isResend) {
      merged.push({ ...block });
      continue;
    }
    // 늘려서 다시 보낸 경우든 지워서 줄인 경우든 나중에 보낸 쪽이 최종본이다.
    // 긴 쪽을 고르면 사용자가 지운 문장이 되살아나 원문이 아닌 것이 증거로 남는다.
    prev.edits = (prev.edits ?? 0) + 1;
    prev.text = block.text;
    prev.at = block.at;
  }
  return merged;
}

// 한 턴이 툴 호출 사이로 여러 엔트리에 쪼개진다. 시각은 첫 발화 기준으로 합친다.
function mergeAssistantRuns(blocks) {
  const merged = [];
  for (const block of blocks) {
    const prev = merged.at(-1);
    if (prev && prev.speaker === 'AI' && block.speaker === 'AI') {
      prev.text = `${prev.text}\n\n${block.text}`;
      continue;
    }
    merged.push({ ...block });
  }
  return merged;
}

function render(blocks, tz) {
  return blocks
    .map((block) => {
      const edits = block.edits ? ` (입력 수정 ×${block.edits})` : '';
      return `**${stamp(block.at, tz)} · ${block.speaker}**${edits}\n\n${block.text}\n\n---\n`;
    })
    .join('\n');
}

const args = parseArgs(process.argv.slice(2));
if (!args.input) {
  console.error('사용: node <이 파일> <session.jsonl> [--out <파일>] [--tz <IANA 타임존>]');
  process.exit(1);
}

const blocks = mergeAssistantRuns(mergeResends(toBlocks(readEntries(args.input), args.tz)));
const output = render(blocks, args.tz);

if (args.out) fs.writeFileSync(args.out, output, 'utf8');
else process.stdout.write(output);

const counted = (speaker) => blocks.filter((b) => b.speaker === speaker).length;
console.error(
  `blocks=${blocks.length} 사용자=${counted('사용자')} AI=${counted('AI')} 시스템=${counted('시스템')}`,
);
