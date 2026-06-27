#!/usr/bin/env node
// AC 로컬 배포(전역 sync:system의 로컬판). 한 명령으로 로컬 산출물 전부를 배포한다:
//   1) 로컬 자산(스킬 등): 각 레포 local/<X> → .claude/<X>·.agents/<X> (claude·codex 공통),
//      CLAUDE.md → AGENTS.md·GEMINI.md. hooks는 2)가 따로 투영하므로 제외.
//   2) AC settings/hooks: local/ 소스 → repo-local .claude/settings.json·.codex/hooks.json
//
// settings/hooks는 전역 sync:system과 동일한 메커니즘(부분키 머지·생성 계약 fail-fast·배포
// 후 대조)을 repo-local·AC 전용으로 적용한다. 산출물은 gitignore되며, 사용자만
// `! npm run sync:local-system`으로 실행한다(에이전트는 block-ac-sync 훅에 막힘).
const path = require('path');
const childProcess = require('child_process');

const { ensureHooksReady } = require('../lib/hook-guard');
const { ensureDir, trustCodexHooks, verifyJsonExact, verifySettings, repoDir } = require('../lib/deploy-lib');
const { syncLocalSkills } = require('./sync-local-skills');
const {
  copyLocalHooks,
  localClaudeSettingsObject,
  localClaudeSettingsPath,
  localCodexDir,
  localCodexHooksObject,
  localCodexHooksPath,
  mergeSettings,
  uninstallLocal,
  writeJson,
} = require('./local-deploy-lib');

async function main() {
  ensureHooksReady();

  // 생성 계약이 깨지면 배포 전에 중단(fail-fast).
  childProcess.execFileSync(process.execPath, [path.join(__dirname, 'verify-local-system.js')], { stdio: 'inherit' });

  // 1) 로컬 스킬 (cross-repo). hooksReady는 위에서 이미 확인했으므로 생략.
  console.log('');
  syncLocalSkills({ ensureHooks: false });

  // 2) AC settings/hooks (AC 전용).
  console.log('');
  console.log('AC 로컬 settings/hooks 배포 중...');
  console.log('---');

  // 기존 AC 산출물 제거 후 재생성(고아 방지).
  uninstallLocal(console.log);

  copyLocalHooks(console.log);

  mergeSettings(localClaudeSettingsObject(), localClaudeSettingsPath);
  console.log('  MERGE .claude/settings.json');

  ensureDir(localCodexDir);
  writeJson(localCodexHooksPath, localCodexHooksObject());
  console.log('  WRITE .codex/hooks.json');

  // 배포 후 검증: claude는 부분키 머지 결과, codex는 whole-file 일치.
  console.log('');
  console.log('검증 중...');
  const failures = [];
  if (verifySettings(localClaudeSettingsObject(), localClaudeSettingsPath)) {
    console.log('  PASS  .claude/settings.json (merged)');
  } else {
    failures.push('.claude/settings.json 머지 결과 키 불일치');
    console.error('  FAIL  .claude/settings.json 머지 결과 키 불일치');
  }
  if (verifyJsonExact(localCodexHooksObject(), localCodexHooksPath)) {
    console.log('  PASS  .codex/hooks.json');
  } else {
    failures.push('.codex/hooks.json 내용 불일치');
    console.error('  FAIL  .codex/hooks.json 내용 불일치');
  }

  // codex 프로젝트-로컬 훅은 trusted여야 발화한다. best-effort로 trust를 시도하고,
  // 실패하면 사용자에게 `/hooks` 수동 신뢰를 안내한다(환경에 따라 app-server 불가).
  try {
    const trusted = await trustCodexHooks(localCodexDir, console.log, repoDir);
    if (trusted === 0) {
      console.warn('  WARN  codex hook trust 항목 없음 — codex 세션에서 `/hooks`로 신뢰가 필요할 수 있습니다.');
    }
  } catch (error) {
    console.warn(`  WARN  codex hook trust 건너뜀: ${error instanceof Error ? error.message : String(error)}`);
    console.warn('  WARN  codex 세션에서 `/hooks`로 .codex/hooks.json을 수동 신뢰하세요.');
  }

  if (failures.length > 0) {
    console.error(`\n배포 검증 실패: ${failures.length}건`);
    process.exit(1);
  }
  console.log('\nAC 로컬 배포 완료 (스킬 + settings/hooks)');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
