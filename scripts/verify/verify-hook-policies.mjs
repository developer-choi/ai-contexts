#!/usr/bin/env node
// 정책 hook(git 계열 + 삭제 가드)의 판정을 회귀 검증한다.
//
// 이 훅들은 실패해도 아무 소리를 내지 않는다 — 등록은 정상이고 명령도 정상 실행되며,
// 다만 특정 형태만 검사를 빠져나간다(`git commit`은 잡는데 `git -C <path> commit`은 놓치는 식).
// 사람이 눈으로 볼 방법이 없으므로 대표 명령을 실제 payload로 흘려 판정을 고정한다.
// sync:system이 배포 전 fail-fast로 돌려, 구멍 난 훅이 배포되는 것을 막는다.

import childProcess from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const hooksDir = path.join(import.meta.dirname, '..', '..', 'deploy', 'hooks');

// 케이스마다 node를 새로 띄우는 검증이라 스폰 개수가 곧 실행시간이다(173건 × 45~105ms ≈ 18초).
// 서로 독립인 케이스를 겹쳐 돌리되, 훅은 그대로 별도 프로세스로 띄운다 — 훅을 import해서
// 부르면 빨라지지만 "실제 payload를 프로세스 경계로 흘린다"는 이 검증의 전제가 사라진다.
const DEFAULT_CONCURRENCY = Math.min(12, Math.max(4, os.cpus().length - 1));
// 실패가 떴을 때 병렬 탓인지 진짜 회귀인지 가르는 수단. 1로 두면 직렬로 재현된다.
const CONCURRENCY = Number(process.env.VERIFY_HOOK_CONCURRENCY) || DEFAULT_CONCURRENCY;
// 절 참조 훅은 케이스 하나가 git을 여러 번 더 스폰한다(rev-parse·diff·ls-files·파일마다 show).
// 같은 한도를 주면 실제 프로세스가 몇 배로 불어나고, 포화로 git이 실패하면 그 훅은 fail-open이라
// deny 기대가 조용히 pass로 뒤집힌다.
const SECTION_REF_CONCURRENCY = Math.max(1, Math.min(6, CONCURRENCY));
// 병렬 실행은 직렬에 없던 교착 모드가 생긴다. 게이트가 소리 없이 매달리는 것보다 FAIL이 낫다.
const HOOK_TIMEOUT_MS = 60_000;

const execFileAsync = promisify(childProcess.execFile);

// fixture 준비용 git. 동기 실행(execSync)은 스레드를 통째로 멈춰 이미 떠 있는 훅들의 완료
// 콜백까지 같이 세운다 — 준비 한 번이 곧 전 그룹의 정지 구간이 되므로 비동기로만 부른다.
function runGit(args, cwd, env) {
  return execFileAsync('git', args, {
    cwd,
    env: env ? { ...process.env, ...env } : process.env,
    windowsHide: true,
  });
}

const COMMIT_AS = ['-c', 'user.email=verify@local', '-c', 'user.name=verify'];

function makeTempDir(prefix) {
  return fsp.mkdtemp(path.join(os.tmpdir(), prefix));
}

