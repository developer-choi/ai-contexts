#!/usr/bin/env node
// 사용법: publish-pr.md (같은 폴더)
//
// 확정한 PR 본문 패키지를 GitHub PR의 제목·본문으로 게시한다.
//
// 세션이 frontmatter·H1 떼기를 즉석 명령으로 짜면 매번 꼴이 달라지고, 형제 PR의 생성 표기 줄을 이어 붙여
// 게시한 적도 있다. 떼기·검사·게시를 여기 한 곳에 둔다.
//
// 하는 일:
//   - frontmatter(`---`~`---`)를 뗀다. 첫 H1은 제목, 나머지는 본문이다.
//   - frontmatter `type`이 pr-body가 아니면 멈춘다. 이 스크립트는 PR의 제목·본문을 통째로 덮어쓰므로,
//     PR 코멘트처럼 같은 PR에 올리는 다른 글을 여기 넣으면 남의 PR 본문이 코멘트로 바뀐다.
//   - 멈추는 조건 목록은 publish-pr.md에 있다. `--accept-residual`로도 못 넘기는 것은 처리 안 된 요청(남은 `[//]: #` 주석)이거나,
//     사용자가 싣지 않기로 한 것(생성 표기 줄)이거나, 판단 없는 형식(제목 기준·번호 참조 링크 깨짐·렌더에 남은 기호)이라서다.
//     대괄호는 버튼·UI 요소 이름(`[저장] 버튼`)에 쓰여 빈칸으로 보지 않는다.
//   - 기본은 미리보기다. 게시는 따로 켜야 한다 — 확인 없이 남의 PR 본문을 덮지 않게.
//
// 시험용: PUBLISH_PR_GH=<node 스크립트 경로>를 설정하면 gh 대신 그 스크립트를 node로 실행한다(렌더 검사의 gh api markdown 포함).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SCORE = path.join(import.meta.dirname, "score.mjs");

// 줄 전체가 표기일 때만 잡는다. 훅 check-pr-attribution-policy.mjs의 ATTRIBUTION_LINE과 같은 대상이다 —
// 훅은 명령 글자에서 찾느라 줄 경계를 넓게 잡고, 여기는 본문 줄을 하나씩 본다.
const ATTRIBUTION_LINE = /^\s*(?:🤖\s*)?Generated with \[?Claude Code\]?(?:\(https?:\/\/[^)\s]*\))?\s*$/;

function parseArgs(argv) {
  const args = { file: null, pr: null, repo: null, acceptResidual: false, apply: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--pr") args.pr = argv[++i];
    else if (a === "--repo") args.repo = argv[++i];
    else if (a === "--accept-residual") args.acceptResidual = true;
    else if (a === "--apply") args.apply = true;
    else if (!args.file) args.file = a;
  }
  return args;
}

