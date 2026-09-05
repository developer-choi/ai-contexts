#!/usr/bin/env node
// 세션 로그(jsonl)를 평면 타임라인 md로 바꾼다.
//
// 이 파일이 존재하는 이유: jsonl을 직접 열어보지 않으면 모르는 함정들(메타 주입, tool_result만 든
// user 엔트리, 래퍼 태그째 들어오는 슬래시 명령, 입력창 재전송, 한 턴이 여러 엔트리로 쪼개짐,
// 백그라운드 알림의 두 가지 래핑)이 회차마다 같은 자리에서 재발했다. 매번 새로 짜면 매번 그중
// 몇 개를 빠뜨린다.
//
// 사용: node <이 파일> <session.jsonl> [--out <파일>] [--tz <IANA 타임존>]
//       node <이 파일> --list <cwd 경로> [--tz <IANA 타임존>]
//         → 그 프로젝트의 세션 후보를 시작·종료·소요·첫 발화와 함께 나열한다
// 표준출력으로 블록 통계를 찍는다 — 후처리 스크립트가 보존을 검증할 기준선이다.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const RESEND_WINDOW_MS = 5 * 60 * 1000;
const COMPACT_PREFIX = 'This session is being continued from a previous conversation';

function parseArgs(argv) {
  const args = { tz: 'Asia/Seoul' };
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out') args.out = argv[++i];
    else if (argv[i] === '--tz') args.tz = argv[++i];
    else if (argv[i] === '--list') args.list = argv[++i];
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

// 사용자가 친 것이 아닌데 `type=user`로 들어오고 `isMeta`도 안 붙는 것들. 런타임이 사용자 자리에
// 끼워 넣는 주입이라 「사용자」로 찍히면 타임라인 위에서 도는 판정이 전부 오염된다. 마커가
// **줄 첫머리**에 오는 것만 잡는다 — 본문 중간에 인용된 같은 글자에는 안 걸린다.
// 짝꿍인 pre-exit `session-state.mjs`의 `INJECTED`와 같은 목록을 본다. 한쪽에서 새 꼴을
// 발견하면 다른 쪽에도 넣는다 — 안 그러면 한쪽 산출물에만 주입이 발화로 샌다.
const INJECTED = [
  { re: /^Another Claude session sent a message/, label: '다른 세션이 보낸 메시지' },
  { re: /^<teammate-message\b/, label: '팀메이트 메시지' },
  { re: /^<agent-message\b/, label: '에이전트 메시지' },
  { re: /^<cross-session-message\b/, label: '다른 세션이 보낸 메시지' },
  { re: /^\[Request interrupted by user/, label: '사용자가 중단함' },
];

// 셸 출력은 화자가 없다 — 남길 것이 아니라 뺄 것이다.
const SHELL_OUTPUT = /^<bash-(stdout|stderr)>/;

function classifyInjection(text) {
  if (SHELL_OUTPUT.test(text)) return { drop: true };
  const hit = INJECTED.find((item) => item.re.test(text));
  return hit ? { label: `[${hit.label} — 본문 생략]` } : null;
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
    const injection = classifyInjection(raw);
    if (injection) {
      if (injection.drop) continue;
      blocks.push({ speaker: '시스템', at: entry.timestamp, text: injection.label });
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

// 로그 디렉토리 이름은 cwd의 경로 구분자를 `-`로 바꾼 것이다 (`C:\Users\…` → `C--Users-…`).
// 이 변환과 후보 훑기를 산문에 적어두면 매번 사람이 슬러그를 짓고 jsonl을 하나씩 열어
// 첫/끝 timestamp를 읽어 표를 만들게 된다 — 엉뚱한 세션을 골라도 타임라인을 다 뽑고 나서야 드러난다.
function listSessions(cwd, tz) {
  const slug = path.resolve(cwd).replace(/[:\\/]/g, '-');
  const dir = path.join(os.homedir(), '.claude', 'projects', slug);
  if (!fs.existsSync(dir)) {
    console.error(`로그 디렉토리 없음: ${dir}`);
    console.error(`(cwd "${cwd}" → 슬러그 "${slug}")`);
    process.exit(1);
  }

  const rows = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.jsonl'))
    .map((name) => {
      const blocks = mergeAssistantRuns(mergeResends(toBlocks(readEntries(path.join(dir, name)), tz)));
      if (!blocks.length) return { name, blocks: 0 };
      const first = blocks[0];
      const last = blocks[blocks.length - 1];
      const minutes = Math.round((new Date(last.at) - new Date(first.at)) / 60000);
      const opener = blocks.find((b) => b.speaker === '사용자') ?? first;
      return {
        name,
        blocks: blocks.length,
        from: stamp(first.at, tz),
        to: stamp(last.at, tz),
        minutes,
        opener: opener.text.replace(/\s+/g, ' ').slice(0, 60),
      };
    })
    .sort((a, b) => (a.from ?? '').localeCompare(b.from ?? ''));

  console.log(`${dir}\n`);
  for (const r of rows) {
    if (!r.blocks) {
      console.log(`${r.name}  (발화 0건)`);
      continue;
    }
    console.log(`${r.name}\n  ${r.from} ~ ${r.to} (${r.minutes}분) · ${r.blocks}블록\n  첫 발화: ${r.opener}`);
  }
}

const args = parseArgs(process.argv.slice(2));
if (args.list) {
  listSessions(args.list, args.tz);
  process.exit(0);
}
if (!args.input) {
  console.error('사용: node <이 파일> <session.jsonl> [--out <파일>] [--tz <IANA 타임존>]');
  console.error('      node <이 파일> --list <cwd 경로>');
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