// Windows에서는 방금까지 git.exe가 cwd로 잡고 있던 디렉토리가 바로 안 지워진다(EBUSY).
function removeTempDir(dir) {
  return fsp.rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

// [hook 파일, 명령, 기대 판정, 설명]
// 기대 판정: 'deny' | 'ask' | 'pass'(훅이 아무 결정도 내지 않음)
const CASES = [
  // --- git -C 우회 (이 검증의 존재 이유) ---
  ['check-git-commit-policy.mjs', 'git -C ~/repo commit -m "x"', 'deny', 'git -C가 껴도 bare commit을 잡는다'],
  ['check-git-staging-policy.mjs', 'git -C ~/repo add .', 'deny', 'git -C가 껴도 add .를 잡는다'],
  ['check-git-staging-policy.mjs', 'git -C ~/repo commit -am "x"', 'deny', 'git -C가 껴도 commit -a를 잡는다'],
  ['check-git-reset-policy.mjs', 'git -C ~/repo reset --hard', 'deny', 'reset은 원래 파서라 회귀 없음'],

  // --- 인접 형태 (기존 동작 유지) ---
  ['check-git-commit-policy.mjs', 'git commit -m "x"', 'deny', 'bare commit'],
  ['check-git-commit-policy.mjs', 'git commit --no-verify -m "x" a.txt', 'deny', '--no-verify 금지'],
  // 짧은 옵션을 묶거나 값을 붙이면 토큰이 통짜가 아니게 된다 — 정확 일치로 보던 때는
  // 아래 형태들이 --no-verify·auto-stage 금지를 그대로 빠져나갔다.
  ['check-git-commit-policy.mjs', 'git commit a.txt -sn -m "x"', 'deny', '묶어 쓴 -n도 --no-verify다'],
  ['check-git-commit-policy.mjs', 'git commit a.txt -nm "x"', 'deny', '메시지와 묶인 -n도 잡는다'],
  ['check-git-staging-policy.mjs', "git commit a.txt -aF- <<'MSG'\nfix: x\nMSG", 'deny', '값이 붙은 묶음의 -a도 잡는다'],
  ['check-git-staging-policy.mjs', 'git commit a.txt -am"여러 단어"', 'deny', '메시지를 붙여 쓴 -am도 잡는다'],
  ['check-git-staging-policy.mjs', 'git commit a.txt -uall -m "x"', 'pass', '-uall(--untracked-files=all)의 값 글자는 옵션이 아니다'],
  ['check-git-staging-policy.mjs', 'git add .', 'deny', 'add .'],
  ['check-git-staging-policy.mjs', 'git add -A', 'deny', 'add -A'],

  // --- 새로 막히는 형태 ---
  ['check-git-staging-policy.mjs', 'git add -f .', 'deny', '플래그가 앞에 와도 add .를 잡는다'],
  ['check-git-staging-policy.mjs', 'git add --all', 'deny', 'add --all'],

  // --- 경로 필수: 메시지를 넘기는 형태와 무관하게 (2026-08-05 PP 사고) ---
  ['check-git-commit-policy.mjs', "git commit -F - <<'MSG'\nfix: x\nMSG", 'deny', 'heredoc 표식이 경로로 오인되지 않는다'],
  ['check-git-commit-policy.mjs', 'git commit -F msg.txt', 'deny', '-F 파일로 넘겨도 경로는 필수'],
  ['check-git-commit-policy.mjs', 'git commit -m "x" > out.txt', 'deny', '리다이렉션 대상이 경로로 오인되지 않는다'],
  ['check-git-commit-policy.mjs', 'git commit --amend --no-edit', 'deny', 'amend도 staging 전체를 커밋하므로 경로 필수'],
  ['check-git-commit-policy.mjs', 'git commit --squash HEAD~1', 'deny', '--squash도 경로 필수'],
  ['check-git-commit-policy.mjs', 'git commit -C HEAD~1', 'deny', '-C(메시지 재사용)도 경로 필수'],
  ['check-git-commit-policy.mjs', 'git commit a.txt', 'deny', '메시지 없는 커밋은 에디터를 띄운다'],
  // PowerShell here-string. 여러 줄 커밋 메시지가 이 형태로 들어오는데, 본문 단어가 경로로
  // 세어져 경로 필수 검사가 통째로 새고 있었다 (2026-08-09 백로그 레포 사고).
  ['check-git-commit-policy.mjs', "git commit -m @'\nfix: 여러 줄 메시지\n'@", 'deny', 'here-string 본문이 경로로 오인되지 않는다'],
  ['check-git-commit-policy.mjs', 'git commit -m @"\nfix: 확장 here-string\n"@', 'deny', '큰따옴표 here-string도 같다'],
  ['check-git-commit-policy.mjs', "git commit -m @'\n한단어\n'@", 'deny', '한 단어짜리 here-string도 경로가 아니다'],
  // 값을 붙여 쓴 짧은 옵션(`-m"..."`). 붙어 있는 조각을 한 토큰으로 이어 붙이지 않으면
  // 메시지 본문 단어가 경로로 세어져 here-string과 같은 구멍이 난다.
  ['check-git-commit-policy.mjs', 'git commit -m"여러 단어 메시지"', 'deny', '붙여 쓴 메시지 본문이 경로로 오인되지 않는다'],
  ['check-git-commit-policy.mjs', "git commit -F- <<'MSG'\nfix: x\nMSG", 'deny', '-F를 붙여 써도 경로는 필수'],
  ['check-git-commit-policy.mjs', 'git commit a.txt -uno', 'deny', '-uno는 --untracked-files=no라 메시지가 아니다'],

  // --- 통과해야 하는 형태 (오탐 방지) ---
  ['check-git-commit-policy.mjs', 'git commit a.txt -m "x"', 'pass', '파일 지정 커밋'],
  ['check-git-commit-policy.mjs', 'git commit -m "x" a.txt', 'pass', '파일이 -m 뒤에 와도 지정된 것'],
  ['check-git-commit-policy.mjs', "git commit a.txt -F - <<'MSG'\nfix: x\nMSG", 'pass', '-F도 경로만 있으면 통과'],
  ['check-git-commit-policy.mjs', 'git commit --amend --no-edit a.txt', 'pass', '경로를 준 amend는 통과'],
  ['check-git-commit-policy.mjs', 'git commit --allow-empty -m "x"', 'pass', '빈 커밋은 경로가 없는 게 정상'],
  ['check-git-commit-policy.mjs', "git commit a.txt -m @'\nfix: 여러 줄 메시지\n'@", 'pass', 'here-string이어도 경로를 주면 통과'],
  // 값을 붙여 쓴·묶어 쓴 짧은 메시지 옵션. 정확 일치로 보던 때는 메시지를 넘겼는데도
  // "메시지 없음"으로 거부됐다 (2026-08-29 실측).
  ['check-git-commit-policy.mjs', "git commit a.txt -F- <<'MSG'\nfix: x\nMSG", 'pass', '-F에 값을 붙여 써도 메시지로 본다'],
  ['check-git-commit-policy.mjs', "git commit a.txt -m'x'", 'pass', "-m'msg'도 메시지로 본다"],
  ['check-git-commit-policy.mjs', "git commit a.txt -sF- <<'MSG'\nfix: x\nMSG", 'pass', '짧은 옵션 묶음(-sF-)도 메시지로 본다'],
  ['check-git-staging-policy.mjs', "git commit a.txt -m @'\ngit add . 를 금지\n'@", 'pass', 'here-string 본문의 문구는 옵션이 아니다'],
  ['check-git-staging-policy.mjs', 'git commit a.txt -m "git add . 를 금지"', 'pass', '메시지 안의 문구는 옵션이 아니다'],
  ['check-git-staging-policy.mjs', 'git commit a.txt -m "-a 옵션 관련 수정"', 'pass', '메시지 값이 옵션으로 오인되지 않는다'],
  ['check-git-staging-policy.mjs', 'git commit --amend --allow-empty a.txt', 'pass', '--amend/--allow-empty는 -a가 아니다'],
  ['check-git-staging-policy.mjs', 'git add src/a.ts', 'pass', '개별 파일 staging'],
  ['check-git-reset-policy.mjs', 'git reset --soft HEAD~1', 'pass', '--soft는 허용'],

  // --- push·merge: 파서를 공용 모듈로 뺀 뒤의 회귀 확인 ---
  // git 상태를 조회하지 않고 판정이 끝나는 케이스만 고른다(검증이 실행 환경에 의존하지 않게).
  ['check-git-push-policy.mjs', 'git push --no-verify', 'deny', 'push --no-verify 금지'],
  ['check-git-push-policy.mjs', 'git reset --soft HEAD~1 && git push --force', 'deny', 'rewrite+force push chain 금지'],
  ['check-git-push-policy.mjs', 'git push origin main', 'ask', '보호 브랜치 push는 승인 창을 띄운다'],
  ['check-git-push-policy.mjs', 'git -C ~/repo push origin develop', 'ask', 'git -C가 껴도 보호 브랜치 push를 잡는다'],
  ['check-git-merge-policy.mjs', 'git -C ~/repo branch -f master', 'deny', '보호 브랜치 포인터 강제 이동'],
  ['check-git-merge-policy.mjs', 'git rebase --abort', 'pass', '진행 중 작업 중단은 허용'],
  // 폴더가 실존하면 브랜치 조회 실패는 그대로 fail-open이다(비-git 디렉터리·detached HEAD 오차단 방지).
  // 아래 「폴더를 못 정한 경우」의 차단과 갈리는 지점이라 함께 고정한다.
  [
    'check-git-merge-policy.mjs',
    `git -C "${os.tmpdir().replace(/\\/g, '/')}" merge feature`,
    'pass',
    '실존하는 비-git 폴더는 fail-open 유지',
  ],

  // --- chain ---
  ['check-git-staging-policy.mjs', 'git status && git -C ~/repo add -A', 'deny', 'chain 뒷단의 위반도 잡는다'],

  // --- git -C 경로의 홈 약어 (사유는 check-shell-policy.mjs의 해당 룰 주석) ---
  ['check-shell-policy.mjs', 'git -C ~/repo status', 'deny', '~ 경로를 잡는다'],
  ['check-shell-policy.mjs', 'git -C $HOME/repo status', 'deny', '$HOME도 같은 표기다'],
  ['check-shell-policy.mjs', 'git -C "${HOME}/repo" status', 'deny', '따옴표로 감싸도 잡는다'],
  ['check-shell-policy.mjs', 'git --no-pager -C ~/repo log', 'deny', '전역 옵션이 앞에 껴도 잡는다'],
  ['check-shell-policy.mjs', 'git status && git -C ~/repo status', 'deny', 'chain 뒷단의 -C도 잡는다'],
  ['check-shell-policy.mjs', 'git -C C:/Users/x/repo status', 'pass', '절대 경로는 통과'],
  // git 호출에만 거는 것이 이 룰의 핵심 제약이다 — 전역으로 막으면 오탐이 쌓여 훅이 통째로 무시된다.
  ['check-shell-policy.mjs', 'ls ~/repo/', 'pass', 'git이 아닌 명령의 ~는 통과'],
  ['check-shell-policy.mjs', 'node ~/scripts/a.mjs', 'pass', 'node도 마찬가지'],
  ['check-shell-policy.mjs', 'git commit a.md -m "git -C ~/repo 금지 훅 추가"', 'pass', '메시지 안의 인용은 실행이 아니다'],

  // --- 배포 가드: sync 계열만 끊고 읽기 전용은 통과 ---
  ['check-deploy-script-policy.mjs', 'npm run sync:system', 'deny', '전역 배포'],
  ['check-deploy-script-policy.mjs', 'npm run unsync:local-system', 'deny', '제거도 배포 조작이다'],
  ['check-deploy-script-policy.mjs', 'npm run --prefix ~/ac sync:system', 'deny', '--prefix로 다른 레포에서 돌려도 잡는다'],
  ['check-deploy-script-policy.mjs', 'yarn sync:environment', 'deny', '패키지 매니저를 바꿔도 잡는다'],
  ['check-deploy-script-policy.mjs', 'node scripts/system/sync-system.mjs', 'deny', 'npm을 우회한 직접 호출'],
  ['check-deploy-script-policy.mjs', 'git status && npm run sync:system', 'deny', 'chain 뒷단의 배포도 잡는다'],
  ['check-deploy-script-policy.mjs', 'npm run sync:something-new', 'deny', '나중에 생길 sync 타겟도 접두사로 잡는다'],
  ['check-deploy-script-policy.mjs', 'echo x && $(npm run sync:system)', 'deny', '명령 치환으로 감싸도 잡는다'],
  ['check-deploy-script-policy.mjs', 'npm run verify:hook-policies', 'pass', '읽기 전용 검증은 통과'],
  ['check-deploy-script-policy.mjs', 'npm run verify:local-system', 'pass', 'local-system도 verify는 통과'],
  ['check-deploy-script-policy.mjs', 'node scripts/verify/verify-hook-policies.mjs', 'pass', '직접 호출도 verify면 통과'],
  ['check-deploy-script-policy.mjs', 'git commit a.md -m "npm run sync:system 금지 훅 추가"', 'pass', '메시지 안의 명령은 실행이 아니다'],
];

// 쓰기 시점 정책 hook은 Bash 명령이 아니라 Write/Edit payload를 본다.
// [hook 파일, {tool_name, tool_input}, 기대 판정, 설명]
const PKG = '---\ntype: pr-body\naudience: 채용담당자\npurpose: 어필\nkey_message: 한 문장\n---\n\n# 제목\n';

const WRITE_CASES = [
  [
    'check-package-frontmatter.mjs',
    { tool_name: 'Write', tool_input: { file_path: 'C:/tmp/pkg.md', content: PKG } },
    'pass',
    '필수 필드가 채워진 패키지는 통과',
  ],
  [
    'check-package-frontmatter.mjs',
    {
      tool_name: 'Write',
      tool_input: { file_path: 'C:/tmp/pkg.md', content: '---\ntype: pr-body\naudience: \npurpose: 어필\n---\n\n# 제목\n' },
    },
    'deny',
    '빈 값·누락 필드가 있으면 막는다',
  ],
  [
    'check-package-frontmatter.mjs',
    {
      tool_name: 'Write',
      tool_input: {
        file_path: 'C:/tmp/pkg.md',
        content: '---\ntype: pr-comment\naudience: 리뷰어\npurpose: 질문\nkey_message: 한 문장\n---\n\n# 제목\n',
      },
    },
    'deny',
    'pr-comment는 subtype도 필수',
  ],
  [
    'check-package-frontmatter.mjs',
    {
      tool_name: 'Write',
      tool_input: { file_path: 'C:/tmp/note.md', content: '---\ntype: guide\n---\n\n# 제목\n' },
    },
    'pass',
    '패키지 어휘 밖 type이라도 다른 필수 필드가 없으면 무관한 문서라 통과',
  ],
  [
    'check-package-frontmatter.mjs',
    {
      tool_name: 'Write',
      tool_input: {
        file_path: 'C:/tmp/pkg.md',
        content: '---\ntype: pr_body\naudience: 채용담당자\npurpose: 어필\nkey_message: 한 문장\n---\n\n# 제목\n',
      },
    },
    'deny',
    'type 오타는 self-filter를 빠져나가 아무 검사도 안 받으므로, 나머지 필수 필드가 있으면 막는다',
  ],
  [
    'check-package-frontmatter.mjs',
    {
      tool_name: 'Write',
      tool_input: { file_path: 'C:/tmp/doc.md', content: '# 설명\n\n```markdown\n---\ntype: pr-body\n---\n```\n' },
    },
    'pass',
    '코드펜스 안의 예시 frontmatter는 잡지 않는다',
  ],
  [
    'check-package-frontmatter.mjs',
    {
      tool_name: 'Write',
      tool_input: { file_path: 'C:/tmp/pkg.txt', content: '---\ntype: pr-body\n---\n\n# 제목\n' },
    },
    'pass',
    '.md가 아니면 검사 대상이 아니다',
  ],
];

const mdWrite = (content, file = 'C:/tmp/doc.md') => ({
  tool_name: 'Write',
  tool_input: { file_path: file, content },
});

WRITE_CASES.push(
  [
    'check-md-code-labels.mjs',
    mdWrite('린터(K10)가 본다. E1 커버리지 누락도 같이 본다.\n'),
    'context',
    '뜻 없이 홀로 놓인 코드를 알린다',
  ],
  [
    'check-md-code-labels.mjs',
    mdWrite('## TC-A1. 드래그로 닫기\n\n- **TC-A1-1** dismiss 확인\n'),
    'context',
    '항목에 지어 붙인 번호도 알린다',
  ],
  [
    'check-md-code-labels.mjs',
    mdWrite('V8 엔진은 L3 스위치와 무관하다. explained H1을 S3에 올린다. ES6 문법.\n'),
    'pass',
    '실존 기술 용어만 있으면 조용하다',
  ],
  [
    'check-md-code-labels.mjs',
    mdWrite('설명은 이렇다.\n\n```js\nconst K10 = 1; // E1\n```\n\n인라인은 `TC-A1` 형태다.\n'),
    'pass',
    '코드블록·인라인코드 안은 보지 않는다',
  ],
  [
    'check-md-code-labels.mjs',
    mdWrite('[강의](https://www.inflearn.com/course/3%EC%9D%BC) 와 [img]: <data:image/png;base64,A0B0B8>\n'),
    'pass',
    'URL·인코딩된 문자열은 보지 않는다',
  ],
  [
    'check-md-code-labels.mjs',
    mdWrite('PR1이 만든 산출물을 PR3에서 쓴다. NEW3 변형도 마찬가지.\n'),
    'pass',
    '대문자가 여럿 붙어 접두사가 뜻을 알려주면 조용하다',
  ],
  [
    'check-md-code-labels.mjs',
    mdWrite('## TC_A1. 드래그로 닫기\n'),
    'context',
    '밑줄로 이은 것도 하이픈과 같게 잡는다',
  ],
  [
    'check-md-code-labels.mjs',
    mdWrite('R3이 만든 산출물을 R4에서 쓴다.\n'),
    'context',
    '같은 모양이라도 접두사가 아무것도 안 알려주면 알린다',
  ],
  [
    'check-md-code-labels.mjs',
    mdWrite('린터(K10)가 본다.\n', 'C:/tmp/doc.txt'),
    'pass',
    '.md가 아니면 검사 대상이 아니다',
  ],
);

const skillDoc = 'C:/tmp/skills/study-report/SKILL.md';

WRITE_CASES.push(
  [
    'check-md-hook-restatement.mjs',
    mdWrite('## 산출물 저장·커밋\n\n리포트 파일 하나만 커밋한다.\n', skillDoc),
    'context',
    '커밋 규약을 쓰려 하면 훅이 이미 막는 목록을 보여준다',
  ],
  [
    'check-md-hook-restatement.mjs',
    mdWrite('## 리포트 형식\n\n한 일과 새로 생긴 도구를 나눠 적는다.\n', skillDoc),
    'pass',
    '커밋·staging 이야기가 없으면 조용하다',
  ],
  [
    'check-md-hook-restatement.mjs',
    mdWrite('금지 예시다.\n\n```sh\ngit add .\n```\n\n인라인 `git commit -a` 도 마찬가지.\n', skillDoc),
    'pass',
    '코드블록·인라인코드 안의 인용은 보지 않는다',
  ],
  [
    'check-md-hook-restatement.mjs',
    mdWrite('커밋은 이렇게 나눈다.\n', 'C:/tmp/docs/design.md'),
    'pass',
    '프롬프트·스킬 문서가 아니면 보지 않는다',
  ],
  [
    'check-md-hook-restatement.mjs',
    mdWrite('커밋은 이렇게 나눈다.\n', 'C:/tmp/CLAUDE.md'),
    'context',
    'CLAUDE.md도 대상이다',
  ],
);

WRITE_CASES.push(
  [
    'check-md-rule-as-code.mjs',
    mdWrite('## 다른 파일의 단계는 번호로 가리키지 않는다\n\n번호로 부르면 단계가 끼는 순간 낡는다.\n', skillDoc),
    'context',
    '규칙 절을 새로 세우면 도구로 내릴 수 있는지 묻는다',
  ],
  [
    'check-md-rule-as-code.mjs',
    mdWrite('## 리포트 형식\n\n한 일과 새로 생긴 도구를 나눠 적는다.\n', skillDoc),
    'pass',
    '절을 세워도 금지 어미가 없으면 조용하다',
  ],
  [
    'check-md-rule-as-code.mjs',
    mdWrite('이 표현은 쓰지 않는다.\n', skillDoc),
    'pass',
    '절 신설 없이 산문만 다듬으면 조용하다',
  ],
  [
    'check-md-rule-as-code.mjs',
    mdWrite('금지 예시다.\n\n```md\n## 값을 옮겨 적지 않는다\n```\n', skillDoc),
    'pass',
    '코드블록 안의 인용은 보지 않는다',
  ],
  [
    'check-md-rule-as-code.mjs',
    mdWrite('## 값을 옮겨 적지 않는다\n\n사본을 두지 않는다.\n', 'C:/tmp/docs/design.md'),
    'pass',
    '프롬프트·스킬 문서가 아니면 보지 않는다',
  ],
);

WRITE_CASES.push(
  [
    'check-skill-purpose-section.mjs',
    mdWrite('# 스킬\n\n## 목적\n\n한 줄로 끝낸다.\n\n안 하면 이런 일이 벌어진다.\n\n## 절차\n\n돈다.\n', skillDoc),
    'context',
    '목적 아래 이유 단락이 붙으면 알린다',
  ],
  [
    'check-skill-purpose-section.mjs',
    mdWrite('# 스킬\n\n## 목적\n\n한 줄로 끝낸다. 두 문장이어도 한 문단이다.\n\n## 절차\n\n돈다.\n', skillDoc),
    'pass',
    '한 문단이면 문장이 여럿이어도 조용하다',
  ],
  [
    'check-skill-purpose-section.mjs',
    {
      tool_name: 'Edit',
      tool_input: { file_path: skillDoc, new_string: '## 목적\n\n한 줄로 끝낸다.\n' },
    },
    'pass',
    '조각이 다음 헤딩 전에 끝나고 문단이 하나면 판단을 미룬다',
  ],
  [
    'check-skill-purpose-section.mjs',
    {
      tool_name: 'Edit',
      tool_input: { file_path: skillDoc, new_string: '## 목적\n\n한 줄로 끝낸다.\n\n안 하면 이런 일이 벌어진다.\n' },
    },
    'context',
    '조각이 안 끝나도 이미 문단이 둘이면 확정이다',
  ],
  [
    'check-skill-purpose-section.mjs',
    mdWrite('# 문서\n\n## 목적\n\n한 줄.\n\n둘째 문단.\n', 'C:/tmp/docs/design.md'),
    'pass',
    'SKILL.md가 아니면 보지 않는다',
  ],
  [
    'check-skill-purpose-section.mjs',
    mdWrite('# 스킬\n\n## 목적\n\n예시는 이렇다.\n\n```sh\nnpm run x\n\nnpm run y\n```\n\n## 절차\n\n돈다.\n', skillDoc),
    'context',
    '코드블록 안 빈 줄은 문단을 가르지 않는다 (블록 앞뒤 두 덩어리라 알린다)',
  ],
);

// 툴 프로토콜 잔재 태그. 정상 콘텐츠에 홀로 있을 수 없는 줄이라 차단이고, 그 태그를 *설명하는*
// 문서는 막히면 안 된다 — 이 둘이 갈리는 지점이 「줄 전체가 태그인가」다.
WRITE_CASES.push(
  [
    'check-artifact-tag-policy.mjs',
    mdWrite('본문 마지막 문단.\n</content>\n'),
    'deny',
    'EOF에 홀로 남은 닫는 태그',
  ],
  [
    'check-artifact-tag-policy.mjs',
    mdWrite('<parameter name="target">\n본문.\n'),
    'deny',
    '속성이 붙은 여는 태그도 줄 전체면 잡는다',
  ],
  [
    'check-artifact-tag-policy.mjs',
    mdWrite('  </invoke>  \n본문.\n'),
    'deny',
    '앞뒤 공백이 붙은 antml 네임스페이스도 잡는다',
  ],
  [
    'check-artifact-tag-policy.mjs',
    { tool_name: 'Edit', tool_input: { file_path: 'C:/tmp/doc.md', new_string: '본문.\n</result>\n' } },
    'deny',
    'Edit으로 새로 넣는 잔재도 잡는다',
  ],
  [
    'check-artifact-tag-policy.mjs',
    mdWrite('`</content>` 는 도구 래퍼가 샌 흔적이다.\n'),
    'pass',
    '백틱으로 감싼 언급은 통과 — 아티팩트를 설명하는 문서가 막히면 안 된다',
  ],
  [
    'check-artifact-tag-policy.mjs',
    mdWrite('문장 중간에 </invoke> 가 나오는 경우는 잔재가 아니다.\n'),
    'pass',
    '줄 전체가 아니면 잡지 않는다',
  ],
  [
    'check-artifact-tag-policy.mjs',
    { tool_name: 'MultiEdit', tool_input: { file_path: 'C:/tmp/doc.md', new_string: '</content>\n' } },
    'pass',
    'MultiEdit은 edit 어댑터가 라우팅하지 않아 대상이 아니다',
  ],
);

// 배포 산출물 직접 수정. ask라서 사용자가 승인하면 통과하는 자리이고, 오차단이 나면 워크트리
// 작업이 통째로 막힌다 — 아래 worktree 케이스가 그 경계다.
const homeDeploy = (...segs) => path.join(os.homedir(), ...segs);

WRITE_CASES.push(
  [
    'check-artifact-write-policy.mjs',
    mdWrite('{}', homeDeploy('.claude', 'settings.json')),
    'ask',
    '홈 배포 루트 하위',
  ],
  [
    'check-artifact-write-policy.mjs',
    mdWrite('{}', homeDeploy('.codex', 'hooks.json')),
    'ask',
    'codex 홈도 같다',
  ],
  [
    'check-artifact-write-policy.mjs',
    mdWrite('# 스킬\n', 'C:/repo/.agents/skills/a/SKILL.md'),
    'ask',
    '레포 안 .agents 세그먼트',
  ],
  [
    'check-artifact-write-policy.mjs',
    mdWrite('# 스킬\n', 'C:/repo/.claude/skills/a/SKILL.md'),
    'ask',
    '.claude 다음이 skills면 산출물',
  ],
  [
    'check-artifact-write-policy.mjs',
    mdWrite('# 규칙\n', 'C:/repo/AGENTS.md'),
    'ask',
    'CLAUDE.md가 원본이라 AGENTS.md는 위치 불문 산출물',
  ],
  [
    'check-artifact-write-policy.mjs',
    mdWrite('# 규칙\n', 'C:/repo/GEMINI.md'),
    'ask',
    'GEMINI.md도 같다',
  ],
  // AC 워크트리는 `…/ai-contexts/.claude/worktrees/<name>/…` 라, `.claude`가 경로에 있다는
  // 이유로 막으면 워크트리 작업 전체가 막힌다. 다음 세그먼트로 갈리는 것을 고정한다.
  [
    'check-artifact-write-policy.mjs',
    mdWrite('# 문서\n', homeDeploy('WebstormProjects', 'main', 'ai-contexts', '.claude', 'worktrees', 'wt', 'deploy', 'x.md')),
    'pass',
    '.claude 다음이 worktrees면 산출물이 아니다',
  ],
  [
    'check-artifact-write-policy.mjs',
    mdWrite('# 규칙\n', 'C:/repo/CLAUDE.md'),
    'pass',
    'CLAUDE.md는 원본이라 통과',
  ],
  [
    'check-artifact-write-policy.mjs',
    mdWrite('# 문서\n', 'C:/repo/deploy/contexts/x.md'),
    'pass',
    '원본 경로는 통과',
  ],
);

// 규칙 옆 예시. 차단이 아니라 알림이라 'context'가 기대값이고, 발동 범위가 안 좁혀져 있으면
// 무관한 편집마다 뜬다 — 통과 케이스 쪽이 이 훅의 값어치를 지킨다.
WRITE_CASES.push(
  [
    'check-md-rule-example.mjs',
    mdWrite('**before** — 옛 문장\n\n**after** — 새 문장\n', skillDoc),
    'context',
    'before/after 쌍',
  ],
  [
    'check-md-rule-example.mjs',
    mdWrite('❌ 위반 (백로그 레포, 2026-08-14)\n', skillDoc),
    'context',
    '날짜가 붙은 위반 사례 블록',
  ],
  [
    'check-md-rule-example.mjs',
    mdWrite('**2026-08-15 개정.** 그전에는 달랐다.\n', skillDoc),
    'context',
    '날짜로 여는 개정 이력',
  ],
  [
    'check-md-rule-example.mjs',
    mdWrite('사용자 교정: 이렇게 쓰지 말 것.\n', skillDoc),
    'context',
    '사용자 발화를 되짚는 서술',
  ],
  [
    'check-md-rule-example.mjs',
    mdWrite('## 규칙\n\n조건을 문장에 담고 사례는 적지 않는다.\n', skillDoc),
    'pass',
    '사건 서술이 없으면 조용하다',
  ],
  [
    'check-md-rule-example.mjs',
    mdWrite('금지 예시다.\n\n```md\n**before** — 옛 문장\n```\n', skillDoc),
    'pass',
    '코드블록 안의 인용은 보지 않는다',
  ],
  [
    'check-md-rule-example.mjs',
    mdWrite('**before** — 옛 문장\n', 'C:/tmp/docs/design.md'),
    'pass',
    '프롬프트·스킬 문서가 아니면 보지 않는다',
  ],
  [
    'check-md-rule-example.mjs',
    mdWrite('**before** — 옛 문장\n', 'C:/tmp/skills/a/note.txt'),
    'pass',
    '.md가 아니면 검사 대상이 아니다',
  ],
);

// 레포 제외는 파일 경로 위쪽에 `.git`이 있어야 판정되므로 실제 폴더를 만들어 검증한다.
const repoCases = (dir) => [
  [
    'check-md-code-labels.mjs',
    mdWrite('린터(K10)가 본다.\n', path.join(dir, 'backlog', 'note.md')),
    'pass',
    '제외 목록에 든 레포는 검사하지 않는다',
  ],
  [
    'check-md-code-labels.mjs',
    mdWrite('린터(K10)가 본다.\n', path.join(dir, 'other-repo', 'note.md')),
    'context',
    '제외 목록 밖 레포는 그대로 검사한다',
  ],
  [
    'check-md-hook-restatement.mjs',
    mdWrite('리포트 파일 하나만 커밋한다.\n', path.join(dir, 'backlog', 'skills', 'a', 'SKILL.md')),
    'pass',
    '제외 목록에 든 레포는 검사하지 않는다',
  ],
  [
    'check-md-hook-restatement.mjs',
    mdWrite('리포트 파일 하나만 커밋한다.\n', path.join(dir, 'other-repo', 'skills', 'a', 'SKILL.md')),
    'context',
    '제외 목록 밖 레포는 그대로 검사한다',
  ],
];

async function withRepoFixture(fn) {
  const dir = await makeTempDir('hook-repo-fixture-');
  try {
    for (const name of ['backlog', 'other-repo']) {
      fs.mkdirSync(path.join(dir, name, '.git'), { recursive: true });
    }
    return await fn(dir);
  } finally {
    await removeTempDir(dir);
  }
}

// Edit은 new_string이 본문 조각일 수 있어 디스크 내용에 치환을 적용해야 판정이 선다.
const editCases = (dir) => [
  [
    'check-md-code-labels.mjs',
    {
      tool_name: 'Edit',
      tool_input: { file_path: path.join(dir, 'pkg.md'), old_string: '# 제목', new_string: '# 제목\n\n순서 불일치는 E6가 잡는다.' },
    },
    'context',
    'Edit으로 새로 넣는 코드도 잡는다',
  ],
  [
    'check-package-frontmatter.mjs',
    {
      tool_name: 'Edit',
      tool_input: { file_path: path.join(dir, 'pkg.md'), old_string: 'purpose: 어필', new_string: 'purpose:' },
    },
    'deny',
    '필수 필드 값을 지우는 Edit도 잡는다',
  ],
  [
    'check-package-frontmatter.mjs',
    {
      tool_name: 'Edit',
      tool_input: { file_path: path.join(dir, 'pkg.md'), old_string: '# 제목', new_string: '# 새 제목' },
    },
    'pass',
    '필수 필드를 건드리지 않는 본문 Edit은 통과',
  ],
];

async function withPackageFixture(fn) {
  const dir = await makeTempDir('hook-package-fixture-');
  try {
    fs.writeFileSync(path.join(dir, 'pkg.md'), PKG);
    return await fn(dir);
  } finally {
    await removeTempDir(dir);
  }
}

// [명령, agent_id(없으면 메인), 서브에이전트 안내를 기대하는가(null이면 통과 기대), 설명]
const WAIT_CASES = [
  ['sleep 30', null, false, '메인의 빈 대기는 턴을 끝내라고 안내한다'],
  ['sleep 30', 'a1b2c3', true, '서브에이전트의 빈 대기는 턴을 끝내지 말라고 안내한다'],
  ['Start-Sleep -Seconds 60', 'a1b2c3', true, 'PowerShell 대기도 서브에이전트 안내'],
  ['until [ -f out.txt ]; do sleep 5; done', 'a1b2c3', null, '조건을 확인하는 루프는 서브에이전트에서도 통과'],
];

// 파일도 명령도 아닌 payload를 보는 hook들. 도구 이름과 인자 모양만으로 판정이 끝난다.
// [hook 파일, payload, 기대 판정, 설명]
const TOOL_CASES = [
  // 팀 에이전트 shutdown 금지. message가 객체이고 type이 그것일 때만 걸린다.
  [
    'check-team-message-policy.mjs',
    { tool_name: 'SendMessage', tool_input: { to: 'a1b2c3', message: { type: 'shutdown_request' } } },
    'deny',
    'shutdown_request 차단',
  ],
  [
    'check-team-message-policy.mjs',
    { tool_name: 'SendMessage', tool_input: { to: 'a1b2c3', message: '진행 상황 알려줘' } },
    'pass',
    '문자열 메시지는 통과',
  ],
  [
    'check-team-message-policy.mjs',
    { tool_name: 'SendMessage', tool_input: { to: 'a1b2c3', message: { type: 'text', text: 'x' } } },
    'pass',
    '다른 type의 객체 메시지는 통과',
  ],

  // 측정 에이전트에 기대가 새는 것을 막는다. 「측정 지시서」로 여는 프롬프트는 표만 담아야 한다.
  [
    'check-blind-measure-prompt.mjs',
    { tool_name: 'Agent', tool_input: { prompt: '측정 지시서\n| 대상 | 입력 |\n| --- | --- |\n| a.md | x |' } },
    'pass',
    '표만 있으면 통과',
  ],
  [
    'check-blind-measure-prompt.mjs',
    { tool_name: 'Agent', tool_input: { prompt: '측정 지시서\n| 대상 | 입력 |\n문서는 A가 맞다고 주장한다.' } },
    'deny',
    '산문 한 줄이 곧 누출 경로다',
  ],
  [
    'check-blind-measure-prompt.mjs',
    { tool_name: 'Agent', tool_input: { prompt: '측정 지시서\n\n| 대상 | 입력 |\n\n| --- | --- |\n' } },
    'pass',
    '빈 줄은 산문으로 세지 않는다',
  ],
  [
    'check-blind-measure-prompt.mjs',
    { tool_name: 'Agent', tool_input: { prompt: '일반 조사 지시\n무엇이든 산문으로 적는다.' } },
    'pass',
    '첫 줄이 마커가 아니면 보지 않는다',
  ],
];

// --- 브라우저 쓰기 차단 ---
// 이 훅은 "지금 이 탭이 어느 사이트인가"를 상태 파일로만 판정한다. 기록의 신선도·배치 안의
// 이동까지 판정에 걸리므로, 명령 문자열 대신 상태 파일을 깔아두고 payload를 흘린다.
const BROWSER_HOOK = 'check-browser-write-policy.mjs';
const BLOCKED_TAB = 100; // 차단 도메인, 방금 기록됨
const FREE_TAB = 200; // 허용 도메인, 방금 기록됨
const STALE_TAB = 300; // 차단 도메인이지만 기록이 낡음
const BLOCKED_URL = 'https://securities.miraeasset.com/';

const chrome = (name, input) => ({ tool_name: `mcp__claude-in-chrome__${name}`, tool_input: input });
const batch = (...actions) => chrome('browser_batch', { actions });

// [payload, 기대 판정, 설명]
const BROWSER_CASES = [
  [chrome('computer', { action: 'left_click', coordinate: [10, 10], tabId: BLOCKED_TAB }), 'deny', '차단 도메인의 클릭'],
  [chrome('computer', { action: 'type', text: '100', tabId: BLOCKED_TAB }), 'deny', '차단 도메인의 입력'],
  [chrome('computer', { action: 'key', text: 'Return', tabId: BLOCKED_TAB }), 'deny', '차단 도메인의 키 입력'],
  [chrome('form_input', { tabId: BLOCKED_TAB, ref: 'ref_1', value: 'x' }), 'deny', '차단 도메인의 폼 입력'],
  [chrome('javascript_tool', { tabId: BLOCKED_TAB, code: '1' }), 'deny', '차단 도메인의 스크립트 실행'],
  [chrome('file_upload', { tabId: BLOCKED_TAB, ref: 'ref_1', paths: ['a.txt'] }), 'deny', '차단 도메인의 파일 업로드'],
  [chrome('upload_image', { tabId: BLOCKED_TAB, ref: 'ref_1', imageId: 'img_1' }), 'deny', '차단 도메인의 이미지 업로드'],
  [chrome('shortcuts_execute', { tabId: BLOCKED_TAB, command: 'summarize' }), 'deny', '차단 도메인의 단축 실행'],

  // 읽기는 그대로 통과해야 한다 — 막히면 "같이 보며 해설"이라는 목적 자체가 없어진다.
  [chrome('computer', { action: 'screenshot', tabId: BLOCKED_TAB }), 'pass', '차단 도메인도 스크린샷은 통과'],
  [chrome('computer', { action: 'scroll', scroll_direction: 'down', coordinate: [10, 10], tabId: BLOCKED_TAB }), 'pass', '스크롤은 읽기'],
  [chrome('computer', { action: 'hover', coordinate: [10, 10], tabId: BLOCKED_TAB }), 'pass', 'hover는 읽기'],
  [chrome('read_page', { tabId: BLOCKED_TAB }), 'pass', 'read_page는 통과'],
  [chrome('navigate', { url: BLOCKED_URL, tabId: BLOCKED_TAB }), 'pass', '차단 도메인으로의 이동 자체는 통과'],

  // 판정 기준이 tabId가 아니라 URL임을 고정한다.
  [chrome('computer', { action: 'left_click', coordinate: [10, 10], tabId: FREE_TAB }), 'pass', '허용 도메인의 클릭'],

  // 기록을 못 믿는 경우는 통과가 아니라 거부다.
  [chrome('computer', { action: 'left_click', coordinate: [10, 10], tabId: STALE_TAB }), 'deny', '기록이 낡으면 거부'],
  [chrome('computer', { action: 'left_click', coordinate: [10, 10], tabId: 999 }), 'deny', '기록 없는 탭은 거부'],
  [chrome('computer', { action: 'left_click', coordinate: [10, 10] }), 'deny', 'tabId가 없으면 거부'],

  // 배치는 다른 도구를 담는 그릇이라 그 안까지 본다.
  [batch({ name: 'computer', input: { action: 'left_click', coordinate: [10, 10], tabId: BLOCKED_TAB } }), 'deny', '배치에 담은 클릭도 거부'],
  [batch({ name: 'computer', input: { action: 'screenshot', tabId: BLOCKED_TAB } }), 'pass', '배치에 담은 읽기는 통과'],
  [
    batch(
      { name: 'navigate', input: { url: BLOCKED_URL, tabId: FREE_TAB } },
      { name: 'computer', input: { action: 'left_click', coordinate: [10, 10], tabId: FREE_TAB } },
    ),
    'deny',
    '배치 안에서 차단 도메인으로 옮긴 뒤의 클릭도 거부',
  ],
  [
    batch(
      { name: 'navigate', input: { url: 'https://www.google.com/', tabId: BLOCKED_TAB } },
      { name: 'computer', input: { action: 'left_click', coordinate: [10, 10], tabId: BLOCKED_TAB } },
    ),
    'pass',
    '배치 안에서 다른 도메인으로 옮기면 그 뒤 클릭은 통과',
  ],
];

// 상태 파일을 임시 경로에 깔고 환경변수로 훅에 물린다(실제 기록을 건드리지 않는다).
//
// 이 변수는 process.env에 심지 않고 스폰마다 넘긴다. 전역에 심으면 함께 도는 다른 그룹의 훅까지
// 이 파일을 보게 되고, 반대로 넘기는 것을 빠뜨리면 훅이 사용자의 진짜 탭 기록을 읽어 판정한다.
// 그래서 fn에 파일 경로가 아니라 env 객체를 넘긴다 — 빠뜨리면 사용처에서 바로 눈에 띈다.
//
// 받아 적는 쪽(record-browser-tab-url) 검증은 상태 파일을 통째로 덮어쓰므로 별도 파일을 준다.
// 같은 파일을 쓰면 판정 케이스가 다 끝난 뒤에만 돌 수 있어 그룹 안에서 직렬 구간이 된다.
async function withBrowserStateFixture(fn) {
  const dir = await makeTempDir('browser-tab-state-');
  const file = path.join(dir, 'browser-tab-urls.json');
  const recordFile = path.join(dir, 'recorded-tab-urls.json');
  const now = Date.now();
  fs.writeFileSync(
    file,
    JSON.stringify({
      [BLOCKED_TAB]: { url: BLOCKED_URL, at: now },
      [FREE_TAB]: { url: 'https://www.google.com/', at: now },
      [STALE_TAB]: { url: BLOCKED_URL, at: now - 10 * 60 * 1000 },
    }),
  );
  fs.writeFileSync(recordFile, '{}');
  try {
    return await fn({
      caseEnv: { CLAUDE_BROWSER_TAB_URLS_FILE: file },
      recordEnv: { CLAUDE_BROWSER_TAB_URLS_FILE: recordFile },
      recordFile,
    });
  } finally {
    await removeTempDir(dir);
  }
}

// 받아 적는 쪽이 깨지면 판정 쪽은 전부 거부로 흐른다(조용한 통과는 없지만 브라우저 작업이
// 통째로 막힌다). 실제 응답 원문 꼴로 기록이 남는지 고정한다.
const TAB_CONTEXT_RESPONSE = [
  'Navigated to https://example.com/',
  '',
  'Tab Context:',
  '- Executed on tabId: 2031789807',
  '- Available tabs:',
  '  • tabId 2031789807: "example.com" ("https://example.com/")',
  '  • tabId 555: "미래에셋증권" ("https://securities.miraeasset.com/main")',
].join('\n');

function runHook(file, command, options) {
  return runHookPayload(file, { tool_name: 'Bash', tool_input: { command } }, options);
}

function runHookPayload(file, payload, { env } = {}) {
  return new Promise((resolve, reject) => {
    const child = childProcess.spawn(process.execPath, [path.join(hooksDir, file)], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
      windowsHide: true,
      // 반드시 merge한다. 치환하면 PATH·SystemRoot·USERPROFILE이 사라져 훅 안의 git 호출이 전부
      // 실패하는데, 그 실패를 삼키고 통과시키는 훅이 있어(check-md-section-refs) 증상이 FAIL이
      // 아니라 '조용한 pass'로 나타난다.
      env: env ? { ...process.env, ...env } : process.env,
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    // 청크 경계가 한글 UTF-8 3바이트를 가르면 판정 JSON이 깨진다 — 훅 사유는 전부 한글이고
    // 길다. setEncoding은 StringDecoder를 물려 경계를 이어 붙인다.
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    // 두 스트림 다 비워야 한다. 파이프로 열어 놓고 안 읽으면 버퍼가 차는 순간 자식이 멈춰 close가
    // 오지 않는다 — 병렬로 돌릴 때 실제로 걸린다.
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, HOOK_TIMEOUT_MS);

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    // exit이 아니라 close다 — exit은 파이프가 비워지기 전에 오므로 판정 본문을 놓친다.
    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        resolve({ decision: `<시간 초과: ${HOOK_TIMEOUT_MS}ms>`, stderr });
        return;
      }
      resolve({ ...decisionOf(stdout, code), stderr });
    });

    // 훅이 payload를 다 읽기 전에 끝나면 이 write가 EPIPE로 깨진다. spawnSync는 삼켜주던 것이라
    // 그냥 두면 정상 판정에서도 예외가 난다.
    child.stdin.on('error', () => {});
    child.stdin.end(JSON.stringify(payload));
  });
}

