#!/usr/bin/env node
// 정책 hook(git 계열 + 삭제 가드)의 판정을 회귀 검증한다.
//
// 이 훅들은 실패해도 아무 소리를 내지 않는다 — 등록은 정상이고 명령도 정상 실행되며,
// 다만 특정 형태만 검사를 빠져나간다(`git commit`은 잡는데 `git -C <path> commit`은 놓치는 식).
// 사람이 눈으로 볼 방법이 없으므로 대표 명령을 실제 payload로 흘려 판정을 고정한다.
// sync:system이 배포 전 fail-fast로 돌려, 구멍 난 훅이 배포되는 것을 막는다.

import childProcess from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const hooksDir = path.join(import.meta.dirname, '..', '..', 'deploy', 'hooks');

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

  // --- 통과해야 하는 형태 (오탐 방지) ---
  ['check-git-commit-policy.mjs', 'git commit a.txt -m "x"', 'pass', '파일 지정 커밋'],
  ['check-git-commit-policy.mjs', 'git commit -m "x" a.txt', 'pass', '파일이 -m 뒤에 와도 지정된 것'],
  ['check-git-commit-policy.mjs', "git commit a.txt -F - <<'MSG'\nfix: x\nMSG", 'pass', '-F도 경로만 있으면 통과'],
  ['check-git-commit-policy.mjs', 'git commit --amend --no-edit a.txt', 'pass', '경로를 준 amend는 통과'],
  ['check-git-commit-policy.mjs', 'git commit --allow-empty -m "x"', 'pass', '빈 커밋은 경로가 없는 게 정상'],
  ['check-git-commit-policy.mjs', "git commit a.txt -m @'\nfix: 여러 줄 메시지\n'@", 'pass', 'here-string이어도 경로를 주면 통과'],
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

  // --- chain ---
  ['check-git-staging-policy.mjs', 'git status && git -C ~/repo add -A', 'deny', 'chain 뒷단의 위반도 잡는다'],

  // --- 삭제 가드: 전 경로 검사 + 예외만 통과 ---
  ['check-rm-policy.mjs', 'rm -rf C:/Windows/Temp/x', 'ask', '시스템 경로 삭제도 잡는다'],
  ['check-rm-policy.mjs', 'rm -rf ~/x', 'ask', '홈 디렉터리 삭제도 잡는다'],
  ['check-rm-policy.mjs', 'rm -rf ~/WebstormProjects/main/x', 'ask', '작업 폴더 삭제(기존 동작 유지)'],
  ['check-rm-policy.mjs', 'rm -rf node_modules', 'pass', '빌드 산출물은 묻지 않는다'],

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
  ['check-rm-policy.mjs', `rm -rf "${path.join(os.tmpdir(), 'claude', 'scratch.txt')}"`, 'pass', '임시 디렉터리 하위는 묻지 않는다'],
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
    '패키지 어휘 밖 type은 무관한 문서라 통과',
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

