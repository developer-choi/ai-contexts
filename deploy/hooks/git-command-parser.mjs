import os from "node:os";
import path from "node:path";

// 정책 훅이 공유하는 git 명령 파서.
//
// 명령 문자열을 정규식으로 인접 매칭하면 형태만 바꿔도 검사를 빠져나간다 —
// `git commit`은 잡히는데 `git -C <path> commit`은 안 잡히는 식이다. 감시 대상이
// "글자 모양"이 아니라 "실행되는 git 호출"이 되도록, 체인을 세그먼트로 쪼개고
// 토큰화한 뒤 전역 옵션(-C/-c/--git-dir 등)을 건너뛰고 서브커맨드를 찾는다.

// 명령 안의 git 호출 중 지정한 서브커맨드인 것들을 { args, cwd }로 돌려준다.
// 세그먼트당 첫 git 호출만 본다 — `git a | git b`처럼 한 세그먼트에 둘을 넣는
// 형태는 파이프로 이미 분리되므로 실사용에서 손실이 없다.
export function findGitInvocations(command, subcommand) {
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

// git 토큰 다음 위치부터 전역 옵션을 흘려보내고 { subcommand, args, cwd }를 만든다.
// -C는 값이 곧 실행 디렉터리라 따로 담는다(훅이 그 위치에서 git 상태를 조회한다).
export function parseGitInvocation(tokens, startIdx) {
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

// 명령 chain을 세그먼트로 분리한다. 따옴표 안의 구분자(커밋 메시지 등)는 무시한다.
export function splitSegments(command) {
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

// 공백 분리하되 따옴표로 묶인 덩어리는 한 토큰으로 유지하고 따옴표는 벗긴다.
// 덕분에 커밋 메시지가 통째로 한 토큰이 되어 메시지 내용이 옵션으로 오인되지 않는다.
export function tokenize(value) {
  const tokens = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = pattern.exec(value))) {
    tokens.push(match[1] || match[2] || match[3]);
  }
  return tokens;
}

// `git commit`에서 다음 토큰을 값으로 먹는 플래그들(`=`로 붙이는 형태는 자체로 한 토큰이라 불필요).
// 값을 옵션으로 오인하면 `git commit -m "-a 관련 수정"` 같은 메시지가 정책 위반으로 오탐된다.
export const COMMIT_VALUED_FLAGS = new Set([
  "-m", "--message", "-F", "--file", "-c", "-C", "--reuse-message", "--reedit-message",
  "--author", "--date", "--fixup", "--squash", "--cleanup", "--gpg-sign", "-S",
  "--pathspec-from-file", "--trailer",
]);

// 셸 리다이렉션 토큰과 그 대상을 인자에서 걷어낸다.
// tokenize는 셸 문법을 모르므로 `<<'MSG'`(heredoc 시작)나 `> out.txt`가 그대로 남고,
// partitionArgs가 이를 파일 경로(positional)로 센다. "경로를 지정했는가" 판정이
// heredoc 표식 하나로 뒤집히므로(`git commit -F - <<'MSG'`가 경로 지정으로 보임)
// 경로를 세기 전에 반드시 통과시킨다.
const REDIRECT_RE = /^(\d*|&)(>>?|<<?-?|>&|<&)/;
export function stripRedirections(args) {
  const out = [];
  for (let i = 0; i < args.length; i += 1) {
    const t = args[i];
    const m = t.match(REDIRECT_RE);
    if (!m) {
      out.push(t);
      continue;
    }
    // 연산자만 있는 토큰(`>`)이면 다음 토큰이 대상 파일이라 함께 버린다.
    // 대상이 붙어 있으면(`>out.txt`·`<<'MSG'`·`2>&1`) 그 토큰만 버린다.
    if (t.length === m[0].length) i += 1;
  }
  return out;
}

// 서브커맨드 인자를 옵션과 positional(주로 파일 경로)로 가른다.
// `--` 이후는 전부 positional로 본다(git 규약).
export function partitionArgs(args, valuedFlags = new Set()) {
  const options = [];
  const positionals = [];
  let pathsOnly = false;
  for (let i = 0; i < args.length; i += 1) {
    const t = args[i];
    if (pathsOnly) {
      positionals.push(t);
      continue;
    }
    if (t === "--") {
      pathsOnly = true;
      continue;
    }
    if (t.startsWith("-")) {
      options.push(t);
      if (valuedFlags.has(t)) i += 1;
      continue;
    }
    positionals.push(t);
  }
  return { options, positionals };
}

// 훅이 execSync에 넘길 cwd로 정규화한다. 실패하면 훅이 git 상태를 못 읽어
// 검증이 통째로 우회되므로, 실사용 표기 세 가지를 모두 흡수한다.
export function normalizeCwd(value) {
  if (!value) return null;
  let c = value;
  // child_process는 ~를 expand하지 않음. 미해석 cwd면 spawnSync가 ENOENT throw → catch 없으면 hook 우회됨.
  if (c.startsWith("~")) c = c.replace(/^~(?=$|[/\\])/, os.homedir());
  // Windows에서 MSYS/Git Bash 경로(/c/foo) → C:\foo. path.normalize가 /c/를 \c\로 잘못 변환해 spawnSync ENOENT.
  if (process.platform === "win32") {
    const msys = c.match(/^\/([a-zA-Z])(\/|$)/);
    if (msys) c = `${msys[1].toUpperCase()}:\\${c.slice(3).replace(/\//g, "\\")}`;
  }
  // tilde expand 결과가 백슬래시(homedir)+슬래시(상대) mix면 gh CLI가 cwd를 git repo로 인식 못 해 OPEN PR deny가 우회됨.
  return path.normalize(c);
}
