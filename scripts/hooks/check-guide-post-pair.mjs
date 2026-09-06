#!/usr/bin/env node
// 전역 git pre-commit 훅. MP `docs/guides/<주제>/step<N>.md`와 블로그 `posts/<주제>-step<N>.md`는
// 같은 본문을 담는 한 짝이다. 이번 커밋이 한쪽을 건드렸는데 짝 레포에 다른 쪽이 없으면 경고한다
// (차단하지 않는다). ~/.ai-contexts/에 그대로 복사돼 어느 레포에서든 돌므로 AC의 다른 모듈을
// import하지 않는다.
//
// 왜 필요한가: 두 레포는 서로를 모른다. 한쪽에만 올려도 그 레포 안에서는 아무 신호가 안 나고,
// 링크가 깨지는 것도 아니라 렌더링으로도 안 드러난다. 낡은 쪽은 사람이 우연히 열어볼 때까지
// 그대로 남는다 — `deploy/contexts/rules-as-code.md` 게이트 2의 「조용함」에 해당한다.
//
// 왜 stepN만 보는가: 두 레포에 같은 이름 규칙으로 사는 것은 시리즈 문서뿐이다. `testing/`처럼
// 주제 이름이 slug에 안 붙는 묶음까지 덮으려면 어느 쪽 규칙인지를 매번 판단해야 하고, 판단이
// 남는 검사는 넓힐수록 오탐으로 무뎌진다. 규칙이 결정론인 범위에서 끊는다.
//
// 짝 레포를 못 찾으면 조용히 통과하지 않는다. 경로가 바뀌면 이 검사는 아무것도 못 보면서 매
// 커밋 성공하게 되고, 죽었다는 사실이 아무 데도 안 남는다.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// 두 레포의 자리는 고정돼 있다. 옮기면 아래 REPOS를 고친다 — 못 찾으면 훅이 시끄러워지므로
// 옮긴 사실이 다음 커밋에서 바로 드러난다.
const HOME = os.homedir();
const REPOS = [
  {
    name: "blog",
    root: path.join(HOME, "WebstormProjects", "my-else", "blog"),
    // posts/<주제>-step<N>.md
    pattern: /^posts\/(.+)-step(\d+)\.md$/,
    counterpart: "monorepo-playground",
    toCounterpart: (topic, step) => `docs/guides/${topic}/step${step}.md`,
  },
  {
    name: "monorepo-playground",
    root: path.join(HOME, "WebstormProjects", "main", "monorepo-playground"),
    // docs/guides/<주제>/step<N>.md
    pattern: /^docs\/guides\/([^/]+)\/step(\d+)\.md$/,
    counterpart: "blog",
    toCounterpart: (topic, step) => `posts/${topic}-step${step}.md`,
  },
];

const MAX_REPORTS = 20;

function main() {
  const here = mainRepoRoot();
  if (!here) return;

  const self = REPOS.find((repo) => samePath(repo.root, here));
  if (!self) return;

  const other = REPOS.find((repo) => repo.name === self.counterpart);
  if (!fs.existsSync(other.root)) {
    console.log(`[가이드-포스트 짝] 짝 레포를 못 찾는다: ${other.root}`);
    console.log("판단: 레포가 옮겨갔으면 이 훅의 REPOS 경로를 고친다. 고치기 전까지 짝 대조는 꺼져 있다.");
    console.log("");
    return;
  }

  const missing = [];
  for (const rel of stagedFiles()) {
    const hit = self.pattern.exec(rel);
    if (!hit) continue;
    const counterpartRel = self.toCounterpart(hit[1], hit[2]);
    if (!fs.existsSync(path.join(other.root, counterpartRel))) {
      missing.push({ rel, counterpartRel });
    }
  }
  if (!missing.length) return;

  console.log("[가이드-포스트 짝 없음] 이번 커밋이 건드린 문서의 짝이 상대 레포에 없다:");
  for (const { rel, counterpartRel } of missing.slice(0, MAX_REPORTS)) {
    console.log(`  ${self.name}: ${rel}`);
    console.log(`    → 없음: ${other.name}: ${counterpartRel}`);
  }
  if (missing.length > MAX_REPORTS) {
    console.log(`  ... 그 밖에 ${missing.length - MAX_REPORTS}건 더`);
  }
  console.log("판단: 짝을 만들거나 고쳐 두 곳의 본문을 맞춘다. 두 곳은 문서 간 이동 링크 형식만 다르다.");
  console.log("      짝이 다른 워크트리에만 있고 아직 기본 브랜치에 없으면 그 머지까지가 남은 일이다.");
  console.log("");
}

// 워크트리에서 커밋해도 원본 레포를 가리키게 한다 — 워크트리 폴더명은 레포 이름과 다르다.
function mainRepoRoot() {
  try {
    const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
      encoding: "utf8",
    }).trim();
    if (!common) return null;
    return path.dirname(common);
  } catch {
    return null;
  }
}

// 윈도우는 대소문자·구분자가 갈릴 수 있어 정규화해서 견준다.
function samePath(a, b) {
  const norm = (p) => path.resolve(p).replace(/[\\/]+$/, "").toLowerCase();
  return norm(a) === norm(b);
}

function stagedFiles() {
  const out = execFileSync("git", ["diff", "--cached", "--name-only", "-z"], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 32,
  });
  return out.split("\0").filter(Boolean);
}

try {
  main();
} catch (error) {
  console.error(`[가이드-포스트 짝 훅 내부 오류, 건너뜀] ${error.message}`);
}
// 짝이 아직 없는 것이 사람의 커밋을 막을 일은 아니다 — 항상 통과시킨다.
process.exit(0);
