// 패키지 frontmatter에서 스크립트가 쓸 값(type·subtype·kind)을 읽는다. 본문의 주석·코드펜스 판정도 여기 둔다.
//
// 세션이 이 값을 스크립트 인자로 손으로 넘기면, subtype을 빠뜨려도 다른 subtype의 승인본·가이드가
// 오류 없이 나온다(채용 PR이 일반 PR 승인본을 받는다). 패키지가 생긴 뒤에는 `--from <패키지>`로 여기서 읽는다.
import fs from "node:fs";

// 본문의 `[//]: # (...)` 주석 줄 — 사용자가 남긴 지시문이다. 채점기와 리뷰어 입력 조립이 같은 판정을 쓴다.
// 목록 항목 아래 들여 쓴 주석도 주석이다. 놓치면 남은 주석 확인을 지나 발행되고 리뷰어가 지시문을 본문으로 문다.
export const COMMENT_LINE = /^\s*\[\/\/\]: #/;

// 줄을 차례로 넘기면 그 줄이 코드펜스 줄이거나 펜스 안인지 돌려주는 판정기. 펜스는 여는 것과 같은 문자로,
// 길이가 같거나 길 때만 닫힌다(CommonMark) — ``` 블록 안의 ~~~ 한 줄에 상태를 뒤집으면 펜스 뒤 주석을 펜스 안으로 본다.
export function fenceTracker() {
  let open = null;
  return (line) => {
    const fence = line.match(/^\s*(`{3,}|~{3,})/)?.[1];
    if (fence && !open) {
      open = fence;
      return true;
    }
    // 닫는 줄에는 info string이 못 붙는다 — ``` 블록 안의 ```js는 코드 내용이다.
    if (fence && fence[0] === open[0] && fence.length >= open.length && /^\s*(`+|~+)\s*$/.test(line)) {
      open = null;
      return true;
    }
    return open !== null;
  };
}

// 읽을 수 없으면 까닭을 내고 멈춘다 — 빈 값으로 이어 가면 엉뚱한 type의 파일이 조용히 나온다.
export function readPackageMeta(file) {
  const fail = (why) => {
    console.error(why);
    process.exit(1);
  };
  const text = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const fm = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1];
  if (fm === undefined) fail(`${file}에 frontmatter가 없다`);
  const field = (key) => {
    const v = fm.match(new RegExp(`^${key}:[ \\t]*(.*)$`, "m"))?.[1].trim();
    return v ? v.replace(/^(['"])(.*)\1$/, "$2") : null;
  };
  const meta = { type: field("type"), subtype: field("subtype"), kind: field("kind") };
  if (!meta.type) fail(`${file}의 frontmatter에 type이 없다`);
  return meta;
}
