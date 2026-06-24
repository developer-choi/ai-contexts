#!/usr/bin/env node
const path = require('path');
const { ensureHooksReady } = require('./hook-guard');

const {
  CATEGORIES,
  SOURCE_ONLY_ROOT_FILES,
  buildCodexAgentsContent,
  claudeSettingsObject,
  codexHooksObject,
  comparePaths,
  copyPath,
  defaultCodexDir,
  defaultClaudeDir,
  defaultGeminiDir,
  deployCodexGlobals,
  deployGeminiGlobals,
  deployRootFiles,
  deploySkills,
  ensureDeploySource,
  ensureDir,
  listEntries,
  unsetWtAddAlias,
  resolveUserPath,
  sourceDir,
  trustCodexHooks,
  uninstallTarget,
  verifyJsonExact,
  verifySettings,
} = require('./deploy-lib');

async function main() {
  ensureHooksReady();
  ensureDeploySource();
  // base-settings.json 생성 계약이 깨지면 배포 전에 중단(fail-fast).
  require('child_process').execFileSync(process.execPath, [path.join(__dirname, 'verify-settings-projection.js')], { stdio: 'inherit' });
  // contexts map.md ↔ 파일 목록 정합이 깨지면 배포 전에 중단(fail-fast).
  require('child_process').execFileSync(process.execPath, [path.join(__dirname, 'verify-context-maps.js')], { stdio: 'inherit' });

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
    if (SOURCE_ONLY_ROOT_FILES.has(entry.name)) continue;

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

  if (!targetArg) {
    console.log('');
    console.log('---');
    const codexTargetDir = defaultCodexDir();
    console.log(`Codex 전역 자산 배포 중: ${codexTargetDir}`);
    const codexCopied = deployCodexGlobals(codexTargetDir, console.log);
    console.log(`Codex 배포 완료: ${codexCopied}개`);
    try {
      await trustCodexHooks(codexTargetDir, console.log);
    } catch (error) {
      if (!isRecoverableCodexTrustError(error)) throw error;
      console.warn(`  WARN  Codex hook trust 건너뜀: ${error.message}`);
      console.warn('  WARN  Codex Desktop이 CLI를 외부에서 실행할 수 없는 환경입니다. 배포 자산은 정상 복사되었고, hook trust는 Desktop에서 다시 확인하면 됩니다.');
    }
    verifyCodexGlobals(codexTargetDir);

    console.log('');
    console.log('---');
    const geminiTargetDir = defaultGeminiDir();
    console.log(`Gemini 전역 자산 배포 중: ${geminiTargetDir}`);
    const geminiCopied = deployGeminiGlobals(geminiTargetDir, console.log);
    console.log(`Gemini 배포 완료: ${geminiCopied}개`);
    verifyGeminiGlobals(geminiTargetDir);
  }
}

function isRecoverableCodexTrustError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return [
    'Codex CLI not found',
    'Access is denied',
    'spawn EPERM',
    'spawn UNKNOWN',
    'spawn EACCES',
    'spawn ENOENT',
  ].some((pattern) => message.includes(pattern));
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

  const srcHooks = path.join(sourceDir, 'hooks');
  const targetHooks = path.join(targetDir, 'hooks');
  if (existsDir(srcHooks)) {
    if (!existsDir(targetHooks)) {
      fail(failures, 'codex hooks/ 존재하지 않음');
    } else if (comparePaths(srcHooks, targetHooks)) {
      console.log('  PASS  codex hooks/');
    } else {
      fail(failures, 'codex hooks/ 내용 불일치');
    }
  }

  const targetHooksConfig = path.join(targetDir, 'hooks.json');
  if (!pathExists(targetHooksConfig)) {
    fail(failures, 'codex hooks.json 존재하지 않음');
  } else if (verifyJsonExact(codexHooksObject(), targetHooksConfig)) {
    console.log('  PASS  codex hooks.json');
  } else {
    fail(failures, 'codex hooks.json 내용 불일치');
  }

  const targetAgents = path.join(targetDir, 'AGENTS.md');
  if (!pathExists(targetAgents)) {
    fail(failures, 'codex AGENTS.md 존재하지 않음');
  } else if (require('fs').readFileSync(targetAgents, 'utf8') === buildCodexAgentsContent()) {
    console.log('  PASS  codex AGENTS.md');
  } else {
    fail(failures, 'codex AGENTS.md 내용 불일치');
  }

  if (failures.length > 0) {
    console.error(`Codex 검증 실패: ${failures.length}개 항목 확인 필요`);
    process.exit(1);
  }
  console.log('Codex 검증 완료: 모두 정상');
}

function verifyGeminiGlobals(targetDir) {
  const {
    buildGeminiAgentsContent,
    geminiSettingsObject,
    comparePaths,
    verifySettings,
  } = require('./deploy-lib');

  console.log('');
  console.log('Gemini 검증 중...');
  const failures = [];

  const srcContexts = path.join(sourceDir, 'contexts');
  const targetContexts = path.join(targetDir, 'contexts');
  if (!existsDir(targetContexts)) {
    fail(failures, 'gemini contexts/ 존재하지 않음');
  } else if (comparePaths(srcContexts, targetContexts)) {
    console.log('  PASS  gemini contexts/');
  } else {
    fail(failures, 'gemini contexts/ 내용 불일치');
  }

  const srcSkills = path.join(sourceDir, 'skills');
  if (existsDir(srcSkills)) {
    for (const entry of listEntries(srcSkills)) {
      const src = path.join(srcSkills, entry.name);
      const target = path.join(targetDir, 'skills', entry.name);
      if (!pathExists(target)) {
        fail(failures, `gemini skills/${entry.name} 존재하지 않음`);
      } else if (comparePaths(src, target)) {
        console.log(`  PASS  gemini skills/${entry.name}`);
      } else {
        fail(failures, `gemini skills/${entry.name} 내용 불일치`);
      }
    }
  }

  const targetSettings = path.join(targetDir, 'settings.json');
  if (!pathExists(targetSettings)) {
    fail(failures, 'gemini settings.json 존재하지 않음');
  } else if (verifySettings(geminiSettingsObject(), targetSettings)) {
    console.log('  PASS  gemini settings.json (merged)');
  } else {
    fail(failures, 'gemini settings.json 머지 결과 키 불일치');
  }

  const targetAgents = path.join(targetDir, 'GEMINI.md');
  if (!pathExists(targetAgents)) {
    fail(failures, 'gemini GEMINI.md 존재하지 않음');
  } else if (require('fs').readFileSync(targetAgents, 'utf8') === buildGeminiAgentsContent()) {
    console.log('  PASS  gemini GEMINI.md');
  } else {
    fail(failures, 'gemini GEMINI.md 내용 불일치');
  }

  if (failures.length > 0) {
    console.error(`Gemini 검증 실패: ${failures.length}개 항목 확인 필요`);
    process.exit(1);
  }
  console.log('Gemini 검증 완료: 모두 정상');
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

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