function decisionOf(stdout, code) {
  // 훅이 죽어도 stdout이 비면 아래에서 'pass'가 되어 통과 기대 케이스와 구분되지 않는다.
  // 절반 가까운 케이스가 pass 기대라 그대로 두면 아무 증상 없이 검증이 비어버린다.
  if (code !== 0) return { decision: `<훅 비정상 종료: exit ${code}>` };

  const out = stdout.trim();
  if (!out) return { decision: 'pass' };
  let parsed;
  try {
    parsed = JSON.parse(out);
  } catch {
    // 앞뒤를 함께 보여준다 — 출력이 잘린 것인지 애초에 JSON이 아닌 것인지 여기서 갈린다.
    return { decision: `<파싱 불가(${out.length}자): ${out.slice(0, 80)} … ${out.slice(-40)}>` };
  }
  const decided = parsed.hookSpecificOutput?.permissionDecision;
  if (decided) return { decision: decided, reason: parsed.hookSpecificOutput.permissionDecisionReason || '' };
  // 차단하지 않고 컨텍스트만 주입하는 hook은 permissionDecision을 내지 않는다. 그대로 두면
  // '조용히 통과'와 구분되지 않아 발동 여부를 검증할 수 없으므로 별도 판정으로 뽑는다.
  if (parsed.hookSpecificOutput?.additionalContext) return { decision: 'context' };
  return { decision: 'pass' };
}

