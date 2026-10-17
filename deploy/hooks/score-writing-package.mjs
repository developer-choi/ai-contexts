// write-doc 글쓰기 패키지를 Edit·Write하면 채점 스크립트(score.mjs)를 돌려 기계 적발을 바로 돌려준다. 막지는 않는다.
//
// 채점은 세션이 score.mjs를 직접 불러야 돌았다. 안 부르면 금지어나, 리뷰어 대안을 반영하다 지워진 사용자 구절이
// 그대로 남는다 — 틀려도 그 자리에서 아무도 모른다. 그래서 고치는 순간 돌린다.
// 기계 적발 합계가 0이고 사용자 구절 누락도 없으면 조용하다. 사용자 구절 누락은 합계 밖이지만 함께 낸다 —
// 이 훅이 막으려는 사고가 그것이다.
//
// 파일 전체를 채점하므로 아직 안 다듬은 단위의 적발도 섞여 나온다. 다듬기는 단위마다 그 단위 줄의 적발만 닫는다.
// codex는 PostToolUse를 '*'로 통합하므로 tool_name으로 스스로 거른다.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { addContext, getToolName, readPayload } from "./hook-utils.mjs";
import { PACKAGE_TYPES, parseFrontmatter } from "./writing-package.mjs";

// 소스(deploy/hooks)와 배포본(<타겟>/hooks) 둘 다 한 단계 위가 skills의 부모다.
const SCORE = path.resolve(import.meta.dirname, "..", "skills", "write-doc", "scripts", "score.mjs");

const EDIT_TOOLS = new Set(["Edit", "Write"]);

// score.mjs 출력에서 합계에 드는 묶음(`[이름] N건`)과 사용자 구절 누락 묶음만 그 아래 줄째 고른다.
// 「합계에서 뺌」·「눈으로 확인」 묶음은 판단이 드는 후보라 Edit마다 띄우면 소음이다.
function pickBlocks(out) {
  const blocks = [];
  let current = null;
  for (const line of out.split("\n")) {
    const head = line.match(/^\[([^\]]+)\] (.*)$/);
    if (head) {
      const count = Number(head[2].match(/(\d+)건/)?.[1] ?? head[2].match(/중 (\d+)개/)?.[1] ?? 0);
      const lost = head[1] === "사용자 구절 누락";
      const inTotal = !/합계에서 뺌|눈으로 확인/.test(head[2]);
      current = count > 0 && (lost || inTotal) ? [line] : null;
      if (current) blocks.push(current);
    } else if (current && /^\s{3}/.test(line)) {
      current.push(line);
    } else {
      current = null;
    }
  }
  return blocks;
}

const payload = readPayload();
const file = payload?.tool_input?.file_path;
if (!EDIT_TOOLS.has(getToolName(payload)) || typeof file !== "string" || !/\.md$/i.test(file)) process.exit(0);
if (!fs.existsSync(SCORE)) process.exit(0);

let text;
try {
  text = fs.readFileSync(file, "utf8");
} catch {
  process.exit(0);
}
if (!PACKAGE_TYPES.has(parseFrontmatter(text)?.type)) process.exit(0);

let out;
try {
  out = execFileSync(process.execPath, [SCORE, file, "--json"], { encoding: "utf8", timeout: 20000 });
} catch {
  process.exit(0); // 채점기가 실패하면 편집을 방해하지 않고 조용히 지나간다 — 막는 훅이 아니다
}
const total = JSON.parse(out.match(/^@@score (.*)$/m)?.[1] ?? "{}").total ?? 0;
const blocks = pickBlocks(out);
if (!total && !blocks.length) process.exit(0);

addContext(
  [
    `[채점] ${path.basename(file)} — 기계 적발 합계 ${total}건. 다듬는 중인 단위 줄의 적발은 그 단위를 내밀기 전에 닫는다.`,
    ...blocks.map((b) => b.join("\n")),
  ].join("\n"),
  "PostToolUse",
);
