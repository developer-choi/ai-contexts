// AC 백로그 커밋 규칙을 hook으로 내린다(부탁→강제).
//   1) 한 커밋(또는 git add)에 backlog/·archives/·그 외 중 서로 다른 종류를
//      섞으면 deny. 셋은 서로 다른 커밋 종류다(백로그 vs 종결자료 vs master).
//   2) backlog/·archives/ 변경을 backlog 브랜치가 아닌 곳에서 커밋하면 deny
//      (둘 다 ai-contexts-backlog 워크트리=backlog 브랜치 전용 폴더다.
//       backlog 브랜치 = master HEAD + backlog/ + archives/).
//
// AC 레포에서만 적용한다. 다른 레포의 backlog/·archives/ 디렉토리는 이 규칙과
// 무관하므로, git common-dir의 부모가 'ai-contexts'(=AC 워크트리 공유 .git)일 때만 발동한다.
//
// 전제: git add . / -A 금지 + bare git commit 금지(다른 hook)라 경로가 항상 명령에
// 명시된다 → 인덱스 조회 없이 명령 문자열로 혼합을 판정한다. 관리 대상(backlog/·
// archives/) 경로가 하나도 없으면 git 조회 없이 통과(흔한 경우 비용 0).
const { execFileSync } = require("child_process");
const path = require("path");
const { deny, getCommand, getCwd, readPayload } = require("./hook-utils");

const AC_DIR_NAME = "ai-contexts"; // git common-dir의 부모 디렉토리명 = AC 식별자
const BACKLOG_BRANCH = "backlog";
// backlog 브랜치 전용 1급 폴더들 → 카테고리명. 이 외 경로는 "other"(master).
const MANAGED_PREFIXES = { "backlog/": "backlog", "archives/": "archives" };

const payload = readPayload();
const cmd = getCommand(payload);
const cwd = getCwd(payload) || process.cwd();

if (cmd) check(cmd, cwd);
process.exit(0);

function check(command, baseCwd) {
  // 메시지 내부 newline·&&·; 영향을 피하려 commit은 -m 이전 경로만 본다(아래 stagedPaths).
  for (const segment of command.split(/&&|\|\||[;\n]/)) {
    const paths = stagedPaths(segment.trim());
    if (!paths.length) continue;

    const cats = new Set();
    for (const p of paths) cats.add(categorize(p));

    const managed = cats.has("backlog") || cats.has("archives");
    if (!managed) continue; // 관리 대상 무관 → 통과(git 조회 안 함)

    const info = gitInfo(baseCwd);
    if (!info || info.acName !== AC_DIR_NAME) continue; // 비-AC 레포 → 무관

    if (cats.size > 1) {
      deny(
        "한 커밋(또는 git add)에 backlog/·archives/·그 외 중 서로 다른 종류를 " +
          "섞을 수 없습니다 (AC 백로그 규칙). 종류별로 분리해 커밋하세요.",
      );
    }
    if (info.branch !== BACKLOG_BRANCH) {
      const kind = cats.has("backlog") ? "backlog/" : "archives/";
      deny(
        `${kind} 변경은 ${BACKLOG_BRANCH} 브랜치(ai-contexts-backlog 워크트리)에서 ` +
          `커밋하세요. 현재 브랜치: ${info.branch}.`,
      );
    }
  }
}

// git add / git commit 세그먼트에서 경로 인수만 추출한다.
// commit은 -m/--message에서 멈춰 메시지(heredoc·따옴표 본문)를 경로로 오인하지 않는다.
function stagedPaths(segment) {
  const tokens = tokenize(segment);
  if (tokens.length < 2 || verbKey(tokens[0]) !== "git") return [];
  const sub = tokens[1];
  if (sub !== "add" && sub !== "commit") return [];

  const out = [];
  for (let i = 2; i < tokens.length; i++) {
    const t = tokens[i];
    if (sub === "commit" && (t === "-m" || t === "--message")) break;
    if (t === "--") continue; // 경로 구분자
    if (t.startsWith("-")) continue; // 플래그
    out.push(t);
  }
  return out;
}

// 경로를 backlog / archives / other 중 하나로 분류한다.
function categorize(arg) {
  const a = stripQuotes(arg).replace(/\\/g, "/").replace(/^\.\//, "");
  for (const [prefix, cat] of Object.entries(MANAGED_PREFIXES)) {
    const dir = prefix.slice(0, -1); // "backlog/" → "backlog"
    if (a === dir || a.startsWith(prefix)) return cat;
  }
  return "other";
}

function gitInfo(baseCwd) {
  try {
    const out = execFileSync("git", ["-C", baseCwd, "rev-parse", "--abbrev-ref", "HEAD", "--git-common-dir"], {
      encoding: "utf8",
    });
    const [branch, commonDir] = out.split(/\r?\n/);
    if (!branch || !commonDir) return null;
    const acName = path.basename(path.dirname(path.resolve(baseCwd, commonDir)));
    return { branch: branch.trim(), acName };
  } catch {
    return null;
  }
}

// 따옴표를 존중하며 공백으로 토큰 분해한다.
function tokenize(s) {
  const out = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m;
  while ((m = re.exec(s)) !== null) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

function verbKey(token) {
  return path.basename(token).replace(/\.(exe|cmd|bat|ps1)$/i, "").toLowerCase();
}

function stripQuotes(s) {
  return s.replace(/^["']|["']$/g, "");
}
