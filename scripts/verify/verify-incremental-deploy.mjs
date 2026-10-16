#!/usr/bin/env node
// 배포가 내용이 바뀐 파일만 쓰는지 검사한다.
//
// 바뀌지 않은 파일까지 다시 쓰면 열려 있던 다른 세션이 그 스킬·문서를 모두 새로 받은 것으로
// 알림받아 다시 읽는다. 배포 로그로는 드러나지 않으므로 임시 폴더에 실제 배포 함수를 돌려
// 고정한다. 모든 쓰기는 자기 mkdtemp 폴더 안에서만 한다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  CATEGORIES,
  copyPath,
  deployCategory,
  deployCodexGlobals,
  deployGeminiGlobals,
  deploySkills,
  injectSkillName,
  listEntries,
  resolveRulePaths,
  sourceDir,
  uninstallTarget,
} from '../lib/deploy-lib.mjs';
import { copyLocalHooks } from '../local-system/local-deploy-lib.mjs';
import { syncLocalSkills } from '../local-system/sync-local-skills.mjs';

const quiet = () => {};
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ac-incremental-deploy-'));

let failed = 0;
function check(label, condition) {
  console.log(`  ${condition ? 'PASS' : 'FAIL'}  ${label}`);
  if (!condition) failed += 1;
}

function listFiles(dir, base = dir, found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listFiles(full, base, found);
    else found.push(path.relative(base, full));
  }
  return found.sort();
}

const snapshotBytes = (dir) => new Map(listFiles(dir).map((rel) => [rel, fs.readFileSync(path.join(dir, rel))]));
const snapshotMtimes = (dir) => new Map(listFiles(dir).map((rel) => [rel, fs.statSync(path.join(dir, rel)).mtimeMs]));
const changedMtimes = (before, after) => [...new Set([...before.keys(), ...after.keys()])]
  .filter((rel) => before.get(rel) !== after.get(rel)).sort();

function sameBytes(left, right) {
  if (left.size !== right.size) return false;
  for (const [rel, buf] of left) if (!right.get(rel)?.equals(buf)) return false;
  return true;
}

// 지금까지의 배포 방식(통째로 복사한 뒤 그 자리에서 렌더)과 같은 결과를 만든다. 비교 기준이다.
function legacyDeploy(targetDir) {
  for (const category of CATEGORIES) copyPath(path.join(sourceDir, category), path.join(targetDir, category));
  resolveRulePaths(targetDir);
  for (const entry of listEntries(path.join(sourceDir, 'skills'))) {
    const dest = path.join(targetDir, 'skills', entry.name);
    copyPath(path.join(sourceDir, 'skills', entry.name), dest);
    if (entry.isDirectory()) injectSkillName(dest);
  }
}

function deployAll(targetDir, srcRoot = sourceDir) {
  let changed = 0;
  for (const category of CATEGORIES) changed += deployCategory(targetDir, category, quiet, srcRoot);
  changed += deploySkills(targetDir, quiet, srcRoot);
  return changed;
}