// 케이스를 겹쳐 돌리되 결과는 입력 순서대로 담는다. 출력 줄과 순서가 직렬일 때와 같아야
// 리팩토링 전후를 그대로 대조할 수 있다.
async function runCases(cases, run, { concurrency = CONCURRENCY } = {}) {
  const results = new Array(cases.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < cases.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await run(cases[index], index);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, cases.length) }, worker));
  return toReport(results);
}

// 판정 하나를 결과 객체로. failLine은 사유 문구까지 보는 케이스처럼 FAIL 줄 형식이 다른 곳용이다.
function judge(label, decision, expected, stderr, { ok = decision === expected, failLine } = {}) {
  return { ok, label, decision, stderr, failLine };
}

function toReport(results) {
  const lines = [];
  const failures = [];
  for (const { ok, label, decision, stderr, failLine } of results) {
    if (ok) {
      lines.push({ text: `  PASS  ${label}` });
      continue;
    }
    lines.push({ text: failLine || `  FAIL  ${label} — 실제: ${decision}`, error: true });
    if (stderr) lines.push({ text: `        stderr: ${stderr.trim().split('\n')[0]}`, error: true });
    failures.push(label);
  }
  return { lines, failures };
}

// 미등록 파일 경고는 명령 문자열만으로 판정되지 않는다 — 실제 레포 상태를 봐야 한다.
// tracked 하나, untracked 하나를 가진 임시 레포를 만들어 판정을 고정한다.
async function withUntrackedFixture(fn) {
  const dir = await makeTempDir('hook-policy-fixture-');
  try {
    await runGit(['init', '-q'], dir);
    fs.writeFileSync(path.join(dir, 'tracked.txt'), 'a\n');
    await runGit(['add', 'tracked.txt'], dir);
    await runGit([...COMMIT_AS, 'commit', '-q', '-m', 'init', 'tracked.txt'], dir);
    fs.writeFileSync(path.join(dir, 'new.txt'), 'b\n');
    return await fn(dir.replace(/\\/g, '/'));
  } finally {
    await removeTempDir(dir);
  }
}

