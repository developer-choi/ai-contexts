// 삭제 명령(rm 계열·PowerShell Remove-Item 계열)이 ~/WebstormProjects 하위를
// 지우려 하면 권한 프롬프트(ask)를 띄운다. node_modules 등 빌드 산출물은 통과.
//
// 판정: 삭제 대상 인자를 cwd와 합쳐 절대경로로 만든 뒤(~ 확장 포함) WebstormProjects
// 하위인지 검사한다 → 상대경로·절대경로·틸드·백슬래시를 한 판정으로 커버.
// 대상이 전부 예외 폴더(어느 세그먼트든 EXEMPT_SEGMENTS)면 묻지 않는다.
import os from "node:os";
import path from "node:path";
import { ask, getCommand, getCwd, readPayload } from "./hook-utils.mjs";

const WS_ROOT = path.join(os.homedir(), "WebstormProjects");

// PowerShell Remove-Item 별칭(rm/del/erase/rd/ri/rmdir) + bash rm/rmdir/unlink.
const DELETE_VERBS = new Set(["rm", "rmdir", "unlink", "del", "erase", "rd", "ri", "remove-item"]);

const EXEMPT_SEGMENTS = new Set(["node_modules", "dist", "build", ".next", ".turbo", "out", "coverage"]);

const payload = readPayload();
const cmd = getCommand(payload);
const cwd = getCwd(payload) || process.cwd();

if (cmd && shouldAsk(cmd, cwd)) {
  ask(
    "~/WebstormProjects 하위를 삭제하려는 명령입니다. 의도한 삭제인지 확인하세요 " +
      "(node_modules·dist 등 빌드 산출물은 묻지 않고 통과합니다).",
  );
}
process.exit(0);

function shouldAsk(command, baseCwd) {
  // && || ; | 줄바꿈으로 끊어 각 단순 명령을 독립 검사한다.
  for (const segment of command.split(/&&|\|\||[;\n|]/)) {
    const tokens = tokenize(segment.trim());
    if (!tokens.length) continue;
    if (!DELETE_VERBS.has(verbKey(tokens[0]))) continue;

    let asksThisSegment = false;
    for (const raw of tokens.slice(1)) {
      if (raw.startsWith("-")) continue; // 플래그/스위치 (-rf, -Recurse, -Path ...)
      const target = resolveArg(raw, baseCwd);
      if (!target || !underWs(target)) continue; // WebstormProjects 밖 → 무관
      if (isExempt(target)) continue; // node_modules 등 → 묻지 않음
      asksThisSegment = true;
    }
    if (asksThisSegment) return true;
  }
  return false;
}

// 따옴표를 존중하며 공백으로 토큰 분해한다.
function tokenize(s) {
  const out = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m;
  while ((m = re.exec(s)) !== null) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

// 첫 토큰을 삭제 동사 키로 정규화한다 (경로·확장자·대소문자 제거).
function verbKey(token) {
  return path.basename(token).replace(/\.(exe|cmd|bat|ps1)$/i, "").toLowerCase();
}

function stripQuotes(s) {
  return s.replace(/^["']|["']$/g, "");
}

function resolveArg(raw, baseCwd) {
  let arg = stripQuotes(raw);
  if (!arg) return null;
  if (arg === "~" || arg.startsWith("~/") || arg.startsWith("~\\")) {
    arg = path.join(os.homedir(), arg.slice(1));
  }
  return path.resolve(baseCwd, arg);
}

function underWs(target) {
  const t = norm(target);
  const root = norm(WS_ROOT);
  return t === root || t.startsWith(root + path.sep);
}

function isExempt(target) {
  return norm(target)
    .split(path.sep)
    .some((seg) => EXEMPT_SEGMENTS.has(seg));
}

// win32는 대소문자 무시.
function norm(p) {
  const n = path.normalize(p);
  return process.platform === "win32" ? n.toLowerCase() : n;
}
