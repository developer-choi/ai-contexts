import os from "node:os";
import path from "node:path";

// 정책 훅이 공유하는 git 명령 파서.
//
// 명령 문자열을 정규식으로 인접 매칭하면 형태만 바꿔도 검사를 빠져나간다 —
// `git commit`은 잡히는데 `git -C <path> commit`은 안 잡히는 식이다. 감시 대상이
// "글자 모양"이 아니라 "실행되는 git 호출"이 되도록, 체인을 세그먼트로 쪼개고
// 토큰화한 뒤 전역 옵션(-C/-c/--git-dir 등)을 건너뛰고 서브커맨드를 찾는다.

// 명령 안의 git 호출 중 지정한 서브커맨드인 것들을 { args, cwd, moveCwd }로 돌려준다.
// cwd는 `git -C` 값, moveCwd는 그 호출 앞에서 폴더 이동으로 옮겨 간 폴더다(없으면 null) —
// 둘을 합친 실행 폴더는 invocationCwd가 정한다.
// 세그먼트당 첫 git 호출만 본다 — `git a | git b`처럼 한 세그먼트에 둘을 넣는
// 형태는 파이프로 이미 분리되므로 실사용에서 손실이 없다.
export function findGitInvocations(command, subcommand) {
  const out = [];
  const vars = new Map();
  const folder = { current: null, stack: [] };
  for (const seg of splitSegments(command)) {
    const tokens = tokenize(seg);
    if (recordAssignment(tokens, vars)) continue;
    trackFolder(tokens, folder);
    for (let i = 0; i < tokens.length; i += 1) {
      if (tokens[i] !== "git") continue;
      const parsed = parseGitInvocation(tokens, i + 1);
      if (parsed && parsed.subcommand === subcommand) {
        out.push({ args: parsed.args, cwd: parsed.cwd && expandVars(parsed.cwd, vars), moveCwd: folder.current });
      }
      break;
    }
  }
  return out;
}

