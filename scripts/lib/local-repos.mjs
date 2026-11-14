// 이 기기의 로컬 레포 목록. 남의 레포를 훑는 검사(verify-skill-purpose --local, hook-guard)가 쓴다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const defaultLocalRoots = [
  path.join(os.homedir(), 'WebstormProjects', 'main'),
  path.join(os.homedir(), 'WebstormProjects', 'my-else'),
];

// scanRoots 아래의 git 워크트리(직속 자식, 또는 root 자체가 워크트리면 그것)를 나열한다.
// .claude/worktrees 같은 중첩은 재귀하지 않는다.
function listLocalRepos(scanRoots = defaultLocalRoots) {
  const isDir = (dirPath) => fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  const isGitWorktree = (repoPath) => fs.existsSync(path.join(repoPath, '.git'));
  const repos = [];
  for (const root of scanRoots) {
    if (!isDir(root)) continue;
    if (isGitWorktree(root)) {
      repos.push(root);
      continue;
    }
    for (const entry of fs.readdirSync(root, { withFileTypes: true }).sort((entryA, entryB) => entryA.name.localeCompare(entryB.name))) {
      if (!entry.isDirectory()) continue;
      const repo = path.join(root, entry.name);
      if (isGitWorktree(repo)) repos.push(repo);
    }
  }
  return repos;
}

export { defaultLocalRoots, listLocalRepos };
