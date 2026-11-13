// AC 스크립트(.mjs·.mts)를 Edit·Write한 직후 `tsc -p <AC 루트>`를 돌려, 타입 오류가 있으면 exit 2로 AI에게 돌려준다.
//
// AI가 데이터 꼴(prs.json 단계 값·필드 이름)이나 Node API를 잘못 써도 실행해 보기 전까지 아무 오류가 없었다.
// 실행 시점이 아니라 고친 그 자리에서 알리려고 편집 직후 돈다. PostToolUse라 편집은 이미 들어갔다 —
// exit 2는 막는 게 아니라 stderr를 AI에게 보이는 길이다.
//
// 검사 범위는 AC 루트 tsconfig.json이 정한다(`.mts`와 `// @ts-check`를 단 `.mjs`). 출력을 고친 파일로 거르지 않는다 —
// 공통 타입(types/)이나 함수 시그니처를 바꿔 다른 파일(호출부)이 깨진 오류도 이 편집이 만든 것이다.
// 파일 경로를 tsc에 넘기지 않는다 — 넘기면 tsconfig를 말없이 무시하고 기본 옵션으로 검사한다(5.9.3).
//
// 전역 hook이라 모든 레포의 편집에 불린다. 고친 파일이 든 레포가 AC(package.json name)이고 tsconfig·tsc가 있을 때만 돈다 —
// AC 워크트리는 폴더 이름이 달라 이름으로 가리지 않는다. 다른 레포 세션이 AC 워크트리를 고칠 때도 돌아야 해서
// AC 로컬 hook(local/)이 아니라 여기 둔다.
// codex는 PostToolUse를 '*'로 통합하므로 tool_name으로 스스로 거른다.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { getToolName, readPayload } from "./hook-utils.mjs";

const EDIT_TOOLS = new Set(["Edit", "Write"]);
const AC_PACKAGE_NAME = "ai-contexts";
// 오류가 많으면 앞부분만 돌려준다 — 전부 실으면 AI 맥락만 채운다. 나머지는 개수로 알린다.
const MAX_LINES = 30;

// 위로 올라가며 `.git`(워크트리는 파일)을 만나는 첫 폴더가 그 파일의 레포 루트다.
function repoRootOf(file) {
  let dir = path.dirname(path.resolve(file));
  for (;;) {
    if (fs.existsSync(path.join(dir, ".git"))) return dir;
    const up = path.dirname(dir);
    if (up === dir) return "";
    dir = up;
  }
}

function isAcRoot(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).name === AC_PACKAGE_NAME;
  } catch {
    return false;
  }
}

const payload = readPayload();
const file = payload?.tool_input?.file_path;
if (!EDIT_TOOLS.has(getToolName(payload)) || typeof file !== "string" || !/\.m[jt]s$/i.test(file)) process.exit(0);

const root = repoRootOf(file);
const tsc = path.join(root, "node_modules", "typescript", "bin", "tsc");
if (!root || !isAcRoot(root) || !fs.existsSync(path.join(root, "tsconfig.json")) || !fs.existsSync(tsc)) process.exit(0);

const run = spawnSync(process.execPath, [tsc, "-p", root], { cwd: root, encoding: "utf8", timeout: 60000 });
if (run.status === 0) process.exit(0);
// 시간 초과·실행 실패는 타입 오류가 아니다 — 편집 흐름을 끊지 않는다.
if (run.status === null || run.error) process.exit(0);

const errors = `${run.stdout}${run.stderr}`.split(/\r?\n/).filter((line) => line.trim());
const shown = errors.slice(0, MAX_LINES);
const more = errors.length > MAX_LINES ? [`… 외 ${errors.length - MAX_LINES}줄`] : [];
process.stderr.write(
  [`타입 검사(tsc -p ${root.replace(/\\/g, "/")})에 오류가 있다. 이 편집이 만든 오류면 지금 고친다:`, ...shown, ...more].join("\n") + "\n",
);
process.exit(2);
