#!/usr/bin/env node
// 세션 마감 전에 훑어야 할 상태들 — 사용자 발화 전수, 압축 스냅샷, 보강 매칭 근거,
// squash 전후 동일성, 회고 표의 빈칸, 읽고 안 쓴 문서, 시간과 지시 순서.
//
// 전부 산문이 "확인한다"까지만 적고 확인 수단은 세션마다 즉흥으로 정해지던 자리다.
//
//   user-turns — 「사용자 지적을 빠짐없이 회수한다」. 세는 일을 산문이 부탁하면 세는 척해도 아무도 못
//     막는다. 실측(2026-09-03 이에이트 세션): 첫 회고 목록 7건, 실제 13건. 압축 스냅샷과 달리
//     라이브 transcript는 압축 여부와 무관하게 항상 있으므로 발화 전수는 언제나 뽑힌다.
//   snapshots — 스냅샷을 *쓰는* 쪽은 코드인데(hooks/snapshot-precompact-transcript.mjs) 읽는
//     진입점이 없어, 폴더 경로와 파일명 규약을 산문에서 읽어 손으로 글롭했다. 빗나가면
//     "이 세션은 압축이 없었다"로 결론내고 넘어가 압축 구간의 사용자 교정이 통째로 유실된다.
//   tasks — 세션 도중 "이건 회고 때 보자"로 적어둔 task. 적을 때는 회고에서 볼 생각이었는데 회고는
//     대화 끝에서 돌아 그 대목이 요약에 접혀 있고, 그러면 사용자가 매번 말로 다시 꺼내야 한다.
//     description까지 봐야 재료가 나오므로 한 번에 덤프한다 — 목록만 받으면 항목 수만큼 더 물어야 한다.
//   changed — 보강 매칭 조건의 파일 쪽 절반(plan/pr{N}/**·knowledge/**)을
//     세션 변경 목록과 눈으로 대조했다. 놓치면 보강이 통째로 안 돌고, 안 돈 사실은 아무 데도 안 남는다.
//   menu — 「이번 세션에 해당하는 회고 항목」. changed와 달리 파일·대화·cwd 조건을 한 번에 돌려
//     골라 받을 목록까지 낸다. 세션이 기억으로 목록을 만들면 안 떠오른 항목이 조용히 빠지고,
//     빠졌다는 것도 아무 데도 안 남는다 — 회고가 길어진 뒤에 도는 절차라 특히 그렇다.
//   squash-check — 「합친 뒤 정리 전과 파일 내용이 같은지 확인한다」. 「커밋 정리」는 사용자 지시를
//     기다리지 않으므로 사람 눈이 안 거친다. rebase 중 hunk가 빠져도 로그는 깔끔해 보이고,
//     잃은 변경은 다음 세션에 "왜 이게 없지"로 나타난다. 트리 해시 둘을 맞대면 끝날 일이다.
//   retro-table — 「빈칸이 하나라도 있으면 산출물 실패다」. 빠뜨린 쪽이 자기가 빠뜨린 것을 세는
//     구조라 산문으로는 아무도 못 막는다. user-turns가 낸 번호가 정답지고 표가 채점 대상이다.
//   timeline — 「무엇이 오래 걸렸나 / 지시가 어떤 순서로 왔나」. 둘 다 세션이 닫히면 사라지는데,
//     체감으로 되짚으면 인상에 남은 한 자리만 올라온다. 실측(2026-09-18 세션): 내가 돈 70분 중
//     38분이 한 턴이었고 그 안의 도구 하나가 12분 40초를 멈춰 있었다 — 그 수치는 기록에만 있다.
//   read-files — 「읽었는데 안 쓴 문서」. 문서가 잘못 놓였다는 것은 그 문서를 연 세션만 알고,
//     나중에 파일을 뜯어봐도 "그날 이게 쓰였나"는 안 나온다. 회고가 기억으로 목록을 만들면
//     인상에 남은 두어 개만 올라온다 — 한 세션이 몇 개를 여는지의 실측은 read-usage.md에 있다.
//
// 판단은 안 한다 — 어느 커밋이 한 작업인지, 스냅샷에서 무엇을 회수할지는 부르는 쪽이 정한다.
// menu는 예외다: 「이 세션에 해당하는가」까지 낸다. 다만 무엇을 돌릴지는 사용자가 고른다.
//
// 사용:
//   node <이 파일> user-turns --session <session_id>
//   node <이 파일> menu --session <session_id> --repo <레포 경로> [--cwd <세션 cwd>]
//   node <이 파일> snapshots --session <session_id>
//   node <이 파일> tasks --session <session_id>
//   node <이 파일> changed --repo <레포 경로> [--base <ref>]
//   node <이 파일> squash-check --repo <레포 경로> --before <정리 전 ref>
//   node <이 파일> read-files --session <session_id>
//   node <이 파일> read-usage --session <session_id> --from <판정 json>
//   node <이 파일> retro-table --session <session_id> --table <표를 적은 md>
//   node <이 파일> timeline --session <session_id> [--notes <요약 json>] [--clip <자를 글자수>] [--html]

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

// task 저장소. 폴더명은 세션 id의 앞 8자다 — transcript와 달리 id 전체로는 안 찾아진다.
const TASK_ROOT = path.join(os.homedir(), '.claude', 'tasks');

// 읽고 안 쓴 문서의 누계. 기기를 넘어 쌓여야 신호가 차므로 백로그 레포에 둔다(같은 이유로
// refresh-projects 상태가 그 옆에 있다). 레포가 없는 기기에서는 no-op 한다.
// 환경변수는 실제 누계를 안 건드리고 사본으로 돌려보기 위한 것이다.
const USAGE_FILE =
  process.env.READ_USAGE_FILE ?? path.join(os.homedir(), 'WebstormProjects', 'main', 'backlog', 'pre-exit', 'read-usage.json');

// 지원동기 회차가 3단(막혔을 때만 여는 자리)에서 떠온 갈래의 누계. 위 문서 누계의 형제다 —
// 저쪽은 이 세션이 연 프롬프트 문서를, 이쪽은 회사를 조사해 떠온 바깥 출처를 센다.
const SOURCE_FILE =
  process.env.SOURCE_USAGE_FILE ?? path.join(os.homedir(), 'WebstormProjects', 'main', 'backlog', 'pre-exit', 'source-usage.json');

