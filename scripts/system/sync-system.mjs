#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { ensureHooksReady } from '../lib/hook-guard.mjs';
import { runVerifications } from '../lib/verify-runner.mjs';

import {
  CATEGORIES,
  SOURCE_ONLY_ROOT_FILES,
  buildCodexAgentsContent,
  buildGeminiAgentsContent,
  claudeSettingsObject,
  codexHooksObject,
  comparePaths,
  compareRulePaths,
  compareSkillPaths,
  defaultCodexDir,
  defaultClaudeDir,
  defaultGeminiDir,
  deployCategory,
  deployCodexGlobals,
  deployGeminiGlobals,
  deployRootFiles,
  deploySkills,
  removeLegacyCategories,
  ensureDeploySource,
  ensureDir,
  geminiSettingsObject,
  listEntries,
  unsetWtAddAlias,
  resolveUserPath,
  sourceDir,
  trustCodexHooks,
  verifyJsonExact,
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
  changed += deploySkills(targetDir, console.log);
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
    } else if (category === 'rules' ? compareRulePaths(src, target, targetDir) : comparePaths(src, target)) {
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
      } else if (compareSkillPaths(src, target)) {
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
    const codexChanged = deployCodexGlobals(codexTargetDir, console.log);
    console.log(codexChanged === 0 ? 'Codex 변경 없음' : `Codex 바뀐 파일: ${codexChanged}개`);
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
    const geminiChanged = deployGeminiGlobals(geminiTargetDir, console.log);
    console.log(geminiChanged === 0 ? 'Gemini 변경 없음' : `Gemini 바뀐 파일: ${geminiChanged}개`);
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
      } else if (compareSkillPaths(src, target)) {
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
  } else if (fs.readFileSync(targetAgents, 'utf8') === buildCodexAgentsContent(targetDir)) {
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
      } else if (compareSkillPaths(src, target)) {
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
  } else if (fs.readFileSync(targetAgents, 'utf8') === buildGeminiAgentsContent(targetDir)) {
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
  return fs.existsSync(target);
}

function existsDir(target) {
  return fs.existsSync(target) && fs.statSync(target).isDirectory();
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
