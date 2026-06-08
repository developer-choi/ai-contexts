const fs = require("fs");
const os = require("os");
const path = require("path");
const { readPayload, getCwd, addContext } = require("./hook-utils");

// 백로그는 master가 아니라 ai-contexts-backlog 워크트리(backlog 브랜치)에 있다.
// 워크트리가 없는 기기에서는 조용히 no-op 한다.
const BACKLOG_ROOT = path.join(
  os.homedir(),
  "WebstormProjects",
  "main",
  "ai-contexts-backlog",
  "backlog",
);

// cwd: .../WebstormProjects/<group>/<project>/... → <project>
function projectFromCwd(cwd) {
  const segs = String(cwd).replace(/\\/g, "/").split("/").filter(Boolean);
  const i = segs.findIndex((s) => s.toLowerCase() === "webstormprojects");
  return i >= 0 && segs.length > i + 2 ? segs[i + 2] : "";
}

function hasMarkdown(dir) {
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch (_e) {
      continue;
    }
    for (const e of entries) {
      if (e.isDirectory()) stack.push(path.join(d, e.name));
      else if (e.isFile() && e.name.endsWith(".md")) return true;
    }
  }
  return false;
}

try {
  const payload = readPayload();
  const project = projectFromCwd(getCwd(payload));
  if (!project) process.exit(0);

  // cwd 프로젝트 → 백로그 폴더. AC 본체는 this/, 그 외는 projects/<project>/.
  const rel = project === "ai-contexts" ? "this" : path.join("projects", project);
  const folder = path.join(BACKLOG_ROOT, rel);
  if (!fs.existsSync(folder) || !hasMarkdown(folder)) process.exit(0);

  // 매 턴 주입한다. 세션당 1회로 묶으면 첫 프롬프트가 무관할 때 단 한 번의 리마인드를
  // 거기 태워버려, 이후 관련 작업이 와도 영구 누락된다 — 누락 0이 노이즈보다 중요하다.
  // 매 턴 주입해도 글랜스(Glob)는 아래 문구로 세션당 1회로 묶어 비용을 제한한다.
  addContext(
    `[백로그 표면화] 현재 작업 디렉터리(${project})에 연결된 백로그 폴더가 있다:\n` +
      `  ${folder}\n` +
      `이 폴더에는 미해결 작업뿐 아니라 학습·정리 대기 노트도 들어 있다. ` +
      `이 세션에서 아직 이 폴더를 보지 않았다면 지금 한 번 훑어(Glob) 항목 제목을 확인한다 — 관련성은 폴더를 본 뒤에 판단하고, 보기 전에 "무관"으로 단정하지 않는다. ` +
      `파일명이 작업 주제를 분명히 드러내지 않으면 파일명만으로 관련·무관을 단정하지 말고, 그 파일을 열어 내용으로 판단한다. ` +
      `열어본 뒤 각도가 조금 다르다는 이유로 "무관"이라 스스로 단정해 묵살하지 않는다 — 같은 영역·대상·메커니즘을 건드리면 구체적 각도가 달라도 부분 관련으로 보고 표면화한다. 부분 관련 항목을 최종적으로 끌어들일지 말지는 사용자가 정하며, 에이전트가 조용히 무관 처리할 권한이 아니다. ` +
      `상위 폴더명이 무관해 보여도 그 폴더 하위 파일명이 현재 작업과 겹치면(예: /recruitment 작업 중 "면접"이 박힌 파일), 폴더명으로 덮어 무관 단정하지 말고 그 파일을 연다. 폴더명은 하위 파일의 관련 신호를 가리지 못한다. ` +
      `directed 슬래시 커맨드를 처리하는 중이라도 이 확인을 먼저 끼워 넣는다. 이미 목록을 봤다면 다시 훑지 말고 기억한 목록으로 판단한다. ` +
      `현재 작업과 겹치는 항목이 있으면 "이 백로그도 같이 다룰까요?"로 사용자에게 제안하고 허락을 받은 뒤에만 작업에 포함한다. ` +
      `내용 판단을 위해 파일을 열어보는 것은 괜찮지만, 허락 없이 백로그 항목을 현재 작업 범위에 끌어들이거나 산출물·스펙에 반영하지 않는다 — 읽고 곧장 흡수하지 말고 반드시 먼저 제안·확인한다. ` +
      `백로그 파일을 작업 이해용 참고로 읽었더라도, 그 안에 지금 손대려는 대상·메커니즘을 건드리는 미해결 항목이 있으면 그 항목을 별도로 호명해 "이 백로그도 같이 다룰까요?"로 제안한다. 읽어서 맥락에 흡수했다는 이유로 제안 의무가 사라지지 않는다 — 자기 진단·수정안으로 곧장 넘어가기 전에 그 항목을 명시적으로 띄운다. ` +
      `백로그가 현재 슬래시 커맨드나 작업의 직접 입력물·대상처럼 보여도 예외가 아니다 — 관련성을 인지하면 곧장 진행하지 말고 멈춰서 "이 백로그를 이번 작업에 반영할까요?"로 제안한 뒤 허락을 기다린다. 관련성만 보고하고 진행하거나, 흡수 범위·기본값을 스스로 정해 밀고 나가지 않는다. ` +
      `겹치는 게 없으면 조용히 넘어간다.`,
  );
} catch (_e) {
  // 표면화 실패가 프롬프트 처리를 막아서는 안 된다.
  process.exit(0);
}
