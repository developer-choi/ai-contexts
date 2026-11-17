#!/usr/bin/env node
// plugins/ac/hooks/hooks.json의 모든 훅이 Gemini 투영 또는 명시적 제외 목록에 분류되었는지와
// Gemini 전역 배포(훅·MCP·규칙)의 멱등성·안전 제거를 검증한다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  buildGeminiHooksObject,
  deployGeminiTarget,
  findUnclassifiedGeminiHooks,
  uninstallGeminiTarget,
  verifyGeminiTarget,
} from '../lib/gemini-deploy.mjs';
import { removePath } from '../lib/deploy-lib.mjs';

const quiet = () => {};

function main() {
  const failures = [];
  const check = (cond, msg) => {
    if (cond) console.log(`  PASS  ${msg}`);
    else {
      console.error(`  FAIL  ${msg}`);
      failures.push(msg);
    }
  };

  console.log('Gemini 전역 훅 분류 및 배포 계약 검증 중...');

  const unclassified = findUnclassifiedGeminiHooks();
  check(
    unclassified.length === 0,
    `plugins/ac/hooks/hooks.json의 모든 훅이 Gemini 매핑 또는 제외 목록에 분류됨 (미분류: ${unclassified.join(', ') || '없음'})`,
  );

  const projected = buildGeminiHooksObject();
  const preCount = (projected['ac-global-shell-policy']?.PreToolUse ?? [])
    .reduce((sum, g) => sum + g.hooks.length, 0);
  const postCount = (projected['ac-global-shell-policy']?.PostToolUse ?? [])
    .reduce((sum, g) => sum + g.hooks.length, 0);
  check(preCount > 0 && postCount > 0, `Gemini 전역 훅 투영 수 확인 (PreToolUse ${preCount}개, PostToolUse ${postCount}개)`);

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ac-gemini-deploy-'));
  try {
    // 사용자 기존 설정이 보존되는지 확인하기 위해 시드 파일 작성
    fs.writeFileSync(path.join(tmpRoot, 'hooks.json'), JSON.stringify({ 'user-custom-hook': { PreToolUse: [] } }, null, 2));
    fs.writeFileSync(path.join(tmpRoot, 'mcp_config.json'), JSON.stringify({ mcpServers: { 'user-mcp': { command: 'echo' } } }, null, 2));

    const first = deployGeminiTarget(tmpRoot, quiet);
    check(first === 3, `첫 배포 시 3개 파일 기록 (hooks.json, mcp_config.json, GEMINI.md) (실제: ${first})`);

    const second = deployGeminiTarget(tmpRoot, quiet);
    check(second === 0, `재실행 시 변경 없음 (실제: ${second})`);

    const verifyFailures = verifyGeminiTarget(tmpRoot);
    check(verifyFailures.length === 0, `verifyGeminiTarget 통과 (${verifyFailures.join(', ') || '없음'})`);

    uninstallGeminiTarget(tmpRoot, quiet);
    const remainingHooks = JSON.parse(fs.readFileSync(path.join(tmpRoot, 'hooks.json'), 'utf8'));
    const remainingMcp = JSON.parse(fs.readFileSync(path.join(tmpRoot, 'mcp_config.json'), 'utf8'));
    check('user-custom-hook' in remainingHooks && !('ac-global-shell-policy' in remainingHooks), 'unsync 시 사용자 hooks.json 항목 보존 및 AC 훅 제거');
    check('user-mcp' in (remainingMcp.mcpServers ?? {}) && !('chrome-devtools' in (remainingMcp.mcpServers ?? {})), 'unsync 시 사용자 MCP 보존 및 AC MCP 제거');
    check(!fs.existsSync(path.join(tmpRoot, 'GEMINI.md')), 'unsync 시 AC GEMINI.md 제거');
  } finally {
    removePath(tmpRoot);
  }

  if (failures.length > 0) {
    process.exit(1);
  }
}

main();
