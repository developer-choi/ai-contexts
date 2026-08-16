#!/usr/bin/env node
// 등록 레포의 추적되는 .md 전수에서 깨진 링크를 결정적으로 검출한다(diff 무관).
//
// refresh-projects가 diff 기반이라, 링크 대상이 발밑에서 사라지면(README는 안 바뀜)
// 깨진 링크가 오래 산다. 이 체커가 그 사각을 메운다. 외부 HTTP는 보지 않는다 —
// GitHub 페이지 내 404도 HTTP 200을 반환해 무의미하고, 비용만 든다.
//
// 링크 target을 4갈래로 분류한다:
//   - in-page 앵커(#...)        → 같은 파일 헤딩 슬러그에 존재하는지
//   - in-repo 상대경로          → 레포 안 파일 존재 + (.md면) 앵커
//   - 내 레포 GitHub URL        → remote 슬러그 역산으로 로컬 매핑 후 파일 + 앵커
//   - 모르는 외부 URL           → 체크 안 하고 pile로 모아 사용자에게 넘김
//
// 깨진 링크가 있으면 exit 1(회귀·CI 활용). 외부 pile은 실패로 치지 않는다.
// README/비-README로 갈라 출력한다 — refresh-projects가 전자는 자동수정, 후자는 보고만.
//
// 반대 방향도 함께 본다: 아무도 안 가리키는 md(고아). 깨진 링크가 "가리키는 대상이
// 없다"라면 고아는 "가리키는 사람이 없다"다. 로드되지 않는 문서는 낡아도 아무도 모르고
// 정비 회차에서만 발견된다. 판정은 보고만 하고 exit code를 바꾸지 않는다 — 아래 「도달
// 판정」이 휴리스틱이라 오탐이 커밋을 막으면 안 된다.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";

// ── 경로 유틸 ───────────────────────────────────────────────
function expandHome(p) {
  return p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p;
}
function toPosix(p) {
  return p.split(path.sep).join("/");
}
function isReadme(relPath) {
  return path.basename(relPath).toLowerCase() === "readme.md";
}

// ── git 연동 ────────────────────────────────────────────────
// repo의 origin remote에서 owner/repo 슬러그를 역산한다. (push 대상이라 가장 신뢰 가능 —
// package.json·디렉토리명은 어긋날 수 있다.) 못 구하면 null.
function repoSlug(repoRoot) {
  try {
    const url = execFileSync("git", ["-C", repoRoot, "remote", "get-url", "origin"], {
      encoding: "utf8",
    }).trim();
    const m = url.match(/github\.com[/:]([^/]+)\/(.+?)(?:\.git)?$/i);
    return m ? `${m[1]}/${m[2]}`.toLowerCase() : null;
  } catch {
    return null;
  }
}

// 추적 파일 목록 (node_modules·.claude/.agents 산출물 자동 배제). repo 기준 posix 상대경로.
// pathspec 없이 부르면 전체 — 고아 검출은 md를 호명하는 쪽이 json·스크립트일 수 있어 전체가 필요하다.
function listFiles(repoRoot, ...pathspec) {
  try {
    const out = execFileSync("git", ["-C", repoRoot, "ls-files", "-z", ...pathspec], {
      encoding: "utf8",
    });
    return out.split("\0").filter(Boolean);
  } catch {
    return [];
  }
}

function listMd(repoRoot) {
  return listFiles(repoRoot, "*.md");
}

// ── 마크다운 파싱 ───────────────────────────────────────────
// 인라인 링크·이미지 [text](target) / ![alt](src)의 target과 줄번호를 뽑는다.
// 코드펜스(``` ~~~) 안은 건너뛴다. 참조형 링크([a][ref])는 다루지 않는다(드묾).
const LINK_RE = /!?\[[^\]]*\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g;

// 인라인 코드(`…`, ``…``) 안의 링크 표기는 "링크는 이렇게 쓴다"는 예시라 대상이 아니다.
// 여는 백틱 수와 같은 수로 닫히는 구간을 같은 길이의 공백으로 덮어 열 위치를 보존한다.
const INLINE_CODE_RE = /(`+)((?:(?!\1)[\s\S])*?)\1/g;

function maskInlineCode(line) {
  return line.replace(INLINE_CODE_RE, (matched) => " ".repeat(matched.length));
}

function extractLinks(text) {
  const out = [];
  const lines = text.split(/\r?\n/);
  let inFence = false;
  let fence = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = line.match(/^\s*(```+|~~~+)/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!inFence) {
        inFence = true;
        fence = marker;
      } else if (marker === fence) {
        inFence = false;
      }
      continue;
    }
    if (inFence) continue;
    for (const m of maskInlineCode(line).matchAll(LINK_RE)) {
      out.push({ target: m[1], line: i + 1 });
    }
  }
  return out;
}

