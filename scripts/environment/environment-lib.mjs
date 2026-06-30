// sync-environment.mjs / unsync-environment.mjs / verify-environment.mjs가 공유하는
// 멱등성·안전제거 메커니즘. 파일 경로·레지스트리 키를 인자로 받아 샌드박스에서도
// 같은 함수를 검증할 수 있게 한다.
import childProcess from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// 마커 block을 삽입하거나 기존 block을 새 내용으로 교체한다. 반복 실행해도 block이
// 중복되지 않고 같은 상태로 수렴한다.
function upsertManagedBlock(file, options) {
  const managed = `${options.start}\n${options.body.trim()}\n${options.end}\n`;
  const markerPattern = new RegExp(`${escapeRegExp(options.start)}[\\s\\S]*?${escapeRegExp(options.end)}\\r?\\n?`);

  fs.mkdirSync(path.dirname(file), { recursive: true });

  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, managed, 'utf8');
    console.log(`Created ${file}`);
    return;
  }

  let existing = fs.readFileSync(file, 'utf8');
  const original = existing;
  const patterns = [markerPattern, ...(options.legacyPatterns || [])];
  const matchingPattern = patterns.find((pattern) => pattern.test(existing));

  if (matchingPattern) {
    existing = existing.replace(matchingPattern, managed);
  } else {
    for (const linePattern of options.legacyLinePatterns || []) {
      existing = existing
        .split(/\r?\n/)
        .filter((line) => !linePattern.test(line.trim()))
        .join('\n');
      if (existing && !existing.endsWith('\n')) existing += '\n';
    }
    existing = `${existing}${existing.endsWith('\n') || existing.length === 0 ? '' : '\n'}${managed}`;
  }

  if (existing === original) {
    console.log(`Already up to date: ${file}`);
    return;
  }

  fs.copyFileSync(file, `${file}.bak-${timestamp()}`);
  fs.writeFileSync(file, existing, 'utf8');
  console.log(`Updated ${file}`);
}

// 마커 block만 제거하고 파일의 나머지(사용자 내용)는 보존한다. 제거 후 파일이
// 비면 파일 자체를 삭제한다.
function removeManagedBlocks(file, patterns) {
  if (!fs.existsSync(file)) {
    console.log(`Already absent: ${file}`);
    return;
  }

  const existing = fs.readFileSync(file, 'utf8');
  const next = patterns.reduce((content, pattern) => content.replace(pattern, ''), existing);

  if (next === existing) {
    console.log(`No ai-contexts block found: ${file}`);
    return;
  }

  fs.copyFileSync(file, `${file}.bak-${timestamp()}`);
  if (next.trim().length === 0) {
    fs.rmSync(file, { force: true });
    console.log(`Removed empty file: ${file}`);
  } else {
    fs.writeFileSync(file, next, 'utf8');
    console.log(`Updated ${file}`);
  }
}

// 파일 전체를 AC 내용으로 멱등 생성/갱신한다. 'created' | 'updated' | 'unchanged' 반환.
function writeWholeFile(file, body) {
  fs.mkdirSync(path.dirname(file), { recursive: true });

  if (fs.existsSync(file)) {
    if (fs.readFileSync(file, 'utf8') === body) return 'unchanged';
    fs.copyFileSync(file, `${file}.bak-${timestamp()}`);
    fs.writeFileSync(file, body, 'utf8');
    return 'updated';
  }

  fs.writeFileSync(file, body, 'utf8');
  return 'created';
}

// 파일 내용이 AC가 쓴 body와 동일할 때만 삭제한다(동일성 비교).
// 'removed' | 'modified' | 'absent' 반환.
function removeIfIdentical(file, body) {
  if (!fs.existsSync(file)) return 'absent';
  if (fs.readFileSync(file, 'utf8') !== body) return 'modified';

  fs.copyFileSync(file, `${file}.bak-${timestamp()}`);
  fs.rmSync(file, { force: true });
  return 'removed';
}

function queryRegValue(key, name) {
  try {
    // 값이 없으면 reg가 stderr로 에러를 내는데, execFileSync 기본값은 그것을 부모
    // 콘솔로 흘린다. stderr를 ignore해 정상적인 "없음" 케이스에서 잡음을 막는다.
    const out = childProcess.execFileSync('reg', ['query', key, '/v', name], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const match = out.match(new RegExp(`${escapeRegExp(name)}\\s+REG_\\w+\\s+(.+)`));
    return match ? match[1].trim() : '';
  } catch {
    return '';
  }
}

function setRegValue(key, name, value) {
  childProcess.execFileSync('reg', ['add', key, '/v', name, '/t', 'REG_SZ', '/d', value, '/f'], {
    stdio: 'ignore',
  });
}

function deleteRegValue(key, name) {
  childProcess.execFileSync('reg', ['delete', key, '/v', name, '/f'], { stdio: 'ignore' });
}

function runs(command, args) {
  try {
    childProcess.execFileSync(command, args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export {
  upsertManagedBlock,
  removeManagedBlocks,
  writeWholeFile,
  removeIfIdentical,
  queryRegValue,
  setRegValue,
  deleteRegValue,
  runs,
  timestamp,
  escapeRegExp,
};
