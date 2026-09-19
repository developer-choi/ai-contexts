#!/usr/bin/env node
// `session-state.mjs source-usage`의 집계·거부·알림 판정을 회귀 검증한다.
//
// 이 눈금은 틀려도 아무 소리를 안 낸다 — 한 칸 잘못 세거나 같은 갈래가 두 줄로 갈려도 그 자리에서는
// 정상으로 보이고, 몇 달 뒤 안 차는 눈금으로만 드러난다. 그때는 어느 회차가 틀렸는지 못 되짚는다.
// sync:system이 배포 전 fail-fast로 돌려, 잘못 세는 판이 배포되는 것을 막는다.

import childProcess from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const script = path.join(import.meta.dirname, '..', '..', 'deploy', 'skills', 'pre-exit', 'scripts', 'session-state.mjs');

const THRESHOLD = { read: 3, unusedRatio: 0.4 };
const today = new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

/** 절 하나. 제목 앞에 `## 3단 — `이 붙어야 라벨 필수 검사에 걸린다. */
const sec = (title, cited) => ({ file: 'x-site.md', title: `## 3단 — ${title}`, lines: 10, cited });
const label = (pairs) => Object.fromEntries(pairs.map(([t, kind]) => [`## 3단 — ${t}`, kind]));

// 각 케이스: 씨앗 상태 → 인자 → 기대 exit code·상태·출력
const CASES = [
  {
    note: '같은 갈래 두 절 중 하나만 인용되면 그 갈래는 값을 했다',
    sections: [sec('A', true), sec('B', false)],
    labels: label([['A', '업계 실무 자료'], ['B', '업계 실무 자료']]),
    expect: { code: 0, kinds: { '업계 실무 자료': { read: 1, unused: 0 } } },
  },
  {
    note: '절이 전부 안 쓰였을 때만 unused가 오른다',
    sections: [sec('A', false), sec('B', false)],
    labels: label([['A', '학술논문'], ['B', '학술논문']]),
    expect: { code: 0, kinds: { 학술논문: { read: 1, unused: 1 } } },
  },
  {
    note: '절이 많은 갈래도 한 눈금이다 — 절 단위로 세면 그 갈래가 분모를 독식한다',
    sections: [sec('A', false), sec('B', false), sec('C', false), sec('D', true)],
    labels: label([['A', '법령·제도 원문'], ['B', '법령·제도 원문'], ['C', '법령·제도 원문'], ['D', '법령·제도 원문']]),
    expect: { code: 0, kinds: { '법령·제도 원문': { read: 1, unused: 0 } } },
  },
  {
    note: '「해당 없음」은 눈금에 안 오른다',
    sections: [sec('열게 된 조건', false), sec('A', false)],
    labels: label([['열게 된 조건', '해당 없음'], ['A', '인터뷰']]),
    expect: { code: 0, kinds: { 인터뷰: { read: 1, unused: 1 } }, absent: ['해당 없음'] },
  },
  {
    note: '목록 밖 갈래는 거부하고 상태를 안 건드린다',
    sections: [sec('A', false)],
    labels: label([['A', '사람 축 1차']]),
    expect: { code: 1, unchanged: true, stderr: '모르는 갈래' },
  },
  {
    note: '라벨을 빠뜨리면 거부한다 — 빠뜨림은 곧 그 갈래의 분모가 줄어드는 것이다',
    sections: [sec('A', false), sec('B', false)],
    labels: label([['A', '인터뷰']]),
    expect: { code: 1, unchanged: true, stderr: '라벨이 안 붙은 3단 절' },
  },
  {
    note: '이 회차가 안 떠온 절은 거부한다',
    sections: [sec('A', false)],
    labels: label([['A', '인터뷰'], ['없는 절', '인터뷰']]),
    expect: { code: 1, unchanged: true, stderr: '이 회차가 안 떠온 절' },
  },
  {
    note: '같은 절이 두 번 들어오면 거부한다 — JSON은 뒤엣것으로 조용히 덮는다',
    sections: [sec('A', false)],
    rawLabels: '{ "## 3단 — A": "인터뷰", "## 3단 — A": "학술논문" }',
    expect: { code: 1, unchanged: true, stderr: '같은 절이' },
  },
  {
    note: '선을 넘으면 알린다',
    seed: { 학술논문: { read: 2, unused: 2, last: today } },
    sections: [sec('A', false)],
    labels: label([['A', '학술논문']]),
    expect: { code: 0, kinds: { 학술논문: { read: 3, unused: 3 } }, stdout: '[3단 낭비 의심]' },
  },
  {
    note: '횟수가 차도 비율이 선 아래면 안 알린다',
    seed: { '업계 실무 자료': { read: 5, unused: 1, last: today } },
    sections: [sec('A', true)],
    labels: label([['A', '업계 실무 자료']]),
    expect: { code: 0, kinds: { '업계 실무 자료': { read: 6, unused: 1 } }, noStdout: '[3단 낭비 의심]' },
  },
  {
    note: '비율이 높아도 횟수가 모자라면 안 알린다 — 한 회차는 그 회사가 특수했는지 모른다',
    seed: { 학술논문: { read: 1, unused: 1, last: today } },
    sections: [sec('A', false)],
    labels: label([['A', '학술논문']]),
    expect: { code: 0, kinds: { 학술논문: { read: 2, unused: 2 } }, noStdout: '[3단 낭비 의심]' },
  },
  {
    note: '이번 회차가 안 떠온 갈래는 선을 넘었어도 안 뜬다',
    seed: { 학술논문: { read: 3, unused: 3, last: today }, 인터뷰: { read: 2, unused: 2, last: today } },
    sections: [sec('A', false)],
    labels: label([['A', '인터뷰']]),
    expect: { code: 0, stdout: '인터뷰', noStdout: '학술논문' },
  },
  {
    note: '창 밖으로 나간 갈래는 안 뜬다 — 자리를 고쳐 눈금이 멈추면 알람이 저절로 꺼진다',
    seed: { 학술논문: { read: 5, unused: 5, last: daysAgo(200) } },
    sections: [sec('A', true)],
    labels: label([['A', '설문·통계']]),
    expect: { code: 0, noStdout: '[3단 낭비 의심]' },
  },
  {
    note: '같은 회차를 두 번 넣어도 눈금이 안 는다',
    seed: { 인터뷰: { read: 1, unused: 1, last: today } },
    sessions: { 'sess-dup': today },
    session: 'sess-dup',
    sections: [sec('A', false)],
    labels: label([['A', '인터뷰']]),
    expect: { code: 0, kinds: { 인터뷰: { read: 1, unused: 1 } } },
  },
  {
    note: '제외한 갈래는 눈금에서 지워지고 다시 안 쌓인다',
    seed: { 학술논문: { read: 3, unused: 3, last: today } },
    sections: [sec('A', false)],
    labels: label([['A', '학술논문']]),
    exclude: '학술논문',
    expect: { code: 0, absent: ['학술논문'], excluded: ['학술논문'] },
  },
  {
    note: '분모 없이 라벨만 주면 거부한다',
    sections: [sec('A', false)],
    labels: label([['A', '인터뷰']]),
    omitSections: true,
    expect: { code: 1, unchanged: true, stderr: '--sections' },
  },
];

