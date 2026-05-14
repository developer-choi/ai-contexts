#!/usr/bin/env node
const path = require('path');
const readline = require('readline');

const { defaultClaudeDir, ensureDeploySource, resolveUserPath, uninstallTarget } = require('./deploy-lib');

async function main() {
  ensureDeploySource();

  const targetArg = process.argv[2] || (await askTarget());
  const targetDir = resolveUserPath(targetArg || defaultClaudeDir());

  console.log(`타겟: ${targetDir}`);
  console.log('---');

  const removed = uninstallTarget(targetDir);

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
