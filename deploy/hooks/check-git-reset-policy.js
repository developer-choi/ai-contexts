const { deny, getCommand, readPayload } = require("./hook-utils");

// git reset --hard / --mixed 금지. --soft만 허용한다. AI는 무조건 차단하고, 정말 필요하면
// 사용자가 직접 실행한다 (hook은 AI 도구 호출만 게이트하므로 사용자 터미널 명령엔 영향 없음).
// 두 플래그의 사유는 다르다:
//   --hard  → 워킹 디렉터리 미커밋 변경 + reset으로 건너뛴 미푸시 커밋을 되돌릴 수 없게 지움 (파괴적).
//   --mixed → 유실은 아니지만 staged 변경을 모두 unstage. --soft만 허용하는 이유.
// 이 훅이 reset 정책의 단일 창구다 (git -C·chain까지 파싱). 거친 정규식 차단은 두지 않는다 —
// check-shell-policy.js에 같은 차단을 또 두면 한 명령에 deny 메시지가 두 번 뜬다.
// git 상태와 무관한 정적 패턴 매칭이라 PreToolUse 타이밍 갭이 없다.
const cmd = getCommand(readPayload());
if (typeof cmd !== "string" || !/\breset\b/.test(cmd)) process.exit(0);

const resets = findGitInvocations(cmd, "reset");
const hard = resets.some((inv) => inv.args.includes("--hard"));
const mixed = resets.some((inv) => inv.args.includes("--mixed"));

if (hard || mixed) {
  const used = [hard && "--hard", mixed && "--mixed"].filter(Boolean).join(" / ");
  const reasons = [];
  if (hard) reasons.push("--hard는 워킹 디렉터리의 미커밋 변경과 reset으로 건너뛴 미푸시 커밋을 되돌릴 수 없게 지웁니다");
  if (mixed) reasons.push("--mixed는 staged 변경을 모두 unstage합니다");
  deny(
    `git reset ${used} 금지, --soft만 사용하세요. ${reasons.join(". ")}. ` +
      "정말 필요하면 사용자에게 직접 실행을 요청하세요.",
  );
}

process.exit(0);

// --- parsing helpers (check-git-push-policy.js와 동일 — 세그먼트/토큰 분해로 chain·git -C 처리) ---
function findGitInvocations(command, subcommand) {
  const out = [];
  for (const seg of splitSegments(command)) {
    const tokens = tokenize(seg);
    for (let i = 0; i < tokens.length; i += 1) {
      if (tokens[i] !== "git") continue;
      const parsed = parseGitInvocation(tokens, i + 1);
      if (parsed && parsed.subcommand === subcommand) out.push({ args: parsed.args, cwd: parsed.cwd });
      break;
    }
  }
  return out;
}

function parseGitInvocation(tokens, startIdx) {
  let i = startIdx;
  let cwd = null;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === undefined) {
      i += 1;
      continue;
    }
    if (t === "-C") {
      if (tokens[i + 1]) cwd = tokens[i + 1];
      i += 2;
      continue;
    }
    if (t === "-c") {
      i += 2;
      continue;
    }
    if (t === "--git-dir" || t === "--work-tree" || t === "--namespace" || t === "--super-prefix" || t === "--exec-path") {
      i += 2;
      continue;
    }
    if (t.startsWith("--") && t.includes("=")) {
      i += 1;
      continue;
    }
    if (t.startsWith("-")) {
      i += 1;
      continue;
    }
    return { subcommand: t, args: tokens.slice(i + 1), cwd };
  }
  return null;
}

function splitSegments(command) {
  const out = [];
  let buf = "";
  let quote = null;
  let i = 0;
  while (i < command.length) {
    const c = command[i];
    if (quote) {
      if (c === quote) quote = null;
      buf += c;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      buf += c;
      i += 1;
      continue;
    }
    if (c === ";" || c === "\n") {
      out.push(buf);
      buf = "";
      i += 1;
      continue;
    }
    if ((c === "&" && command[i + 1] === "&") || (c === "|" && command[i + 1] === "|")) {
      out.push(buf);
      buf = "";
      i += 2;
      continue;
    }
    if (c === "|") {
      out.push(buf);
      buf = "";
      i += 1;
      continue;
    }
    buf += c;
    i += 1;
  }
  if (buf) out.push(buf);
  return out;
}

function tokenize(value) {
  const tokens = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = pattern.exec(value))) {
    tokens.push(match[1] || match[2] || match[3]);
  }
  return tokens;
}
