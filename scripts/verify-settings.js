#!/usr/bin/env node
// settings.json 머지 결과 검증
// usage: node verify-settings.js <deploy-settings.json> <target-settings.json>
//
// deploy의 모든 top-level 키가 target에 deepEqual로 동일하게 존재하는지 확인.
// target에만 있는 추가 키(사용자 동적 필드)는 무시한다.
// exit 0: OK, exit 1: mismatch

const fs = require('fs');

const [, , deployPath, targetPath] = process.argv;

if (!deployPath || !targetPath) {
  console.error('usage: node verify-settings.js <deploy> <target>');
  process.exit(2);
}

const deploy = JSON.parse(fs.readFileSync(deployPath, 'utf8'));
const target = JSON.parse(fs.readFileSync(targetPath, 'utf8'));

const mismatches = [];
for (const key of Object.keys(deploy)) {
  if (JSON.stringify(deploy[key]) !== JSON.stringify(target[key])) {
    mismatches.push(key);
  }
}

if (mismatches.length > 0) {
  console.error('settings.json 키 불일치: ' + mismatches.join(', '));
  process.exit(1);
}
process.exit(0);