function split(raw) {
  let text = raw.replace(/\r\n/g, "\n");
  if (text.startsWith("---\n")) {
    const end = text.indexOf("\n---", 3);
    if (end !== -1) text = text.slice(text.indexOf("\n", end + 1) + 1);
  }
  const lines = text.split("\n");
  // 코드블록 안의 `# 주석`은 H1이 아니다.
  let fenced = false;
  const h1 = lines.findIndex((ln) => {
    if (/^\s*(```|~~~)/.test(ln)) fenced = !fenced;
    return !fenced && /^# \S/.test(ln);
  });
  const title = h1 === -1 ? null : lines[h1].slice(2).trim();
  if (h1 !== -1) lines.splice(h1, 1);
  return { title, body: lines.join("\n").trim() + "\n" };
}

// 남은 `[//]: #` 주석 판정은 채점기 `--residual` 하나에 둔다 — 두 곳에 따로 두면 인용 줄 같은 자리에서 판정이 갈린다.
function residualComments(file) {
  const run = spawnSync(process.execPath, [SCORE, file, "--residual"], { encoding: "utf8" });
  return (run.stdout ?? "").split("\n").filter((ln) => /^L\d+: /.test(ln));
}

function frontmatterType(raw) {
  const text = raw.replace(/\r\n/g, "\n");
  if (!text.startsWith("---\n")) return null;
  const end = text.indexOf("\n---", 3);
  const m = end === -1 ? null : text.slice(3, end).match(/^type:[ \t]*['"]?([\w-]+)/m);
  return m ? m[1] : null;
}

// 합계와, 합계 안에서도 --accept-residual로 못 넘기는 PR 제목·번호 참조 링크 깨짐 적발을 채점기 출력에서 읽는다.
// 두 판정은 채점기 한 곳에서 한다(제목 기준은 pr-body 가이드와 짝, 다듬기에서 먼저 잡히게).
function scoreRun(file) {
  const run = spawnSync(process.execPath, [SCORE, file, "--json"], { encoding: "utf8" });
  const line = (run.stdout ?? "").split("\n").find((ln) => ln.startsWith("@@score "));
  if (!line) throw new Error(`채점기 출력에서 판정 줄(@@score)을 못 찾았다: ${SCORE}\n${run.stderr ?? ""}`);
  const { total, titleHits, refHits } = JSON.parse(line.slice("@@score ".length));
  return { total, titleLines: titleHits.map((h) => ` ${h}`), refLines: refHits.map((h) => ` ${h}`) };
}

// GitHub이 실제로 그린 본문에서 글자로 남은 `**`·`__`를 찾는다. 채점기는 원문만 읽어, 닫는 `**` 앞이 문장부호이고
// 뒤에 글자가 붙은 자리(`**"…"**는`)처럼 GitHub에서 굵게가 닫히지 않는 꼴을 못 잡는다. 코드 안의 기호는 빼고 본다.
function renderLeftovers(body, repo, gh) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "publish-pr-render-"));
  const file = path.join(dir, "body.md");
  fs.writeFileSync(file, body);
  const ghArgs = ["api", "markdown", "-f", "mode=gfm", "-F", `text=@${file}`];
  if (repo) ghArgs.push("-f", `context=${repo}`);
  const run = gh(ghArgs, { encoding: "utf8" });
  fs.rmSync(dir, { recursive: true, force: true });
  if (run.error || run.status !== 0) return { error: (run.error?.message ?? run.stderr ?? "").trim() || `exit ${run.status}` };
  const text = (run.stdout ?? "")
    .replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/g, "")
    .replace(/<code\b[^>]*>[\s\S]*?<\/code>/g, "")
    .replace(/<[^>]+>/g, "");
  return { lines: text.split("\n").filter((line) => /\*\*|__/.test(line)).map((line) => line.trim()) };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file || (args.apply && !args.pr)) {
    console.error(`패키지 경로가 없거나, --apply인데 --pr 번호가 없다\n사용법: ${import.meta.dirname.replace(/\\/g, "/")}/publish-pr.md`);
    process.exit(1);
  }
  const raw = fs.readFileSync(args.file, "utf8");
  const type = frontmatterType(raw);
  if (type !== "pr-body") {
    console.error(
      `게시하지 않는다: 패키지 type이 ${type ?? "(없음)"}이다 — 이 스크립트는 pr-body만 PR 제목·본문으로 덮어쓴다. ` +
        "PR 코멘트 같은 다른 글은 이 스크립트로 올리지 않는다.",
    );
    process.exit(1);
  }
  const { title, body } = split(raw);

  const stops = [];
  if (!title) stops.push("H1이 없다 — 첫 `# 제목` 줄이 PR 제목이 된다.");
  const { total, titleLines, refLines } = scoreRun(args.file);
  for (const ln of titleLines) stops.push(`PR 제목 기준에 걸렸다 — --accept-residual로도 못 넘긴다:${ln}`);
  for (const ln of refLines) {
    stops.push(`번호 참조 링크가 깨진다 — --accept-residual로도 못 넘긴다:${ln}. 번호 뒤에 공백을 두거나 괄호로 감싼다.`);
  }
  const comments = residualComments(args.file);
  if (comments.length) {
    stops.push(
      `\`[//]: #\` 주석 줄이 ${comments.length}개 남아 있다 — 반영한 주석은 지우는 규칙이라 남은 것은 처리 안 된 요청이다. ` +
        "--accept-residual로도 못 넘긴다. 사용자에게 아래 주석을 보이고 처리한 뒤 다시 실행한다.\n" +
        comments.map((ln) => `      ${ln}`).join("\n"),
    );
  } else if (body.replace(/(```|~~~)[\s\S]*?\1/g, "").replace(/`[^`\n]*`/g, "").includes("[//]")) {
    stops.push("`[//]` 주석이 본문에 남아 있다 — 패키지에서 그 주석을 지운다.");
  }
  const tagged = body.split("\n").filter((ln) => ATTRIBUTION_LINE.test(ln));
  for (const ln of tagged) {
    stops.push(
      `Claude Code 생성 표기 줄이 있다: ${ln.trim()} — 사용자가 PR 본문에 싣지 않기로 한 줄이라 ` +
        "--accept-residual로도 못 넘긴다. 형제 PR 본문 끝에 있던 것을 양식으로 보고 따라 붙였다면 패키지에서 그 줄을 지운다.",
    );
  }
  const fakeGhScriptPath = process.env.PUBLISH_PR_GH;
  const gh = (ghArgs, opts) =>
    fakeGhScriptPath ? spawnSync(process.execPath, [fakeGhScriptPath, ...ghArgs], opts) : spawnSync("gh", ghArgs, opts);
  const rendered = renderLeftovers(body, args.repo, gh);
  if (rendered.error) {
    stops.push(`GitHub 렌더 검사(gh api markdown)를 못 했다 — gh 로그인·네트워크를 확인하고 다시 실행한다: ${rendered.error}`);
  }
  for (const line of rendered.lines ?? []) {
    stops.push(
      `GitHub에서 마크다운 기호가 글자로 남는다 — --accept-residual로도 못 넘긴다.\n      ${line}\n      ` +
        '닫는 `**` 바로 앞이 문장부호이고 뒤에 글자가 붙었으면 닫는 `**`를 글자 뒤로 옮긴다(`**"…"는 조건**을`).',
    );
  }
  if (total - titleLines.length - refLines.length > 0 && !args.acceptResidual) {
    stops.push(`채점기 기계 적발 합계가 ${total}건이다 — 고치거나, 사용자가 잔여를 받아들였으면 --accept-residual.`);
  }

  console.log(`제목: ${title ?? "(없음)"}\n${"-".repeat(60)}\n${body}${"-".repeat(60)}`);
  console.log(`채점기 기계 적발 합계: ${total}건${total > 0 && args.acceptResidual ? " (잔여 허용)" : ""}`);
  if (stops.length) {
    console.error(`\n게시하지 않는다:\n${stops.map((s) => `  - ${s}`).join("\n")}`);
    process.exit(1);
  }

  const target = [args.pr ? `#${args.pr}` : "PR 미정", args.repo].filter(Boolean).join(" · ");
  if (!args.apply) {
    const howToPublish = args.pr ? "같은 명령에 --apply를" : "PR을 연 뒤 같은 명령에 --pr <번호> --apply를";
    console.log(`\n미리보기다(${target}). 게시하려면 ${howToPublish} 붙여 다시 실행한다.`);
    return;
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "publish-pr-"));
  const bodyFile = path.join(dir, "body.md");
  fs.writeFileSync(bodyFile, body);
  const ghArgs = ["pr", "edit", String(args.pr), "--title", title, "--body-file", bodyFile];
  if (args.repo) ghArgs.push("--repo", args.repo);
  const run = gh(ghArgs, { stdio: "inherit" });
  fs.rmSync(dir, { recursive: true, force: true });
  if (run.error) throw run.error;
  process.exit(run.status ?? 1);
}

main();
