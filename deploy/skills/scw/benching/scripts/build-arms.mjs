#!/usr/bin/env node
// 팔별 작업 폴더를 만든다 — 원본을 팔 수만큼 복사하고, 팔마다 정해진 치환을 적용한다.
//
// 측정 대상이 시스템 프롬프트가 아니라 **워커가 열어야 할 파일**일 때 쓴다.
// 그때는 팔마다 변형을 적용한 체크아웃을 cwd로 줘야 하고, 그 경로가
// `bench-ablation.mjs`의 eval-set `variant_cwds`로 들어간다.
//
// 사용법: node build-arms.mjs <명세> <출력루트> [묶음필터]
//   <명세>      .mjs면 default export, .json이면 그 내용을 명세로 읽는다
//   [묶음필터]  쉼표로 구분한 묶음 이름(팔 이름의 첫 조각). 준 것만 다시 만든다.
//               다른 묶음이 측정 중일 때 그 폴더를 안 건드리려고 둔다 — 도는 중에
//               cwd가 사라지면 그 팔 전 런이 죽어 「델타 없음」으로 읽힌다.
//
// 명세 형식:
//   {
//     src: '<원본 폴더 절대경로>',        // 측정 워크트리 안의 폴더. 이 스크립트는 읽기만 한다
//     arms: {
//       'k1/w1': [],                      // 현행 팔 — 치환 없음
//       'k1/w2': [
//         { file: 'a/b.md', from: '원문', to: '치환문' },
//         { file: 'a/b.md', line: '통째로 지울 줄' },   // from: line+개행, to: '' 과 같다
//       ],
//     },
//   }
//
// 팔 폴더 이름은 뜻이 안 드러나게 짓는다 (`w1`·`w2`…). 워커가 경로에서 측정 대상이나
// 자기가 어느 팔인지 역추론하면 그것이 곧 누설이다 — `benching/operations.md`
// 「측정 도구 누설」이 정본이다.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const [specPath, outRoot, only] = process.argv.slice(2);
if (!specPath || !outRoot) {
  process.stderr.write('사용법: node build-arms.mjs <명세> <출력루트> [묶음필터]\n');
  process.exit(2);
}

const spec = specPath.endsWith('.mjs') || specPath.endsWith('.js')
  ? (await import(pathToFileURL(path.resolve(specPath)).href)).default
  : JSON.parse(fs.readFileSync(specPath, 'utf8'));

if (!spec?.src || !spec?.arms) {
  process.stderr.write('명세에 src와 arms가 있어야 한다\n');
  process.exit(2);
}
if (!fs.existsSync(spec.src)) {
  process.stderr.write(`원본이 없다: ${spec.src}\n`);
  process.exit(2);
}

const ONLY = only ? new Set(only.split(',')) : null;

for (const [arm, rawEdits] of Object.entries(spec.arms)) {
  if (ONLY && !ONLY.has(arm.split('/')[0])) continue;

  const dest = path.join(outRoot, arm);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(spec.src, dest, { recursive: true });

  // 개행을 **전 팔에서 똑같이** LF로 맞춘다. 원본이 CRLF인데 변형을 준 팔만 LF가 되면
  // 그 차이 자체가 팔 간 비대칭이 된다.
  for (const entry of fs.readdirSync(dest, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const full = path.join(entry.parentPath ?? entry.path, entry.name);
    fs.writeFileSync(full, fs.readFileSync(full, 'utf8').replaceAll('\r\n', '\n'), 'utf8');
  }

  const touched = new Map();
  for (const e of rawEdits) {
    const from = e.line != null ? `${e.line}\n` : e.from;
    const to = e.line != null ? '' : e.to;
    if (from == null || to == null) {
      throw new Error(`[${arm}] ${e.file}: 항목에 from/to 또는 line이 있어야 한다`);
    }
    const full = path.join(dest, e.file);
    let text = touched.get(full) ?? fs.readFileSync(full, 'utf8');

    // 정확히 1회가 아니면 죽인다. 앵커가 빗나가면 후보를 걷은 팔이 조용히 현행과 같아지는데,
    // 그 run은 실행 실패로 안 잡혀 델타 0으로 찍히고 그대로 삭제 근거가 된다.
    const hits = text.split(from).length - 1;
    if (hits !== 1) {
      throw new Error(`[${arm}] ${e.file}: 원문이 ${hits}회 — 정확히 1회여야 한다\n  ${from.slice(0, 90)}`);
    }

    touched.set(full, text.replace(from, to));
  }
  for (const [full, text] of touched) fs.writeFileSync(full, text, 'utf8');

  process.stdout.write(`${arm}: ${rawEdits.length}건 치환, ${touched.size}파일\n`);
}
