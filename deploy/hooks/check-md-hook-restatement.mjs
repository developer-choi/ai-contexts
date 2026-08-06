// 프롬프트·스킬 md에 커밋·staging·push 같은 규약을 새로 쓰려 하면, 전역 훅이 이미 막고 있는
// 목록을 그 자리에서 보여준다 (차단하지 않는다).
//
// 훅이 이미 결정론적으로 잡는 것을 산문이 다시 적으면 두 곳이 어긋나고, 훅이 바뀔 때 문서만
// 조용히 낡는다 (scw specialized/lean-prompt.md 「도구가 강제하는 규약은 재기술도 언급도 하지
// 않는다」).
//
// 실측 사고 (2026-08-06, PP 벤치 3회): 워커가 lean-prompt 체크리스트를 로드해 판정 질문까지
// 대입했는데, 확인한 강제 표면이 레포 안 commitlint·husky뿐이었다. 전역 훅은 찾아보지 않아
// "강제하는 도구가 없다"로 결론내고 "리포트 파일 하나만 커밋한다"(= check-git-staging-policy가
// 이미 막는 것)를 3회 모두 적었다. 즉 판단력이 아니라 확인 범위가 구멍이었다.
//
// 차단이 아니라 알림인 이유: 이 md들은 훅이 막는 명령을 금지 예시로 인용하는 자리이기도 하다
// (lean-prompt.md 자신이 `git add .`를 before 사례로 싣는다). 차단하면 그 정상 문서가 막힌다.
//
// 막는 목록을 이 파일에 적어두지 않고 매번 훅 소스에서 읽는 이유: 적어두면 사본이 되어 다른
// 훅이 바뀔 때 여기만 낡는다 (rules-as-code.md 「정본이 코드에 있으면 산문은 옮겨 적지 않는다」).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { addContext, getToolName, readPayload } from "./hook-utils.mjs";

const EDIT_TOOLS = new Set(["Edit", "Write"]);

// 검사에서 통째로 빼는 레포. 남이 읽지 않는 개인 메모라 규약을 적어둬도 손해가 적다.
const SKIP_REPOS = new Set(["backlog"]);

// 전역 훅이 다루는 주제. 이 말이 새 문장에 없으면 재기술일 수 없으므로 조용히 넘어간다.
const TOPICS =
  /커밋|commit|staging|스테이징|git add|푸시|push|머지|merge|rebase|리베이스|no-verify|reset|rm -rf|npx/i;

// 거부 사유 중 명령 사용 규약만 보여준다. 같은 폴더엔 문서 내용·팀 메시지를 보는 훅도 있는데,
// 그것까지 실으면 알림이 길어지기만 한다. 이름으로 고르면 훅이 늘 때마다 여기를 고쳐야 하므로
// 메시지 자체에 명령 이야기가 있는지로 가른다.
const COMMAND_RULE = new RegExp(`${TOPICS.source}|git |bash`, "i");

const payload = readPayload();
if (!EDIT_TOOLS.has(getToolName(payload))) process.exit(0);

const input = payload.tool_input ?? {};
const filePath = typeof input.file_path === "string" ? input.file_path : "";
if (!filePath || path.extname(filePath).toLowerCase() !== ".md") process.exit(0);
if (!isPromptDoc(filePath)) process.exit(0);
if (SKIP_REPOS.has(repoName(filePath))) process.exit(0);

const written = typeof input.content === "string" ? input.content : typeof input.new_string === "string" ? input.new_string : "";
if (!TOPICS.test(prose(written))) process.exit(0);

const enforced = collectDenyMessages();
if (!enforced.length) process.exit(0);

addContext(
  [
    `[이미 막히는 규약] ${path.basename(filePath)} 에 커밋·staging·push 규약을 쓰려 한다.`,
    `아래는 전역 훅이 지금 결정론적으로 거부하는 것들이다. 훅 소스에서 방금 읽었다.`,
    ``,
    ...enforced.map((m) => `- ${m}`),
    ``,
    `쓰려는 문장 하나하나에 물어본다: 이 문장을 지우면 위반이 그냥 통과되는가.`,
    `- 훅이 여전히 막는다 → 지운다. "따르라"는 한 줄도 남기지 않는다 — 훅이 이미 거부한다.`,
    `- 아무도 안 막는다 (톤·판단·재현 조건 등) → 남긴다. 이건 과잉 검출 대상이 아니다.`,
    ``,
    `레포 안에 commitlint·husky가 없다는 것은 근거가 되지 않는다. 위 목록이 레포와 무관하게 걸린다.`,
    `금지 예시로 인용하는 자리라면 그대로 두고 넘어간다.`,
  ].join("\n"),
  "PreToolUse",
);

