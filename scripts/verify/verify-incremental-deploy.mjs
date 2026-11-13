#!/usr/bin/env node
// 배포가 내용이 바뀐 파일만 쓰는지 검사한다.
//
// 바뀌지 않은 파일까지 다시 쓰면 열려 있던 다른 세션이 그 스킬·문서를 모두 새로 받은 것으로
// 알림받아 다시 읽는다. 배포 로그로는 드러나지 않으므로 임시 폴더에 실제 배포 함수를 돌려
// 고정한다. 모든 쓰기는 자기 mkdtemp 폴더 안에서만 한다.
import childProcess from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  claudeImportLines,
  deployClaudeImports,
  listEntries,
  pluginSkillsDir,
  removeLegacyCategories,
  removePluginSkillCopies,
  sourceDir,
  uninstallClaudeImports,
  uninstallTarget,
  verifyClaudeImports,
} from '../lib/deploy-lib.mjs';
import { copyLocalHooks } from '../local-system/local-deploy-lib.mjs';
import { syncLocalAssets } from '../local-system/sync-local-assets.mjs';

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

const snapshotMtimes = (dir) => new Map(listFiles(dir).map((rel) => [rel, fs.statSync(path.join(dir, rel)).mtimeMs]));
const changedMtimes = (before, after) => [...new Set([...before.keys(), ...after.keys()])]
  .filter((rel) => before.get(rel) !== after.get(rel)).sort();

function deployAll(targetDir) {
  return removeLegacyCategories(targetDir, quiet) + removePluginSkillCopies(targetDir, quiet);
}

