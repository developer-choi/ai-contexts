#!/usr/bin/env node
// settings.json 분리: target에서 deploy의 top-level 키만 제거
// usage: node split-settings.js <deploy-settings.json> <target-settings.json>
//
// 사용자 동적 필드(enabledPlugins 등)는 보존한다.
// 남은 객체가 비면 파일을 삭제한다.

const fs = require('fs');

const [, , deployPath, targetPath] = process.argv;

if (!deployPath || !targetPath) {
  console.error('usage: node split-settings.js <deploy> <target>');
  process.exit(2);
}

if (!fs.existsSync(targetPath)) process.exit(0);

const raw = fs.readFileSync(targetPath, 'utf8').trim();
if (!raw) process.exit(0);

let existing;
try {
  existing = JSON.parse(raw);
} catch (e) {
  console.error(`기존 settings.json JSON 파싱 실패: ${targetPath}`);
  console.error(`  ${e.message}`);
  process.exit(1);
}

const deploy = JSON.parse(fs.readFileSync(deployPath, 'utf8'));

for (const key of Object.keys(deploy)) {
  delete existing[key];
}

if (Object.keys(existing).length === 0) {
  fs.unlinkSync(targetPath);
} else {
  fs.writeFileSync(targetPath, JSON.stringify(existing, null, 2) + '\n');
}
