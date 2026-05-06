// git push 제어 hook
// 1. master/main/develop/release 브랜치: push 무조건 차단
// 2. 열린 PR이 있으면: AI 푸시 무조건 차단 (사용자가 직접 푸시)
// 3. 그 외 브랜치 force push: origin과 코드가 동일할 때만 허용

const { execSync } = require("child_process");

const j = JSON.parse(require("fs").readFileSync(0, "utf8"));
const cmd = j.tool_input.command;

if (!/\bgit\s+push\b/.test(cmd)) process.exit(0);

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

// command에서 cd 경로 파싱 (hook은 cd 실행 전에 돌기 때문)
const cdMatch = cmd.match(/cd\s+(\S+)/);
const gitOpts = cdMatch ? { encoding: "utf8", cwd: cdMatch[1] } : { encoding: "utf8" };
const gitOptsQuiet = { ...gitOpts, stdio: "pipe" };

// 현재 브랜치 (cd 대상 디렉토리 기준)
const branch = execSync("git rev-parse --abbrev-ref HEAD", gitOpts).trim();

// push 대상 브랜치 파악 (명시적 지정 또는 현재 브랜치)
const explicitTarget = cmd.match(
  /git\s+push\s+(?:--\S+\s+)*\S+\s+([\w\-/.]+)/,
);
const targetBranch = explicitTarget ? explicitTarget[1] : branch;

// 1. 보호 브랜치 차단
const protectedBranches = /^(master|main|develop|release)$/;
if (protectedBranches.test(targetBranch)) {
  deny(`${targetBranch} 브랜치에 push 금지.`);
}

// 2. 열린 PR이 있으면 푸시 전체 차단 (사용자가 직접 푸시)
try {
  const prState = execSync(
    `gh pr view ${targetBranch} --json state -q .state`,
    gitOptsQuiet,
  )
    .toString()
    .trim();
  if (prState === "OPEN") {
    deny(
      `${targetBranch} 브랜치에 열린 PR이 있습니다. AI는 푸시하지 않습니다 — 사용자가 직접 푸시하세요.`,
    );
  }
} catch {
  // PR 없음 또는 gh 미설치 → 통과
}

// 3. force push 시 코드 동일 여부 확인
if (/--force\b|--force-with-lease\b/.test(cmd)) {
  try {
    execSync(`git fetch origin ${branch}`, gitOptsQuiet);
  } catch {
    // origin에 브랜치가 없으면 (새 브랜치) force push 허용
    process.exit(0);
  }

  try {
    execSync(`git diff origin/${branch} HEAD --quiet`, gitOptsQuiet);
    // 코드 동일 → 히스토리 정리만이므로 허용
  } catch {
    deny(
      `force push 차단: origin/${branch}과 코드가 다릅니다. 히스토리 정리(squash, reword)만 허용됩니다.`,
    );
  }
}
