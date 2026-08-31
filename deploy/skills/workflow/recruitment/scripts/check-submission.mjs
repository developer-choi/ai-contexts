#!/usr/bin/env node
// 채용과제 제출 전후 게이트 — 세 가지를 본다. 셋 다 「틀리면 되돌릴 수 없다」가 공통이다.
//
// 이 파일이 존재하는 이유: 셋 다 산문이 눈으로 훑으라고 시키던 것인데, 발견 주체가 우리가
// 아니거나(채용담당자) 아예 발견되지 않는다.
//
//   time-pressure — 시간 압박 정보가 원본 저장분에 남았는가. 그 폴더는 persistent라 프로젝트
//     내내 남고 이후 모든 세션이 읽는다. 한 줄이 살아남으면 그걸 읽는 세션이 작업 범위를 자의로
//     줄이는 근거를 갖는데, 그 축소는 「판단」으로 보여서 아무도 원인을 되짚지 않는다.
//   submission — `.env.local`·`plan/`이 제출물에 섞였는가. 유출은 제출된 뒤에야 성립하고
//     우리 화면에는 아무 표시도 안 난다.
//   pr-body — 게시된 PR 본문에 플레이스홀더·내부 문서 링크·죽을 링크가 남았는가. 제출 후에는
//     못 고치고, 다음에 그 본문을 보는 사람이 채용담당자다.
//
// 판단은 안 한다 — 걸린 줄을 어떻게 고쳐 쓸지(무엇을 지우고 무엇을 남길지)는 부르는 쪽이 정한다.
//
// 사용:
//   node <이 파일> time-pressure <디렉토리>
//   node <이 파일> submission <레포 경로>
//   node <이 파일> pr-body <본문.md> [--submit-remote <제출 레포 URL>] [--check-urls]
//
// 걸린 것이 있으면 exit 1.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// 「입력 자료 저장 시 제외 항목」의 네 갈래. 걸리는 것은 **후보**이고, 지울지 남길지는 사람이
// 정한다 — 날짜 하나하나가 다 마감일은 아니다. 그래서 이 모드는 exit 1을 내지 않는다.
//
// 기간 표현과 타임스탬프는 그 자체로는 과제 명세의 정상 문장이다("캐시는 3일 이내 갱신",
// `createdAt: 2026-08-31T…`). 제출·마감 맥락이 같은 줄에 있을 때만 잡는다 — 안 그러면 정상
// 명세에서 게이트가 늘 빨간불이 되고, 늘 빨간 게이트는 곧 안 읽힌다.
const SUBMISSION_CONTEXT = /(제출|마감|기한|응시|납기|deadline|due)/i;
const TIME_PRESSURE = [
  { label: '기한·마감', re: /(제출\s*기한|마감일|마감\s*기한|응시\s*기한|잔여\s*시간|deadline|due date)/i },
  { label: '시간 압박 표현', re: /(\d+\s*일\s*(까지|이내)|\d+\s*시간\s*(내|이내)|\d+\s*주\s*(까지|이내)|D-\s*\d+)/, needsContext: true },
  { label: '메일 수신 일자', re: /^\s*(Date|보낸\s*날짜|수신\s*일자|Sent)\s*[:：]/i },
  { label: '메일 타임스탬프', re: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, needsMail: true },
];
// 메일 원본에서만 타임스탬프를 본다. 코드 예시의 ISO 문자열은 명세의 일부다.
const MAIL_FILE = /(mail|메일|메시지)/i;

// 제출물에 섞이면 안 되는 것. tracked 파일 기준으로 본다 — .gitignore에 있어도 이미
// 커밋된 적이 있으면 트리에 남는다.
//
// `.env.example`류는 제외한다 — 값이 없는 견본이라 오히려 함께 내보내는 파일이다.
// `plan/`은 레포 루트의 것만 본다 — `src/app/plan/page.tsx` 같은 앱 라우트는 제출물이 맞다.
const MUST_NOT_SHIP = [
  { label: '환경변수 파일', re: /(^|\/)\.env(\.|$)/, unless: /\.(example|sample|template|dist)$/ },
  { label: 'AI 산출물', re: /^plan\// },
];

// 뒤에 `(`나 `[`가 오면 실제 링크·이미지라 플레이스홀더가 아니다 — `![스샷](url)`도
// `![스크린샷][img1]`(참조식)도 붙일 것을 이미 붙인 것이다.
const PLACEHOLDER = /\[[^\]]*(이미지|스크린샷|캡처|TODO|placeholder|스샷)[^\]]*\](?![([])/i;
// 내부 문서 링크만 본다. `https://github.com/.../docs/x.md` 같은 외부 링크는 남길 자료다.
const INTERNAL_DOC = /\]\((?!https?:)([^)]*\bdocs\/[^)]*\.md)\)/g;
// 이미지와 일반 링크를 모두 본다 — 산문이 「이미지·링크」라고 적었고, 죽은 일반 링크도 똑같이 드러난다.
const MD_LINK = /!?\[[^\]]*\]\(([^)\s]+)\)/g;