const untrackedCases = (dir) => [
  ['check-git-commit-policy.mjs', `git -C ${dir} commit . -m "x"`, 'ask', '경로 안의 미등록 파일을 알린다'],
  ['check-git-commit-policy.mjs', `git -C ${dir} commit tracked.txt -m "x"`, 'pass', '미등록 파일이 없는 경로는 조용하다'],
];

// 레포 면제(`policy-exempt-repos.mjs`)는 `--git-common-dir`로 레포 이름을 구하므로 진짜 git 레포가
// 있어야 판정된다. 면제 이름(`backlog`)과 아닌 이름(`ai-contexts`)을 나란히 만들어, 같은 명령이
// 레포에 따라 갈리는지를 고정한다. 보호 브랜치로 체크아웃된 상태여야 하므로 커밋까지 만든다.
// `knowledge-archive`는 같은 재료를 detached HEAD로 떼어둔 것이다 — 머지 훅이 "폴더를 못 정한 경우"를
// 차단하면서 detached HEAD를 오차단하지 않는지 가르려면 진짜 detached 레포가 필요하다.
async function withFreeRepoFixture(fn) {
  const root = await makeTempDir('hook-free-repo-');
  try {
    const names = ['backlog', 'ai-contexts', 'knowledge-archive'];
    const made = {};
    // 세 레포는 서로 독립이라 함께 세운다 — 순서대로 세우면 git 스폰 12번이 그대로 직렬이 된다.
    await Promise.all(names.map(async (name) => {
      const dir = path.join(root, name);
      fs.mkdirSync(dir);
      await runGit(['init', '-q', '-b', 'main'], dir);
      fs.writeFileSync(path.join(dir, 'a.txt'), 'a\n');
      await runGit(['add', 'a.txt'], dir);
      await runGit([...COMMIT_AS, 'commit', '-q', '-m', 'init', 'a.txt'], dir);
      if (name === 'knowledge-archive') await runGit(['checkout', '-q', '--detach', 'HEAD'], dir);
      made[name] = dir.replace(/\\/g, '/');
    }));
    return await fn(made);
  } finally {
    await removeTempDir(root);
  }
}

