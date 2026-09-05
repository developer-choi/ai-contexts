import { parseGitInvocation, splitSegments, tokenize } from "./git-command-parser.mjs";
import { deny, getCommand, getToolName, readPayload } from "./hook-utils.mjs";

const payload = readPayload();
const cmd = getCommand(payload);
const tool = getToolName(payload);

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

// git -C 뒤의 ~ / $HOME: 셸이 실행 시점에 펼치는 표기라 Claude Code가 실행 전에 대상 폴더를 확정하지
// 못하고, 워크트리에 묶인 세션에서는 "다른 레포로 새는 것"과 구분이 안 돼 내장 격리 검사가 거부한다.
// 그 영어 메시지가 워크트리 얘기만 해서 원인이 경로 표기인 줄 모르고 "다른 레포는 못 건드린다"로 오독해
// 작업을 포기하게 된다(2026-09-06 실측). 바로 위 룰이 git -C로 보낸 자리에서 다시 걸리므로 함께 둔다.
// git 호출에만 건다 — ~를 명령 전역으로 막으면 멀쩡한 ls·node가 걸려 오탐이 쌓이고, 그러면 훅이 통째로 무시된다.
// 워크트리 여부는 판정하지 않는다 — 그 정보가 페이로드에 없고, 워크트리가 아니어도 절대 경로가 손해는 아니다.
const HOME_SHORTHAND = /^(?:~|\$HOME(?![A-Za-z0-9_])|\$\{HOME\})/;

// 글자 모양이 아니라 파싱된 git 호출의 -C 값을 본다. 인접 정규식으로 보면 전역 옵션이 앞에 끼거나
// (`git --no-pager -C ~/x`) 따옴표로 감싼 형태를 놓치고, 반대로 커밋 메시지 안의 인용문을 오탐한다.
function homeShorthandCwd(command) {
  for (const seg of splitSegments(command)) {
    const tokens = tokenize(seg);
    const gitAt = tokens.indexOf("git");
    if (gitAt === -1) continue;
    const parsed = parseGitInvocation(tokens, gitAt + 1);
    if (parsed?.cwd && HOME_SHORTHAND.test(parsed.cwd)) return parsed.cwd;
  }
  return null;
}

const shorthandCwd = homeShorthandCwd(cmd);
if (shorthandCwd) {
  deny(`git -C 경로에 ~ / $HOME 금지 — '${shorthandCwd}'를 '<홈 절대경로>/WebstormProjects/...'처럼 끝까지 적힌 절대 경로로 바꿔 같은 명령을 그대로 다시 실행하세요. 물결표는 셸이 실행할 때 펼치는 표기라 Claude Code가 실행 전에 대상 폴더를 확정하지 못합니다. 워크트리에 묶인 세션이면 내장 격리 검사도 같은 이유로 거부하는데, 사유는 '다른 레포라서'가 아니라 경로 표기입니다 — 포기하거나 사용자에게 넘기지 말고 경로만 바꿔 재시도하세요.`);
}

// 백그라운드 작업 대기용 빈 명령. 완료 알림은 푸시로 오므로 이런 콜은 아무것도 앞당기지 못하고
// 턴과 컨텍스트만 태운다(실측: 한 회차에 수십 턴). 명령 전체가 무작용일 때만 막는다.
if (/^\s*(echo\s+\S*|Write-Output\s+\S*|sleep\s+[\d.]+|Start-Sleep(\s+-\w+)?\s+[\d.]+|true|:)\s*$/.test(cmd)) {
  deny("대기용 빈 명령입니다. 백그라운드 작업은 끝나면 알림이 옵니다 — 도구를 부르지 말고 턴을 끝내세요. 조건이 충족될 때까지 꼭 기다려야 하면 Monitor나 Bash run_in_background + until 루프를 쓰세요.");
}

// PowerShell here-string(@'...'@ / @"..."@)을 Bash 툴에 쓰면 @가 리터럴로 남아
// 커밋 메시지 등에 눌러붙는다. bash 여러 줄 문자열은 -m 여러 번 또는 heredoc을 쓴다.
// PowerShell tool에서는 here-string이 정상 문법이므로 이 룰만 건너뛴다(위 두 룰은 공통).
if (tool !== "PowerShell" && /(?:^|\s)@['"]/.test(cmd)) {
  deny("PowerShell here-string(@'...'@) 문법을 Bash 툴에 썼습니다. bash에선 @가 리터럴로 남아 메시지 앞뒤에 붙습니다. 여러 줄이면 -m 'subject' -m 'body'로 나누거나 heredoc(<<'MSG' ... MSG)을 쓰세요.");
}
