const { deny, getCommand, readPayload } = require("./hook-utils");

const cmd = getCommand(readPayload());

if (/\bgit\b.*--(hard|mixed)\b/.test(cmd)) {
  deny("git reset --hard / --mixed 금지. --soft만 사용하세요. 워킹 디렉토리 미커밋 변경이 복구 불가능하게 삭제됩니다.");
}

if (/(?:^|&&|\|\||[;|]|\$\(|`)\s*npx\b/.test(cmd)) {
  deny("npx is not allowed. 가장 가까운 package.json의 scripts 섹션을 읽고 적절한 npm run <script>를 사용하세요.");
}

// cd <dir> && git: 대상 폴더의 .git/hooks 실행 위험 → Claude Code가 무조건 권한 프롬프트(allowlist·hook allow로 우회 불가).
// git -C <path>로 강제 교정.
const hasCdSub = /(?:^|&&|\|\||;|\|)\s*cd\s/.test(cmd);
const hasGitSub = /(?:^|&&|\|\||;|\|)\s*git\s/.test(cmd);
if (hasCdSub && hasGitSub) {
  deny("cd && git 금지 — 다른 디렉터리의 git은 'git -C <path> <cmd>' 형태로 실행하세요. cd로 이동 후 git을 돌리면 대상 폴더의 .git/hooks가 실행될 수 있어 Claude Code가 무조건 권한 프롬프트를 띄웁니다(allowlist·hook allow로 우회 불가).");
}
