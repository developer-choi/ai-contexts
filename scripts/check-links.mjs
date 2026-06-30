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

// 추적되는 .md만 (node_modules·.claude/.agents 산출물 자동 배제). repo 기준 posix 상대경로.
function listMd(repoRoot) {
  try {
    const out = execFileSync("git", ["-C", repoRoot, "ls-files", "-z", "*.md"], { encoding: "utf8" });
    return out.split("\0").filter(Boolean);
  } catch {
    return [];
  }
}

// ── 마크다운 파싱 ───────────────────────────────────────────
// 인라인 링크·이미지 [text](target) / ![alt](src)의 target과 줄번호를 뽑는다.
// 코드펜스(``` ~~~) 안은 건너뛴다. 참조형 링크([a][ref])는 다루지 않는다(드묾).
const LINK_RE = /!?\[[^\]]*\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g;

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
    for (const m of line.matchAll(LINK_RE)) {
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

  for (const root of repos) {
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
  return { broken, external, repos };
}

// ── 출력 ────────────────────────────────────────────────────
function shortFile(rec) {
  return `${toPosix(path.basename(rec.repoRoot))}/${rec.file}:${rec.line}`;
}

function report({ broken, external }) {
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

  if (!broken.length && !external.length) console.log("\n깨진 링크·미확인 외부 URL 없음.");
  else if (!broken.length) console.log("\n깨진 in-repo/내레포 링크 없음 (외부 pile은 사용자 확인 대상).");
}

function main(argv) {
  const args = argv.filter((a) => a !== "--json");
  const asJson = argv.includes("--json");
  const repoRoots = args.length ? args : ["."];
  const result = scan(repoRoots);
  if (asJson) {
    console.log(JSON.stringify({ broken: result.broken, external: result.external }, null, 2));
  } else {
    report(result);
  }
  process.exit(result.broken.length ? 1 : 0);
}

export { scan, classify, githubSlug, headingSlugs, extractLinks, repoSlug };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2));
}