// 갈래 이름을 세션이 지어 붙이면 같은 갈래가 여러 줄로 갈려 눈금이 영영 안 찬다. 문서 누계에서
// 실제로 그렇게 깨졌다 — 진입점 이름이 35가지로 흩어져 한 문서의 횟수가 9·3·1로 나뉘었다.
// 목록은 PP `local/contexts/recruitment/conventions.md` 「회사 자료는 세 단으로…」 3단 표에서 온다.
// 「법령·제도 원문」만 그 표 밖이다 — 제도 원문은 단 순위에 안 걸리는 별개 층이라 덤프에도
// 제 절(`## 제도 원문`)로 적히고, 그러면 3단 라벨 대상에서 빠진다. 그래도 목록에 두는 것은
// 그 규약이 서기 전 덤프가 남아 있는 동안과, 판 자료에 딸려 온 법령이 3단 절에 섞이는 회차 때문이다.
const SOURCE_KINDS = [
  '인터뷰',
  '기사·보도자료',
  '대표 기고',
  '앱스토어 설명·리뷰',
  '커뮤니티 글',
  '설문·통계',
  '업계 실무 자료',
  '법령·제도 원문',
  '학술논문',
];

// 3단 절 중에는 자료가 아니라 메모인 것이 섞인다(「열게 된 조건」·「확인했으나 싣지 않은 자리」).
// 눈금에 안 올리되 라벨을 붙이게 해서, 빠뜨린 절과 구분한다 — 빠뜨림은 곧 분모가 줄어드는 것이라
// 조용히 넘기면 안 된다.
const SOURCE_SKIP = '해당 없음';

// 문서 쪽 30일과 다르다. 지원은 몰아서 돌아(11개 회차 중 9개가 2026-09-14~16 사흘에 몰렸다)
// 30일 창이면 한 달 쉬는 사이 눈금이 통째로 빠져 0에서 다시 시작한다.
const SOURCE_WINDOW_DAYS = 90;

// CLI가 그 자리에서 돌린 명령의 출력·주의문이 user 엔트리에 섞여 들어온다. 발화 뒤에 붙는 일도
// 있어 첫머리 검사로는 못 걷는다.
const LOCAL_COMMAND_TAGS = /<local-command-(stdout|stderr|caveat)>[\s\S]*?<\/local-command-\1>/g;

