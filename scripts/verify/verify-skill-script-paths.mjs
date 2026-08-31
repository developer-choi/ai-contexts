#!/usr/bin/env node
// 전역 스킬 문서가 스크립트를 실행 위치(cwd) 기준 상대경로로 부르지 않는지 검사한다.
//
// 전역 스킬은 어느 레포에서 작업하다 불릴지 모른다. 그래서 `node scripts/foo.mjs`처럼 적으면
// 그때그때의 작업 디렉토리를 기준으로 풀려, 같은 이름의 폴더가 있는 레포에서는 엉뚱한 곳을
// 뒤지다 실패하고 없는 레포에서는 파일이 없다고 나온다. 2026-08-09에 `/backlog`가 이 모양으로
// 실패했고, 실행한 쪽은 "스킬이 없는 스크립트를 참조한다"고 오진했다.
//
// 로컬 스킬(`local/skills/`)은 대상이 아니다 — 그 레포 안에서만 도니 자기 레포 상대경로가 맞다.
// 실측(2026-08-09, 6개 레포): 전역 1건(전부 정탐), 로컬 11건(전부 자기 레포 경로라 정탐 0).
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const ROOT = 'deploy/skills';
// contexts·rules도 배포돼 여러 에이전트가 읽는다. 스킬만 보던 시절 `deploy/contexts/`의
// 사용법 주석이 `~/.claude/...`를 박아둔 채 남아 있었고(codex·gemini에서 없는 경로),
// 검사기는 `~`를 앵커로 쳐서 통과시켰다.
const EXTRA_ROOTS = ['deploy/contexts', 'deploy/rules'];
// 특정 에이전트의 홈을 박은 경로. 자리표시자로 적어야 각 타겟의 실제 경로로 채워진다.
const AGENT_HOME = /^~[\\/]\.(claude|codex|gemini)\b/;

// 인터프리터 + (옵션들) + 스크립트 파일 경로. 산문에 나온 파일 이름은 잡지 않는다.
const INVOCATION = /(?:^|[\s(`"'&|])(?:node|python3?|python\.exe|tsx|bash|sh|npx)\s+(?:--?[\w-]+\s+)*([^\s`"'|;)]+\.(?:mjs|cjs|js|ts|mts|py|sh))/g;

// 기준점이 확정된 형태 — 절대경로·홈·환경변수·자리표시자·`<설명>` 꼴은 통과.
const ANCHORED = /^(\/|~|\$|<|\{\{|[A-Za-z]:[\\/])/;

function collect(dir, found = [], extra) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full, found, extra);
    else if (entry.name.endsWith('.md') || (extra && extra(entry.name))) found.push(full);
  }
  return found;
}

// `{{skill_dir}}`는 **스킬 루트**로 채워진다(deploy-lib의 renderSkillSubMd가 하위 파일에도 같은
// 값을 넘긴다). 그래서 하위 폴더의 스크립트를 `{{skill_dir}}/scripts/x.mjs`로 적으면 배포본이
// 없는 경로를 가리키는데, 앵커 검사만으로는 통과한다 — 자리표시자로 시작하니까.
// 실제로 그렇게 깨진 줄이 여섯 개 있었고 아무도 안 잡았다. 채워질 경로가 실재하는지까지 본다.
function resolveSkillDir(file) {
  const rel = path.relative(path.join(repoRoot, ROOT), file).replaceAll('\\', '/');
  return path.join(repoRoot, ROOT, rel.split('/')[0]); // deploy/skills/<스킬명>
}

const offenders = [];
const missing = [];
const agentHome = [];

// .mjs 주석 안의 사용법도 본다 — 그 줄을 따라 치는 것은 사람·AI이고, 깨진 경로는 md와 똑같이 안 닿는다.
const isSource = (f) => /\.(mjs|cjs|js)$/.test(f);
const roots = [ROOT, ...EXTRA_ROOTS];
for (const root of roots) {
  for (const file of collect(path.join(repoRoot, root), [], root === ROOT ? undefined : isSource)) {
    const skillDir = root === ROOT ? resolveSkillDir(file) : null;
    fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, index) => {
      for (const match of line.matchAll(INVOCATION)) {
        const raw = match[1];
        const where = { file: path.relative(repoRoot, file).replaceAll('\\', '/'), lineNo: index + 1, line: line.trim() };
        if (AGENT_HOME.test(raw)) {
          agentHome.push(where);
          continue;
        }
        if (!ANCHORED.test(raw)) {
          offenders.push(where);
          continue;
        }
        if (!skillDir || !raw.startsWith('{{skill_dir}}/')) continue; // 다른 앵커는 이 레포 밖을 가리킬 수 있어 실재를 못 본다
        const target = path.join(skillDir, raw.slice('{{skill_dir}}/'.length));
        if (!fs.existsSync(target)) missing.push({ ...where, target: path.relative(repoRoot, target).replaceAll('\\', '/') });
      }
    });
  }
}

if (offenders.length > 0) {
  console.error('실행 위치에 따라 달라지는 스크립트 호출:');
  for (const { file, lineNo, line } of offenders) console.error(`  ${file}:${lineNo}: ${line}`);
  console.error('');
  console.error('스크립트가 스킬 폴더에 있으면 `{{skill_dir}}/<경로>`로 적는다 — 배포가 절대경로로 채운다.');
  console.error('다른 레포 소유면 그 레포 경로를 앞에 붙여 적는다.');
}

if (missing.length > 0) {
  console.error(`${offenders.length ? '\n' : ''}{{skill_dir}}가 없는 파일을 가리킨다:`);
  for (const { file, lineNo, target } of missing) console.error(`  ${file}:${lineNo} → ${target}`);
  console.error('');
  console.error('{{skill_dir}}는 스킬 루트로 채워진다 — 하위 폴더의 스크립트는 그 폴더까지 적는다.');
  console.error('  예: session-timeline/SKILL.md에서 → {{skill_dir}}/session-timeline/scripts/x.mjs');
}

if (agentHome.length > 0) {
  console.error(`${offenders.length + missing.length ? '\n' : ''}특정 에이전트의 홈 경로를 박은 호출:`);
  for (const { file, lineNo, line } of agentHome) console.error(`  ${file}:${lineNo}: ${line}`);
  console.error('');
  console.error('배포는 claude·codex·gemini 셋 다에 깔린다 — `~/.claude/...`는 나머지 둘에서 없는 경로다.');
  console.error('`{{contexts}}/<파일>`·`{{skill_dir}}/<경로>`로 적으면 배포가 각 타겟의 절대경로로 채운다.');
}

if (offenders.length + missing.length + agentHome.length > 0) process.exit(1);

console.log(`${roots.join('·')} 스크립트 호출 모두 실행 위치 무관, 가리키는 파일 실재`);
