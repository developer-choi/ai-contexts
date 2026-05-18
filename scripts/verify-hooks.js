#!/usr/bin/env node
const { ensureHooksReady } = require('./hook-guard');

try {
  ensureHooksReady();
  console.log('AC git hook 준비 상태 정상');
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
