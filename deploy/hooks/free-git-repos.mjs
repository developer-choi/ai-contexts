import { execSync } from "node:child_process";
import { normalizeCwd } from "./git-command-parser.mjs";

// git 정책을 통째로 면제하는 레포. 사용자가 자기 것만 담아 자유롭게 쓰는 개인 레포라,
// 머지·푸시·reset을 "사용자 결정"으로 묶어둘 이유가 없는 곳이다.
//
// 면제 대상이 아닌 것: 파일 단위 커밋 강제(check-git-staging-policy·check-git-commit-policy).
// 그건 브랜치 정책이 아니라 "내가 안 건드린 변경이 딸려 들어가는 것"을 막는 장치라,
// 레포가 누구 것이든 같은 사고가 난다. 여기서 갈라주지 않는다.
const FREE_REPOS = new Set(["backlog", "private-playground"]);

// cwd → 면제 여부. 한 명령에 같은 경로가 여러 번 나오므로 프로세스 안에서 재사용한다.
const cache = new Map();

// 워크트리는 폴더명이 `<레포>-<식별>`이라 폴더명만 보면 원본 레포와 안 갈린다.
// `--git-common-dir`은 링크된 워크트리에서도 원본의 `.git`을 가리키므로 그것으로 이름을 구한다.
export function isFreeGitRepo(cwd) {
  const key = cwd || "";
  if (cache.has(key)) return cache.get(key);

  let free = false;
  try {
    const commonDir = execSync("git rev-parse --path-format=absolute --git-common-dir", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      ...(key ? { cwd: key } : {}),
    })
      .toString()
      .trim();
    const name = commonDir.replace(/\\/g, "/").replace(/\/\.git\/?$/, "").split("/").pop();
    free = FREE_REPOS.has(name);
  } catch {
    // 레포를 못 정하면 면제하지 않는다 — 어디인지 모르는 곳에서 정책이 풀리는 쪽이 더 나쁘다.
    free = false;
  }

  cache.set(key, free);
  return free;
}

// 훅이 보는 git 호출이 **전부** 면제 레포를 향할 때만 참. 한 명령이 여러 레포를 섞어 부르면
// (`git -C backlog ... && git -C ai-contexts ...`) 정책을 유지한다 — 면제되는 쪽에 얹혀
// 면제 아닌 레포의 검사가 통째로 꺼지는 것을 막는다.
export function allInFreeRepos(invocations, fallbackCwd) {
  if (invocations.length === 0) return false;
  return invocations.every((inv) => isFreeGitRepo(normalizeCwd(inv.cwd) || fallbackCwd));
}