try {
  const target = path.join(root, 'claude');
  const writeFile = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };

  console.log('전역 배포 — 예전 sync가 둔 contexts·hooks 사본을 지움');
  // hook·contexts는 plugin ac가 원본을 읽는다. 사본이 남으면 사람·AI가 낡은 사본을 원본으로 잘못 고친다.
  writeFile(path.join(target, 'contexts', 'stale', 'x.md'), 'x');
  writeFile(path.join(target, 'hooks', 'old-hook.mjs'), 'x');
  const keepFile = path.join(target, 'plans', 'p.md');
  writeFile(keepFile, 'x');
  check('바꾼 것 2개(contexts·hooks 폴더)', deployAll(target) === 2);
  check('contexts·hooks가 사라짐', ['contexts', 'hooks'].every((category) => !fs.existsSync(path.join(target, category))));
  check('AC 것이 아닌 폴더(plans/)는 남음', fs.existsSync(keepFile));

  console.log('전역 배포 — 다시 돌리면 아무것도 안 씀');
  const before = snapshotMtimes(target);
  check('바꾼 파일 0개', deployAll(target) === 0);
  check('모든 파일의 수정 시각이 그대로', changedMtimes(before, snapshotMtimes(target)).length === 0);

  console.log('전역 배포 — plugin 스킬의 옛 사본은 지우고 다른 스킬은 둠');
  const [pluginSkill, otherPluginSkill] = listEntries(pluginSkillsDir).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const oldSkillCopy = path.join(target, 'skills', pluginSkill, 'SKILL.md');
  const userSkill = path.join(target, 'skills', otherPluginSkill, 'SKILL.md');
  const synced = path.join(target, 'skills', 'synced', 'x', 'SKILL.md');
  // 예전 sync가 렌더해 둔 사본은 앵커를 갖는다. 같은 이름이어도 앵커가 없으면 사용자가 만든 스킬이다.
  writeFile(oldSkillCopy, '---\nname: x\n---\n\n<!-- deploy-anchor -->\n이 파일은 ...\n');
  writeFile(userSkill, '---\nname: mine\n---\n');
  writeFile(synced, 'x');
  deployAll(target);
  check('plugin이 설치되지 않은 타겟이면 옛 사본을 지우지 않음', fs.existsSync(oldSkillCopy));
  writeFile(path.join(target, 'plugins', 'installed_plugins.json'), JSON.stringify({ plugins: { 'ac@ac': [{ scope: 'user' }] } }));
  deployAll(target);
  check('plugin에 있는 이름의 옛 사본이 지워짐', !fs.existsSync(path.dirname(oldSkillCopy)));
  check('이름이 같아도 앵커가 없는(사용자가 만든) 스킬은 남음', fs.existsSync(userSkill));
  check('AC 것이 아닌 스킬(synced/)은 남음', fs.existsSync(synced));

  console.log('전역 배포 — unsync 뒤 잔여 없음');
  writeFile(oldSkillCopy, '<!-- deploy-anchor -->\n');
  writeFile(path.join(target, 'hooks', 'old-hook.mjs'), 'x');
  fs.rmSync(path.join(target, 'plugins'), { recursive: true, force: true });
  uninstallTarget(target, { log: quiet, removeAlias: false });
  check('옛 hooks 사본이 사라짐', !fs.existsSync(path.join(target, 'hooks')));
  check('plugin이 없어도 unsync는 옛 사본을 지우고 AC 것이 아닌 것만 남김', listEntries(path.join(target, 'skills')).map((entry) => entry.name).sort().join() === [otherPluginSkill, 'synced'].sort().join());

  console.log('전역 CLAUDE.md — 복사본을 import 줄로 바꾸고 unsync는 그 줄만 걷음');
  const home = path.join(root, 'home');
  const homeRules = path.join(home, 'rules');
  const USER_LINE = 'user line';
  const USER_NOTE = '# user note';
  const imports = claudeImportLines();
  const ruleNames = listEntries(path.join(sourceDir, 'rules')).filter((entry) => entry.isFile()).map((entry) => entry.name);
  fs.mkdirSync(homeRules, { recursive: true });
  fs.copyFileSync(path.join(sourceDir, 'CLAUDE.md'), path.join(home, 'CLAUDE.md'));
  for (const name of ruleNames) fs.copyFileSync(path.join(sourceDir, 'rules', name), path.join(homeRules, name));
  fs.writeFileSync(path.join(homeRules, 'mine.md'), '# 내 규칙\n');
  deployClaudeImports(home, quiet);
  check('예전 사본이 import 줄로 바뀜', fs.readFileSync(path.join(home, 'CLAUDE.md'), 'utf8') === `${imports.join('\n')}\n`);
  check('import 줄이 원본 CLAUDE.md와 rules를 모두 가리킴', imports.length === 1 + ruleNames.length);
  check('import 줄이 워크트리가 아니라 본 체크아웃을 가리킴', imports.every((line) => !line.includes('/.claude/worktrees/')));
  check('rules/의 원본 이름 사본만 지워지고 사용자 rule은 남음',
    ruleNames.every((name) => !fs.existsSync(path.join(homeRules, name))) && fs.existsSync(path.join(homeRules, 'mine.md')));
  check('대조 통과', verifyClaudeImports(home));
  fs.appendFileSync(path.join(home, 'CLAUDE.md'), `\n${USER_LINE}\n`);
  const homeBefore = snapshotMtimes(home);
  check('다시 돌리면 아무것도 안 씀(사용자 줄 포함)', deployClaudeImports(home, quiet) === 0
    && changedMtimes(homeBefore, snapshotMtimes(home)).length === 0);
  uninstallClaudeImports(home, quiet);
  check('unsync 뒤 사용자 줄만 남음', fs.readFileSync(path.join(home, 'CLAUDE.md'), 'utf8') === `${USER_LINE}\n`);
  check('unsync 뒤 사용자 rule이 남음', fs.existsSync(path.join(homeRules, 'mine.md')));
  fs.writeFileSync(path.join(home, 'CLAUDE.md'), `${imports.join('\n')}\n`);
  uninstallClaudeImports(home, quiet);
  check('import 줄뿐이면 unsync가 파일을 지움', !fs.existsSync(path.join(home, 'CLAUDE.md')));

  console.log('전역 CLAUDE.md — 사본인지는 원본 이력으로 가르고, 사용자 파일은 지우지 않음');
  const firstSha = childProcess.execFileSync('git', ['-C', sourceDir, 'log', '--reverse', '--format=%H', '--', 'CLAUDE.md'], { encoding: 'utf8' }).split('\n')[0];
  const oldCopy = childProcess.execFileSync('git', ['-C', sourceDir, 'show', `${firstSha}:deploy/CLAUDE.md`], { encoding: 'utf8' });
  fs.writeFileSync(path.join(home, 'CLAUDE.md'), oldCopy);
  deployClaudeImports(home, quiet);
  check('옛 버전 사본도 import 줄로 바뀜', fs.readFileSync(path.join(home, 'CLAUDE.md'), 'utf8') === `${imports.join('\n')}\n`);
  const ownRule = path.join(homeRules, ruleNames[0]);
  fs.writeFileSync(ownRule, '# 전환 뒤 사용자가 만든 같은 이름 rule\n');
  deployClaudeImports(home, quiet);
  check('전환 뒤 만든 같은 이름 rule은 지우지 않음', fs.existsSync(ownRule));
  fs.writeFileSync(path.join(home, 'CLAUDE.md'), `${USER_NOTE}\n`);
  deployClaudeImports(home, quiet);
  check('사용자가 쓴 CLAUDE.md는 import 줄 아래에 남음',
    fs.readFileSync(path.join(home, 'CLAUDE.md'), 'utf8') === `${imports.join('\n')}\n\n${USER_NOTE}\n`);
  fs.writeFileSync(path.join(home, 'CLAUDE.md'), `${USER_NOTE}\n`);
  uninstallClaudeImports(home, quiet);
  check('import 줄 없는 사용자 CLAUDE.md는 unsync가 지우지 않음', fs.existsSync(path.join(home, 'CLAUDE.md')));

  console.log('로컬 자산 배포 — 커밋된 스킬은 건드리지 않고, 다시 돌리면 아무것도 안 씀');
  const repo = path.join(root, 'repo');
  fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'local', 'skills', 'sample'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'local', 'agents'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'local', 'contexts'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'local', 'hooks'), { recursive: true });
  // contexts는 배포를 멈췄다. 그전에 배포된 옛 사본이 남아 있으면 sync가 지워야 한다.
  const retiredCopy = path.join(repo, '.claude', 'contexts', 'old.md');
  fs.mkdirSync(path.dirname(retiredCopy), { recursive: true });
  fs.writeFileSync(retiredCopy, '# 옛 사본\n');
  fs.writeFileSync(path.join(repo, 'local', 'skills', 'sample', 'SKILL.md'), '---\ndescription: 남은 옛 원본\n---\n');
  // 스킬은 레포가 .claude/skills/에 커밋한다. local/skills가 남아 있어도 그것으로 덮어쓰면 안 된다.
  const committedSkill = path.join(repo, '.claude', 'skills', 'sample', 'SKILL.md');
  const committedText = '---\ndescription: 설명\n---\n\n# 제목\n';
  fs.mkdirSync(path.dirname(committedSkill), { recursive: true });
  fs.writeFileSync(committedSkill, committedText);
  fs.writeFileSync(path.join(repo, 'local', 'agents', 'a.md'), '# a\n');
  fs.writeFileSync(path.join(repo, 'local', 'contexts', 'c.md'), '# c\n');
  fs.writeFileSync(path.join(repo, 'local', 'hooks', 'h.mjs'), '// hook\n');
  fs.writeFileSync(path.join(repo, 'local', 'base-settings.json'), '{ "hooks": [] }\n');
  fs.writeFileSync(path.join(repo, 'CLAUDE.md'), '# 레포\n');
  const runLocal = () => {
    const argv = process.argv;
    const log = console.log;
    process.argv = [argv[0], argv[1], repo];
    console.log = quiet;
    try {
      syncLocalAssets({ ensureHooks: false });
      copyLocalHooks(quiet, repo);
    } finally {
      process.argv = argv;
      console.log = log;
    }
  };
  runLocal();
  check('커밋된 .claude/skills를 local/skills로 덮어쓰지 않음', fs.readFileSync(committedSkill, 'utf8') === committedText);
  check('.agents·AGENTS.md·GEMINI.md를 만들지 않음',
    ['.agents', 'AGENTS.md', 'GEMINI.md'].every((name) => !fs.existsSync(path.join(repo, name))));
  check('로컬 hook이 배포됨', fs.existsSync(path.join(repo, '.claude', 'hooks', 'h.mjs')));
  check('local/agents가 배포됨', fs.existsSync(path.join(repo, '.claude', 'agents', 'a.md')));
  check('local/contexts는 배포하지 않고 옛 .claude/contexts 사본은 지움', !fs.existsSync(path.join(repo, '.claude', 'contexts')));
  const localBefore = snapshotMtimes(repo);
  runLocal();
  check('모든 파일의 수정 시각이 그대로', changedMtimes(localBefore, snapshotMtimes(repo)).length === 0);
  fs.rmSync(path.join(repo, 'local', 'agents', 'a.md'));
  runLocal();
  // 고친 것은 원본(local/)이다 — 배포본 쪽 변화만 센다.
  const localTouched = changedMtimes(localBefore, snapshotMtimes(repo)).filter((rel) => !rel.startsWith(`local${path.sep}`));
  check('지운 agents 파일만 바뀜', localTouched.length === 1 && localTouched[0].endsWith(path.join('agents', 'a.md')));
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

if (failed > 0) {
  console.error(`\n바뀐 파일만 배포 계약 위반 ${failed}건`);
  process.exit(1);
}
console.log('\n바뀐 파일만 배포 계약 정상');