const freeRepoCases = ({ backlog: free, 'ai-contexts': gated, 'knowledge-archive': detached }) => [
  // 면제 레포 — 세 정책이 통째로 걷힌다.
  ['check-git-merge-policy.mjs', `git -C ${free} merge feature`, 'pass', '면제 레포는 보호 브랜치 머지도 통과'],
  ['check-git-merge-policy.mjs', `git -C ${free} cherry-pick abc123`, 'pass', '면제 레포는 체리픽도 통과'],
  ['check-git-merge-policy.mjs', `git -C ${free} branch -f main abc123`, 'pass', '면제 레포는 포인터 강제 이동도 통과'],
  ['check-git-push-policy.mjs', `git -C ${free} push origin main`, 'pass', '면제 레포는 보호 브랜치 push도 통과'],
  ['check-git-reset-policy.mjs', `git -C ${free} reset --hard`, 'pass', '면제 레포는 reset --hard도 통과'],

  // 면제 아닌 레포 — 기존 판정 그대로.
  ['check-git-merge-policy.mjs', `git -C ${gated} merge feature`, 'deny', '면제 밖은 보호 브랜치 머지 차단 유지'],
  ['check-git-merge-policy.mjs', `git -C ${gated} branch -f main abc123`, 'deny', '면제 밖은 포인터 강제 이동 차단 유지'],
  ['check-git-push-policy.mjs', `git -C ${gated} push origin main`, 'ask', '면제 밖은 보호 브랜치 push 승인 유지'],
  ['check-git-reset-policy.mjs', `git -C ${gated} reset --hard`, 'deny', '면제 밖은 reset --hard 차단 유지'],

  // 경로를 셸 변수로 넘기면 훅은 셸 확장 전 원문(`$V`)을 받는다. 예전엔 그 폴더에서 브랜치를 못 읽고
  // fail-open으로 흘러 머지 판정이 통째로 사라졌다 (2026-08-29 KA `main` 무단 머지 사고, 08-30 재현).
  // 같은 명령 안의 단순 대입은 파서가 풀어 실제 폴더로 판정한다 — 면제 밖은 막고, 면제 레포는 통과.
  [
    'check-git-merge-policy.mjs',
    `V="${gated}"; git -C "$V" merge feature`,
    'deny',
    '셸 변수 경로여도 머지 판정을 건너뛰지 않는다',
  ],
  ['check-git-merge-policy.mjs', `V="${free}"; git -C "$V" merge feature`, 'pass', '같은 명령에서 대입한 변수 경로는 풀어서 면제 판정'],
  ['check-git-push-policy.mjs', `P=${free}; git -C $P push origin main`, 'pass', '변수 경로 면제 레포는 보호 브랜치 push도 통과'],
  ['check-git-push-policy.mjs', `$P = '${free}'; git -C $P push origin main`, 'pass', 'PowerShell 대입도 풀어서 면제 판정'],
  ['check-git-push-policy.mjs', `P=${gated}; git -C \${P} push origin main`, 'ask', '변수 경로여도 면제 밖은 push 승인 유지'],
  // 풀 수 없는 변수(미정의·명령 치환)는 폴더를 못 정한 것으로 남는다 — 면제 레포도 예외가 아니다.
  ['check-git-merge-policy.mjs', `git -C "$UNSET_V" merge feature`, 'deny', '미정의 변수 경로는 면제되지 않는다'],
  ['check-git-merge-policy.mjs', `V=$(echo ${free}); git -C "$V" merge feature`, 'deny', '명령 치환 값은 풀지 않아 면제되지 않는다'],
  [
    'check-git-merge-policy.mjs',
    `git -C "$UNSET_V" rebase --continue`,
    'pass',
    '진행 중 작업 복구는 폴더를 못 정해도 통과',
  ],
  // 위 차단이 detached HEAD까지 삼키면 rebase/cherry-pick 중의 정상 상태가 오차단된다.
  [
    'check-git-merge-policy.mjs',
    `git -C ${detached} merge feature`,
    'pass',
    'detached HEAD는 보호 브랜치가 아니라 그대로 통과',
  ],

  // 한 명령이 두 레포를 섞어 부르면 정책을 유지한다 — 면제 레포에 얹혀 검사가 꺼지지 않게.
  [
    'check-git-reset-policy.mjs',
    `git -C ${free} reset --hard && git -C ${gated} reset --hard`,
    'deny',
    '면제 레포와 섞이면 면제되지 않는다',
  ],
];

// 워크트리 위치 정책(`check-git-worktree-policy.mjs`)은 `--git-common-dir`로 메인 레포 루트를 구하므로
// 진짜 git 레포가 있어야 판정이 선다. 가짜 경로로 등록하면 전부 fail-open→pass가 되어 검증이 조용히
// 무력화된다. 면제 fixture(`withFreeRepoFixture`)에 얹지 않는 이유는 그쪽 이름이 면제 의미론(free·gated)에
// 고정돼 있고 이 훅에는 면제 개념이 아예 없기 때문이다.
//
// cwd로 쓸 워크트리는 **관리 위치 밖**(`detached-wt`)에 둔다. 관리 위치 안에 두면 "fixture가 이 정책을
// 미리 지켜야 케이스가 성립한다"는 순환처럼 보이고, 밖에 두면 오히려 훅의 핵심(워크트리가 어디 있든
// 메인 루트 기준으로 판정)을 더 강하게 고정한다. 이 워크트리는 검증 스크립트가 `runGit`으로 직접 만들어
// 훅을 거치지 않는다.
//
// `sibling`·`managed`는 실제로 만들지 않는다 — 훅은 대상 경로의 실존 여부를 안 보고 문자열 비교만 한다.
async function withWorktreePolicyFixture(fn) {
  const root = await makeTempDir('hook-worktree-policy-');
  const main = path.join(root, 'main-repo');
  const wtOutside = path.join(root, 'detached-wt');
  try {
    fs.mkdirSync(main);
    await runGit(['init', '-q', '-b', 'main'], main);
    fs.writeFileSync(path.join(main, 'a.txt'), 'a\n');
    await runGit(['add', 'a.txt'], main);
    await runGit([...COMMIT_AS, 'commit', '-q', '-m', 'init', 'a.txt'], main);
    await runGit(['worktree', 'add', '-q', wtOutside, '-b', 'wt-branch'], main);
    const posix = (value) => value.replace(/\\/g, '/');
    return await fn({
      main: posix(main),
      managed: posix(path.join(main, '.claude', 'worktrees')),
      sibling: posix(path.join(root, 'sibling')),
      wtOutside: posix(wtOutside),
      nonGit: posix(root),
    });
  } finally {
    await removeTempDir(root);
  }
}

// [hook 파일, 명령, 기대 판정, 설명, (선택) payload.cwd]
const worktreePolicyCases = ({ main, managed, sibling, wtOutside, nonGit }) => [
  // --- 위치 판정 ---
  ['check-git-worktree-policy.mjs', `git -C ${main} worktree add ${sibling}/feature -b feature`, 'deny', '형제 경로는 관리 위치 밖이라 차단'],
  ['check-git-worktree-policy.mjs', `git -C ${main} worktree add ${managed}/feature -b feature`, 'pass', '관리 위치 밑은 통과'],

  // --- cwd를 어디서 구하든 같은 판정 ---
  ['check-git-worktree-policy.mjs', `cd ${main} && git worktree add ${sibling}/feature -b feature`, 'deny', 'cd로 옮겨도 형제 경로를 잡는다'],
  ['check-git-worktree-policy.mjs', 'git worktree add ../feature -b feature', 'deny', 'git -C도 cd도 없으면 payload.cwd로 판정한다', 'MAIN'],
  ['check-git-worktree-policy.mjs', `git status && git -C ${main} worktree add ${sibling}/feature -b feature`, 'deny', 'chain 뒷단의 위반도 잡는다'],

  // --- 워크트리 안에서 실행해도 메인 루트 기준 ---
  // 이 fixture 워크트리 자체가 관리 위치 밖에 있다. 그래도 그 안에서 부른 add의 기대 경로는
  // 워크트리가 아니라 메인의 `.claude/worktrees`여야 한다.
  ['check-git-worktree-policy.mjs', `git -C ${wtOutside} worktree add ${sibling}/second -b second`, 'deny', '워크트리 안에서도 메인 기준으로 판정한다'],
  ['check-git-worktree-policy.mjs', `git -C ${wtOutside} worktree add ${managed}/second -b second`, 'pass', '워크트리 안에서도 메인의 관리 위치는 통과'],

  // --- 옵션 값이 대상 경로로 오인되지 않는다 ---
  // `-b`/`-B`의 값을 positional로 세면 브랜치명이 심사 대상이 되어 판정이 통째로 뒤집힌다.
  ['check-git-worktree-policy.mjs', `git -C ${main} worktree add -b ${sibling}/notabranch ${managed}/feature2`, 'pass', '-b 값이 밖이어도 대상이 관리 위치면 통과'],
  ['check-git-worktree-policy.mjs', `git -C ${main} worktree add -B ${managed}/notabranch ${sibling}/feature3`, 'deny', '-B 값이 안이어도 대상이 밖이면 차단'],

  // --- add가 아닌 서브커맨드는 안 본다 ---
  ['check-git-worktree-policy.mjs', `git -C ${main} worktree list`, 'pass', 'list는 관여하지 않는다'],
  ['check-git-worktree-policy.mjs', `git -C ${main} worktree remove ${sibling}/feature`, 'pass', 'remove는 관여하지 않는다'],
  ['check-git-worktree-policy.mjs', `git -C ${main} worktree add -b feature`, 'pass', '경로 없는 add는 git이 거부하므로 관여하지 않는다'],

  // --- 비-git 디렉토리는 fail-open ---
  ['check-git-worktree-policy.mjs', `git -C ${nonGit} worktree add ${nonGit}/x -b x`, 'pass', '비-git 디렉토리는 git 자신이 거부한다'],
];

