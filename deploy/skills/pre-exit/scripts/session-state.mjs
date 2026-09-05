#!/usr/bin/env node
// 세션 마감 전에 훑어야 할 상태 넷 — 사용자 발화 전수, 압축 스냅샷, 보강 매칭 근거, squash 전후 동일성.
//
// 넷 다 산문이 "확인한다"까지만 적고 확인 수단은 세션마다 즉흥으로 정해지던 자리다.
//
//   user-turns — 「사용자 지적을 빠짐없이 회수한다」. 세는 일을 산문이 부탁하면 세는 척해도 아무도 못
//     막는다. 실측(2026-09-03 이에이트 세션): 첫 회고 목록 7건, 실제 13건. 압축 스냅샷과 달리
//     라이브 transcript는 압축 여부와 무관하게 항상 있으므로 발화 전수는 언제나 뽑힌다.
//   snapshots — 스냅샷을 *쓰는* 쪽은 코드인데(hooks/snapshot-precompact-transcript.mjs) 읽는
//     진입점이 없어, 폴더 경로와 파일명 규약을 산문에서 읽어 손으로 글롭했다. 빗나가면
//     "이 세션은 압축이 없었다"로 결론내고 넘어가 압축 구간의 사용자 교정이 통째로 유실된다.
//   changed — 보강 매칭 조건의 파일 쪽 절반(plan/pr{N}/**·knowledge/**·refresh-prompts/state.json)을
//     세션 변경 목록과 눈으로 대조했다. 놓치면 보강이 통째로 안 돌고, 안 돈 사실은 아무 데도 안 남는다.
//   squash-check — 「합친 뒤 정리 전과 파일 내용이 같은지 확인한다」. Step 3은 사용자 지시를
//     기다리지 않으므로 사람 눈이 안 거친다. rebase 중 hunk가 빠져도 로그는 깔끔해 보이고,
//     잃은 변경은 다음 세션에 "왜 이게 없지"로 나타난다. 트리 해시 둘을 맞대면 끝날 일이다.
//   read-files — 「읽었는데 안 쓴 문서」. 문서가 잘못 놓였다는 것은 그 문서를 연 세션만 알고,
//     나중에 파일을 뜯어봐도 "그날 이게 쓰였나"는 안 나온다. 회고가 기억으로 목록을 만들면
//     인상에 남은 두어 개만 올라온다 — 한 세션이 몇 개를 여는지의 실측은 read-usage.md에 있다.
//
// 판단은 안 한다 — 어느 보강을 돌릴지(대화 쪽 조건은 세션만 안다), 어느 커밋이 한 작업인지,
// 스냅샷에서 무엇을 회수할지는 부르는 쪽이 정한다.
//
// 사용:
//   node <이 파일> user-turns --session <session_id>
//   node <이 파일> snapshots --session <session_id>
//   node <이 파일> changed --repo <레포> [--base <ref>]
//   node <이 파일> squash-check --repo <레포> --before <정리 전 ref>
//   node <이 파일> read-files --session <session_id>
//   node <이 파일> read-usage --from <판정 json>

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// 스냅샷 위치·파일명 규약의 정본은 쓰는 쪽(deploy/hooks/snapshot-precompact-transcript.mjs)이다.
// 여기 사본을 두는 이유는 훅이 배포돼 나가는 파일이라 import가 안 되기 때문이고, 그래서
// meta/coupling.json에 짝꿍으로 올려 뒀다.
const SNAPSHOT_DIR = path.join(os.homedir(), '.claude', 'precompact-snapshots');

// 라이브 transcript. 폴더명은 cwd를 인코딩한 것이지만 세션이 옮겨 다니면 어긋나므로, 인코딩을
// 흉내내지 않고 세션 id로 된 파일을 찾는다(실측 8000여 폴더에서 0.2초 미만).
const TRANSCRIPT_ROOT = path.join(os.homedir(), '.claude', 'projects');