// 사용자가 친 것이 아닌데 `type=user`로 들어오는 것들. 런타임이 사용자 자리에 끼워 넣는 주입이라
// 회고가 세면 안 되는 쪽이다. 마커가 **줄 첫머리**에 오는 것만 잡는다 — 본문 중간에 인용된
// 같은 글자에는 안 걸린다.
const INJECTED = [
  /^Another Claude session sent a message/,
  /^<teammate-message\b/,
  /^<agent-message\b/,
  /^<cross-session-message\b/,
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
// 회고 항목 레지스트리 — 「이번 세션에 해당하는가」의 정본. 라벨과 상세 파일은 SKILL.md
// 「회고 항목」 표가 갖는다. 여기 라벨을 다시 적으면 표와 두 벌이 되고, 어긋나도 드러나는 자리가
// 없다 — 그래서 여기는 key와 감지 조건만 갖는다.
//
//   always — 조건 없이 돈다          off — 기본 꺼짐. 사용자가 켤 때만
//   timeline — 시간·순서 표의 자체 판정(SKIP_TURNS·SKIP_MS)을 쓴다
//   file·slash — 둘 중 하나만 맞아도 해당    cwd — 있으면 먼저 통과해야 하는 관문
// 순서는 SKILL.md 「회고 항목」 표와 같다 — 그 표의 순서가 실행 순서라, 메뉴를 다른 순서로 내면
// 고르는 쪽이 무엇이 무엇에 흘러 들어가는지 못 본다.
const RETRO_ITEMS = [
  { key: 'timeline', when: 'timeline' },
  { key: 'workflow', file: /(^|\/)plan\/pr\d+\//, slash: [/^\/workflow$/] },
  { key: 'digest', file: /(^|\/)knowledge\//, slash: [/^\/digest$/] },
  { key: 'write-refine', slash: [/^\/write-refine$/] },
  { key: 'routine', slash: [/^\/routine-/], cwd: 'private-playground' },
  { key: 'recruitment', slash: [/^\/recruitment-(application|motivation)$/], cwd: 'private-playground' },
  { key: 'step-1', when: 'always' },
  { key: 'error-notebook', when: 'off' },
];

// changed가 쓰는 파일 쪽 절반. 레지스트리에서 뽑아 쓴다 — 두 벌로 두면 한쪽만 늘어난다.
const AUGMENTATION_PATHS = RETRO_ITEMS.filter(({ file }) => file).map(({ key, file }) => ({ key, re: file }));

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

// 모델이 도구를 돌리는 사이에 사용자가 보낸 메시지는 `type: "user"` 줄이 아예 안 생기고
// `queue-operation`으로만 남는다. 닫히는 꼴이 둘이라 여기서 갈라야 한다:
//   - `dequeue` — 나중에 정식 턴으로 들어와 `type: "user"` 줄이 따로 생긴다. 여기서 세면 두 번이다
//   - `remove` + `reason: "absorbed_mid_turn"` — 돌던 턴이 그대로 삼켜서 user 줄이 안 생긴다.
//     이쪽만 새는 쪽이고, 실제 작업 지시가 통째로 회고 표에서 빠졌다(2026-09-06 실측 3건).
// 주입 필터는 큐에도 그대로 댄다 — 큐로 들어오는 task 알림이 실제로 있다.
function queuedTurn(entry, pending, replies) {
  // 큐는 content로 짝을 맞춘다. 같은 글자를 두 번 올리는 일이 있으므로 시각을 쌓아 두고 먼저
  // 올린 것부터 뺀다 — 덮어쓰면 앞 메시지가 뒤 메시지의 시각을 갖는다.
  const content = typeof entry.content === 'string' ? entry.content : '';
  if (entry.operation === 'enqueue') {
    if (content) pending.set(content, [...(pending.get(content) ?? []), entry.timestamp]);
    return null;
  }
  const waiting = pending.get(content) ?? [];
  const enqueuedAt = waiting.shift();
  if (!waiting.length) pending.delete(content);
  if (entry.operation !== 'remove' || entry.reason !== 'absorbed_mid_turn') return null;
  const text = typedText(content);
  if (!text) return null;
  // 시각은 enqueue 쪽 — 사용자가 실제로 친 시각이 그쪽이다.
  // `source: 'queued'`는 재전송 합치기에서 빼는 표시이기도 하다. 큐 메시지는 앞 발화를 고쳐
  // 다시 보낸 것이 아니라 그 위에 얹은 별개 지시다.
  return { at: enqueuedAt ?? entry.timestamp, text, replies, source: 'queued' };
}

// 발화 전수를 뽑는 두 진입점(user-turns가 목록을 내고, retro-table이 그 목록과 표를 맞댄다)이
// 같은 transcript 해석을 쓴다. 한쪽만 고치면 표 검사가 목록에 없는 번호를 요구하게 된다.
function collectTurns(file) {
  const raw = [];
  const pending = new Map(); // 큐에 올라와 아직 안 닫힌 메시지 → enqueue 시각
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
    if (entry.type === 'queue-operation') {
      const turn = queuedTurn(entry, pending, replies);
      if (turn) raw.push(turn);
      continue;
    }
    const text = rawUserText(entry);
    if (!text) continue;
    if (/^\[Request interrupted by user/.test(text.trimStart())) {
      interrupts += 1;
      continue;
    }
    const typed = typedText(text);
    if (typed) raw.push({ at: entry.timestamp, text: typed, replies, source: entry.promptSource });
  }
  // 큐 메시지는 enqueue 시각이 기록 순서보다 앞서므로 시각으로 섞는다. 뒤에 몰아 붙이면
  // "무슨 일을 하다 이 지시가 왔나"가 안 보인다. 시각이 같으면 기록 순서를 지킨다.
  const order = new Map(raw.map((t, i) => [t, i]));
  raw.sort((a, b) => String(a.at ?? '').localeCompare(String(b.at ?? '')) || order.get(a) - order.get(b));
  return { turns: mergeResends(raw), interrupts };
}

function transcriptOrDie(session, who) {
  if (!session) {
    console.error(`${who} 에는 --session <session_id> 가 필요합니다.`);
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
  return file;
}

if (command === 'user-turns') {
  const session = optOf('session');
  const file = transcriptOrDie(session, 'user-turns');
  const { turns, interrupts } = collectTurns(file);

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

// ---------------------------------------------------------------- timeline

// 표에서 눈에 띄게 만들 선들. 전부 "이 값을 넘으면 사유를 적는다"는 표시일 뿐이라,
// 넘지 않은 줄도 표에는 그대로 남는다 — 거르면 순서를 보는 쪽이 못 쓴다.
// 보강 감지의 「이 세션에서 그 스킬을 불렀는가」를 회상이 아니라 기록으로 답한다. 회고는 세션이
// 길어진 뒤에 도는지라 앞머리가 요약으로 접혀 있고, 그러면 불렀다는 사실이 안 떠올라 보강이 통째로
// 안 돈다 — 안 돌았다는 것도 아무 데도 안 남아서 다음 회차까지 모른다.
if (command === 'commands') {
  const session = optOf('session');
  const file = transcriptOrDie(session, 'commands');
  const { turns } = collectTurns(file);
  const counts = new Map();
  for (const { text } of turns) {
    const name = text.match(/^(\/\S+)/)?.[1];
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  if (!counts.size) {
    console.log(`[이 세션이 부른 슬래시 명령] 없음 — ${file}`);
    process.exit(0);
  }
  console.log(`[이 세션이 부른 슬래시 명령] ${counts.size}종 — ${file}`);
  for (const [name, n] of [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
    console.log(`  ${name}${n > 1 ? `  ×${n}` : ''}`);
  }
  // 스킬이 자동 발동된 회차는 호출 기록이 안 생긴다. 목록에 없다고 그 스킬을 안 쓴 것은 아니다.
  console.log('\n사용자가 슬래시로 부른 것만 남는다 — 자동 발동은 안 잡히므로, 이 목록은 「불렀다」의 증거이지 「안 불렀다」의 증거가 아니다.');
  process.exit(0);
}

const SLOW_MS = 3 * 60_000; // 이 이상 걸린 턴은 강조한다
const LONG_GAP_MS = 90_000; // 도구 하나가 이만큼 멈춰 있었으면 사유로 적는다
const MANY_TOOLS = 10;
const TIMELINE_CLIP = 35;

// 볼 것이 없는 세션을 스스로 거르는 선. 둘 다 작을 때만 거른다 — 발화 두 개짜리라도 총
// 시간이 길면 시간 쪽 인사이트는 남고, 짧아도 발화가 많으면 순서 쪽이 남는다.
const SKIP_TURNS = 5;
const SKIP_MS = 10 * 60_000;

const KST_OFFSET_MS = 9 * 3_600_000;

function hhmm(at) {
  return new Date(at + KST_OFFSET_MS).toISOString().slice(11, 16);
}

function durText(value) {
  const s = Math.round(value / 1000);
  if (s < 60) return `${s}초`;
  const m = Math.floor(s / 60);
  return s % 60 ? `${m}분 ${s % 60}초` : `${m}분`;
}

// 발화마다 "그 발화가 시킨 일이 언제 끝났나"와 "그 사이에 무엇이 시간을 먹었나"를 붙인다.
// 구간은 발화 시각으로 가른다 — 큐에 올린 발화는 기록 순서가 시각과 어긋나므로 인덱스로
// 가르면 그 구간이 통째로 앞 턴에 붙는다.
function attachTiming(file, turns) {
  const entries = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (!entry.timestamp || entry.isSidechain) continue;
    entries.push({ ...entry, ms: new Date(entry.timestamp).getTime() });
  }
  entries.sort((a, b) => a.ms - b.ms);

  return turns.map((turn, i) => {
    const start = new Date(turn.at).getTime();
    const stop = turns[i + 1] ? new Date(turns[i + 1].at).getTime() : Infinity;
    const seg = entries.filter((e) => e.ms >= start && e.ms < stop);
    const lastReply = [...seg].reverse().find((e) => e.type === 'assistant');

    const tools = seg.flatMap((e) =>
      e.type === 'assistant' && Array.isArray(e.message?.content)
        ? e.message.content.filter((c) => c.type === 'tool_use').map((c) => c.name)
        : []);
    let gap = 0;
    for (let j = 1; j < seg.length; j += 1) gap = Math.max(gap, seg[j].ms - seg[j - 1].ms);

    return {
      ...turn,
      at: start,
      // 답이 없는 턴 = AI가 답하기 전에 이어서 친 발화. 재전송이 아니라 별개 지시라
      // mergeResends가 안 합친 것이므로, 행은 남기고 걸린 시간만 비운다.
      spent: lastReply ? lastReply.ms - start : null,
      endedAt: lastReply ? lastReply.ms : start,
      tools: tools.length,
      gap,
      denied: seg.filter((e) => e.toolDenialKind).length,
      interrupted: seg.some((e) => /^\[Request interrupted by user/.test(rawUserText(e)?.trimStart() ?? '')),
    };
  });
}

function timelineTotals(rows) {
  let mine = 0;
  let yours = 0;
  rows.forEach((row, i) => {
    mine += row.spent ?? 0;
    const next = rows[i + 1];
    if (next) yours += Math.max(0, next.at - row.endedAt);
  });
  return { mine, yours, total: rows.at(-1).endedAt - rows[0].at };
}

function escapeHtml(text) {
  return String(text).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
}

// 시간을 먹은 자리는 기계가 안다. 그것이 왜 걸렸는지(무슨 벤치였나·왜 25번 읽었나)는 모른다 —
// 그 줄은 회고가 표 아래 두 덩이에 적는다.
function spentReason(row) {
  const bits = [];
  if (row.gap > LONG_GAP_MS) bits.push(`도구 하나가 ${durText(row.gap)} 멈춤`);
  if (row.tools >= MANY_TOOLS) bits.push(`도구 ${row.tools}회`);
  if (row.denied) bits.push(`거절한 도구 호출 ${row.denied}건`);
  if (row.interrupted) bits.push('응답을 끊음');
  return bits.join(' · ');
}

function renderTimeline(rows, notes, clipAt) {
  const { mine, yours, total } = timelineTotals(rows);
  const said = (row, i) => {
    const note = notes.rows?.[String(i + 1)];
    const head = row.text.length > clipAt ? `${escapeHtml(row.text.slice(0, clipAt))}…` : escapeHtml(row.text);
    return `<span class="said">${head}</span>${note ? ` <span class="note">${escapeHtml(note)}</span>` : ''}`;
  };
  const body = rows.map((row, i) => `
      <tr class="${(row.spent ?? 0) > SLOW_MS ? 'slow' : ''}">
        <td class="t">${hhmm(row.at)}</td>
        <td>${said(row, i)}${row.edits ? `<span class="tag">같은 발화 ×${row.edits + 1} 합침</span>` : ''}</td>
        <td class="d">${row.spent === null ? '—' : durText(row.spent)}</td>
        <td class="w">${escapeHtml(spentReason(row))}</td>
      </tr>`).join('');
  const list = (items) => (items ?? []).map((x) => `<li>${escapeHtml(x)}</li>`).join('');

  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>세션 회고 — 시간과 순서</title>
<style>
  :root {
    --bg: #fbfaf8; --fg: #1f1d1a; --muted: #6b6560; --line: #e5e0d8;
    --card: #fff; --slow: #fdf3e7; --accent: #b4551f;
  }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
    --bg: #171614; --fg: #ebe7e1; --muted: #9a938b; --line: #302d29;
    --card: #1f1e1b; --slow: #2c2317; --accent: #e08f52;
  } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.6 "Pretendard", -apple-system, "Segoe UI", system-ui, sans-serif; }
  main { max-width: 900px; margin: 0 auto; padding: 40px 16px 80px; }
  h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: -.01em; }
  .sub { color: var(--muted); font-size: 13px; margin-bottom: 28px; }
  .totals { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 28px; }
  .tot { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 12px 16px; flex: 1 1 180px; }
  .tot b { display: block; font-size: 20px; font-weight: 650; letter-spacing: -.01em; }
  .tot span { color: var(--muted); font-size: 12px; }
  table { width: 100%; border-collapse: collapse; background: var(--card); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
  th { text-align: left; font-size: 12px; color: var(--muted); font-weight: 600; padding: 10px 14px; border-bottom: 1px solid var(--line); }
  td { padding: 11px 14px; border-bottom: 1px solid var(--line); vertical-align: top; }
  tr:last-child td { border-bottom: 0; }
  tr.slow { background: var(--slow); }
  td.t { color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; width: 58px; }
  td.d { font-variant-numeric: tabular-nums; white-space: nowrap; width: 92px; }
  tr.slow td.d { color: var(--accent); font-weight: 650; }
  td.w { color: var(--muted); font-size: 13px; width: 30%; }
  .note { color: var(--muted); }
  .tag { display: inline-block; margin-left: 6px; font-size: 11px; color: var(--muted); border: 1px solid var(--line); border-radius: 999px; padding: 1px 7px; white-space: nowrap; }
  h2 { font-size: 15px; margin: 34px 0 8px; }
  .insight { background: var(--card); border: 1px solid var(--line); border-left: 3px solid var(--accent); border-radius: 0 10px 10px 0; padding: 14px 18px; }
  .insight ul { margin: 0; padding-left: 18px; }
  .insight li + li { margin-top: 6px; }
  @media (max-width: 620px) { td.w, th:nth-child(4) { display: none; } }
</style></head>
<body><main>
  <h1>세션 회고 — 시간과 순서</h1>
  <div class="sub">${escapeHtml(notes.title ?? '')} · 발화 ${rows.length}건</div>

  <div class="totals">
    <div class="tot"><b>${durText(total)}</b><span>세션 전체</span></div>
    <div class="tot"><b>${durText(mine)}</b><span>내가 돈 시간</span></div>
    <div class="tot"><b>${durText(yours)}</b><span>다음 지시를 쓰시던 시간</span></div>
  </div>

  <table>
    <thead><tr><th>시각</th><th>지시</th><th>걸린 시간</th><th>어디서 먹었나</th></tr></thead>
    <tbody>${body}
    </tbody>
  </table>

  <h2>왜 오래 걸렸나</h2>
  <div class="insight"><ul>${list(notes.time)}</ul></div>

  <h2>순서</h2>
  <div class="insight"><ul>${list(notes.order)}</ul></div>
</main></body></html>
`;
}

if (command === 'timeline') {
  const session = optOf('session');
  const file = transcriptOrDie(session, 'timeline');
  const { turns } = collectTurns(file);
  if (!turns.length) {
    console.log('발화가 없다 — 표로 만들 것이 없다.');
    process.exit(0);
  }

  const rows = attachTiming(file, turns);
  const { mine, yours, total } = timelineTotals(rows);
  if (rows.length < SKIP_TURNS && total < SKIP_MS) {
    console.log(`[시간·순서] 볼 것 없음 — 발화 ${rows.length}건, 총 ${durText(total)}. 이 단계를 건너뛴다.`);
    process.exit(0);
  }

  const clipAt = Number(optOf('clip') ?? TIMELINE_CLIP);
  const notesPath = optOf('notes');
  const notes = notesPath ? JSON.parse(fs.readFileSync(notesPath, 'utf8')) : {};

  if (process.argv.includes('--html')) {
    process.stdout.write(renderTimeline(rows, notes, clipAt));
    process.exit(0);
  }

  console.log(`[시간·순서] 발화 ${rows.length}건 — ${file}`);
  console.log(`총 ${durText(total)} = 내가 돈 시간 ${durText(mine)} / 다음 지시를 쓰시던 시간 ${durText(yours)}`);
  console.log(`${clipAt}자를 넘는 발화에는 요약을 붙인다 — --notes 로 넘길 json의 rows 키가 아래 번호다.\n`);
  rows.forEach((row, i) => {
    const reason = spentReason(row);
    console.log(`${i + 1}. ${hhmm(row.at)}  ${row.spent === null ? '—' : durText(row.spent)}${reason ? `  (${reason})` : ''}`);
    console.log(`   ${row.text.length > clipAt ? `${row.text.slice(0, clipAt)}… (총 ${row.text.length}자)` : row.text}`);
  });
  process.exit(0);
}

// 시간·순서 표의 판정(SKIP_TURNS·SKIP_MS)을 쓰므로 timeline 블록 뒤에 둔다.
if (command === 'menu') {
  const session = optOf('session');
  const repo = optOf('repo') ?? process.cwd();
  const cwd = (optOf('cwd') ?? process.cwd()).replaceAll('\\', '/');

  // 파일 쪽 재료. 작업 트리의 미커밋 변경을 본다 — changed와 같은 기준이다.
  const out = git(repo, ['status', '--porcelain=v1', '--untracked-files=all']);
  const changedFiles = out.error
    ? null
    : out.split('\n').filter(Boolean).map((l) => l.slice(3).replaceAll('\\', '/'));

  // 대화 쪽 재료. transcript가 없으면(세션 id가 틀렸거나 이 CLI가 Claude Code 형식으로 안 남긴다)
  // 없는 채로 낸다 — 여기서 죽으면 파일·cwd로 걸리는 항목까지 함께 못 내게 된다.
  const file = session ? findTranscript(session) : null;
  let slashes = null;
  let timelineLine = 'timeline  미확인  transcript 없음 — 이 항목은 세션이 판단한다';
  if (file) {
    const { turns } = collectTurns(file);
    slashes = turns.map(({ text }) => text.match(/^(\/\S+)/)?.[1]).filter(Boolean);
    const rows = attachTiming(file, turns);
    const { total } = timelineTotals(rows);
    const thin = rows.length < SKIP_TURNS && total < SKIP_MS;
    timelineLine = `timeline  ${thin ? '해당없음' : '해당'}  발화 ${rows.length}건, 총 ${durText(total)}`;
  }

  const lines = [];
  for (const item of RETRO_ITEMS) {
    if (item.when === 'timeline') {
      lines.push(timelineLine);
      continue;
    }
    if (item.when === 'always') {
      lines.push(`${item.key}  항상`);
      continue;
    }
    if (item.when === 'off') {
      lines.push(`${item.key}  기본 꺼짐  사용자가 켤 때만`);
      continue;
    }
    if (item.cwd && !cwd.includes(item.cwd)) {
      lines.push(`${item.key}  해당없음  cwd가 ${item.cwd} 아님`);
      continue;
    }
    const hitFile = item.file && changedFiles?.filter((f) => item.file.test(f));
    const hitSlash = item.slash && slashes?.filter((s) => item.slash.some((re) => re.test(s)));
    const why = [];
    if (hitFile?.length) why.push(`변경 ${hitFile.slice(0, 3).join(', ')}`);
    if (hitSlash?.length) why.push(`호출 ${[...new Set(hitSlash)].join(', ')}`);
    if (why.length) {
      lines.push(`${item.key}  해당  ${why.join(' / ')}`);
      continue;
    }
    // 재료가 아예 없었으면 「해당없음」이 아니라 「미확인」이다. 둘을 같은 말로 내면 못 본 것이
    // 안 걸린 것으로 보고된다.
    const missing = [];
    if (item.file && changedFiles === null) missing.push(`git 실패(${out.error})`);
    if (item.slash && slashes === null) missing.push('transcript 없음');
    if (!missing.length) {
      lines.push(`${item.key}  해당없음`);
      continue;
    }
    // 못 본 절반과 보고 안 걸린 절반을 함께 적는다. 「미확인」만 적으면 세션이 처음부터 다시 봐야
    // 하고, 그러면 기억으로 답하는 자리로 되돌아간다.
    const checked = [];
    if (item.file && changedFiles !== null) checked.push('변경 파일에는 안 걸림');
    if (item.slash && slashes !== null) checked.push('슬래시 호출에는 안 걸림');
    lines.push(`${item.key}  미확인  ${missing.join(', ')}${checked.length ? ` (${checked.join(', ')})` : ''}`);
  }

  console.log('[이번 세션에 해당하는 회고 항목]');
  for (const line of lines) console.log(`  ${line}`);
  console.log('\n라벨과 상세 파일은 SKILL.md 「회고 항목」 표에서 읽는다 — 여기는 해당 여부만 낸다.');
  console.log('슬래시 호출은 사용자가 직접 부른 것만 남는다. 자동 발동은 안 잡히므로 「해당없음」은 안 불렀다는 증거가 아니다.');
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

if (command === 'tasks') {
  const session = optOf('session');
  if (!session) {
    console.error('tasks 에는 --session <session_id> 가 필요합니다.');
    process.exit(1);
  }
  const dir = path.join(TASK_ROOT, `session-${session.slice(0, 8)}`);
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    : [];
  if (!files.length) {
    console.log('이 세션의 task 없음 — 회수할 것이 없다.');
    process.exit(0);
  }
  console.log(`[이 세션의 task] ${files.length}건. 회고 재료가 아닌 것(작업 추적용)은 세션이 거른다.\n`);
  for (const f of files) {
    let task;
    try {
      task = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    } catch (e) {
      // 한 건이 깨져도 나머지는 낸다. 조용히 건너뛰면 그 건이 없었던 것이 된다.
      console.log(`#${path.basename(f, '.json')} [읽기 실패] ${`${e.message}`.split('\n')[0]}\n`);
      continue;
    }
    console.log(`#${task.id ?? path.basename(f, '.json')} (${task.status ?? '상태없음'}) ${task.subject ?? ''}`);
    if (task.description) console.log(`${task.description}\n`);
    else console.log('');
  }
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

// read-files가 목록을 내고, read-usage가 그 목록으로 판정을 맞대 본다(안 연 경로 거부·고친 파일 제외).
// 둘의 transcript 해석이 갈리면 목록에 있던 경로를 누계가 거부하므로 함수 하나로 둔다.
function collectReads(file) {
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
  return { reads, touched };
}

// 진입점 칸은 세션이 손으로 채운다. 이름을 자유로 두자 한 스킬이 `/scw`·`scw(editing)`처럼 여러 이름으로
// 갈려 한 문서의 눈금이 줄마다 나뉘었다 — 경로를 원본 하나로 접은 것과 같은 사정이다. 그래서 스킬 폴더
// 이름(부르는 이름과 같다)만 받는다. 스킬이 아닌 자리는 역할 이름으로 받는다:
//   전역규칙 — 전역 규칙·CLAUDE.md 자동 로드·상황별 참고 표가 불러온 문서
const ENTRY_ROLES = ['전역규칙'];

function knownEntryPoints() {
  const names = new Set(ENTRY_ROLES);
  const walk = (dir, depth) => {
    if (depth < 0 || !fs.existsSync(dir)) return;
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      const sub = path.join(dir, d.name);
      if (fs.existsSync(path.join(sub, 'SKILL.md'))) names.add(d.name);
      walk(sub, depth - 1); // `workflow/recruitment` 같은 중첩 스킬
    }
  };
  // 전역 스킬은 이 스크립트가 든 skills 폴더에 함께 있다(원본이든 배포본이든).
  walk(path.resolve(import.meta.dirname, '..', '..'), 2);
  // 레포 로컬 스킬은 레포마다 따로 산다. 누계 파일과 같은 작업 폴더 규약을 따른다.
  const projects = path.join(os.homedir(), 'WebstormProjects');
  const dirs = (p) => (fs.existsSync(p) ? fs.readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()) : []);
  for (const group of dirs(projects)) {
    for (const repo of dirs(path.join(projects, group.name))) {
      walk(path.join(projects, group.name, repo.name, 'local', 'skills'), 2);
    }
  }
  return names;
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
  const { reads, touched } = collectReads(file);

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

// 기록하는 세션은 모두 pre-exit를 돌므로 그 진입점의 문서는 매번 열리고 매번 쓰인다 — 배치에 대해
// 아무것도 안 말하는 줄이라 후보 목록에서 뺀다.
const RECORDER = 'pre-exit';

// 선은 누계 파일의 threshold가 갖는다. 선을 넘어도 마지막으로 열린 지 오래된 줄은 안 띄운다 —
// 자리를 고치면 그 진입점이 그 문서를 안 물게 되어 눈금이 멈추는데, 멈춘 줄이 계속 뜨면 알람을
// 끄려고 따로 손대야 한다. 다시 열리면 last가 갱신돼 도로 뜬다.
function ripeRows(rows, threshold, cutoff, skip = () => false) {
  if (!threshold) return null;
  return rows
    .filter(([key, v]) => !skip(key) && v.read >= threshold.read && v.unused / v.read >= threshold.unusedRatio && v.last >= cutoff)
    .sort((a, b) => b[1].unused / b[1].read - a[1].unused / a[1].read);
}

const ripeDocs = (state, cutoff) => ripeRows(Object.entries(state.docs ?? {}), state.threshold, cutoff, (key) => key.startsWith(`${RECORDER}\t`));

const rowLine = ([key, v]) => `  ${v.unused}/${v.read}  ${key.replace('\t', ' → ')}`;

if (command === 'read-usage') {
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const from = optOf('from');
  const session = optOf('session');
  if (!from || !session) {
    console.error('read-usage 에는 --session <session_id> 와 --from <판정 json> 이 필요합니다.');
    console.error('형식: { "<진입점>\\t<read-files가 낸 경로>": "used" | "unused" | "excluded" }');
    // 세션 id가 없으면 같은 판정을 여러 번 넣었을 때 가를 방법이 없다 — 한 세션의 13줄이 한꺼번에
    // ×3으로 더해진 적이 있고, 그중 한 줄은 「3번 중 3번 안 씀」으로 가장 강한 후보처럼 보였다.
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
  const transcript = findTranscript(session);
  if (!transcript) {
    console.error(`transcript를 못 찾았다 (${TRANSCRIPT_ROOT} 아래에 ${session}.jsonl 없음) — 판정을 맞대 볼 목록이 없어 더하지 않는다.`);
    process.exit(1);
  }
  const { reads, touched } = collectReads(transcript);
  const entryPoints = knownEntryPoints();

  // 전부 검사한 뒤에 더한다. 한 줄씩 끊으면 고칠 것을 하나씩만 알게 된다.
  const problems = [];
  for (const [key, verdict] of Object.entries(verdicts)) {
    const [entry, doc] = key.split('\t');
    if (doc === undefined) {
      problems.push(`진입점이 없다: ${JSON.stringify(key)} — "<진입점>\\t<경로>" 형식이어야 한다.`);
      continue;
    }
    if (!['used', 'unused', 'excluded'].includes(verdict)) {
      problems.push(`모르는 판정 ${JSON.stringify(verdict)} (${key}) — used·unused·excluded 중 하나여야 한다.`);
    }
    if (!entryPoints.has(entry)) {
      problems.push(`모르는 진입점 ${JSON.stringify(entry)} — 스킬 폴더 이름이나 역할 이름(${ENTRY_ROLES.join('·')})만 받는다. 괄호로 세부를 붙이지 않는다.`);
    }
    // excluded는 누계를 읽는 회차가 넣으므로 그 세션이 연 문서가 아니어도 된다.
    if (verdict !== 'excluded' && !reads.has(doc)) {
      problems.push(`이 세션이 안 연 경로 ${JSON.stringify(doc)} — read-files가 낸 경로를 그대로 옮긴다. 손으로 고치면 한 파일의 눈금이 다시 갈린다.`);
    }
  }
  if (problems.length) {
    for (const p of problems) console.error(p);
    if (problems.some((p) => p.startsWith('모르는 진입점'))) {
      console.error(`\n받는 진입점: ${[...entryPoints].sort().join(', ')}`);
    }
    process.exit(1);
  }

  const state = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
  state.docs ??= {};
  state.excluded ??= [];
  state.sessions ??= {};
  const today = new Date().toISOString().slice(0, 10);
  // 같은 세션을 다시 넣는 일은 그 세션이 살아 있는 동안에만 생기므로 오래된 id는 걷는다.
  for (const [id, day] of Object.entries(state.sessions)) if (day < cutoff) delete state.sessions[id];
  const counted = Boolean(state.sessions[session]);
  let added = 0;
  let skipped = 0;
  let edited = 0;
  for (const [key, verdict] of Object.entries(verdicts)) {
    if (verdict === 'excluded') {
      if (!state.excluded.includes(key)) state.excluded.push(key);
      delete state.docs[key];
      continue;
    }
    if (counted) continue;
    // 사용자가 「안 고친다」고 판정한 것은 다시 안 뜬다. 안 그러면 두 번째 회차부터 같은
    // 목록을 다시 보게 되고, 그게 이런 장치가 무뎌지는 가장 흔한 경로다.
    if (state.excluded.includes(key)) {
      skipped += 1;
      continue;
    }
    // 이번에 고친 파일은 「없었으면 결과가 달라졌나」에 늘 그렇다로 답해진다 — 고치는 것이 곧 결과라서다.
    // 배치에 대해 아무것도 안 말하면서 분모만 키워, 파일을 많이 만지는 정리 회차일수록 눈금이 흐려진다.
    if (touched.has(key.split('\t')[1])) {
      edited += 1;
      continue;
    }
    const row = (state.docs[key] ??= { read: 0, unused: 0, last: today });
    row.read += 1;
    if (verdict === 'unused') row.unused += 1;
    row.last = today;
    added += 1;
  }
  if (!counted) state.sessions[session] = today;
  fs.writeFileSync(USAGE_FILE, `${JSON.stringify(state, null, 2)}\n`);
  if (counted) {
    console.log(`[읽고 안 쓴 문서 누계] 이 세션은 이미 더했다 — used·unused는 건너뛰고 excluded만 반영했다 — ${USAGE_FILE}`);
  } else {
    const notes = [skipped ? `제외 목록에 있어 건너뜀 ${skipped}건` : null, edited ? `이번에 고친 파일이라 뺌 ${edited}건` : null];
    console.log(`[읽고 안 쓴 문서 누계] ${added}건 반영${notes.filter(Boolean).map((n) => `, ${n}`).join('')} — ${USAGE_FILE}`);
  }

  // 선을 넘은 줄 중 이번 세션이 연 것만 알린다. 그 문서를 왜 열었고 무엇에 쓰려 했는지는 이 세션과
  // 사용자가 지금 기억하고 있고, 누계만 받은 다른 세션은 그 이유를 다시 추적해야 한다. 이번 세션이
  // 안 연 줄까지 띄우면 매 회고가 같은 목록을 되풀이하게 된다.
  const ripe = ripeDocs(state, cutoff);
  const mine = (ripe ?? []).filter(([key]) => key in verdicts && verdicts[key] !== 'excluded');
  if (mine.length) {
    console.log(`\n[배치 의심] 이번 세션이 연 문서 중 선(${state.threshold.read}회 이상, 안 쓴 비율 ${state.threshold.unusedRatio} 이상)을 넘은 것:`);
    for (const row of mine) console.log(rowLine(row));
    console.log('회고 문제 목록에 올린다 — 무엇을 적고 무엇을 고르게 하는지는 read-usage.md 「선을 넘은 것」.');
  }
  process.exit(0);
}

// 지원동기 회차가 3단에서 떠온 갈래의 누계. 회고가 내는 것은 절마다의 **갈래 라벨뿐**이고,
// 쓰였는지 안 쓰였는지는 PP `site-usage.mjs --sections`가 낸 목록에서 읽는다 — 사람만 할 수 있는
// 일(어느 갈래인가)과 기계가 아는 일(인용됐는가)을 섞으면, 기계가 아는 것을 사람이 틀리게 적는다.
//
// `--sections` 출력 모양(`sections[].title`·`cited`)에 기대므로, PP
// `local/contexts/recruitment/scripts/site-usage.mjs`를 고치면 여기도 함께 본다. 레포가 갈려 결속
// 등록부에 못 묶는다 — 양쪽 주석이 서로를 가리킨다.
if (command === 'source-usage') {
  if (rest.includes('--kinds')) {
    console.log(`받는 갈래: ${SOURCE_KINDS.join(', ')}`);
    console.log(`자료가 아닌 절(열게 된 조건·확인했으나 싣지 않은 자리 등)에는 「${SOURCE_SKIP}」을 붙인다 — 눈금에 안 오르되 빠뜨린 것과 구분된다.`);
    process.exit(0);
  }

  const session = optOf('session');
  const from = optOf('from');
  const sectionsPath = optOf('sections');
  const exclude = (optOf('exclude') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!session) {
    console.error('source-usage 에는 --session <session_id> 가 필요하다 — 없으면 같은 판정을 두 번 넣었을 때 가를 방법이 없다.');
    process.exit(1);
  }
  if (!from && !exclude.length) {
    console.error('source-usage 에는 --from <라벨 json> 이나 --exclude <갈래> 중 하나가 필요하다.');
    console.error('라벨 json 형식: { "<site-usage --sections가 낸 절 제목>": "<갈래>" }');
    process.exit(1);
  }
  // 분모(이번 회차가 3단에서 떠온 갈래 전부)를 기억으로 채우면 이 장치가 막으려던 일이 그대로 난다.
  if (from && !sectionsPath) {
    console.error('--from 을 줄 때는 --sections <site-usage --sections 출력> 도 줘야 한다 — 안 쓴 비율의 분모가 거기서 나온다.');
    process.exit(1);
  }

  if (!fs.existsSync(SOURCE_FILE)) {
    if (!fs.existsSync(path.dirname(SOURCE_FILE))) {
      // 백로그 레포가 없는 기기에서는 조용히 넘어간다 — 기기 간 공유가 목적이라 레포 없이 만들면
      // 다음 세션이 못 읽는다.
      console.log(`[3단 갈래 누계] 누계를 둘 레포가 없어 건너뛴다 — ${SOURCE_FILE}`);
      process.exit(0);
    }
    // 폴더가 있는데 파일이 없으면 만든다. 「없으면 no-op」만 두면 아무도 안 만들어 줘서 영영 안 돈다.
    fs.writeFileSync(SOURCE_FILE, `${JSON.stringify({ kinds: {}, excluded: [], threshold: { read: 3, unusedRatio: 0.4 }, sessions: {} }, null, 2)}\n`);
    console.log(`[3단 갈래 누계] 누계 파일을 새로 만들었다 — ${SOURCE_FILE}`);
  }

  let labels = {};
  let rawLabels = '';
  let sections = [];
  if (from) {
    try {
      rawLabels = fs.readFileSync(from, 'utf8');
      labels = JSON.parse(rawLabels);
    } catch (error) {
      console.error(`라벨 파일을 못 읽었다: ${error.message}`);
      process.exit(1);
    }
    try {
      sections = JSON.parse(fs.readFileSync(sectionsPath, 'utf8')).sections ?? [];
    } catch (error) {
      console.error(`절 목록을 못 읽었다: ${error.message}`);
      process.exit(1);
    }
  }

  const titles = new Map(sections.map((s) => [s.title, s]));
  const allowed = new Set([...SOURCE_KINDS, SOURCE_SKIP]);
  // 전부 검사한 뒤에 더한다. 한 줄씩 끊으면 고칠 것을 하나씩만 알게 된다.
  const problems = [];
  for (const [title, kind] of Object.entries(labels)) {
    if (!allowed.has(kind)) problems.push(`모르는 갈래 ${JSON.stringify(kind)} (${title.slice(0, 60)})`);
    if (!titles.has(title)) problems.push(`이 회차가 안 떠온 절 ${JSON.stringify(title.slice(0, 60))} — --sections 가 낸 제목을 그대로 옮긴다.`);
    // JSON.parse는 같은 키를 조용히 덮어써서, 두 갈래에 달린 절이 한 갈래로만 세어진다.
    const seen = rawLabels.split(JSON.stringify(title)).length - 1;
    if (seen > 1) problems.push(`같은 절이 ${seen}번 들어왔다 ${JSON.stringify(title.slice(0, 60))}`);
  }
  // 라벨을 빠뜨리면 그 갈래의 분모가 조용히 줄어든다.
  for (const sec of sections) {
    if (/^##\s*3단/.test(sec.title) && !(sec.title in labels)) {
      problems.push(`라벨이 안 붙은 3단 절 ${JSON.stringify(sec.title.slice(0, 60))} — 자료가 아니면 「${SOURCE_SKIP}」을 붙인다.`);
    }
  }
  for (const kind of exclude) if (!SOURCE_KINDS.includes(kind)) problems.push(`모르는 갈래 ${JSON.stringify(kind)} (--exclude)`);
  if (problems.length) {
    for (const p of problems) console.error(p);
    console.error(`\n받는 갈래: ${SOURCE_KINDS.join(', ')}, ${SOURCE_SKIP}`);
    process.exit(1);
  }

  const state = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf8'));
  state.kinds ??= {};
  state.excluded ??= [];
  state.sessions ??= {};
  const today = new Date().toISOString().slice(0, 10);
  const windowStart = new Date(Date.now() - SOURCE_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
  for (const [id, day] of Object.entries(state.sessions)) if (day < windowStart) delete state.sessions[id];
  const counted = Boolean(state.sessions[session]);

  // 사용자가 「원래 가끔만 맞는 갈래」로 판정한 것은 다시 안 뜬다. 없으면 선을 넘은 갈래가 매 회차
  // 같은 알람을 내고, 그게 이런 장치가 무뎌지는 가장 흔한 경로다.
  for (const kind of exclude) {
    if (!state.excluded.includes(kind)) state.excluded.push(kind);
    delete state.kinds[kind];
  }

  // 갈래마다 한 눈금이다. 절 단위로 세면 한 회차에 절이 여럿인 갈래(법령 원문)가 분모를 독식한다.
  const byKind = new Map();
  for (const [title, kind] of Object.entries(labels)) {
    if (kind === SOURCE_SKIP) continue;
    if (!byKind.has(kind)) byKind.set(kind, []);
    byKind.get(kind).push(titles.get(title));
  }
  let added = 0;
  let skipped = 0;
  for (const [kind, secs] of byKind) {
    if (counted) continue;
    if (state.excluded.includes(kind)) {
      skipped += 1;
      continue;
    }
    const row = (state.kinds[kind] ??= { read: 0, unused: 0, last: today });
    row.read += 1;
    // 하나라도 인용됐으면 그 갈래는 값을 했다 — 판정 문장 「없었으면 결과가 달라졌나」와 같은 방향이다.
    if (secs.every((s) => !s.cited)) row.unused += 1;
    row.last = today;
    added += 1;
  }
  if (!counted && byKind.size) state.sessions[session] = today;
  fs.writeFileSync(SOURCE_FILE, `${JSON.stringify(state, null, 2)}\n`);

  const notes = [skipped ? `제외 목록에 있어 건너뜀 ${skipped}건` : null, exclude.length ? `제외 ${exclude.length}건` : null];
  const head = counted ? '이 회차는 이미 더했다 — 제외만 반영했다' : `${added}건 반영`;
  console.log(`[3단 갈래 누계] ${head}${notes.filter(Boolean).map((n) => `, ${n}`).join('')} — ${SOURCE_FILE}`);

  // 선을 넘은 갈래 중 이번 회차가 떠온 것만 알린다. 왜 팠고 무엇에 쓰려 했는지는 이 회차와 사용자가
  // 지금 기억하고 있고, 누계만 받은 다른 회차는 그 이유를 다시 추적해야 한다.
  const ripe = ripeRows(Object.entries(state.kinds), state.threshold, windowStart);
  const mine = (ripe ?? []).filter(([kind]) => byKind.has(kind));
  if (mine.length) {
    console.log(`\n[3단 낭비 의심] 이번 회차가 떠온 갈래 중 선(${state.threshold.read}회 이상, 안 쓴 비율 ${state.threshold.unusedRatio} 이상)을 넘은 것:`);
    for (const row of mine) console.log(rowLine(row));
    console.log('회고 문제 목록에 올린다 — 무엇을 고르게 하는지는 augmentations/recruitment.md 「떠왔는데 안 쓴 절」.');
  }
  process.exit(0);
}

// 「문제 추출」 표가 발화 전수를 실제로 다 받았는지 맞대 본다. 산문이 "빈칸이 하나라도 있으면
// 산출물 실패다"라고 적고 있지만, 빠뜨린 쪽이 자기가 빠뜨린 것을 세는 구조라 아무도 못 막는다.
// user-turns가 낸 번호가 정답지고, 표는 채점 대상이다.
if (command === 'retro-table') {
  const session = optOf('session');
  const table = optOf('table');
  if (!table) {
    console.error('retro-table 에는 --table <표가 담긴 md 파일> 이 필요합니다.');
    process.exit(1);
  }
  const file = transcriptOrDie(session, 'retro-table');
  const total = collectTurns(file).turns.length;

  let md;
  try {
    md = fs.readFileSync(table, 'utf8');
  } catch {
    console.error(`표 파일을 못 읽었다: ${table}`);
    process.exit(1);
  }

  // 헤더·구분선을 뺀 본문 행만 본다. 셀 안의 escape된 파이프(\|)는 칸을 안 가른다.
  const rows = [];
  for (const line of md.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('|')) continue;
    if (/^\|[\s:|-]+\|$/.test(t)) continue; // 구분선
    const body = t.slice(1, t.endsWith('|') ? -1 : undefined);
    const cells = body.split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, '|').trim());
    if (cells.length < 3) continue;
    if (/^#$/.test(cells[0])) continue; // 헤더
    rows.push(cells);
  }

  const seen = new Map(); // 번호 → 행 수
  const blanks = [];
  const unnumbered = [];
  for (const cells of rows) {
    const n = Number(cells[0]);
    if (!Number.isInteger(n) || n < 1) {
      unnumbered.push(cells[0]);
      continue;
    }
    seen.set(n, (seen.get(n) ?? 0) + 1);
    // 한 발화가 지적 여럿을 담으면 같은 번호로 행을 나누므로, 빈칸 판정은 행 단위다.
    if (!cells[1] || !cells[2]) blanks.push(n);
  }

  const missing = [];
  for (let n = 1; n <= total; n += 1) if (!seen.has(n)) missing.push(n);
  const extra = [...seen.keys()].filter((n) => n > total).sort((a, b) => a - b);

  console.log(`[회고 표 대조] 발화 전수 ${total}건 / 표에 오른 번호 ${seen.size}개 (행 ${rows.length}개)`);
  let failed = false;
  if (missing.length) {
    failed = true;
    console.log(`  빠진 번호 ${missing.length}개: ${missing.join(', ')}`);
  }
  if (blanks.length) {
    failed = true;
    console.log(`  빈칸이 있는 번호: ${[...new Set(blanks)].join(', ')} — 「지적」과 「어디로 갔나」는 둘 다 채운다`);
  }
  if (extra.length) {
    failed = true;
    console.log(`  발화 전수를 넘는 번호: ${extra.join(', ')}`);
  }
  if (unnumbered.length) {
    failed = true;
    console.log(`  번호가 아닌 첫 칸 ${unnumbered.length}개: ${unnumbered.slice(0, 5).join(' / ')}`);
  }
  if (failed) {
    console.log('산출물 실패다. 표를 채운 뒤 다시 돌린다 — 세어보는 것으로 대신하지 않는다.');
    process.exit(1);
  }
  console.log('  빠진 번호·빈칸 없음.');
  process.exit(0);
}

console.error(`모르는 명령: ${command ?? '(없음)'}`);
process.exit(1);