// 헤딩 텍스트 → GitHub 슬러그. 인라인 마크다운(링크·코드·강조) 제거 후
// 소문자화·구두점 제거(문자/숫자/언더스코어/공백/하이픈만 보존, 유니코드·한글 유지)·공백→'-'.
function githubSlug(headingText) {
  const text = headingText
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // [a](b) → a
    .replace(/[`*_~]/g, "");
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
}

// 파일의 헤딩 슬러그 집합(코드펜스 밖 # ~ ######). 같은 슬러그 반복 시 -1,-2 부여(GitHub 규칙).
function headingSlugs(text) {
  const slugs = new Set();
  const seen = new Map();
  const lines = text.split(/\r?\n/);
  let inFence = false;
  let fence = "";
  for (const line of lines) {
    const fenceMatch = line.match(/^\s*(```+|~~~+)/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!inFence) {
        inFence = true;
        fence = marker;
      } else if (marker === fence) {
        inFence = false;
      }
      continue;
    }
    if (inFence) continue;
    const h = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!h) continue;
    const base = githubSlug(h[2]);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    slugs.add(n === 0 ? base : `${base}-${n}`);
  }
  return slugs;
}

// ── 분류 ────────────────────────────────────────────────────
// target → { kind, ... }. kind: anchor | in-repo | myrepo-url | external | ignore
function classify(target, slugMap) {
  if (target.startsWith("#")) {
    return { kind: "anchor", anchor: decodeURIComponent(target.slice(1)) };
  }
  // 스킴 있는 URL
  const scheme = target.match(/^([a-z][a-z0-9+.-]*):/i);
  if (scheme || target.startsWith("//")) {
    const proto = (scheme?.[1] || "").toLowerCase();
    if (proto !== "http" && proto !== "https" && !target.startsWith("//")) {
      return { kind: "ignore" }; // mailto:, tel: 등
    }
    const gh = target.match(
      /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|tree)\/[^/]+\/([^#?]*)(?:#(.*))?$/i,
    );
    if (gh) {
      const slug = `${gh[1]}/${gh[2]}`.toLowerCase();
      if (slugMap.has(slug)) {
        return {
          kind: "myrepo-url",
          repoRoot: slugMap.get(slug),
          filePath: decodeURIComponent(gh[3]),
          anchor: gh[4] ? decodeURIComponent(gh[4]) : null,
        };
      }
    }
    return { kind: "external", url: target };
  }
  // 상대경로 (앵커 동반 가능)
  const hashIdx = target.indexOf("#");
  const filePath = hashIdx >= 0 ? target.slice(0, hashIdx) : target;
  const anchor = hashIdx >= 0 ? decodeURIComponent(target.slice(hashIdx + 1)) : null;
  if (filePath === "") return { kind: "ignore" }; // 순수 앵커는 위에서 처리됨
  return { kind: "in-repo", filePath: decodeURIComponent(filePath), anchor };
}

// ── 검사 ────────────────────────────────────────────────────
// 헤딩 슬러그 캐시(파일 절대경로 → Set). 없는 파일은 null 캐시.
function makeSlugCache() {
  const cache = new Map();
  return (absPath) => {
    if (cache.has(absPath)) return cache.get(absPath);
    let slugs = null;
    try {
      slugs = headingSlugs(fs.readFileSync(absPath, "utf8"));
    } catch {
      slugs = null;
    }
    cache.set(absPath, slugs);
    return slugs;
  };
}

function checkAnchorIn(absPath, anchor, getSlugs) {
  if (!anchor) return true; // 앵커 없으면 파일 존재만으로 충분
  if (!absPath.toLowerCase().endsWith(".md")) return true; // 비-.md(코드 라인앵커 등)는 검증 안 함
  const slugs = getSlugs(absPath);
  if (!slugs) return false; // 대상 파일 자체가 없음
  return slugs.has(githubSlug(anchor));
}

// repoRoot들을 받아 깨진 링크 목록 + 외부 pile을 반환한다.
function scan(repoRoots) {
  const repos = repoRoots.map((r) => path.resolve(expandHome(r)));
  const slugMap = new Map();
  for (const root of repos) {
    const slug = repoSlug(root);
    if (slug) slugMap.set(slug, root);
  }

  const getSlugs = makeSlugCache();
  const broken = []; // { repoRoot, file, line, target, category, reason, readme }
  const external = []; // { repoRoot, file, line, url }
  const orphans = []; // { repoRoot, file }

  for (const root of repos) {
    orphans.push(...findOrphans(root, listFiles(root)));
    for (const rel of listMd(root)) {
      const abs = path.join(root, rel);
      let text;
      try {
        text = fs.readFileSync(abs, "utf8");
      } catch {
        continue;
      }
      const readme = isReadme(rel);
      for (const { target, line } of extractLinks(text)) {
        const c = classify(target, slugMap);
        const rec = { repoRoot: root, file: rel, line, target, readme };
        if (c.kind === "ignore") continue;
        if (c.kind === "external") {
          external.push({ repoRoot: root, file: rel, line, url: c.url });
          continue;
        }
        if (c.kind === "anchor") {
          if (!checkAnchorIn(abs, c.anchor, getSlugs)) {
            broken.push({ ...rec, category: "anchor", reason: `앵커 #${c.anchor} 없음` });
          }
          continue;
        }
        if (c.kind === "in-repo") {
          const targetAbs = path.resolve(path.dirname(abs), c.filePath);
          const targetRel = toPosix(path.relative(root, targetAbs));
          if (targetRel.startsWith("..")) {
            broken.push({ ...rec, category: "in-repo", reason: "repo 경계 밖 상대경로" });
            continue;
          }
          if (!fs.existsSync(targetAbs)) {
            broken.push({ ...rec, category: "in-repo", reason: "파일 없음" });
          } else if (!checkAnchorIn(targetAbs, c.anchor, getSlugs)) {
            broken.push({ ...rec, category: "in-repo", reason: `대상에 앵커 #${c.anchor} 없음` });
          }
          continue;
        }
        if (c.kind === "myrepo-url") {
          const targetAbs = path.join(c.repoRoot, c.filePath);
          if (!fs.existsSync(targetAbs)) {
            broken.push({ ...rec, category: "myrepo-url", reason: "매핑된 로컬 파일 없음" });
          } else if (!checkAnchorIn(targetAbs, c.anchor, getSlugs)) {
            broken.push({ ...rec, category: "myrepo-url", reason: `대상에 앵커 #${c.anchor} 없음` });
          }
          continue;
        }
      }
    }
  }
  return { broken, external, orphans, repos };
}

// ── 고아 md 검출 ────────────────────────────────────────────
// 진입점 관례상 아무도 호명하지 않는 이름. 도구·런타임이 위치로 찾는다.
const ENTRY_BASENAMES = new Set([
  "readme.md", "claude.md", "agents.md", "gemini.md",
  "skill.md", "map.md", "todo.md", "contributing.md",
]);

// 한 문서가 다른 문서에 도달하는 경로는 두 가지다.
//   (1) 이름으로 호명 — 본문에 파일명이 등장한다. 링크든 백틱 경로든 산문이든 상관없다.
//   (2) 디렉토리 통째 탐색 — "그 폴더를 Glob해서 전부 읽어라" 식이라 개별 파일명이 안 나온다.
//
// (2)를 이름 안 나옴만으로 고아 처리하면 오탐이 압도한다(AC 실측 29건 중 27건). 그래서
// **바구니 판정**을 둔다: 디렉토리 이름이 어딘가에 등장하는데 그 안의 md가 하나도 개별
// 호명되지 않으면, 그 디렉토리는 통째로 읽히는 바구니로 본다. 거꾸로 형제 중 하나라도
// 개별 호명되는 디렉토리는 파일 단위로 불리는 자리이므로, 거기서 혼자 안 불리는 파일은
// 진짜 고아다.
function findOrphans(root, files) {
  const corpus = [];
  for (const f of files) {
    try {
      corpus.push({ f, text: fs.readFileSync(path.join(root, f), "utf8") });
    } catch { /* 바이너리·읽기 실패는 건너뛴다 */ }
  }
  const mentionedElsewhere = (needle, self) =>
    corpus.some(({ f, text }) => f !== self && text.includes(needle));

  // 파일명이 등장해도 앞에 붙은 폴더가 다르면 남의 파일 얘기다. 다른 레포에 같은 이름이
  // 있을 때 그쪽 경로를 적은 문장이 이쪽 파일을 살려주는 것을 막는다.
  // 폴더 없이 이름만 나온 언급은 이 파일을 가리키는 것으로 본다.
  //
  // 주의: 이 판정은 본문 문자열만 본다. 설명 주석에 실제 경로를 적으면 그 경로의 파일이
  // 호명된 것으로 잡히므로, 예시 경로는 실재하지 않는 이름으로 쓴다.
  function namedElsewhere(md) {
    const base = path.posix.basename(md);
    const parent = path.posix.basename(path.posix.dirname(md));
    return corpus.some(({ f, text }) => {
      if (f === md) return false;
      let from = 0;
      for (;;) {
        const i = text.indexOf(base, from);
        if (i < 0) return false;
        from = i + 1;
        const prev = i === 0 ? "" : text[i - 1];
        // 더 긴 이름의 꼬리로 걸린 것은 이 파일 얘기가 아니다 (`checklist.md` 안의 `list.md`).
        if (/[A-Za-z0-9_-]/.test(prev)) continue;
        if (prev !== "/") return true; // 폴더 수식 없음
        const seg = text.slice(0, i - 1).match(/([^\s/`'"()[\]]*)$/)?.[1] ?? "";
        if (seg === "" || seg === "." || seg === ".." || seg === parent) return true;
      }
    });
  }

  const mds = files.filter((f) => f.toLowerCase().endsWith(".md"));
  const named = new Map(); // md 경로 → 다른 파일이 이름으로 부르는가
  for (const md of mds) named.set(md, namedElsewhere(md));

  // 디렉토리별 직속 md 집계 → 바구니 판정
  const byDir = new Map();
  for (const md of mds) {
    const d = path.posix.dirname(md);
    if (!byDir.has(d)) byDir.set(d, []);
    byDir.get(d).push(md);
  }
  const isBasket = new Map();
  for (const [dir, members] of byDir) {
    const dirNamed = dir !== "." && mentionedElsewhere(path.posix.basename(dir) + "/", null);
    // 직속 md가 없는 디렉토리는 바구니가 될 수 없다 — 조건이 공허하게 참이 되어
    // 상위 폴더 이름 하나로 하위 전체가 도달 가능해진다.
    // 개별 호명이 소수에 그치면 바구니로 본다. 바구니 안에도 대표 파일 한둘은 따로
    // 불리는 일이 흔해서(예: 템플릿 모음 중 한 종류만 본문에서 예시로 언급) 0건을
    // 요구하면 나머지 형제가 통째로 오탐이 된다.
    const namedCount = members.filter((m) => named.get(m)).length;
    isBasket.set(dir, dirNamed && members.length > 0 && namedCount * 2 <= members.length);
  }

  const orphans = [];
  for (const md of mds) {
    if (ENTRY_BASENAMES.has(path.posix.basename(md).toLowerCase())) continue;
    if (named.get(md)) continue;
    // 자기 디렉토리부터 위로 올라가며 바구니를 만나면 도달 가능
    let dir = path.posix.dirname(md);
    let reachable = false;
    while (dir && dir !== "." && dir !== "/") {
      if (isBasket.get(dir)) { reachable = true; break; }
      dir = path.posix.dirname(dir);
    }
    if (!reachable) orphans.push({ repoRoot: root, file: md });
  }
  return orphans;
}

// ── 출력 ────────────────────────────────────────────────────
function shortFile(rec) {
  return `${toPosix(path.basename(rec.repoRoot))}/${rec.file}:${rec.line}`;
}

function report({ broken, external, orphans = [] }) {
  const readmeBroken = broken.filter((b) => b.readme);
  const otherBroken = broken.filter((b) => !b.readme);

  const printGroup = (title, items) => {
    if (!items.length) return;
    console.log(`\n${title} (${items.length})`);
    for (const b of items) console.log(`  ${shortFile(b)}  [${b.category}] ${b.reason}\n    → ${b.target}`);
  };

  console.log("=== 깨진 링크 검출 결과 ===");
  printGroup("README 깨진 링크 (Phase 4-readme 자동수정 대상)", readmeBroken);
  printGroup("비-README 깨진 링크 (Phase 2 보고만)", otherBroken);

  if (external.length) {
    console.log(`\n모르는 외부 URL — 사용자 직접 확인 (${external.length})`);
    for (const e of external) console.log(`  ${toPosix(path.basename(e.repoRoot))}/${e.file}:${e.line}  → ${e.url}`);
  }

  if (orphans.length) {
    console.log(`\n아무도 안 가리키는 md — 존폐 판정 대상 (${orphans.length})`);
    for (const o of orphans) console.log(`  ${toPosix(path.basename(o.repoRoot))}/${o.file}`);
    console.log("  (통째로 Glob되는 폴더는 걸러냈으나 휴리스틱이라 오탐 가능. 실패로 치지 않는다.)");
  }

  if (!broken.length && !external.length) console.log("\n깨진 링크·미확인 외부 URL 없음.");
  else if (!broken.length) console.log("\n깨진 in-repo/내레포 링크 없음 (외부 pile은 사용자 확인 대상).");
}

function main(argv) {
  const args = argv.filter((a) => a !== "--json");
  const asJson = argv.includes("--json");
  const repoRoots = args.length ? args : ["."];
  const result = scan(repoRoots);
  if (asJson) {
    console.log(
      JSON.stringify(
        { broken: result.broken, external: result.external, orphans: result.orphans },
        null,
        2,
      ),
    );
  } else {
    report(result);
  }
  process.exit(result.broken.length ? 1 : 0);
}

export { scan, classify, githubSlug, headingSlugs, extractLinks, repoSlug, findOrphans };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2));
}
