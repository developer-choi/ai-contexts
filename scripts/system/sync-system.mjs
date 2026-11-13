#!/usr/bin/env node
// 사용법: sync-system.md (같은 폴더)
import fs from 'node:fs';
import path from 'node:path';
import { ensureHooksReady } from '../lib/hook-guard.mjs';
import { runVerifications } from '../lib/verify-runner.mjs';

import {
  CATEGORIES,
  IMPORTED_ROOT_FILES,
  SOURCE_ONLY_ROOT_FILES,
  claudeSettingsObject,
  comparePaths,
  defaultClaudeDir,
  deployCategory,
  deployRootFiles,
  removeLegacyCategories,
  removePluginSkillCopies,
  pluginSkillCopies,
  acPluginInstalled,
  ensureDeploySource,
  ensureDir,
  listEntries,
  unsetWtAddAlias,
  resolveUserPath,
  sourceDir,
  verifyClaudeImports,
  verifySettings,
} from '../lib/deploy-lib.mjs';

// 배포 전 fail-fast 게이트. 디스크에 쓰는 것은 verify-source-usage 하나뿐이고 그것도 자기
// mkdtemp 폴더 안에서만 쓰므로, 겹쳐 돌려도 서로 간섭하지 않는다.
const scriptsDir = path.join(import.meta.dirname, '..');
const VERIFY_STEPS = [
  // base-settings.json 생성 계약이 깨지면 배포 전에 중단(fail-fast).
  { file: path.join(scriptsDir, 'settings', 'verify-settings-projection.mjs') },
  // 정책 hook은 구멍이 나도 조용하다(등록·실행은 정상, 특정 명령 형태만 통과). 배포 전에 판정을 고정한다.
  { file: path.join(scriptsDir, 'verify', 'verify-hook-policies.mjs') },
  // 목적 없는 스킬이 배포되면 나중에 본문이 목적에서 벗어났는지 판정할 기준이 없다.
  { file: path.join(scriptsDir, 'verify', 'verify-skill-purpose.mjs') },
  // SKILL.md 렌더링이 멱등을 잃으면 매 sync마다 배포본이 달라져 "변경 없음"으로 수렴하지 않는다.
  { file: path.join(scriptsDir, 'verify', 'verify-skill-render.mjs') },
  // 배포가 바뀌지 않은 파일까지 다시 쓰면, 열려 있던 다른 세션이 그 스킬·문서를 모두 새로 받아 다시 읽는다.
  { file: path.join(scriptsDir, 'verify', 'verify-incremental-deploy.mjs') },
  // 실행 위치에 기대는 스크립트 호출이 배포되면, 그 스킬을 다른 레포에서 부른 순간 엉뚱한 폴더를 뒤진다.
  { file: path.join(scriptsDir, 'verify', 'verify-skill-script-paths.mjs') },
  // 잘못 세는 눈금은 그 자리에서 정상으로 보이고 몇 달 뒤 안 차는 것으로만 드러난다. 그때는 어느 회차가 틀렸는지 못 되짚는다.
  { file: path.join(scriptsDir, 'verify', 'verify-source-usage.mjs') },
];

async function main() {
  ensureDeploySource();
  await runVerifications(VERIFY_STEPS, ensureHooksReady);

  const targetArg = process.argv[2];
  const targetDir = resolveUserPath(targetArg || defaultClaudeDir());
  console.log(`소스: ${sourceDir}`);
  console.log(`타겟: ${targetDir}`);
  console.log('---');

  ensureDir(targetDir);

  // 내용이 바뀐 파일만 쓰고, 원본에서 사라진 파일만 지운다(이유는 deploy-lib의 writeIfChanged 주석).
  let changed = removeLegacyCategories(targetDir, console.log);
  for (const category of CATEGORIES) {
    changed += deployCategory(targetDir, category, console.log);
  }
  // 전역 스킬은 plugin `ac`가 맡는다. 예전 sync가 배포해 둔 같은 이름의 사본만 지운다.
  changed += removePluginSkillCopies(targetDir, console.log);
  changed += deployRootFiles(targetDir, console.log);

  console.log('---');
  console.log(changed === 0 ? '변경 없음' : `바뀐 파일: ${changed}개`);
  console.log('');

  console.log('검증 중...');
  const failures = [];

  for (const category of CATEGORIES) {
    const src = path.join(sourceDir, category);
    if (!existsDir(src)) continue;

    const target = path.join(targetDir, category);
    if (!existsDir(target)) {
      fail(failures, `${category}/ 존재하지 않음`);
    } else if (comparePaths(src, target)) {
      console.log(`  PASS  ${category}/`);
    } else {
      fail(failures, `${category}/ 내용 불일치`);
    }
  }

  const leftCopies = pluginSkillCopies(targetDir);
  if (leftCopies.length > 0) {
    const why = acPluginInstalled(targetDir) ? '' : ' — plugin ac가 설치되지 않아 두었다(meta/INSTALLATION_GUIDE.md의 plugin 등록 명령)';
    fail(failures, `plugin ac 스킬의 옛 사본이 남음: ${leftCopies.map((name) => `skills/${name}`).join(', ')}${why}`);
  } else {
    console.log('  PASS  skills/ (plugin ac 스킬의 옛 사본 없음)');
  }

  for (const entry of listEntries(sourceDir)) {
    if (!entry.isFile()) continue;
    if (SOURCE_ONLY_ROOT_FILES.has(entry.name) || IMPORTED_ROOT_FILES.has(entry.name)) continue;

    const src = path.join(sourceDir, entry.name);
    const target = path.join(targetDir, entry.name);
    if (!pathExists(target)) {
      fail(failures, `${entry.name} 존재하지 않음`);
    } else if (comparePaths(src, target)) {
      console.log(`  PASS  ${entry.name}`);
    } else {
      fail(failures, `${entry.name} 내용 불일치`);
    }
  }

  if (verifyClaudeImports(targetDir)) {
    console.log('  PASS  CLAUDE.md (import)');
  } else {
    fail(failures, 'CLAUDE.md의 ai-contexts import 줄이 원본 목록과 다름');
  }

  const targetSettings = path.join(targetDir, 'settings.json');
  if (!pathExists(targetSettings)) {
    fail(failures, 'settings.json 존재하지 않음');
  } else if (verifySettings(claudeSettingsObject(), targetSettings)) {
    console.log('  PASS  settings.json (merged)');
  } else {
    fail(failures, 'settings.json 머지 결과 키 불일치');
  }

  console.log('---');
  if (failures.length > 0) {
    console.error(`검증 실패: ${failures.length}개 항목 확인 필요`);
    process.exit(1);
  }
  console.log('검증 완료: 모두 정상');

  console.log('');
  console.log('---');
  console.log('구버전 git wt-add alias 정리 중 (워크트리 복구는 self-heal hook이 전담)...');
  unsetWtAddAlias(console.log);
}

function fail(failures, message) {
  failures.push(message);
  console.log(`  FAIL  ${message}`);
}

function pathExists(target) {
  return fs.existsSync(target);
}

function existsDir(target) {
  return fs.existsSync(target) && fs.statSync(target).isDirectory();
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
