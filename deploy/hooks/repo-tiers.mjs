import { execSync } from "node:child_process";
import { normalizeCwd } from "./git-command-parser.mjs";

// 레포마다 보호 브랜치(master·main·develop·release)를 얼마나 막을지 세 등급으로 가른다.
//
//   "free"           — 사용자가 자기 것만 담아 자유롭게 쓰는 곳. 머지·푸시·reset 정책을 통째로 걷는다.
//   "approval-gated" — 사용자 레포지만 결과물이 남는 곳. 보호 브랜치 머지는 승인 창, push는 차단 —
//                      로컬 머지는 되돌릴 수 있지만 push는 밖으로 나가므로 사용자가 리뷰한 뒤 직접 민다.
//   "pr-only"        — 위 두 목록 밖 전부(실무·채용 과제 등). 보호 브랜치 머지·push 모두 차단,
//                      작업 브랜치 push와 PR만 된다. 채용 레포는 PR 이력이 평가 대상이다.
//
// 가르는 축은 소유가 아니라 어느 목록에 올랐는지다. 모르는 레포를 가장 엄한 쪽으로 두려고
// PR 전용은 목록 없이 기본값이다 — 새 레포를 목록에 안 올리면 막히는 쪽으로 틀린다.
//
// 등급과 무관한 것: 파일 단위 커밋 강제(check-git-staging-policy·check-git-commit-policy).
// 그건 브랜치 정책이 아니라 "내가 안 건드린 변경이 딸려 들어가는 것"을 막는 장치라,
// 레포가 누구 것이든 같은 사고가 난다. 여기서 갈라주지 않는다.
const FREE_REPOS = new Set(["private-playground", "test-playground", "backlog", "finance-os"]);
const APPROVAL_GATED_REPOS = new Set([
  "ai-contexts",
  "dsa-playground",
  "knowledge-archive",
  "monorepo-playground",
  "plan-for-myself",
  "developer-choi",
]);

// 레포 이름 → 등급. 빈 이름(레포를 못 정함)도 목록 밖이라 PR 전용이 된다 —
// 어디인지 모르는 곳에서 정책이 풀리는 쪽이 더 나쁘다.
export function tierOfRepoName(name) {
  if (FREE_REPOS.has(name)) return "free";
  if (APPROVAL_GATED_REPOS.has(name)) return "approval-gated";
  return "pr-only";
}

// cwd → 등급. 한 명령에 같은 경로가 여러 번 나오므로 프로세스 안에서 재사용한다.
const cache = new Map();

export function repoTier(cwd) {
  const key = cwd || "";
  if (!cache.has(key)) cache.set(key, tierOfRepoName(originRepoName(key)));
  return cache.get(key);
}

// cwd가 속한 원본 레포 이름. 레포가 아니거나 git 조회가 실패하면 빈 문자열.
// 워크트리는 폴더명이 `<레포>-<식별>`이라 폴더명만 보면 원본 레포와 안 갈린다.
// `--git-common-dir`은 링크된 워크트리에서도 원본의 `.git`을 가리키므로 그것으로 이름을 구한다.
export function originRepoName(cwd) {
  try {
    const commonDir = execSync("git rev-parse --path-format=absolute --git-common-dir", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      ...(cwd ? { cwd } : {}),
    })
      .toString()
      .trim();
    return commonDir.replace(/\\/g, "/").replace(/\/\.git\/?$/, "").split("/").pop();
  } catch {
    return "";
  }
}

// 훅이 보는 git 호출이 **전부** FREE 레포를 향할 때만 참. 한 명령이 여러 레포를 섞어 부르면
// (`git -C backlog ... && git -C ai-contexts ...`) 정책을 유지한다 — FREE 쪽에 얹혀
// 다른 레포의 검사가 통째로 꺼지는 것을 막는다.
export function allInFreeRepos(invocations, fallbackCwd) {
  if (invocations.length === 0) return false;
  return invocations.every((inv) => repoTier(normalizeCwd(inv.cwd) || fallbackCwd) === "free");
}
