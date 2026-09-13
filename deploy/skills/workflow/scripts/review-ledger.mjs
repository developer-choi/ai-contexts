#!/usr/bin/env node
// BG 산출물 중 사용자가 아직 리뷰하지 않은 것을 뽑고, 리뷰를 마친 파일을 표시한다.
//
// 무엇을 읽었고 그 뒤 무엇이 바뀌었는지를 대화 기억이나 손으로 대조하면, 틀려도 조용하다 —
// 리뷰 뒤에 고친 파일이 "읽음"으로 넘어가 사용자가 못 본 수정이 후속 세션으로 간다.
// 채용 모드는 `plan/`이 git 밖이라 git diff로 바뀐 줄을 볼 수도 없어, 리뷰 시점 사본을 여기 둔다.
//
// 같음 판정은 경로가 아니라 내용 지문이다. PR 확정 때 페이지 분석 문서가 `pr{N}/consumable/page.md`로
// 옮겨져도 내용이 같으면 다시 뽑지 않는다.
//
// 사용:
//   node <이 파일> pending --plan <plan 루트>            → 새 파일(전체 경로)과 바뀐 파일(바뀐 줄)
//   node <이 파일> mark --plan <plan 루트> <파일...>      → 그 파일의 지금 내용을 리뷰 완료로 기록
//
// 파일 인자는 plan 루트 기준 상대경로. pending은 리뷰할 것이 있으면 exit 1.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const [command, ...rest] = process.argv.slice(2);
const planIdx = rest.indexOf('--plan');
const plan = planIdx >= 0 ? rest[planIdx + 1] : undefined;
const fileArgs = rest.filter((_, i) => i !== planIdx && i !== planIdx + 1);

if (!['pending', 'mark'].includes(command) || !plan) {
  console.error('사용: node <이 파일> <pending|mark> --plan <plan 루트> [파일...]');
  process.exit(1);
}

const LEDGER_DIR = path.join(plan, 'background', '.reviewed');
const LEDGER = path.join(LEDGER_DIR, 'ledger.json');
const SNAP_DIR = path.join(LEDGER_DIR, 'snapshots');

const toRel = (abs) => path.relative(plan, abs).replace(/\\/g, '/');
const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
const readLedger = () => (fs.existsSync(LEDGER) ? JSON.parse(fs.readFileSync(LEDGER, 'utf8')) : { files: {} });

// BG가 쓰는 자리: background/ 전체(사용자 원본을 그대로 담는 persistent/와 이 기록 폴더는 뺀다)
// + PR 확정 때 옮겨간 페이지 분석 문서.
function bgFiles() {
  const out = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) walk(full);
      else out.push(full);
    }
  };
  const bg = path.join(plan, 'background');
  if (fs.existsSync(bg)) {
    for (const name of fs.readdirSync(bg)) {
      if (name === 'persistent' || name === '.reviewed') continue;
      const full = path.join(bg, name);
      if (fs.statSync(full).isDirectory()) walk(full);
      else out.push(full);
    }
  }
  if (fs.existsSync(plan)) {
    for (const name of fs.readdirSync(plan)) {
      const page = path.join(plan, name, 'consumable', 'page.md');
      if (/^pr\d+$/.test(name) && fs.existsSync(page)) out.push(page);
    }
  }
  return out;
}

// 줄 단위 LCS diff. 바뀐 줄만 `-`/`+`로 낸다.
function diffLines(before, after) {
  const a = before.split('\n');
  const b = after.split('\n');
  const dp = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const lines = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { i++; j++; }
    else if (j < b.length && (i >= a.length || dp[i][j + 1] >= dp[i + 1][j])) lines.push(`+ ${b[j++]}`);
    else lines.push(`- ${a[i++]}`);
  }
  return lines;
}

const ledger = readLedger();

if (command === 'mark') {
  if (fileArgs.length === 0) {
    console.error('mark 에는 리뷰를 마친 파일 경로가 필요합니다.');
    process.exit(1);
  }
  fs.mkdirSync(SNAP_DIR, { recursive: true });
  for (const rel of fileArgs) {
    const abs = path.join(plan, rel);
    if (!fs.existsSync(abs)) {
      console.error(`없는 파일: ${rel}`);
      process.exit(1);
    }
    const text = fs.readFileSync(abs, 'utf8');
    const hash = sha(text);
    fs.writeFileSync(path.join(SNAP_DIR, hash), text);
    ledger.files[toRel(abs)] = { sha: hash, reviewedAt: new Date().toISOString() };
    console.log(`리뷰 완료로 기록: ${toRel(abs)}`);
  }
  fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2));
  process.exit(0);
}

const reviewedHashes = new Set(Object.values(ledger.files).map((f) => f.sha));
const fresh = [];
const changed = [];
for (const abs of bgFiles()) {
  const rel = toRel(abs);
  const text = fs.readFileSync(abs, 'utf8');
  if (reviewedHashes.has(sha(text))) continue;
  const prev = ledger.files[rel];
  const snap = prev && path.join(SNAP_DIR, prev.sha);
  if (snap && fs.existsSync(snap)) changed.push({ rel, lines: diffLines(fs.readFileSync(snap, 'utf8'), text) });
  else fresh.push(rel);
}

if (fresh.length === 0 && changed.length === 0) {
  console.log('[리뷰할 것 없음]');
  process.exit(0);
}
console.log(`[새 파일] ${fresh.length}건 — 전체를 리뷰받는다`);
fresh.forEach((rel) => console.log(`  ${rel}`));
console.log(`\n[리뷰 뒤 바뀐 파일] ${changed.length}건 — 아래 바뀐 줄만 리뷰받는다`);
for (const c of changed) {
  console.log(`  ${c.rel}`);
  c.lines.forEach((l) => console.log(`    ${l}`));
}
process.exit(1);
