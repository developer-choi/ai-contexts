import { deny, getCommand, readPayload } from "./hook-utils.mjs";

const cmd = getCommand(readPayload());

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

// PowerShell here-string(@'...'@ / @"..."@)을 Bash 툴에 쓰면 @가 리터럴로 남아
// 커밋 메시지 등에 눌러붙는다. bash 여러 줄 문자열은 -m 여러 번 또는 heredoc을 쓴다.
if (/(?:^|\s)@['"]/.test(cmd)) {
  deny("PowerShell here-string(@'...'@) 문법을 Bash 툴에 썼습니다. bash에선 @가 리터럴로 남아 메시지 앞뒤에 붙습니다. 여러 줄이면 -m 'subject' -m 'body'로 나누거나 heredoc(<<'MSG' ... MSG)을 쓰세요.");
}