// 절 참조 검사(`check-md-section-refs.mjs`)는 staged 파일과 그것이 가리키는 대상을 둘 다
// 디스크에서 읽는다 — 명령 문자열만으로는 판정이 안 선다. 대상 문서 하나와, 그것을 가리키는
// 여러 형태(정상·깨진 앵커, 옛 「」 표기, 코드블록 안 예시, 코드의 문자열 인용, 커맨드 호명)를
// staged 상태로 만들어 고정한다.
// 파일을 나눠 두는 이유: 한 파일에 섞으면 차단이 알림을 가려 알림 케이스를 못 잰다.
//
// 케이스마다 스테이징이 다른데, 예전에는 한 index를 `git reset` 후 다시 채워 돌려썼다. 그래서
// 케이스끼리 겹쳐 돌 수 없었다. 이제는 케이스마다 자기 index 파일을 준다(`GIT_INDEX_FILE`) —
// 훅 안의 git 호출은 env를 물려받으므로 `git diff --cached`·`git ls-files`가 그 index를 본다.
// 새 index 파일은 빈 상태라 reset도 필요 없다. 워킹트리는 공유해도 되는데, 이 갈래의 케이스는
// 스테이징만 바꾸고 파일 내용은 안 건드리기 때문이다(내용을 바꾸는 역방향은 아래에서 따로 푼다).
async function withSectionRefFixture(fn) {
  const root = await makeTempDir('hook-section-ref-');
  const dir = path.join(root, 'section-ref-repo');
  const indexDir = path.join(root, 'index');
  fs.mkdirSync(dir);
  fs.mkdirSync(indexDir);
  try {
    await runGit(['init', '-q'], dir);
    fs.writeFileSync(
      path.join(dir, 'target.md'),
      '# 대상\n\n## 메모·기록 도구 분리\n\n본문\n\n## 사전 준비: 브랜치 생성\n\n본문\n',
    );
    // 산문(「」)은 앞머리만 불러도 인정하지만, 앵커 **링크**는 전체 이름이라야 실제로 그 절로
    // 뛴다. 두 기준이 갈리는 자리라 링크 쪽을 케이스로 고정한다.
    fs.writeFileSync(path.join(dir, 'alias-link.md'), '[사전 준비](target.md#사전-준비)를 따른다.\n');
    fs.writeFileSync(path.join(dir, 'alias-prose.md'), '`target.md`의 「사전 준비」를 따른다.\n');
    fs.writeFileSync(path.join(dir, 'ok.md'), '[메모·기록 도구 분리](target.md#메모기록-도구-분리)를 따른다.\n');
    fs.writeFileSync(path.join(dir, 'broken.md'), '[메모 기록 도구](target.md#메모와-기록-도구를-나눈다)를 따른다.\n');
    fs.writeFileSync(path.join(dir, 'legacy.md'), '`target.md`의 「메모·기록 도구 분리」를 따른다.\n');
    fs.writeFileSync(path.join(dir, 'fenced.md'), '예시:\n\n```markdown\n[없는 절](target.md#없는-절)\n```\n');
    // 코드는 문서를 **경로가 아니라 이름으로** 부른다(KA 린터 `rule` 필드, AC 훅 주석).
    // 이름은 레포의 md 색인으로 되돌리므로 대상 md도 함께 스테이지해야 판정이 선다.
    fs.writeFileSync(path.join(dir, 'code-ok.mts'), 'const RULE = "target \'메모·기록 도구 분리\'";\n');
    fs.writeFileSync(path.join(dir, 'code-broken.mts'), 'const RULE = "target \'메모와 기록 도구를 나눈다\'";\n');
    // 이름이 어느 md로도 안 풀리면 인용이 아니다 — 코드에 흔한 `말 '따옴표'` 꼴을 차단하지 않는다.
    fs.writeFileSync(path.join(dir, 'code-unrelated.mts'), 'const KIND = "widget \'없는 문서의 없는 절\'";\n');
    // 커맨드 호명은 **인자를 달고 불리는 꼴**만 본다. 이름만 적힌 백틱은 URL 경로와 안 갈린다.
    fs.writeFileSync(path.join(dir, 'cmd-missing.md'), '`/scaffold https://example.com/1` 실행 시 생성되는 파일들.\n');
    fs.writeFileSync(path.join(dir, 'cmd-builtin.md'), '`/compact 후 이어서` 진행한다.\n');
    fs.writeFileSync(path.join(dir, 'cmd-bare.md'), '엔드포인트는 `/users`, `/settings` 두 개다.\n');
    // 외부 URL은 이 레포에 없는 것이 정상이다. 안 거르면 GitHub·공식문서의 `.md#앵커`가
    // 로컬 파일로 읽혀 무관한 커밋을 통째로 막는다(전수 실측: backlog가 그렇게 막혀 있었다).
    fs.writeFileSync(path.join(dir, 'external.md'), '[출처](https://example.com/docs/guide.md#anchor)를 본다.\n');
    // `경로` + 「절」 + 콜론 뒤 코드펜스가 그 파일에서 그대로 옮겨온 것인지 본다.
    fs.writeFileSync(
      path.join(dir, 'quote-ok.md'),
      '**before** — `target.md` 「메모·기록 도구 분리」:\n\n```\n## 메모·기록 도구 분리\n```\n',
    );
    fs.writeFileSync(
      path.join(dir, 'quote-stale.md'),
      '**before** — `target.md` 「메모·기록 도구 분리」:\n\n```\ngh pr list --state all\n```\n',
    );
    // 세 조각이 다 모이지 않으면 예시용 경로와 구분이 안 되므로 보지 않는다.
    fs.writeFileSync(path.join(dir, 'quote-loose.md'), '`target.md`를 참고한다.\n\n```\n실재하지 않는 내용\n```\n');
    return await fn(dir.replace(/\\/g, '/'), async (files, slot) => {
      const env = { GIT_INDEX_FILE: path.join(indexDir, `idx-${slot}`) };
      await runGit(['add', ...files], dir, env);
      return env;
    });
  } finally {
    await removeTempDir(root);
  }
}

const sectionRefCases = [
  [['target.md', 'ok.md'], 'pass', '앵커가 실재하는 절을 가리키면 조용하다'],
  [['target.md', 'broken.md'], 'deny', '대상 파일에 없는 절을 가리키면 차단한다'],
  [['legacy.md'], 'context', '옛 「」 표기는 차단이 아니라 알림이다'],
  [['fenced.md'], 'pass', '코드블록 안의 예시 링크는 보지 않는다'],
  [['target.md', 'alias-link.md'], 'deny', '앞머리만 적은 앵커 링크는 그 절로 안 뛰므로 차단한다'],
  [['target.md', 'alias-prose.md'], 'context', '산문은 앞머리만 불러도 차단하지 않는다'],
  [['target.md', 'code-ok.mts'], 'pass', '코드가 문자열로 든 절 인용이 실재하면 조용하다'],
  [['target.md', 'code-broken.mts'], 'deny', '코드가 든 절 이름이 문서에 없으면 차단한다'],
  [['target.md', 'code-unrelated.mts'], 'pass', '문서 이름으로 안 풀리는 문자열은 인용이 아니다'],
  [['cmd-missing.md'], 'context', '없는 커맨드를 인자와 함께 호명하면 알린다'],
  [['cmd-builtin.md'], 'pass', '빌트인 커맨드 호명은 조용하다'],
  [['cmd-bare.md'], 'pass', '인자 없는 백틱 경로는 커맨드로 보지 않는다'],
  [['external.md'], 'pass', '외부 URL은 로컬 파일로 보지 않는다'],
  // 인용 머리줄은 `경로` + 「절」이라 옛 표기 알림에도 걸린다 — 차단이 아니라는 것이 여기서 재는 것이다.
  [['target.md', 'quote-ok.md'], 'context', '인용한 코드블록이 대상 파일에 있으면 차단하지 않는다'],
  [['target.md', 'quote-stale.md'], 'deny', '인용한 코드블록이 대상 파일에 없으면 차단한다'],
  [['target.md', 'quote-loose.md'], 'pass', '경로만 있고 「절」·콜론이 없으면 인용으로 보지 않는다'],
];

// 역방향(가리켜지는 쪽 개명)은 **커밋 전 판본**과 대조해야 판정이 서므로 이력이 있는 레포가
// 필요하다. 위 fixture는 첫 커밋이 없어 같이 못 쓴다 — 거기에 이력을 넣으면 staged 목록이
// 달라져 위 케이스가 통째로 함께 흔들린다.
// 대상 문서 둘을 두는 이유: 앵커 링크로 부르는 쪽과 옛 「」 표기로만 부르는 쪽이 각각 혼자
// 차단을 일으키는지 재야 하는데, 한 문서를 같이 가리키면 앞의 차단이 뒤를 가린다.
//
// 이 갈래는 순방향과 달리 **워킹트리를 고친다**(`edit`가 문서의 헤딩을 바꾼다). 그래서 index만
// 갈라서는 케이스끼리 격리되지 않는다 — 템플릿을 한 벌 세우고 케이스마다 통째로 복사한다.
// 복사본 이름을 면제 레포 이름(backlog·ai-contexts·knowledge-archive)으로 짓지 않는다. 이 훅은
// 레포 이름을 안 보지만, 나중에 같은 fixture에 다른 훅 케이스를 얹으면 이름으로 판정이 갈린다.
async function withSectionRefReverseFixture(fn) {
  const root = await makeTempDir('hook-section-ref-rev-');
  const template = path.join(root, 'template');
  fs.mkdirSync(template);
  const write = (base) => (name, body) => fs.writeFileSync(path.join(base, name), body);
  try {
    const seed = write(template);
    await runGit(['init', '-q'], template);
    seed('doc.md', '# 문서\n\n## 옛 이름\n\n본문\n\n## 그대로\n\n본문\n');
    seed('other.md', '# 다른 문서\n\n## 옛 절\n\n본문\n');
    seed('link.md', '[옛 이름](doc.md#옛-이름)를 따른다.\n');
    seed('note.md', '`other.md`의 「옛 절」을 따른다.\n');
    // 이 커밋이 깨뜨린 것이 아닌 기존 미해결. 발동이 안 좁혀져 있으면 무관한 커밋마다 뜬다.
    seed('stale.md', '[없는 절](doc.md#처음부터-없던-절)를 따른다.\n');
    await runGit(['add', '.'], template);
    await runGit([...COMMIT_AS, 'commit', '-q', '-m', 'init'], template);
    return await fn(async (edit, files, slot) => {
      const dir = path.join(root, `reverse-case-${slot}`);
      await fsp.cp(template, dir, { recursive: true });
      edit(write(dir));
      await runGit(['add', ...files], dir);
      return dir.replace(/\\/g, '/');
    });
  } finally {
    await removeTempDir(root);
  }
}

const sectionRefReverseCases = [
  [
    (write) => write('doc.md', '# 문서\n\n## 새 이름\n\n본문\n\n## 그대로\n\n본문\n'),
    ['doc.md'],
    'deny',
    '개명한 파일만 스테이지해도 그 절을 가리키던 앵커 링크가 걸린다',
  ],
  [
    (write) => write('other.md', '# 다른 문서\n\n## 새 절\n\n본문\n'),
    ['other.md'],
    'deny',
    '옛 「」 표기로만 가리키던 인용도 역방향에서는 차단이다',
  ],
  [
    (write) => write('doc.md', '# 문서\n\n## 옛 이름\n\n고친 본문\n\n## 그대로\n\n본문\n'),
    ['doc.md'],
    'pass',
    '헤딩이 그대로면 레포에 기존 미해결이 있어도 조용하다',
  ],
  [
    (write) => write('doc.md', '# 문서\n\n## 옛 이름\n\n본문\n\n## 아무도 안 부르는 이름\n\n본문\n'),
    ['doc.md'],
    'pass',
    '아무도 안 가리키던 절의 개명은 걸리지 않는다',
  ],
];

// 쓰기 시점 hook: [파일, payload, 기대, 설명] 꼴을 공유하는 그룹들.
const runWriteCases = (cases) => runCases(cases, async ([file, payload, expected, note]) => {
  const { decision, stderr } = await runHookPayload(file, payload);
  const label = `${file} :: ${payload.tool_name} ${payload.tool_input.file_path} → ${expected} (${note})`;
  return judge(label, decision, expected, stderr);
});

// fixture 안에서 실행까지 끝낸다 — 케이스 목록만 만들어 나오면 임시 레포가 먼저 지워져
// 미등록 파일이 사라진 상태로 판정된다(레포 부재 → 조회 실패 → pass로 통과, 위양성 없이 조용히 무력화).
const untrackedGroup = () => withUntrackedFixture((dir) =>
  runCases([...CASES, ...untrackedCases(dir)], async ([file, command, expected, note]) => {
    const { decision, stderr } = await runHook(file, command);
    return judge(`${file} :: ${command} → ${expected} (${note})`, decision, expected, stderr);
  }));

// 레포 면제는 임시 레포의 이름으로 판정되므로 fixture 안에서 실행까지 끝낸다.
const freeRepoGroup = () => withFreeRepoFixture((repos) =>
  runCases(freeRepoCases(repos), async ([file, command, expected, note]) => {
    const { decision, stderr } = await runHook(file, command);
    return judge(`${file} :: ${command} → ${expected} (${note})`, decision, expected, stderr);
  }));