// 읽고 안 쓴 문서의 누계. 기기를 넘어 쌓여야 신호가 차므로 백로그 레포에 둔다(같은 이유로
// refresh-prompts·refresh-projects 상태가 그 옆에 있다). 레포가 없는 기기에서는 no-op 한다.
const USAGE_FILE = path.join(os.homedir(), 'WebstormProjects', 'main', 'backlog', 'pre-exit', 'read-usage.json');

// CLI가 그 자리에서 돌린 명령의 출력·주의문이 user 엔트리에 섞여 들어온다. 발화 뒤에 붙는 일도
// 있어 첫머리 검사로는 못 걷는다.
const LOCAL_COMMAND_TAGS = /<local-command-(stdout|stderr|caveat)>[\s\S]*?<\/local-command-\1>/g;

// 사용자가 친 것이 아닌데 `type=user`로 들어오는 것들. 런타임이 사용자 자리에 끼워 넣는 주입이라
// 회고가 세면 안 되는 쪽이다. 마커가 **줄 첫머리**에 오는 것만 잡는다 — 본문 중간에 인용된
// 같은 글자에는 안 걸린다.
const INJECTED = [
  /^Another Claude session sent a message/,
  /^<teammate-message\b/,
  /^<bash-stdout>/,
  /^<bash-stderr>/,
  /^\[Request interrupted by user/,
  /^Caveat: The messages below were generated/,
  /^This session is being continued from a previous conversation/,
];

// 긴 붙여넣기는 통째로 실으면 회고 입력을 덮는다. 다만 지시는 붙여넣은 자료 **뒤에** 붙는 일이
// 잦아서, 앞만 자르면 정작 지적이 잘린다. 그래서 앞뒤를 함께 남긴다.
const HEAD = 1200;
const TAIL = 300;

function findTranscript(session) {
  if (!fs.existsSync(TRANSCRIPT_ROOT)) return null;
  for (const dir of fs.readdirSync(TRANSCRIPT_ROOT)) {
    const p = path.join(TRANSCRIPT_ROOT, dir, `${session}.jsonl`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// 사용자 자리에 실린 텍스트. 도구 결과·서브에이전트 줄은 여기서 걸러진다. 주입인지 아닌지는
// 아직 안 가른다 — 중단 횟수처럼 주입 쪽에서만 세는 것이 있다.
function rawUserText(entry) {
  if (entry.type !== 'user' || entry.isSidechain || entry.isMeta) return null;
  const content = entry.message?.content;
  const text =
    typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content.filter((b) => b.type === 'text').map((b) => b.text).join('\n')
        : '';
  return text.trim() ? text : null;
}

// 사용자가 실제로 친 것만 남긴다. 남길 게 없으면 null.
function typedText(raw) {
  const stripped = raw.replace(LOCAL_COMMAND_TAGS, '').trim();
  if (!stripped) return null;
  // 백그라운드 task 알림은 래핑이 두 가지라(감싸 오는 형태·곧장 태그로 시작하는 형태) 첫머리로 안 갈린다.
  if (stripped.includes('<task-notification>')) return null;
  if (INJECTED.some((re) => re.test(stripped))) return null;

  // 슬래시 커맨드는 호출 자체가 발화다(그게 지적인지는 회고가 판정한다). 나머지 래퍼는 벗긴다.
  const name = stripped.match(/<command-name>([^<]*)<\/command-name>/)?.[1]?.trim();
  if (name) {
    const args = stripped.match(/<command-args>([\s\S]*?)<\/command-args>/)?.[1]?.trim();
    return `${name}${args ? ` ${args}` : ''}`;
  }
  const bash = stripped.match(/<bash-input>([\s\S]*?)<\/bash-input>/)?.[1]?.trim();
  if (bash) return `! ${bash}`;

  const text = stripped.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim();
  return text || null;
}

// 한 발화가 엔트리 둘로 쌓이는 자리가 둘 있다 — 사용자가 입력창에서 고쳐 다시 보낸 것, 그리고
// CLI가 한 입력을 두 번 기록한 것(`/compact`은 맨 텍스트와 래핑된 형태로 2ms 간격에 두 번 남는다).
// 어느 쪽이든 「같은 지적이 두 번 왔는가」에 오탐으로 걸리므로 합친다. 둘을 갈라 라벨에 적지는
// 않는다 — 텍스트만으로는 어느 쪽인지 안 갈리고, 확인 안 된 원인을 매번 단정해 찍게 된다.
//
// 다만 CLI가 `promptSource: queued`로 표시한 것은 AI가 답하기 전에 사용자가 따로 밀어 넣은 별개
// 메시지라 합치면 안 된다. 이 표시는 옛 기록에 없으므로(실측 1161개 세션 중 708건이 무표기)
// 앞부분 일치 판정을 없애지 않고 그 위에 얹는다.
//
// 가르는 것은 시간이 아니라 **그 사이에 AI가 답했는가**다. 답이 끼어 있으면 뒤엣것은 그 답을
// 보고 한 새 발화이지 재전송이 아니다. 시간으로 자르면 양쪽으로 틀린다 — 실측에서 글자가 똑같은
// 재전송이 10.9초 뒤에 온 사례가 있고(창을 좁히면 한 발화가 둘로 쪼개진다), 같은 「ㅇㅋ」가 4분
// 35초 간격의 서로 다른 대답이었던 사례도 있다(창을 넓히면 번호가 조용히 빠진다).
//
// 합칠 때는 나중에 보낸 쪽이 최종본이다 — 긴 쪽을 고르면 사용자가 지운 문장이 되살아나 원문
// 아닌 것이 회고의 증거로 남는다.
function mergeResends(turns) {
  const merged = [];
  for (const turn of turns) {
    const prev = merged.at(-1);
    const isResend =
      prev &&
      turn.source !== 'queued' &&
      turn.replies === prev.replies &&
      (turn.text.startsWith(prev.text) || prev.text.startsWith(turn.text));
    if (!isResend) {
      merged.push({ ...turn });
      continue;
    }
    prev.edits = (prev.edits ?? 0) + 1;
    prev.text = turn.text;
    prev.at = turn.at;
  }
  return merged;
}

function clip(text) {
  if (text.length <= HEAD + TAIL) return text;
  return `${text.slice(0, HEAD)}\n… (총 ${text.length}자 중 가운데 생략) …\n${text.slice(-TAIL)}`;
}

// 「잘못 놓였다」가 말이 되는 문서만 센다 — 스킬·컨텍스트·규칙과 레포 규칙 파일. 코드나 백로그
// 항목을 읽은 것은 그 회차가 그걸 다뤘다는 뜻이지 배치가 틀렸다는 신호가 아니다.
const PROMPT_DOC = /(\/(skills|contexts|rules)\/.*\.md$)|(\/(CLAUDE|AGENTS|GEMINI)\.md$)/;

// 문서를 여는 길은 `Read` 만이 아니다. 셸로 통째로 찍으면 같은 분량이 컨텍스트에 들어오는데
// 도구 이름이 달라 안 세어졌다 — 2026-09-05 벤치에서 한 팔이 네 문서를 `cat` 한 번으로 열었고
// 눈금에는 0건이 남았다. 오차가 한 방향(과소)이라 「안 차는 눈금」으로만 드러나서, 장치가
// 고장난 것인지 정말 후보가 없는 것인지 안 갈린다.
//
// 읽는 명령만 센다. 명령줄에 `.md` 가 보이면 다 세는 쪽은 `ls *.md`·`git commit x.md`·`> x.md`
// 까지 읽은 것으로 쳐서, 세션이 열지도 않은 문서에 「안 썼다」가 찍힌다. 그건 없는 신호를
// 만들어내는 것이라 못 센 것보다 나쁘다 — 그 신호를 받은 회차가 멀쩡한 문서를 옮긴다.
const BASH_READER = new Set(['cat', 'head', 'tail', 'less', 'more', 'bat', 'type']);

function bashReads(command, cwd) {
  if (!command) return [];
  const out = [];
  // `a && cat x`·`a; cat x`·`a | cat` 처럼 이어 붙은 것은 토막마다 앞머리를 본다.
  for (const segment of String(command).split(/&&|\|\||;|\|/)) {
    const words = segment.trim().split(/\s+/);
    let i = 0;
    while (i < words.length && /^[A-Za-z_]\w*=/.test(words[i])) i += 1; // `FOO=1 cat x`
    if (!BASH_READER.has(path.basename(words[i] ?? '').replace(/\.exe$/, ''))) continue;
    for (const word of words.slice(i + 1)) {
      if (word.startsWith('-')) continue;
      const arg = word.replace(/^["']|["']$/g, '').replaceAll('\\', '/');
      if (!PROMPT_DOC.test(arg)) continue;
      // 상대 경로는 그 회차가 서 있던 자리에서 푼다. 이 스크립트가 도는 자리에서 풀면
      // sourcePath 의 git 질의가 엉뚱한 레포를 답해 키가 조용히 다른 파일로 붙는다.
      const abs = /^(\/|[A-Za-z]:)/.test(arg) ? arg : path.resolve(cwd ?? '.', arg);
      out.push(String(abs).replaceAll('\\', '/'));
    }
  }
  return out;
}

// 같은 문서가 여러 경로로 열린다 — 워크트리는 레포마다 다른 폴더이고, 글로벌 자산은 CLI마다
// 홈 아래에 사본이 깔린다. 경로 그대로 키를 잡으면 한 파일의 눈금이 서넛으로 갈려 「열 번 중
// 여덟 번」이 영영 안 찬다. 그래서 고칠 자리, 곧 **원본의 레포 상대 경로**로 되돌린다.
const DEPLOYED_ASSET = /\/\.(?:claude|codex|gemini)\/((?:skills|contexts|rules)\/.*)$/;
const repoRootCache = new Map();

function sourcePath(file) {
  // 배포 위치의 정본은 AC다(글로벌 규칙 「AI 설정을 고칠 위치」). 고칠 곳을 적어야 회차가 손댄다.
  const deployed = file.match(DEPLOYED_ASSET);
  if (deployed) return `ai-contexts/deploy/${deployed[1]}`;
  // 그 회차가 파일을 옮기거나 지웠으면 폴더째 없어져 git 질의가 실패한다 — 남아 있는 가장 가까운
  // 조상에게 묻는다. 레포 소속은 조상이 정하므로 답은 같다.
  let dir = path.dirname(file);
  while (!fs.existsSync(dir) && path.dirname(dir) !== dir) dir = path.dirname(dir);
  if (!repoRootCache.has(dir)) {
    const top = git(dir, ['rev-parse', '--show-toplevel']);
    const common = git(dir, ['rev-parse', '--path-format=absolute', '--git-common-dir']);
    repoRootCache.set(
      dir,
      top.error || common.error
        ? null
        : {
            top: top.replaceAll('\\', '/'),
            // 워크트리의 common-dir은 원본 레포의 .git이라, 이름이 원본으로 수렴한다.
            name: common.replaceAll('\\', '/').replace(/\/\.git\/?$/, '').split('/').pop(),
          },
    );
  }
  const repo = repoRootCache.get(dir);
  if (!repo || !file.startsWith(`${repo.top}/`)) return file;
  // 워크트리 폴더가 아직 살아 있으면 toplevel이 그쪽을 가리켜 접두사가 안 남지만, 이미 지워졌으면
  // 조상까지 올라오느라 `.claude/worktrees/<브랜치>/`가 상대경로에 남는다. 두 경우를 같게 만든다.
  const rel = file.slice(repo.top.length + 1).replace(/^\.?(claude\/)?worktrees\/[^/]+\//, '');
  return `${repo.name}/${rel}`;
}

// 세션이 끝나기 전에 워크트리를 지우면(면제 레포에서는 AI가 그 자리에서 지운다) 위 git 질의가
// 통째로 실패해 원경로가 그대로 키가 된다. 그때는 이번에 이미 풀린 키들과 꼬리를 맞대 되돌린다 —
// 맞는 키가 **하나일 때만** 합친다. 둘 이상이면 어느 레포인지 못 가리므로 원경로로 둔다.
function collapseUnresolved(keys) {
  const isAbsolute = (k) => k.startsWith('/') || /^[A-Za-z]:/.test(k);
  const resolved = keys.filter((k) => !isAbsolute(k));
  const map = new Map();
  for (const key of keys) {
    if (!isAbsolute(key)) continue;
    const hits = resolved.filter((r) => key.endsWith(`/${r.slice(r.indexOf('/') + 1)}`));
    if (hits.length === 1) map.set(key, hits[0]);
  }
  return map;
}

// 보강 매칭 조건 중 **파일로 판정되는 것만**. 대화 쪽 조건(그 스킬을 불렀는가)은 세션만 안다.
const AUGMENTATION_PATHS = [
  { key: 'workflow', re: /(^|\/)plan\/pr\d+\// },
  { key: 'digest', re: /(^|\/)knowledge\// },
  { key: 'refresh-prompts', re: /refresh-prompts\/state\.json$/ },
];

const [command, ...rest] = process.argv.slice(2);
const optOf = (name) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : undefined;
};

function git(cwd, args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    return { error: `${e.stderr || e.message}`.trim().split('\n').pop() };
  }
}

if (command === 'user-turns') {
  const session = optOf('session');
  if (!session) {
    console.error('user-turns 에는 --session <session_id> 가 필요합니다.');
    process.exit(1);
  }
  const file = findTranscript(session);
  if (!file) {
    // 이 폴더는 Claude Code만 쓴다. 같은 스킬이 다른 CLI로도 배포되므로 여기서 죽는 것이
    // 정상 경로일 수 있다 — 그때 회고가 "세어봤다"로 되돌아가면 이 서브커맨드를 만든 이유가
    // 사라지므로, 대신 무엇을 해야 하는지까지 적어 보낸다.
    console.error(`transcript를 못 찾았다 (${TRANSCRIPT_ROOT} 아래에 ${session}.jsonl 없음).`);
    console.error('세션 id가 틀렸거나, 이 CLI가 Claude Code 형식 기록을 안 남기는 것이다.');
    console.error('발화 전수를 못 뽑았으면 세어보는 것으로 대신하지 말고, 못 뽑았다는 사실과 사유를 회고 첫머리에 적는다.');
    process.exit(1);
  }
  const raw_turns = [];
  let interrupts = 0;
  let replies = 0; // 지금까지 AI가 답한 횟수. 재전송과 새 발화를 가르는 기준이다.
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue; // 쓰는 중이라 끊긴 마지막 줄
    }
    if (entry.type === 'assistant' && !entry.isSidechain) {
      replies += 1;
      continue;
    }
    const raw = rawUserText(entry);
    if (!raw) continue;
    if (/^\[Request interrupted by user/.test(raw.trimStart())) interrupts += 1;
    const text = typedText(raw);
    if (text) raw_turns.push({ at: entry.timestamp, text, replies, source: entry.promptSource });
  }
  const turns = mergeResends(raw_turns);

  console.log(`[사용자 발화 전수] ${turns.length}건 — ${file}`);
  console.log('회고는 이 번호를 하나도 빼지 않고 표에 옮긴다. 「지적 없음」인 번호도 행으로 남긴다.\n');
  turns.forEach(({ at, text, edits }, i) => {
    console.log(`### ${i + 1}. ${at ?? ''}${edits ? ` (같은 발화 ×${edits} 합침 — 반복 지적이 아니다)` : ''}`);
    console.log(clip(text));
    console.log('');
  });
  if (interrupts) {
    console.log(`[중단] 사용자가 응답을 끊은 횟수 ${interrupts}회 — 내용이 없어 번호를 안 붙였다. 끊긴 자리에서 무엇을 하다 끊겼는지는 회고가 본다.`);
  }
  process.exit(0);
}

if (command === 'snapshots') {
  const session = optOf('session');
  if (!session) {
    console.error('snapshots 에는 --session <session_id> 가 필요합니다.');
    process.exit(1);
  }
  if (!fs.existsSync(SNAPSHOT_DIR)) {
    console.log(`스냅샷 폴더가 없다 (${SNAPSHOT_DIR}) — 이 기기에서 압축이 일어난 적이 없다.`);
    process.exit(0);
  }
  const hits = fs
    .readdirSync(SNAPSHOT_DIR)
    .filter((f) => f.startsWith(session) && f.endsWith('.jsonl'))
    .map((f) => ({ f, at: fs.statSync(path.join(SNAPSHOT_DIR, f)).mtimeMs }))
    .sort((a, b) => b.at - a.at);

  if (!hits.length) {
    console.log('이 세션의 스냅샷 없음 — 압축이 없었던 세션이다. 회수 단계를 건너뛴다.');
    process.exit(0);
  }
  console.log(`[압축 스냅샷] ${hits.length}건 (최신순). 가장 위를 Read해 압축 이전 구간의 교정을 회수한다:`);
  hits.forEach(({ f }, i) => console.log(`  ${i === 0 ? '→' : ' '} ${path.join(SNAPSHOT_DIR, f)}`));
  process.exit(0);
}

if (command === 'changed') {
  const repo = optOf('repo') ?? process.cwd();
  const base = optOf('base');
  const args = base ? ['diff', '--name-only', `${base}...HEAD`] : ['status', '--porcelain=v1', '--untracked-files=all'];
  const out = git(repo, args);
  if (out.error) {
    console.error(`git 실행 실패: ${out.error}`);
    process.exit(1);
  }
  const files = out
    .split('\n')
    .filter(Boolean)
    .map((l) => (base ? l : l.slice(3)))
    .map((f) => f.replaceAll('\\', '/'));

  console.log(`[변경 파일] ${files.length}건 (${base ? `${base}...HEAD` : '작업 트리'})`);
  const matched = AUGMENTATION_PATHS.filter(({ re }) => files.some((f) => re.test(f)));
  console.log(`\n[파일로 걸리는 보강] ${matched.length}건`);
  for (const { key, re } of matched) {
    console.log(`  ${key} — ${files.filter((f) => re.test(f)).slice(0, 4).join(', ')}`);
  }
  console.log('\n  대화 쪽 조건(그 스킬을 이 세션에서 불렀는가)은 세션만 아는 사실이라 여기서 안 본다.');
  process.exit(0);
}

if (command === 'squash-check') {
  const repo = optOf('repo') ?? process.cwd();
  const before = optOf('before');
  if (!before) {
    console.error('squash-check 에는 --before <정리 전 ref> 가 필요합니다. 정리를 시작하기 전에 그 SHA를 잡아둔다.');
    process.exit(1);
  }
  // 커밋 로그가 아니라 **트리**를 맞댄다. 합치는 일은 히스토리를 바꾸는 것이고, 바뀌면 안 되는
  // 것은 최종 파일 내용이다.
  const diff = git(repo, ['diff', '--stat', before, 'HEAD']);
  if (diff.error) {
    console.error(`git diff 실패: ${diff.error}`);
    process.exit(1);
  }
  const commits = git(repo, ['rev-list', '--count', `${before}..HEAD`]);
  console.log(`[squash 전후 대조] ${before.slice(0, 8)} → HEAD (그 사이 커밋 ${commits}개)`);
  if (!diff) {
    console.log('  파일 내용 차이 없음 — 합치기가 내용을 안 건드렸다.');
    process.exit(0);
  }
  console.log('  ✗ 파일 내용이 달라졌다. 합치다 hunk가 빠졌을 수 있다:');
  console.log(diff.split('\n').map((l) => `    ${l}`).join('\n'));
  process.exit(1);
}

if (command === 'read-files') {
  const session = optOf('session');
  if (!session) {
    console.error('read-files 에는 --session <session_id> 가 필요합니다.');
    process.exit(1);
  }
  const file = findTranscript(session);
  if (!file) {
    console.error(`transcript를 못 찾았다 (${TRANSCRIPT_ROOT} 아래에 ${session}.jsonl 없음).`);
    console.error('기억으로 목록을 만들지 않는다 — 못 뽑았다는 사실을 회고에 적고 이번 회차는 기록을 건너뛴다.');
    process.exit(1);
  }
  const reads = new Map();
  const touched = new Set();
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    const content = entry.message?.content;
    if (!Array.isArray(content)) continue;
    const note = (norm) => {
      const key = sourcePath(norm);
      const seen = reads.get(key) ?? { count: 0, sub: false };
      seen.count += 1;
      seen.sub ||= Boolean(entry.isSidechain);
      reads.set(key, seen);
    };
    for (const block of content) {
      if (block.type !== 'tool_use') continue;
      if (block.name === 'Bash') {
        for (const norm of bashReads(block.input?.command, entry.cwd)) note(norm);
        continue;
      }
      const target = block.input?.file_path;
      if (!target) continue;
      const norm = String(target).replaceAll('\\', '/');
      if (block.name === 'Read') {
        if (PROMPT_DOC.test(norm)) note(norm);
      } else if (block.name === 'Edit' || block.name === 'Write' || block.name === 'NotebookEdit') {
        touched.add(sourcePath(norm));
      }
    }
  }

  for (const [from, to] of collapseUnresolved([...new Set([...reads.keys(), ...touched])])) {
    if (reads.has(from)) {
      const seen = reads.get(to) ?? { count: 0, sub: false };
      seen.count += reads.get(from).count;
      seen.sub ||= reads.get(from).sub;
      reads.set(to, seen);
      reads.delete(from);
    }
    if (touched.delete(from)) touched.add(to);
  }

  const rows = [...reads.entries()].sort((a, b) => b[1].count - a[1].count);
  console.log(`[읽은 프롬프트 문서] ${rows.length}건 — ${file}`);
  if (!rows.length) {
    console.log('이 세션은 프롬프트 문서를 안 열었다. 올릴 기록이 없다.');
    process.exit(0);
  }
  console.log('여기에 세션이 두 칸을 채운다 — **어느 진입점(스킬·역할)이 이 문서를 물었는가**와 **썼는가**.');
  console.log('둘 다 기계가 못 낸다. 진입점은 스킬이 자동으로 붙으면 기록에 안 남고(실측 20세션 중 6건만 남았다),');
  console.log('사용 여부는 애초에 파일에 안 적힌다.');
  console.log('판정 문장은 「참고했나」가 아니라 **「이 문서가 없었으면 결과가 달라졌나」**다 — 앞의 문장으로 물으면');
  console.log('열어본 것이 전부 "썼다"로 답해진다.\n');
  for (const [p, { count, sub }] of rows) {
    const marks = [count > 1 ? `×${count}` : null, sub ? '서브에이전트' : null, touched.has(p) ? '이번에 고침' : null]
      .filter(Boolean)
      .join(', ');
    console.log(`  ${p}${marks ? `  (${marks})` : ''}`);
  }
  console.log('\n한 세션의 「안 씀」은 신호가 아니라 눈금 하나다 — 그 자리에서 "쪼개라"고 결론내지 않는다.');
  process.exit(0);
}

if (command === 'read-usage') {
  const from = optOf('from');
  if (!from) {
    console.error('read-usage 에는 --from <판정 json> 이 필요합니다.');
    console.error('형식: { "<진입점>\\t<read-files가 낸 경로>": "used" | "unused" | "excluded" }');
    process.exit(1);
  }
  if (!fs.existsSync(USAGE_FILE)) {
    // 백로그 레포가 없는 기기에서는 조용히 넘어간다 — 이 기록은 기기 간 공유가 목적이라
    // 레포 없이 만들면 다음 세션이 못 읽는다.
    console.log(`${USAGE_FILE} 이 없다 — 이 기기에는 기록을 둘 자리가 없으므로 건너뛴다.`);
    process.exit(0);
  }
  let verdicts;
  try {
    verdicts = JSON.parse(fs.readFileSync(from, 'utf8'));
  } catch (error) {
    console.error(`판정 파일을 못 읽었다: ${error.message}`);
    process.exit(1);
  }
  const state = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
  state.docs ??= {};
  state.excluded ??= [];
  const today = new Date().toISOString().slice(0, 10);
  let added = 0;
  let skipped = 0;
  for (const [key, verdict] of Object.entries(verdicts)) {
    if (!key.includes('\t')) {
      console.error(`진입점이 없다: ${JSON.stringify(key)} — "<진입점>\\t<경로>" 형식이어야 한다.`);
      process.exit(1);
    }
    if (verdict === 'excluded') {
      if (!state.excluded.includes(key)) state.excluded.push(key);
      delete state.docs[key];
      continue;
    }
    if (verdict !== 'used' && verdict !== 'unused') {
      console.error(`모르는 판정 ${JSON.stringify(verdict)} (${key}) — used·unused·excluded 중 하나여야 한다.`);
      process.exit(1);
    }
    // 사용자가 「안 고친다」고 판정한 것은 다시 안 뜬다. 안 그러면 두 번째 회차부터 같은
    // 목록을 다시 보게 되고, 그게 이런 장치가 무뎌지는 가장 흔한 경로다.
    if (state.excluded.includes(key)) {
      skipped += 1;
      continue;
    }
    const row = (state.docs[key] ??= { read: 0, unused: 0, last: today });
    row.read += 1;
    if (verdict === 'unused') row.unused += 1;
    row.last = today;
    added += 1;
  }
  fs.writeFileSync(USAGE_FILE, `${JSON.stringify(state, null, 2)}\n`);
  console.log(`[읽고 안 쓴 문서 누계] ${added}건 반영${skipped ? `, 제외 목록에 있어 건너뜀 ${skipped}건` : ''} — ${USAGE_FILE}`);

  // 몇 번 중 몇 번이면 후보인가는 아직 안 정해졌다 — 표본이 사고 사례 하나뿐이라, 첫 회수
  // 회차가 분포를 보고 사용자와 함께 정한다. 그때 그 값을 state.threshold 에 적으면 아래가
  // 목록을 좁힌다. 안 적혀 있으면 좁히지 않고 상위 몇 줄만 보여준다.
  const rows = Object.entries(state.docs).sort((a, b) => b[1].unused - a[1].unused);
  const t = state.threshold;
  const ripe = t ? rows.filter(([, v]) => v.read >= t.read && v.unused / v.read >= t.unusedRatio) : rows.slice(0, 10);
  if (ripe.length) {
    console.log(t ? `\n선(${t.read}회 이상, 안 쓴 비율 ${t.unusedRatio} 이상)을 넘은 것:` : '\n안 쓴 횟수 상위 (선은 아직 안 정해졌다 — 분포를 보는 용도다):');
    for (const [key, v] of ripe) console.log(`  ${v.unused}/${v.read}  ${key.replace('\t', ' → ')}`);
    console.log('\n여기서 결론내지 않는다 — 배치를 고칠지는 refresh-prompts 회차가 사용자와 함께 정한다.');
  }

  // 선이 아직 안 정해진 동안에도 착수 조건에 닿았는지는 여기서 판정한다. 숫자를 가진 쪽이
  // 판정까지 해야 한다 — 「10회면 연다」를 백로그 본문에만 두면 그 본문을 여는 세션이 있어야
  // 알게 되고, 그 세션이 없어서 눈금이 차도 아무 일이 안 일어난다. 위 목록은 도달 여부와
  // 무관하게 같은 모양으로 찍혀서 눈으로는 안 갈린다.
  // 10인 근거는 read-usage.md 「열 번 중 여덟 번이 되어야 신호다」 — 분모가 열은 돼야 한다.
  const READY_AT = 10;
  const reached = rows.filter(([, v]) => v.read >= READY_AT);
  if (!t && reached.length) {
    console.log(`\n[착수 조건 도달] ${reached.length}건이 ${READY_AT}회 이상 열렸다 — 선을 정할 때다.`);
    console.log('  backlog projects/ai-contexts/active/scw/읽었는데-안-쓴-파일-누적.md');
    console.log('이 사실을 회고 보고에 넣는다. 사용자가 묻기를 기다리지 않는다.');
  }
  process.exit(0);
}

console.error(`모르는 명령: ${command ?? '(없음)'}`);
process.exit(1);