function runCase(dir, index, c) {
  const statePath = path.join(dir, `state-${index}.json`);
  const before = {
    kinds: c.seed ?? {},
    excluded: [],
    threshold: THRESHOLD,
    sessions: c.sessions ?? {},
  };
  fs.writeFileSync(statePath, `${JSON.stringify(before, null, 2)}\n`);
  const args = ['source-usage', '--session', c.session ?? `sess-${index}`];
  if (!c.omitSections) {
    const secPath = path.join(dir, `sections-${index}.json`);
    fs.writeFileSync(secPath, JSON.stringify({ slug: 'x', date: today, sections: c.sections }));
    args.push('--sections', secPath);
  }
  if (c.labels || c.rawLabels) {
    const labelPath = path.join(dir, `labels-${index}.json`);
    fs.writeFileSync(labelPath, c.rawLabels ?? JSON.stringify(c.labels));
    args.push('--from', labelPath);
  }
  if (c.exclude) args.push('--exclude', c.exclude);

  const r = childProcess.spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    env: { ...process.env, SOURCE_USAGE_FILE: statePath },
  });
  const after = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  return { code: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '', before, after };
}

function check(c, r) {
  const e = c.expect;
  const bad = [];
  if (r.code !== e.code) bad.push(`exit ${r.code} (기대 ${e.code})`);
  if (e.unchanged && JSON.stringify(r.after.kinds) !== JSON.stringify(r.before.kinds)) {
    bad.push(`거부인데 눈금이 바뀌었다: ${JSON.stringify(r.after.kinds)}`);
  }
  for (const [kind, want] of Object.entries(e.kinds ?? {})) {
    const got = r.after.kinds?.[kind];
    if (!got) bad.push(`${kind} 줄이 없다`);
    else if (got.read !== want.read || got.unused !== want.unused) {
      bad.push(`${kind} ${got.unused}/${got.read} (기대 ${want.unused}/${want.read})`);
    }
  }
  for (const kind of e.absent ?? []) if (r.after.kinds?.[kind]) bad.push(`${kind}이 눈금에 올랐다`);
  for (const kind of e.excluded ?? []) if (!r.after.excluded?.includes(kind)) bad.push(`${kind}이 제외 목록에 없다`);
  if (e.stdout && !r.stdout.includes(e.stdout)) bad.push(`출력에 ${JSON.stringify(e.stdout)}가 없다`);
  if (e.noStdout && r.stdout.includes(e.noStdout)) bad.push(`출력에 ${JSON.stringify(e.noStdout)}가 있다`);
  if (e.stderr && !r.stderr.includes(e.stderr)) bad.push(`사유에 ${JSON.stringify(e.stderr)}가 없다`);
  return bad;
}

function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'source-usage-'));
  const failures = [];
  try {
    CASES.forEach((c, i) => {
      const r = runCase(dir, i, c);
      const bad = check(c, r);
      if (bad.length) {
        console.error(`  FAIL  ${c.note}`);
        for (const b of bad) console.error(`        ${b}`);
        if (r.stderr.trim()) console.error(`        stderr: ${r.stderr.trim().split('\n')[0]}`);
        failures.push(c.note);
      } else {
        console.log(`  PASS  ${c.note}`);
      }
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  if (failures.length) {
    console.error(`3단 갈래 누계 판정 검증 실패: ${failures.length}건`);
    process.exit(1);
  }
  console.log('3단 갈래 누계 판정 정상');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
