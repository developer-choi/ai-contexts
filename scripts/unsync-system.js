#!/usr/bin/env node
const path = require('path');
const readline = require('readline');

const {
  defaultCodexDir,
  defaultClaudeDir,
  ensureDeploySource,
  resolveUserPath,
  uninstallCodexGlobals,
  uninstallTarget,
} = require('./deploy-lib');

async function main() {
  ensureDeploySource();

  const explicitTarget = process.argv[2];
  const targetArg = explicitTarget || (await askTarget());
  const targetDir = resolveUserPath(targetArg || defaultClaudeDir());

  console.log(`타겟: ${targetDir}`);
  console.log('---');

  let removed = uninstallTarget(targetDir);

  if (!explicitTarget && targetDir === defaultClaudeDir()) {
    const codexTargetDir = defaultCodexDir();
    console.log('');
    console.log(`Codex 타겟: ${codexTargetDir}`);
    console.log('---');
    removed += uninstallCodexGlobals(codexTargetDir);
  }

  console.log('---');
  console.log(`완료: ${removed}개 제거`);
}

function askTarget() {
  const defaultTarget = defaultClaudeDir();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`타겟 경로 [${defaultTarget}]: `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultTarget);
    });
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
