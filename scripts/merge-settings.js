#!/usr/bin/env node
// settings.json 얕은 머지
// usage: node merge-settings.js <deploy-settings.json> <target-settings.json>
//
// deploy의 top-level 키를 target에 덮어쓰고,
// target의 다른 top-level 키(사용자 동적 필드: enabledPlugins 등)는 보존한다.

const fs = require('fs');

const [, , deployPath, targetPath] = process.argv;

if (!deployPath || !targetPath) {
  console.error('usage: node merge-settings.js <deploy> <target>');
  process.exit(2);
}

const deploy = JSON.parse(fs.readFileSync(deployPath, 'utf8'));

let existing = {};
if (fs.existsSync(targetPath)) {
  const raw = fs.readFileSync(targetPath, 'utf8').trim();
  if (raw) {
    try {
      existing = JSON.parse(raw);
    } catch (e) {
      console.error(`기존 settings.json JSON 파싱 실패: ${targetPath}`);
      console.error(`  ${e.message}`);
      process.exit(1);
    }
  }
}

const merged = { ...existing, ...deploy };
fs.writeFileSync(targetPath, JSON.stringify(merged, null, 2) + '\n');