// 워크트리 위치는 임시 레포의 `--git-common-dir`로 판정되므로 fixture 안에서 실행까지 끝낸다 —
// 폴더가 먼저 지워지면 메인 루트를 못 찾아 fail-open으로 흘러 전부 조용히 pass가 된다.
const worktreePolicyGroup = () => withWorktreePolicyFixture((paths) =>
  runCases(worktreePolicyCases(paths), async ([file, command, expected, note, cwdKey]) => {
    const payload = { tool_name: 'Bash', tool_input: { command } };
    // cwdKey가 있는 케이스만 payload.cwd를 채운다 — 훅의 `getCwd(payload)` 갈래를 재는 케이스다.
    if (cwdKey === 'MAIN') payload.cwd = paths.main;
    const { decision, stderr } = await runHookPayload(file, payload);
    return judge(`${file} :: ${command} → ${expected} (${note})`, decision, expected, stderr);
  }));

// Edit 케이스는 디스크 내용을 읽으므로 fixture 안에서 실행까지 끝낸다.
const packageGroup = () => withPackageFixture((dir) => runWriteCases([...WRITE_CASES, ...editCases(dir)]));

// 레포 제외는 경로 위쪽의 `.git`으로 판정되므로 fixture 안에서 실행까지 끝낸다 — 폴더가
// 먼저 지워지면 레포를 못 찾아 제외가 안 걸린 채로 판정된다.
const repoGroup = () => withRepoFixture((dir) => runWriteCases(repoCases(dir)));

// 브라우저 쓰기 차단은 상태 파일을 읽어 판정하므로 fixture(임시 상태 파일) 안에서 끝낸다.
const browserGroup = () => withBrowserStateFixture(async ({ caseEnv, recordEnv, recordFile }) => {
  const [cases, record] = await Promise.all([
    runCases(BROWSER_CASES, async ([payload, expected, note]) => {
      const { decision, stderr } = await runHookPayload(BROWSER_HOOK, payload, { env: caseEnv });
      return judge(`${BROWSER_HOOK} :: ${payload.tool_name} → ${expected} (${note})`, decision, expected, stderr);
    }),
    // 받아 적는 쪽: 응답 원문에서 목록의 탭을 전부 뽑아 기록하는지.
    (async () => {
      await runHookPayload('record-browser-tab-url.mjs', {
        tool_name: 'mcp__claude-in-chrome__navigate',
        tool_input: { url: 'https://example.com/' },
        tool_response: { content: [{ type: 'text', text: TAB_CONTEXT_RESPONSE }] },
      }, { env: recordEnv });
      const recorded = JSON.parse(fs.readFileSync(recordFile, 'utf8'));
      const label = 'record-browser-tab-url.mjs :: 응답의 탭 목록을 전부 기록한다';
      const ok =
        recorded['2031789807']?.url === 'https://example.com/' &&
        recorded['555']?.url === 'https://securities.miraeasset.com/main' &&
        typeof recorded['555']?.at === 'number';
      return toReport([{ ok, label, failLine: `  FAIL  ${label} — 실제: ${JSON.stringify(recorded)}` }]);
    })(),
  ]);
  return mergeReports([cases, record]);
});

// 절 참조 검사는 staged 목록과 대상 파일을 디스크에서 읽으므로 fixture 안에서 실행까지 끝낸다.
// 케이스마다 stage 대상이 달라 자기 index를 받아 간다.
const sectionRefGroup = () => withSectionRefFixture((dir, stage) =>
  runCases(sectionRefCases, async ([files, expected, note], slot) => {
    // 준비와 실행은 케이스 안에서 순서를 지킨다 — 같은 index를 둘이 동시에 만지면 안 된다.
    const env = await stage(files, slot);
    const { decision, stderr } = await runHookPayload('check-md-section-refs.mjs', {
      tool_name: 'Bash',
      tool_input: { command: `git -C ${dir} commit -m "x" ${files.join(' ')}` },
      cwd: dir,
    }, { env });
    const label = `check-md-section-refs.mjs :: [${files.join(', ')}] → ${expected} (${note})`;
    return judge(label, decision, expected, stderr);
  }, { concurrency: SECTION_REF_CONCURRENCY }));

// 역방향은 커밋 전 판본을 `git show`로 읽으므로 이력이 있는 fixture 안에서 끝낸다.
const sectionRefReverseGroup = () => withSectionRefReverseFixture((prepare) =>
  runCases(sectionRefReverseCases, async ([edit, files, expected, note], slot) => {
    const dir = await prepare(edit, files, slot);
    const { decision, stderr } = await runHookPayload('check-md-section-refs.mjs', {
      tool_name: 'Bash',
      tool_input: { command: `git -C ${dir} commit -m "x" ${files.join(' ')}` },
      cwd: dir,
    });
    const label = `check-md-section-refs.mjs :: [${files.join(', ')}] 역방향 → ${expected} (${note})`;
    return judge(label, decision, expected, stderr);
  }, { concurrency: SECTION_REF_CONCURRENCY }));

// 대기용 빈 명령은 둘 다 막지만 안내가 반대다 — 메인은 턴을 끝내라, 서브에이전트는 끝내지 마라.
// 판정만 보면 안내가 뒤바뀌어도 통과하므로 사유 문구까지 고정한다.
const waitGroup = () => runCases(WAIT_CASES, async ([command, agentId, expectSubagentMsg, note]) => {
  const payload = { tool_name: 'Bash', tool_input: { command }, ...(agentId ? { agent_id: agentId } : {}) };
  const { decision, reason = '', stderr } = await runHookPayload('check-shell-policy.mjs', payload);
  const expected = expectSubagentMsg === null ? 'pass' : 'deny';
  const msgOk = expectSubagentMsg === null || reason.includes('서브에이전트는 턴을 끝내지 마세요') === expectSubagentMsg;
  const label = `check-shell-policy.mjs :: ${command}${agentId ? ' [서브에이전트]' : ''} → ${expected} (${note})`;
  return judge(label, decision, expected, stderr, {
    ok: decision === expected && msgOk,
    failLine: `  FAIL  ${label} — 실제: ${decision} / 사유: ${reason.slice(0, 60)}`,
  });
});

async function runGroupsInSequence(groups) {
  const settled = [];
  for (const group of groups) {
    try {
      settled.push({ status: 'fulfilled', value: await group() });
    } catch (reason) {
      settled.push({ status: 'rejected', reason });
    }
  }
  return settled;
}

// 파일 경로가 없는 payload라 쓰기 그룹의 라벨 형식을 못 쓴다 — 도구 이름으로 가른다.
const toolGroup = () => runCases(TOOL_CASES, async ([file, payload, expected, note]) => {
  const { decision, stderr } = await runHookPayload(file, payload);
  return judge(`${file} :: ${payload.tool_name} → ${expected} (${note})`, decision, expected, stderr);
});

// skill-creator 알림은 대화 기록 파일을 읽어 「이미 불렀는가」를 가르므로, 기록 두 벌(부른 것·안 부른 것)을
// 임시 폴더에 만들어 두고 그 안에서 실행까지 끝낸다. 부른 기록은 플러그인 접두가 붙은 이름으로 둔다 —
// 이름 전체 일치로 판정하면 이 형태를 놓친다.
const SKILL_CREATOR_HOOK = 'surface-skill-creator.mjs';
const skillCreatorGroup = async () => {
  const dir = await makeTempDir('hook-skill-creator-');
  try {
    const loaded = path.join(dir, 'loaded.jsonl');
    const fresh = path.join(dir, 'fresh.jsonl');
    const toolUse = (name, input) => JSON.stringify({ message: { role: 'assistant', content: [{ type: 'tool_use', name, input }] } });
    fs.writeFileSync(loaded, `${toolUse('Skill', { skill: 'anthropic-skills:skill-creator' })}\n`);
    // 본문에 이름만 나오고 Skill 호출은 없는 기록 — 읽은 문서에 이름이 적혀 있는 것은 부른 것이 아니다
    fs.writeFileSync(fresh, `${toolUse('Read', { file_path: 'C:/x/skill-creator/SKILL.md' })}\n`);
    const read = (file, transcript) => ({ tool_name: 'Read', tool_input: { file_path: file }, transcript_path: transcript });
    const bench = 'C:/Users/u/.claude/skills/scw/benching/SKILL.md';
    const cases = [
      [read(bench, fresh), 'context', '안 부른 세션이 벤치 문서를 열면 알린다'],
      [read('C:/repo/deploy/skills/scw/benching/SKILL.md', fresh), 'context', '원본 경로로 열어도 알린다'],
      [read(bench, loaded), 'pass', '이미 부른 세션은 조용하다'],
      [read(bench, path.join(dir, 'none.jsonl')), 'context', '기록을 못 읽으면 알리는 쪽으로 기운다'],
      [read('C:/Users/u/.claude/skills/scw/SKILL.md', fresh), 'pass', 'scw 본문만 연 것은 벤치 회차가 아니다'],
      [{ tool_name: 'Edit', tool_input: { file_path: bench }, transcript_path: fresh }, 'pass', 'Read가 아니면 조용하다'],
    ];
    return await runCases(cases, async ([payload, expected, note]) => {
      const { decision, stderr } = await runHookPayload(SKILL_CREATOR_HOOK, payload);
      return judge(`${SKILL_CREATOR_HOOK} :: ${payload.tool_name} → ${expected} (${note})`, decision, expected, stderr);
    });
  } finally {
    await removeTempDir(dir);
  }
};

function mergeReports(reports) {
  return {
    lines: reports.flatMap((report) => report.lines),
    failures: reports.flatMap((report) => report.failures),
  };
}

async function main() {
  console.log('정책 hook 판정 검증 중...');

  const groups = [
    untrackedGroup,
    freeRepoGroup,
    worktreePolicyGroup,
    packageGroup,
    repoGroup,
    browserGroup,
    sectionRefGroup,
    sectionRefReverseGroup,
    waitGroup,
    toolGroup,
    skillCreatorGroup,
  ];

  // 그룹은 각자 자기 임시 폴더만 쓰므로 함께 돌린다. allSettled인 이유는 한 그룹이 터졌을 때
  // 형제 그룹이 아직 훅을 돌리는 중에 상위가 정리·종료로 넘어가면 임시 폴더 삭제가 깨지기 때문이다.
  // 한도를 1로 준 것은 직렬 재현을 보겠다는 뜻이므로 그룹 겹치기도 함께 끈다.
  const settled = CONCURRENCY === 1
    ? await runGroupsInSequence(groups)
    : await Promise.allSettled(groups.map((group) => group()));

  const errors = settled.filter((result) => result.status === 'rejected').map((result) => result.reason);
  const report = mergeReports(settled.filter((result) => result.status === 'fulfilled').map((result) => result.value));

  for (const { text, error } of report.lines) {
    if (error) console.error(text);
    else console.log(text);
  }

  for (const error of errors) {
    console.error(`  ERROR ${error instanceof Error ? error.message : String(error)}`);
  }

  if (report.failures.length || errors.length) {
    console.error(`정책 hook 판정 검증 실패: ${report.failures.length + errors.length}건`);
    process.exit(1);
  }
  console.log('정책 hook 판정 정상');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exit(1);
  });
}
