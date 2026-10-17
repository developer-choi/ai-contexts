#!/usr/bin/env node
// 단계마다 읽을·넘길 writing-guide 파일 경로를 낸다. 로드 목록의 정본이다.
//
// type 폴더에 template.md·guide.md가 있는지, subtype 폴더가 있는지를 세션이 단계마다 손으로 확인하고
// 절대경로로 풀면, 단계 문서 세 곳(초안·다듬기·표현 리뷰어)에 같은 목록이 사본으로 살다가 한쪽만 고쳐진다.
// 그 어긋남은 리뷰어가 파일을 못 읽는 것으로만 드러나 조용하다. 있는 파일만 절대경로로 낸다.
//
// 사용:
//   node guide-files.mjs <type> [--subtype <subtype>] --for draft      초안 단계가 Read할 type 템플릿·가이드
//   node guide-files.mjs <type> [--subtype <subtype>] --for polish     다듬기 단계 메인이 Read할 톤 규칙·가이드
//   node guide-files.mjs <type> [--subtype <subtype>] --for finish     마무리 단계 메인이 Read할 반려 줄 꼴·type 단계 파일
//   node guide-files.mjs <type> [--subtype <subtype>] --for reviewer   표현 리뷰어가 읽을 경로 (늘 + 조건부, reviewer-input.mjs가 쓴다)
//   node guide-files.mjs --from <패키지.md> --for <단계>                type·subtype을 패키지 frontmatter에서 읽는다
//                                                                     (패키지가 생긴 뒤 단계는 이쪽을 쓴다 — 손으로 넘기면 subtype을 빠뜨린다)
//
// type 폴더의 steps.md는 그 type만 더 도는 절차라 메인 단계(draft·polish·finish)에만 낸다.
// 단계 문서에 type 이름을 박은 분기를 두면 type이 늘 때마다 모든 세션이 남의 type 분기까지 읽는다.
// steps.md의 `## [OUTLINE_STEP] …` 절은 단계 파일에 같은 절차 ID가 있어야 읽힌다.
// 단계 파일에서 ID를 바꾸거나 지우면 type 절이 조용히 안 읽히므로, 낼 때마다 대조해 어긋나면 멈춘다.
//   node guide-files.mjs --check   모든 type의 steps.md를 대조만 한다
//
// 조건부 경로는 판단이 드는 조건(본문에 수치가 있는가 등)이라 고르지 않고 조건과 함께 낸다. 고르는 것은 메인이다.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { readPackageMeta } from "./package-meta.mjs";

// 소스(deploy/skills/write-doc/scripts)와 배포본(<타겟>/skills/write-doc/scripts) 둘 다 세 단계 위가 contexts의 부모다.
const GUIDE = path.resolve(import.meta.dirname, "..", "..", "..", "contexts", "writing-guide");

const FOR = ["draft", "polish", "finish", "reviewer"];

// 리뷰어에게 넘길 조건부 경로. 조건 문장은 메인이 본문을 보고 가르는 기준이다.
const CONDITIONAL = [
  ["문단·구조 이슈가 보이면", "examples/structure.md"],
  ["본문에 수치·단정 표현이 있거나 요약·축소 정확성이 걸리면 (단정 수위를 낮추는 것까지가 표현 다듬기다. 사실 자체의 검증은 초안 단계 책임)", "examples/accuracy.md"],
  ["해법·선택을 제시하는 절이 있으면", "tradeoff-guide.md"],
];

const existing = (...rels) => rels.map((r) => path.join(GUIDE, r)).filter((f) => fs.existsSync(f));

// type 폴더의 template.md·guide.md와 subtype 폴더의 guide.md. 승인본 폴더·사례 묶음은 넣지 않는다 — 승인본은 approved.mjs로 한 편만 읽는다.
function typeFiles(type, subtype, { template }) {
  const base = path.join("types", type);
  return existing(
    ...(template ? [path.join(base, "template.md")] : []),
    path.join(base, "guide.md"),
    ...(subtype ? [path.join(base, subtype, "guide.md")] : []),
  );
}

const STEPS_DIR = path.resolve(import.meta.dirname, "..", "steps");
const STEP_ID = /\[([A-Z_]+_STEP)\]/;

