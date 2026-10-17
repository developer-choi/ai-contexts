#!/usr/bin/env node
// 대상 md에서 부정문(「않는다」·「말고」·「금지」·「없이」 류)을 바로 앞뒤 문장과 함께 빠짐없이 뽑는다. 판정은 하지 않는다.
//
// 리뷰어가 긴 문서를 읽으며 지적을 고르면 회차마다 집는 곳이 달라, 군더더기 부정문이 남는다
// (벤치: 같은 문서에서 리뷰어가 매번 다른 부정문을 건너뛰었다). 후보 고르기는 여기서 하고, 리뷰어는
// 목록의 줄마다 남길지 지울지만 판정한다. 부르는 곳은 [군더더기를 지운다](trimming.md#군더더기를-지운다)다.
// 앞뒤 문장을 함께 내는 것은 「옆 문장이 이미 같은 뜻인가」를 리뷰어가 파일을 다시 열지 않고 보게 하려는 것이다.
//
// 사용: node <이 파일이 있는 폴더>/negatives.mjs <대상.md> [<대상.md> ...]
//
// 코드블록 안은 건너뛴다. 문장은 줄 안에서 「다.」·「다 —」 같은 끝맺음으로 자르고, 앞뒤 문장은 같은 줄이나
// 바로 이웃한 줄(빈 줄·헤딩을 넘지 않는다)에서 찾는다.
import fs from "node:fs";
import { pathToFileURL } from "node:url";

// 습니다체 문서(writing-guide 등)의 부정 종결도 잡는다 — 해라체 꼴만 보면 그런 문서에서 판정이 조용히 비어 돈다.
const NEGATIVE = /않는다|않습니다|않고|않게|않도록|않아야|않으면|말고|말라|마십시오|마세요|금지|없이/;

// 한국어 문장 끝: 「다.」「다」+줄끝, 그리고 「—」 앞 「다」. 목록 기호와 굵게 표시는 문장에 남긴다.
export function sentences(line) {
  return line
    .split(/(?<=[다요]\.)\s+|(?<=[다요])\s+—\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function negatives(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let fence = false;
  lines.forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fence = !fence;
      return;
    }
    if (fence || !NEGATIVE.test(line)) return;
    const ss = sentences(line);
    ss.forEach((s, j) => {
      if (!NEGATIVE.test(s)) return;
      const neighbor = (k) => {
        const l = lines[k];
        if (l === undefined || /^\s*$/.test(l) || /^#/.test(l)) return null;
        return l.trim();
      };
      const prev = j > 0 ? ss[j - 1] : neighbor(i - 1) && sentences(neighbor(i - 1)).at(-1);
      const next = j < ss.length - 1 ? ss[j + 1] : neighbor(i + 1) && sentences(neighbor(i + 1))[0];
      out.push({ line: i + 1, sentence: s, prev: prev ?? null, next: next ?? null });
    });
  });
  return out;
}

function main() {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error("사용: node <이 파일이 있는 폴더>/negatives.mjs <대상.md> [<대상.md> ...]");
    process.exit(1);
  }
  for (const file of files) {
    const hits = negatives(fs.readFileSync(file, "utf8"));
    console.log(`## ${file} — 부정문 ${hits.length}개`);
    for (const h of hits) {
      console.log(`\n- ${h.line}: ${h.sentence}`);
      if (h.prev) console.log(`  - 앞: ${h.prev}`);
      if (h.next) console.log(`  - 뒤: ${h.next}`);
    }
    console.log("");
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
