#!/usr/bin/env node
const path = require('path');

const {
  CATEGORIES,
  comparePaths,
  copyPath,
  defaultCodexDir,
  defaultClaudeDir,
  deployCodexGlobals,
  deployRootFiles,
  deploySkills,
  ensureDeploySource,
  ensureDir,
  listEntries,
  registerWtAddAlias,
  resolveUserPath,
  sourceDir,
  uninstallTarget,
  verifySettings,
} = require('./deploy-lib');

function main() {
  ensureDeploySource();

  const targetArg = process.argv[2];
  const targetDir = resolveUserPath(targetArg || defaultClaudeDir());
  console.log(`소스: ${sourceDir}`);
  console.log(`타겟: ${targetDir}`);
  console.log('---');

  ensureDir(targetDir);

  console.log('기존 파일 제거 중...');
  uninstallTarget(targetDir, { removeAlias: false });
  console.log('');

  let copied = 0;

  for (const category of CATEGORIES) {
    const src = path.join(sourceDir, category);
    if (!existsDir(src)) continue;

    copyPath(src, path.join(targetDir, category));
    console.log(`  COPY  ${category}/`);
    copied += 1;
  }

  copied += deploySkills(targetDir, console.log);

  console.log('---');
  console.log(`복사 완료: ${copied}개`);
  console.log('');

  copied += deployRootFiles(targetDir, console.log);

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

  const srcSkills = path.join(sourceDir, 'skills');
  if (existsDir(srcSkills)) {
    for (const entry of listEntries(srcSkills)) {
      const src = path.join(srcSkills, entry.name);
      const target = path.join(targetDir, 'skills', entry.name);
      if (!pathExists(target)) {
        fail(failures, `skills/${entry.name} 존재하지 않음`);
      } else if (comparePaths(src, target)) {
        console.log(`  PASS  skills/${entry.name}`);
      } else {
        fail(failures, `skills/${entry.name} 내용 불일치`);
      }
    }
  }

  for (const entry of listEntries(sourceDir)) {
    if (!entry.isFile()) continue;

    const src = path.join(sourceDir, entry.name);
    const target = path.join(targetDir, entry.name);
    if (!pathExists(target)) {
      fail(failures, `${entry.name} 존재하지 않음`);
    } else if (entry.name === 'settings.json') {
      if (verifySettings(src, target)) {
        console.log(`  PASS  ${entry.name} (merged)`);
      } else {
        fail(failures, `${entry.name} 머지 결과 키 불일치`);
      }
    } else if (comparePaths(src, target)) {
      console.log(`  PASS  ${entry.name}`);
    } else {
      fail(failures, `${entry.name} 내용 불일치`);
    }
  }

  console.log('---');
  if (failures.length > 0) {
    console.error(`검증 실패: ${failures.length}개 항목 확인 필요`);
    process.exit(1);
  }
  console.log('검증 완료: 모두 정상');

  console.log('');
  console.log('---');
  console.log('git wt-add alias 등록 중...');
  registerWtAddAlias(console.log);

  if (!targetArg) {
    console.log('');
    console.log('---');
    const codexTargetDir = defaultCodexDir();
    console.log(`Codex 전역 자산 배포 중: ${codexTargetDir}`);
    const codexCopied = deployCodexGlobals(codexTargetDir, console.log);
    console.log(`Codex 배포 완료: ${codexCopied}개`);
    verifyCodexGlobals(codexTargetDir);
  }
}

function verifyCodexGlobals(targetDir) {
  console.log('');
  console.log('Codex 검증 중...');
  const failures = [];

  const srcContexts = path.join(sourceDir, 'contexts');
  const targetContexts = path.join(targetDir, 'contexts');
  if (!existsDir(targetContexts)) {
    fail(failures, 'codex contexts/ 존재하지 않음');
  } else if (comparePaths(srcContexts, targetContexts)) {
    console.log('  PASS  codex contexts/');
  } else {
    fail(failures, 'codex contexts/ 내용 불일치');
  }

  const srcSkills = path.join(sourceDir, 'skills');
  if (existsDir(srcSkills)) {
    for (const entry of listEntries(srcSkills)) {
      const src = path.join(srcSkills, entry.name);
      const target = path.join(targetDir, 'skills', entry.name);
      if (!pathExists(target)) {
        fail(failures, `codex skills/${entry.name} 존재하지 않음`);
      } else if (comparePaths(src, target)) {
        console.log(`  PASS  codex skills/${entry.name}`);
      } else {
        fail(failures, `codex skills/${entry.name} 내용 불일치`);
      }
    }
  }

  if (failures.length > 0) {
    console.error(`Codex 검증 실패: ${failures.length}개 항목 확인 필요`);
    process.exit(1);
  }
  console.log('Codex 검증 완료: 모두 정상');
}

function fail(failures, message) {
  failures.push(message);
  console.log(`  FAIL  ${message}`);
}

function pathExists(target) {
  return require('fs').existsSync(target);
}

function existsDir(target) {
  const fs = require('fs');
  return fs.existsSync(target) && fs.statSync(target).isDirectory();
}

main();