// 단계 파일 셋에 있는 절차 ID. 같은 ID가 두 번 나오면 type 절이 어느 절차에 붙는지 갈리지 않으므로 멈춘다.
function baseStepIds() {
  const ids = ["draft.md", "polish.md", "finish.md"].flatMap((f) =>
    fs.readFileSync(path.join(STEPS_DIR, f), "utf8").split("\n").map((l) => l.match(STEP_ID)?.[1]).filter(Boolean));
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) throw new Error(`단계 파일에 절차 ID ${dup.join(" ")}가 두 번 이상 있다`);
  return new Set(ids);
}

// steps.md의 `## ` 절 중 단계 파일에 없는 ID(또는 ID 없는 절)를 돌려준다.
export function unmatchedSections(file) {
  const ids = baseStepIds();
  const heads = fs.readFileSync(file, "utf8").split("\n").filter((l) => l.startsWith("## ")).map((l) => l.slice(3).trim());
  return heads.filter((h) => !ids.has(h.match(STEP_ID)?.[1]));
}

// type 폴더의 steps.md, 이어서 subtype 폴더의 steps.md. subtype 절은 type 절 다음에 돈다.
function typeSteps(type, subtype) {
  const files = existing(path.join("types", type, "steps.md"), ...(subtype ? [path.join("types", type, subtype, "steps.md")] : []));
  for (const f of files) {
    const bad = unmatchedSections(f);
    if (bad.length) throw new Error(`${f}의 절 ${bad.map((b) => `「${b}」`).join(" ")}에 단계 파일의 절차 ID가 없다`);
  }
  return files;
}

export function guideFiles(type, subtype, step) {
  if (step === "draft") return { always: [...typeFiles(type, subtype, { template: true }), ...typeSteps(type, subtype)], conditional: [] };
  if (step === "polish") return { always: [...existing("tone.md"), ...typeFiles(type, subtype, { template: false }), ...typeSteps(type, subtype)], conditional: [] };
  if (step === "finish") return { always: [...existing("rejected.md"), ...typeSteps(type, subtype)], conditional: [] };
  return {
    always: [...existing("tone.md", "examples/tone.md", "rejected.md"), ...typeFiles(type, subtype, { template: true })],
    conditional: CONDITIONAL.flatMap(([when, rel]) => existing(rel).map((file) => ({ when, file }))),
  };
}

function parseArgs(argv) {
  const args = { type: null, subtype: null, step: null, from: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--subtype") args.subtype = argv[++i];
    else if (argv[i] === "--for") args.step = argv[++i];
    else if (argv[i] === "--from") args.from = argv[++i];
    else args.type ??= argv[i];
  }
  if (args.from) {
    const meta = readPackageMeta(args.from);
    args.type ??= meta.type;
    args.subtype ??= meta.subtype;
  }
  return args;
}

function check() {
  const typesDir = path.join(GUIDE, "types");
  let failed = false;
  for (const t of fs.readdirSync(typesDir)) {
    const subs = fs.readdirSync(path.join(typesDir, t), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
    for (const sub of [null, ...subs]) {
      try { typeSteps(t, sub); } catch (e) { console.error(e.message); failed = true; }
    }
  }
  if (failed) process.exit(1);
  console.log("type steps.md 절의 절차 ID 모두 단계 파일에 있음");
}

function main() {
  if (process.argv.includes("--check")) return check();
  const { type, subtype, step } = parseArgs(process.argv.slice(2));
  if (!type || !FOR.includes(step)) {
    console.error(`사용: node guide-files.mjs <type> [--subtype <subtype>] | --from <패키지.md>  --for ${FOR.join("|")}`);
    process.exit(1);
  }
  const { always, conditional } = guideFiles(type, subtype, step);
  console.log(step === "reviewer" ? "## 늘 넘긴다" : "## Read한다");
  console.log(always.map((f) => `- ${f}`).join("\n") || "- 없음");
  if (conditional.length) {
    console.log("\n## 조건에 맞을 때만 더 넘긴다");
    for (const { when, file } of conditional) console.log(`- ${when}: ${file}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