try {
  const target = path.join(root, 'claude');

  console.log('전역 배포 — 기존 방식과 같은 결과');
  legacyDeploy(target);
  const legacy = snapshotBytes(target);
  fs.rmSync(target, { recursive: true, force: true });
  deployAll(target);
  check('파일 목록과 내용이 기존 방식과 바이트 단위로 같음', sameBytes(legacy, snapshotBytes(target)));

  console.log('전역 배포 — 다시 돌리면 아무것도 안 씀');
  const before = snapshotMtimes(target);
  check('바꾼 파일 0개', deployAll(target) === 0);
  check('모든 파일의 수정 시각이 그대로', changedMtimes(before, snapshotMtimes(target)).length === 0);

  console.log('전역 배포 — 원본 하나만 바꾸면 그 파일만');
  const src = path.join(root, 'src');
  for (const category of [...CATEGORIES, 'skills']) copyPath(path.join(sourceDir, category), path.join(src, category));
  const skillName = listEntries(path.join(src, 'skills')).find((entry) => entry.isDirectory()).name;
  const editedSkill = path.join('skills', skillName, 'SKILL.md');
  fs.appendFileSync(path.join(src, editedSkill), '\n추가 줄\n');
  const removedContext = path.join('contexts', listFiles(path.join(src, 'contexts'))[0]);
  fs.rmSync(path.join(src, removedContext));
  // 배포본 폴더로 렌더되므로 원본 폴더가 달라도 경로가 같다 — 바뀐 것은 고친 두 파일뿐이어야 한다.
  const beforeEdit = snapshotMtimes(target);
  const editChanged = deployAll(target, src);
  const touched = changedMtimes(beforeEdit, snapshotMtimes(target));
  check('바꾼 파일 2개(고친 스킬 md 1, 지운 contexts 1)', editChanged === 2);
  check('수정 시각이 바뀐 것은 그 둘뿐', touched.length === 2 && touched.includes(editedSkill) && touched.includes(removedContext));
  check('지운 원본은 배포본에서도 사라짐', !fs.existsSync(path.join(target, removedContext)));

  console.log('전역 배포 — 고아는 지우고 외부 스킬은 둠');
  const preserved = path.join(target, 'skills', 'vercel-react-best-practices', 'SKILL.md');
  const staleSkill = path.join(target, 'skills', 'stale-skill', 'SKILL.md');
  const staleContext = path.join(target, 'contexts', 'stale', 'x.md');
  for (const file of [preserved, staleSkill, staleContext]) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'x');
  }
  deployAll(target);
  check('원본에 없는 스킬 폴더가 지워짐', !fs.existsSync(path.dirname(staleSkill)));
  check('원본에 없는 contexts 하위 폴더가 지워짐', !fs.existsSync(path.dirname(staleContext)));
  check('보존 목록의 외부 스킬은 남음', fs.existsSync(preserved));
  check('원래 원본으로 되돌리면 기존 방식과 다시 같음', sameBytes(new Map([...snapshotBytes(target)].filter(([rel]) => !rel.startsWith(path.join('skills', 'vercel-react-best-practices')))), legacy));

  console.log('전역 배포 — unsync 뒤 잔여 없음');
  uninstallTarget(target, { log: quiet, removeAlias: false });
  check('rules·contexts·hooks가 사라짐', CATEGORIES.every((category) => !fs.existsSync(path.join(target, category))));
  check('스킬은 외부 스킬만 남음', listEntries(path.join(target, 'skills')).map((entry) => entry.name).join() === 'vercel-react-best-practices');

  for (const [label, deploy] of [['Codex', deployCodexGlobals], ['Gemini', deployGeminiGlobals]]) {
    console.log(`${label} 배포 — 다시 돌리면 아무것도 안 씀`);
    const dir = path.join(root, label.toLowerCase());
    deploy(dir, quiet);
    const first = snapshotMtimes(dir);
    check('바꾼 파일 0개', deploy(dir, quiet) === 0);
    check('모든 파일의 수정 시각이 그대로', changedMtimes(first, snapshotMtimes(dir)).length === 0);
  }

  console.log('로컬 스킬 배포 — 다시 돌리면 아무것도 안 씀');
  const repo = path.join(root, 'repo');
  fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'local', 'skills', 'sample'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'local', 'contexts'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'local', 'hooks'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'local', 'skills', 'sample', 'SKILL.md'), '---\ndescription: 설명\n---\n\n# 제목\n');
  fs.writeFileSync(path.join(repo, 'local', 'contexts', 'a.md'), '# a\n');
  fs.writeFileSync(path.join(repo, 'local', 'hooks', 'h.mjs'), '// hook\n');
  fs.writeFileSync(path.join(repo, 'local', 'base-settings.json'), '{ "hooks": [] }\n');
  fs.writeFileSync(path.join(repo, 'CLAUDE.md'), '# 레포\n');
  const runLocal = () => {
    const argv = process.argv;
    const log = console.log;
    process.argv = [argv[0], argv[1], repo];
    console.log = quiet;
    try {
      syncLocalSkills({ ensureHooks: false });
      copyLocalHooks(quiet, repo);
    } finally {
      process.argv = argv;
      console.log = log;
    }
  };
  runLocal();
  check('로컬 스킬이 .claude·.agents에 렌더돼 배포됨',
    ['.claude', '.agents'].every((dir) => /^name: sample$/m.test(fs.readFileSync(path.join(repo, dir, 'skills', 'sample', 'SKILL.md'), 'utf8'))));
  check('로컬 hook이 배포됨', fs.existsSync(path.join(repo, '.claude', 'hooks', 'h.mjs')));
  const localBefore = snapshotMtimes(repo);
  runLocal();
  check('모든 파일의 수정 시각이 그대로', changedMtimes(localBefore, snapshotMtimes(repo)).length === 0);
  fs.rmSync(path.join(repo, 'local', 'contexts', 'a.md'));
  fs.appendFileSync(path.join(repo, 'local', 'skills', 'sample', 'SKILL.md'), '\n추가 줄\n');
  runLocal();
  // 고친 것은 원본(local/)이다 — 배포본 쪽 변화만 센다.
  const localTouched = changedMtimes(localBefore, snapshotMtimes(repo)).filter((rel) => !rel.startsWith(`local${path.sep}`));
  check('고친 스킬과 지운 contexts만 바뀜(.claude·.agents 각각)', localTouched.length === 4
    && localTouched.every((rel) => rel.endsWith(path.join('skills', 'sample', 'SKILL.md')) || rel.endsWith(path.join('contexts', 'a.md'))));
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

if (failed > 0) {
  console.error(`\n바뀐 파일만 배포 계약 위반 ${failed}건`);
  process.exit(1);
}
console.log('\n바뀐 파일만 배포 계약 정상');