// 원격 PR을 머지하는 gh 호출을 { repo }로 돌려준다. 원격 보호 브랜치를 바로 바꾸므로 훅은 이것을
// 로컬 merge가 아니라 push와 같이 친다. 잡는 형태:
//   gh pr merge …                               — repo는 `-R`/`--repo owner/name`의 name, PR을 URL로 주면
//                                                  그 URL의 name, 둘 다 없으면 null
//   gh api …/pulls/<n>/merge                    — repo는 `repos/owner/name/…`의 name, `{repo}` 자리표시면 null
//   gh api graphql … mergePullRequest …         — repo는 null
// repo가 null이면 훅이 작업 폴더로 레포를 정한다. moveCwd는 findGitInvocations와 같다.
export function findGhPrMerges(command) {
  const out = [];
  const folder = { current: null, stack: [] };
  for (const seg of splitSegments(command)) {
    const tokens = tokenize(seg);
    trackFolder(tokens, folder);
    const moveCwd = folder.current;
    const at = tokens.findIndex((t) => t === "gh" || t === "gh.exe");
    if (at < 0) continue;
    const args = tokens.slice(at + 1);
    const words = args.filter((t) => !t.startsWith("-"));
    if (words[0] === "pr" && words[1] === "merge") {
      const i = args.findIndex((t) => t === "-R" || t === "--repo");
      const inline = args.find((t) => t.startsWith("--repo="));
      const spec = inline ? inline.slice("--repo=".length) : i >= 0 ? args[i + 1] : null;
      // 사용자가 붙여 준 PR 링크를 그대로 넘기는 형태 — gh는 작업 폴더가 아니라 링크의 레포를 머지한다.
      const url = words[2] && words[2].match(/github\.com\/[^/]+\/([^/]+)\/pull\//);
      out.push({ repo: spec ? spec.split("/").pop() : url ? url[1] : null, moveCwd });
      continue;
    }
    if (words[0] !== "api") continue;
    const rest = args.slice(args.indexOf("api") + 1);
    const endpoint = rest.find((t) => /(?:^|\/)pulls\/[^/]+\/merge\/?$/.test(t));
    if (endpoint) {
      const m = endpoint.match(/(?:^|\/)repos\/[^/]+\/([^/]+)\/pulls\//);
      out.push({ repo: m && !/^\{.*\}$/.test(m[1]) ? m[1] : null, moveCwd });
      continue;
    }
    if (rest.some((t) => /mergePullRequest/.test(t))) out.push({ repo: null, moveCwd });
  }
  return out;
}

// 폴더를 옮기는 명령. 셸마다 이름이 달라 `cd`만 보면 `pushd <레포> && git push`·
// `Set-Location <레포>; git push`가 세션 폴더 기준으로 판정돼 등급 정책을 빠져나간다(2026-09-26 실측).
// PowerShell 명령·별칭은 대소문자를 가리지 않는다.
const FOLDER_SET = new Set(["cd", "chdir", "set-location", "sl"]);
const FOLDER_PUSH = new Set(["pushd", "push-location"]);
const FOLDER_POP = new Set(["popd", "pop-location"]);

// 옮겨 간 폴더를 글자로 정할 수 없을 때(`cd`·`cd -`·빈 스택의 `popd`) 쓰는 값. 실존하지 않는 경로라
// 등급 판정은 FREE로 새지 않고, 브랜치 조회는 실패해 막는 쪽으로 간다.
export const UNKNOWN_FOLDER = "<옮긴 폴더 미확인>";

// 명령에 폴더 이동이 하나라도 있는가.
export function hasFolderMove(command) {
  return splitSegments(command).some((seg) => folderMoveKind(tokenize(seg)) !== null);
}

// 명령에 git 호출이 하나라도 있는가. 세그먼트 안 어디든 `git` 토큰이면 센다 — findGitInvocations와 같은 기준이라
// 줄바꿈으로 나눈 명령과 PowerShell 호출 연산자(`& git`)도 잡는다.
export function hasGitCall(command) {
  return splitSegments(command).some((seg) => tokenize(seg).includes("git"));
}

function folderMoveKind(tokens) {
  const name = tokens[0]?.toLowerCase();
  if (FOLDER_SET.has(name)) return "set";
  if (FOLDER_PUSH.has(name)) return "push";
  if (FOLDER_POP.has(name)) return "pop";
  return null;
}

// 세그먼트를 앞에서부터 실행한다고 보고, 각 세그먼트가 도는 폴더를 따라간다. null은 옮기지 않았다(세션 폴더)는 뜻.
// 명령 전체에서 폴더 하나만 뽑으면 git 뒤의 `Set-Location <FREE 레포>`나 `pushd …; popd` 뒤의 git이
// 엉뚱한 폴더로 판정돼 FREE 면제를 탄다. 상대 경로는 앞 폴더에 이어 붙이고, 세션 폴더 기준 풀이는 훅이 한다.
function trackFolder(tokens, state) {
  const kind = folderMoveKind(tokens);
  if (kind === null) return;
  if (kind === "pop") {
    state.current = state.stack.length ? state.stack.pop() : UNKNOWN_FOLDER;
    return;
  }
  const target = tokens.slice(1).find((t) => !t.startsWith("-"));
  const next = !target ? UNKNOWN_FOLDER : joinFolder(state.current, target);
  if (kind === "push") state.stack.push(state.current);
  state.current = next;
}

function joinFolder(current, target) {
  const t = normalizeCwd(target);
  if (path.isAbsolute(t)) return t;
  if (current === UNKNOWN_FOLDER) return UNKNOWN_FOLDER;
  return current ? path.join(current, t) : t;
}

// 호출이 실제로 도는 폴더. `git -C`가 있으면 그것을(상대면 옮긴 폴더 기준), 없으면 옮긴 폴더를,
// 둘 다 없으면 null(세션 폴더)이다. 상대 경로는 세션 폴더 기준으로 푼다 — 셸이 거기서 출발한다.
export function invocationCwd(inv, sessionCwd) {
  const moved = inv.moveCwd == null ? null : resolveFrom(sessionCwd, inv.moveCwd);
  const dashC = normalizeCwd(inv.cwd);
  if (dashC) return moved && moved !== UNKNOWN_FOLDER && !path.isAbsolute(dashC) ? path.resolve(moved, dashC) : dashC;
  return moved;
}

function resolveFrom(base, folder) {
  if (folder === UNKNOWN_FOLDER || path.isAbsolute(folder) || !base) return folder;
  return path.resolve(base, folder);
}

// 훅은 셸 확장 전 원문을 받으므로 `P=<경로>; git -C $P ...`의 cwd가 글자 그대로 `$P`다.
// 같은 명령 안의 단순 대입만 기억해 두었다가 풀어 준다 — 경로를 못 정하면 등급 판정이 서지 않아
// FREE 레포도 보호 브랜치에서 막힌다. 값에 `$`·백틱이 섞인 대입(`$(...)` 등)은 기억하지 않아
// 원문으로 남고, 그 경우 판정은 예전처럼 "폴더를 못 정함" 쪽으로 간다.
// 세그먼트가 대입만으로 이뤄졌을 때만 기록한다 — `V=x cmd`는 cmd 한 번의 환경변수라 뒤로 이어지지 않는다.
function recordAssignment(tokens, vars) {
  const body = tokens[0] === "export" ? tokens.slice(1) : tokens;
  if (body.length === 0) return false;
  // PowerShell: `$P = 'path'` → ["$P", "=", "path"]
  if (body.length === 3 && body[1] === "=" && /^\$[A-Za-z_]\w*$/.test(body[0])) {
    return setVar(vars, body[0].slice(1), body[2]);
  }
  const pairs = body.map((t) => t.match(/^([A-Za-z_]\w*)=(.*)$/s));
  if (pairs.some((m) => !m)) return false;
  for (const [, name, value] of pairs) setVar(vars, name, value);
  return true;
}

function setVar(vars, name, value) {
  if (/[$`]/.test(value)) vars.delete(name);
  else vars.set(name, value);
  return true;
}

function expandVars(value, vars) {
  return value.replace(/\$\{([A-Za-z_]\w*)\}|\$([A-Za-z_]\w*)/g, (m, braced, bare) => vars.get(braced ?? bare) ?? m);
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
//
// PowerShell here-string(`@'...'@`)을 따옴표보다 먼저 본다. 여러 줄 커밋 메시지는 이 형태로
// 들어오는데, 모르고 공백 분리하면 `@'`가 `-m`의 값으로 먹히고 메시지 본문 단어들이 파일
// 경로(positional)로 세어진다 — "경로를 지정했는가" 판정이 뒤집혀 경로 없는 커밋이 통과한다.
// 실측(2026-08-09): 같은 커밋을 한 줄 메시지로는 막고 여러 줄 here-string으로는 통과시켰다.
//
// 붙어 있는 조각들은 셸과 같이 한 토큰으로 이어 붙인다(`-m"여러 단어"` → `-m여러 단어`).
// 조각마다 토큰을 끊으면 옵션에 값을 붙여 쓴 형태에서 값의 단어들이 파일 경로로 세어져
// "경로를 지정했는가" 판정이 뒤집힌다 — 위 here-string 사고와 같은 구멍이다.
export function tokenize(value) {
  const tokens = [];
  // 마지막 대안은 따옴표를 뺀 조각이다. 짝이 맞는 따옴표는 앞 대안이 먼저 먹으므로,
  // 여기 남는 홑따옴표는 짝 없는 것(`don't`)이고 글자 그대로 이어 붙인다.
  const pattern = /@'([\s\S]*?)'@|@"([\s\S]*?)"@|"([^"]*)"|'([^']*)'|[^\s'"]+|['"]/g;
  let match;
  let buf = null;
  let end = -1;
  while ((match = pattern.exec(value))) {
    // 빈 문자열도 값이므로 truthy 판정이 아니라 "매치된 그룹"으로 고른다(`-m ""`).
    const piece = match.slice(1).find((group) => group !== undefined) ?? match[0];
    if (buf !== null && match.index === end) buf += piece;
    else {
      if (buf !== null) tokens.push(buf);
      buf = piece;
    }
    end = pattern.lastIndex;
  }
  if (buf !== null) tokens.push(buf);
  return tokens;
}

// `git commit`의 짧은 옵션 중 값을 먹는 것들. 묶음(`-sF-`)을 읽을 때 여기서 멈춘다.
// 출처: git-commit(1) OPTIONS — `-c`/`-C`/`-F`/`-m`/`-t`/`-U<n>`은 값 필수, `-u[<mode>]`·`-S[<key-id>]`는 선택.
const COMMIT_SHORT_VALUED = new Set(["c", "C", "F", "m", "t", "u", "S", "U"]);

// 짧은 옵션 토큰에서 "옵션으로 유효한 글자들"을 뽑는다. git은 짧은 옵션에 값을 붙여 쓰는 것도
// (`-F-`, `-m'msg'`), 다른 짧은 옵션과 묶는 것도(`-sF-`) 허용하므로, 토큰을 정확 일치로만 보면
// 이 형태들이 검사를 통째로 빠져나간다. 값을 먹는 글자를 만나면 그 뒤는 값이라 멈춘다 —
// `-uno`(--untracked-files=no)의 'n'이나 `-Sm`(키 이름 m)을 옵션으로 오독하지 않기 위함이다.
export function commitShortFlagChars(token) {
  if (!/^-[^-]/.test(token)) return [];
  const chars = [];
  for (const ch of token.slice(1)) {
    if (!/[a-zA-Z]/.test(ch)) break;
    chars.push(ch);
    if (COMMIT_SHORT_VALUED.has(ch)) break;
  }
  return chars;
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