const [command, target, ...rest] = process.argv.slice(2);
const optOf = (name) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : undefined;
};

if (!command || !target) {
  console.error('사용: node <이 파일> <time-pressure|submission|pr-body> <대상> [옵션]');
  process.exit(1);
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const problems = [];

if (command === 'time-pressure') {
  const files = walk(target).filter((f) => /\.(md|txt)$/i.test(f));
  let hits = 0;
  for (const file of files) {
    const isMail = MAIL_FILE.test(path.basename(file));
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const { label, re, needsContext, needsMail } of TIME_PRESSURE) {
        if (!re.test(line)) continue;
        if (needsContext && !SUBMISSION_CONTEXT.test(line)) continue;
        if (needsMail && !isMail) continue;
        console.log(`  ${path.relative(target, file)}:${i + 1} [${label}] ${line.trim().slice(0, 120)}`);
        hits += 1;
        break;
      }
    });
  }
  console.log(`\n[시간 압박 정보] ${files.length}개 파일에서 ${hits}건`);
  // 여기서는 exit 1을 내지 않는다. 걸린 줄이 정말 지울 것인지는 사람이 정하고, 정상 명세에도
  // 기간 표현은 있다 — 늘 빨간 게이트는 곧 안 읽히는 게이트가 된다.
  if (hits) console.log('  → 지울지 남길지는 사람이 정한다. 날짜가 다 마감일은 아니다.');
} else if (command === 'submission') {
  let tracked;
  try {
    tracked = execFileSync('git', ['ls-files'], { cwd: target, encoding: 'utf8' }).split('\n').filter(Boolean);
  } catch (e) {
    console.error(`git ls-files 실패: ${`${e.stderr || e.message}`.trim().split('\n').pop()}`);
    process.exit(1);
  }
  for (const { label, re, unless } of MUST_NOT_SHIP) {
    const hits = tracked.filter((f) => re.test(f) && !(unless && unless.test(f)));
    console.log(`[${label}] ${hits.length}건`);
    hits.forEach((f) => console.log(`  ${f}`));
    if (hits.length) problems.push(`${label}이 제출물에 들어 있다`);
  }
  console.log(`\n추적 파일 ${tracked.length}개 기준. 빌드 통과 여부는 별도로 확인한다.`);
} else if (command === 'pr-body') {
  const text = fs.readFileSync(target, 'utf8');
  const lines = text.split('\n');

  const placeholders = lines.map((l, i) => [i + 1, l]).filter(([, l]) => PLACEHOLDER.test(l));
  console.log(`[플레이스홀더 잔존] ${placeholders.length}건`);
  placeholders.forEach(([n, l]) => console.log(`  :${n} ${l.trim().slice(0, 120)}`));
  if (placeholders.length) problems.push('캡처 전 임시 텍스트가 남아 있다');

  const internal = [...text.matchAll(INTERNAL_DOC)].map((m) => m[1]);
  console.log(`\n[내부 문서 링크] ${internal.length}건 — 채용담당자 시점에 노이즈다`);
  internal.forEach((u) => console.log(`  ${u}`));
  if (internal.length) problems.push('내부 문서 링크가 남아 있다');

  const submitRemote = optOf('submit-remote');
  if (submitRemote) {
    const stale = lines.map((l, i) => [i + 1, l]).filter(([, l]) => l.includes(submitRemote));
    console.log(`\n[제출 레포를 가리키는 링크] ${stale.length}건 — 레포가 삭제되면 전부 죽는다`);
    stale.forEach(([n, l]) => console.log(`  :${n} ${l.trim().slice(0, 120)}`));
    if (stale.length) problems.push('제출 레포 링크가 아카이브 링크로 안 바뀌었다');
  }

  if (rest.includes('--check-urls')) {
    const urls = [...text.matchAll(MD_LINK)].map((m) => m[1]).filter((u) => /^https?:/.test(u));
    console.log(`\n[이미지 URL] ${urls.length}건 확인 중…`);
    for (const url of urls) {
      const ok = await fetch(url, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
      console.log(`  ${ok ? 'OK  ' : '깨짐'} ${url}`);
      if (!ok) problems.push(`이미지가 깨진다: ${url}`);
    }
  }
} else {
  console.error(`모르는 명령: ${command}`);
  process.exit(1);
}

if (problems.length) {
  console.error(`\n${[...new Set(problems)].join('\n')}`);
  process.exit(1);
}
