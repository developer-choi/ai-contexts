// git 훅 안에서 띄우는 자식이 훅을 부른 저장소에 묶이지 않게 env를 푼다.
//
// git은 훅을 돌릴 때 `GIT_DIR` 등을 env로 넘긴다. 링크된 워크트리에서는 그 값이 실제 저장소의
// `.git/worktrees/<이름>` 절대 경로라, 자식이 임시 폴더에서 `git init`·`commit`·`config`를 해도
// git은 cwd가 아니라 그 경로에 쓴다(2026-09-26 워크트리 push에서 AC가 bare로 바뀐 사고).
import { execFileSync } from 'node:child_process';

// 걷을 이름은 git이 「저장소에 묶인 변수」로 내는 목록이다. 손으로 적으면 git에 변수가 늘 때 빠진다.
// `GIT_`를 통째로 걷지 않는 것은 `GIT_SSH_COMMAND`처럼 저장소에 안 묶인 설정까지 사라지기 때문이다.
// 저장소 없이도 답하므로 어떤 env에서 불러도 된다.
function repoLocalEnvVars() {
  return execFileSync('git', ['rev-parse', '--local-env-vars'], { encoding: 'utf8', windowsHide: true })
    .split('\n')
    .map((name) => name.trim())
    .filter(Boolean);
}

// env 사본에서 저장소 위치 변수를 뺀다. 자식은 cwd로 저장소를 다시 찾는다.
function withoutRepoLocalEnv(env = process.env) {
  const cleaned = { ...env };
  for (const name of repoLocalEnvVars()) delete cleaned[name];
  return cleaned;
}

export { repoLocalEnvVars, withoutRepoLocalEnv };
