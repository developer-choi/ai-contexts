#!/usr/bin/env node
// environment-lib.js의 멱등성·안전제거 계약을 샌드박스에서 검증한다.
// 실제 사용자 환경(실프로필·실레지스트리·winget)은 건드리지 않는다.
// 파일 메커니즘은 임시 디렉토리에서, 레지스트리는 버리는 테스트 키에서만 돌린다.
// exit 0: 모든 계약 통과, exit 1: 위반.
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  upsertManagedBlock,
  removeManagedBlocks,
  writeWholeFile,
  removeIfIdentical,
  queryRegValue,
  setRegValue,
  deleteRegValue,
  escapeRegExp,
} = require('./environment-lib');

const failures = [];

function check(name, condition) {
  if (condition) {
    console.log(`  OK   ${name}`);
  } else {
    console.error(`  FAIL ${name}`);
    failures.push(name);
  }
}

function blockPattern(start, end) {
  return new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}\\r?\\n?`);
}

function verifyFileMechanisms(sandbox) {
  console.log('--- whole-file 멱등 ---');
  const whole = path.join(sandbox, 'whole.txt');
  check("최초 write는 'created'", writeWholeFile(whole, 'A\n') === 'created');
  check("같은 내용 재write는 'unchanged'", writeWholeFile(whole, 'A\n') === 'unchanged');
  check("다른 내용 write는 'updated'", writeWholeFile(whole, 'B\n') === 'updated');

  console.log('--- 동일성 기반 제거 ---');
  const ident = path.join(sandbox, 'ident.txt');
  writeWholeFile(ident, 'OWNED\n');
  fs.writeFileSync(ident, 'USER EDITED\n', 'utf8');
  check("수정된 파일은 'modified'로 보존", removeIfIdentical(ident, 'OWNED\n') === 'modified' && fs.existsSync(ident));
  fs.writeFileSync(ident, 'OWNED\n', 'utf8');
  check("원본 일치 시 'removed'", removeIfIdentical(ident, 'OWNED\n') === 'removed' && !fs.existsSync(ident));
  check("없는 파일은 'absent'", removeIfIdentical(path.join(sandbox, 'nope.txt'), 'OWNED\n') === 'absent');

  console.log('--- managed-block 멱등 + 선택 제거 ---');
  const start = '# >>> verify test >>>';
  const end = '# <<< verify test <<<';
  const managed = path.join(sandbox, 'managed.txt');
  fs.writeFileSync(managed, 'USER LINE\n', 'utf8');
  upsertManagedBlock(managed, { start, end, body: 'managed body' });
  upsertManagedBlock(managed, { start, end, body: 'managed body' });
  const afterUpsert = fs.readFileSync(managed, 'utf8');
  check('2회 upsert 후 block 1개만 존재', afterUpsert.split(start).length - 1 === 1);
  check('upsert가 사용자 줄 보존', afterUpsert.includes('USER LINE'));
  check('upsert가 block body 포함', afterUpsert.includes('managed body'));

  removeManagedBlocks(managed, [blockPattern(start, end)]);
  const afterRemove = fs.readFileSync(managed, 'utf8');
  check('removeManagedBlocks가 block 제거', !afterRemove.includes('managed body'));
  check('removeManagedBlocks가 사용자 줄 보존', afterRemove.includes('USER LINE'));
}

function verifyRegistryMechanisms() {
  if (process.platform !== 'win32') {
    console.log('--- 레지스트리: Windows 아님, skip ---');
    return;
  }

  console.log('--- 레지스트리 set/query/delete 왕복 ---');
  const testKey = 'HKCU\\Software\\ai-contexts-verify';
  try {
    setRegValue(testKey, 'AutoRun', '@C:\\verify\\test.cmd');
    check('set 후 query가 같은 값 반환', queryRegValue(testKey, 'AutoRun') === '@C:\\verify\\test.cmd');
    deleteRegValue(testKey, 'AutoRun');
    check('delete 후 query가 빈 값', queryRegValue(testKey, 'AutoRun') === '');
    check('없는 키 query는 빈 값', queryRegValue(testKey, 'Missing') === '');
  } finally {
    childProcess.spawnSync('reg', ['delete', testKey, '/f'], { stdio: 'ignore' });
  }
}

function main() {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'ac-verify-env-'));
  try {
    verifyFileMechanisms(sandbox);
    verifyRegistryMechanisms();
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }

  if (failures.length > 0) {
    console.error(`\n검증 실패 ${failures.length}건: ${failures.join(', ')}`);
    process.exit(1);
  }
  console.log('\nenvironment 메커니즘 계약 정상');
}

main();