function withRepoFixture(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-repo-fixture-'));
  try {
    for (const name of ['backlog', 'other-repo']) {
      fs.mkdirSync(path.join(dir, name, '.git'), { recursive: true });
    }
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
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

function withPackageFixture(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-package-fixture-'));
  try {
    fs.writeFileSync(path.join(dir, 'pkg.md'), PKG);
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function runHook(file, command) {
  return runHookPayload(file, { tool_name: 'Bash', tool_input: { command } });
}

function runHookPayload(file, payload) {
  const res = childProcess.spawnSync(process.execPath, [path.join(hooksDir, file)], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
  });
  if (res.error) throw res.error;
  const out = (res.stdout || '').trim();
  if (!out) return { decision: 'pass', stderr: res.stderr };
  let parsed;
  try {
    parsed = JSON.parse(out);
  } catch {
    return { decision: `<파싱 불가: ${out.slice(0, 80)}>`, stderr: res.stderr };
  }
  const decided = parsed.hookSpecificOutput?.permissionDecision;
  if (decided) return { decision: decided, stderr: res.stderr };
  // 차단하지 않고 컨텍스트만 주입하는 hook은 permissionDecision을 내지 않는다. 그대로 두면
  // '조용히 통과'와 구분되지 않아 발동 여부를 검증할 수 없으므로 별도 판정으로 뽑는다.
  if (parsed.hookSpecificOutput?.additionalContext) return { decision: 'context', stderr: res.stderr };
  return { decision: 'pass', stderr: res.stderr };
}

// 미등록 파일 경고는 명령 문자열만으로 판정되지 않는다 — 실제 레포 상태를 봐야 한다.
// tracked 하나, untracked 하나를 가진 임시 레포를 만들어 판정을 고정한다.
function withUntrackedFixture(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-policy-fixture-'));
  const run = (cmd) => childProcess.execSync(cmd, { cwd: dir, stdio: 'pipe' });
  try {
    run('git init -q');
    fs.writeFileSync(path.join(dir, 'tracked.txt'), 'a\n');
    run('git add tracked.txt');
    run('git -c user.email=verify@local -c user.name=verify commit -q -m init tracked.txt');
    fs.writeFileSync(path.join(dir, 'new.txt'), 'b\n');
    return fn(dir.replace(/\\/g, '/'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const untrackedCases = (dir) => [
  ['check-git-commit-policy.mjs', `git -C ${dir} commit . -m "x"`, 'ask', '경로 안의 미등록 파일을 알린다'],
  ['check-git-commit-policy.mjs', `git -C ${dir} commit tracked.txt -m "x"`, 'pass', '미등록 파일이 없는 경로는 조용하다'],
];

function main() {
  console.log('정책 hook 판정 검증 중...');
  const failures = [];
  // fixture 안에서 실행까지 끝낸다 — 케이스 목록만 만들어 나오면 임시 레포가 먼저 지워져
  // 미등록 파일이 사라진 상태로 판정된다(레포 부재 → 조회 실패 → pass로 통과, 위양성 없이 조용히 무력화).
  withUntrackedFixture((dir) => {
    for (const [file, command, expected, note] of [...CASES, ...untrackedCases(dir)]) {
      const { decision, stderr } = runHook(file, command);
      const label = `${file} :: ${command} → ${expected} (${note})`;
      if (decision === expected) {
        console.log(`  PASS  ${label}`);
      } else {
        console.error(`  FAIL  ${label} — 실제: ${decision}`);
        if (stderr) console.error(`        stderr: ${stderr.trim().split('\n')[0]}`);
        failures.push(label);
      }
    }
  });
  // 쓰기 시점 hook: Edit 케이스는 디스크 내용을 읽으므로 fixture 안에서 실행까지 끝낸다.
  const runWriteCases = (cases) => {
    for (const [file, payload, expected, note] of cases) {
      const { decision, stderr } = runHookPayload(file, payload);
      const label = `${file} :: ${payload.tool_name} ${payload.tool_input.file_path} → ${expected} (${note})`;
      if (decision === expected) {
        console.log(`  PASS  ${label}`);
      } else {
        console.error(`  FAIL  ${label} — 실제: ${decision}`);
        if (stderr) console.error(`        stderr: ${stderr.trim().split('\n')[0]}`);
        failures.push(label);
      }
    }
  };
  withPackageFixture((dir) => runWriteCases([...WRITE_CASES, ...editCases(dir)]));
  // 레포 제외는 경로 위쪽의 `.git`으로 판정되므로 fixture 안에서 실행까지 끝낸다 — 폴더가
  // 먼저 지워지면 레포를 못 찾아 제외가 안 걸린 채로 판정된다.
  withRepoFixture((dir) => runWriteCases(repoCases(dir)));
  if (failures.length) {
    console.error(`정책 hook 판정 검증 실패: ${failures.length}건`);
    process.exit(1);
  }
  console.log('정책 hook 판정 정상');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