// 프롬프트·스킬 문서만 본다. 일반 문서까지 걸면 커밋 이야기가 나올 때마다 떠서 소음이 된다.
function isPromptDoc(file) {
  const posix = file.replace(/\\/g, "/");
  if (/\/(skills|rules|contexts)\//.test(posix)) return true;
  return /^(CLAUDE|AGENTS|GEMINI)\.md$/i.test(path.basename(posix));
}

// 위로 올라가며 `.git`을 만나는 첫 폴더가 그 파일의 레포다.
function repoName(file) {
  let dir = path.dirname(path.resolve(file));
  for (;;) {
    if (fs.existsSync(path.join(dir, ".git"))) return path.basename(dir);
    const up = path.dirname(dir);
    if (up === dir) return "";
    dir = up;
  }
}

// 코드블록·인라인코드는 걷어낸 뒤 본다. 금지 예시로 명령어를 인용하는 자리가 많아, 안 걷어내면
// 인용만 있는 편집에도 뜬다.
function prose(src) {
  return src
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/`[^`\n]*`/g, " ");
}

// 같은 폴더의 다른 정책 훅에서 거부 사유를 읽어온다. 사본을 두지 않으려는 것이므로, 못 읽으면
// 그 파일은 조용히 건너뛴다 — 알림 하나가 짧아질 뿐이다.
function collectDenyMessages() {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const self = path.basename(fileURLToPath(import.meta.url));
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.startsWith("check-") || !name.endsWith(".mjs") || name === self) continue;
    let src;
    try {
      src = fs.readFileSync(path.join(dir, name), "utf8");
    } catch {
      continue;
    }
    for (const msg of denyMessages(src)) out.push(`${msg} (${name})`);
  }
  return out;
}

// `deny(...)` 인자에서 문자열 리터럴만 뽑는다. 상수로 뺀 메시지(`deny(MERGE_MSG)`)는 그 상수
// 선언을 찾아 잇는다. 문장 단위로 자르지 않는다 — 메시지에 `git add .`처럼 마침표가 들어 있어
// 첫 마침표에서 끊으면 정작 중요한 뒷부분이 날아간다.
function denyMessages(src) {
  const code = src.replace(/^\s*\/\/.*$/gm, " ");
  const found = [];
  for (const [, arg] of code.matchAll(/\bdeny\(([\s\S]*?)\)\s*;/g)) {
    const literal = joinLiterals(arg) || joinLiterals(constValue(code, arg.trim()));
    // 값이 런타임에 채워지는 자리를 걷어내면 구두점이 겹치거나 껍데기만 남는 것들이 있다.
    // 짧으면 규칙이 아니라 파싱 부스러기이므로 버린다.
    // 겹친 마침표만 합친다. 붙어 있는 `...`은 건드리지 않는다 — 그대로 인용문의 일부다.
    const flat = literal.replace(/\s+/g, " ").replace(/\.\s+\./g, ".").trim();
    if (flat.length < 12 || !COMMAND_RULE.test(flat)) continue;
    const shown = flat.length > 160 ? `${flat.slice(0, 160)}…` : flat;
    if (!found.includes(shown)) found.push(shown);
  }
  return found;
}

// 큰따옴표·작은따옴표·백틱을 모두 본다. 템플릿의 `${...}` 자리는 런타임 값이라 먼저 걷어낸다 —
// 안에 중첩된 따옴표가 남으면 그 조각이 메시지인 양 딸려 나온다.
function joinLiterals(text) {
  if (!text) return "";
  const filled = text.replace(/\$\{[^{}]*\}/g, "");
  return [...filled.matchAll(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)]
    .map(([, d, s, t]) => (d ?? s ?? t ?? "").replace(/\\(.)/g, "$1"))
    .join("");
}

function constValue(code, identifier) {
  if (!/^[A-Za-z_$][\w$]*$/.test(identifier)) return "";
  const m = code.match(new RegExp(`\\bconst\\s+${identifier}\\s*=([\\s\\S]*?);`));
  return m ? m[1] : "";
}
