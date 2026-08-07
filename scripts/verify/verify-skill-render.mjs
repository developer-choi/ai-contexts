#!/usr/bin/env node
// 배포되는 SKILL.md 렌더링(`renderSkillMd`)의 계약을 검사한다.
//
// 이 렌더링이 깨지면 조용히 어긋난다 — 앵커가 매번 새로 쌓이면 sync를 돌릴 때마다 배포본이
// 달라져 "변경 없음"으로 수렴하지 않고, 앵커가 frontmatter 안으로 들어가면 스킬 자체가
// 인식되지 않는다. 둘 다 배포 로그만 봐서는 눈에 띄지 않으므로 배포 전에 여기서 고정한다.
import path from 'node:path';
import { renderSkillMd, withAnchor } from '../lib/deploy-lib.mjs';

const GEMINI_DIR = path.join('C:', 'Users', 'tester', '.gemini', 'skills', 'sample');
const CLAUDE_DIR = path.join('C:', 'Users', 'tester', '.claude', 'skills', 'sample');

const SOURCES = {
  'frontmatter 있음': '---\ndescription: 설명\n---\n\n# 제목\n\n[링크](../../contexts/x.md)\n',
  'frontmatter 없음': '# 제목\n\n본문\n',
  'name 이미 있음': '---\nname: sample\ndescription: 설명\n---\n\n# 제목\n',
  'CRLF 소스': '---\r\ndescription: 설명\r\n---\r\n\r\n# 제목\r\n',
  // 끝 개행이 없으면 frontmatter 매치가 파일 끝에서 끝나 head가 개행으로 안 끝난다.
  '끝 개행 없음': '---\ndescription: 설명\n---',
  // 본문이 마커를 인용하는 경우. 앵커 제거가 위치 고정이 아니면 이 대목이 조용히 지워진다.
  '본문이 마커를 인용': '---\ndescription: 설명\n---\n\n# 제목\n\n<!-- deploy-anchor -->\n인용된 예시 줄\n\n## 다음 절\n',
};

const anchorCount = (text) => (text.match(/<!-- deploy-anchor -->/g) || []).length;

let failed = 0;
function check(label, condition) {
  console.log(`  ${condition ? 'PASS' : 'FAIL'}  ${label}`);
  if (!condition) failed += 1;
}

for (const [label, source] of Object.entries(SOURCES)) {
  const once = renderSkillMd(source, GEMINI_DIR);
  const twice = renderSkillMd(once, GEMINI_DIR);
  const moved = renderSkillMd(once, CLAUDE_DIR);
  // 본문이 마커를 인용하고 있으면 그 개수만큼 더 나오는 것이 맞다 — 인용은 본문이다.
  const expected = 1 + anchorCount(source);

  console.log(label);
  // 이미 배포된 산출물에 다시 적용해도 같아야 sync가 "변경 없음"으로 수렴한다.
  check('재적용해도 동일(멱등)', once === twice);
  check('심은 앵커는 하나만', anchorCount(once) === expected && anchorCount(twice) === expected);
  // 타겟이 바뀌면 앵커도 그 타겟을 가리켜야 한다 — 남은 옛 경로는 다른 CLI를 가리킨다.
  check('타겟이 바뀌면 앵커도 바뀜', moved.includes(CLAUDE_DIR) && !moved.includes(GEMINI_DIR));
  check('타겟을 바꿔도 심은 앵커는 하나만', anchorCount(moved) === expected);
  check('경로가 잘리지 않고 들어감', once.includes(GEMINI_DIR));
  check('폴더명이 name으로 들어감', /^name: sample$/m.test(once));
  // 앵커가 frontmatter 안에 들어가면 YAML이 깨져 스킬이 인식되지 않는다.
  check('앵커가 frontmatter 바깥', once.indexOf('<!-- deploy-anchor -->') > once.lastIndexOf('\n---'));
  check('본문 보존', source.includes('# 제목') ? once.includes('# 제목') : true);
  // 본문이 마커를 인용해도 그 대목은 남아야 한다 — 앵커는 맨 앞의 것만 교체 대상이다.
  check('인용된 마커 주변 본문 보존', source.includes('인용된 예시 줄') ? once.includes('인용된 예시 줄') : true);
}

// SKILL.md가 아닌 하위 md에도 같은 앵커가 붙는다. 바깥으로 나가는 참조가 여기 더 많다.
const SUB_DIR = path.join(CLAUDE_DIR, 'specialized');
const sub = withAnchor('# 체크리스트\n\n[링크](../../../contexts/x.md)\n', SUB_DIR);
console.log('하위 md');
check('재적용해도 동일(멱등)', sub === withAnchor(sub, SUB_DIR));
check('앵커가 하나만', anchorCount(sub) === 1);
check('자기 디렉터리를 가리킴', sub.includes(SUB_DIR));
check('frontmatter를 만들지 않음', !sub.startsWith('---'));

if (failed > 0) {
  console.error(`\nSKILL.md 렌더링 계약 위반 ${failed}건`);
  process.exit(1);
}
console.log('\nSKILL.md 렌더링 계약 정상');
