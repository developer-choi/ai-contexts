#!/usr/bin/env node
// 확정한 PR 본문 패키지를 GitHub PR의 제목·본문으로 게시한다.
//
// 세션이 frontmatter·H1 떼기를 awk·sed로 즉석에서 짜면 매번 꼴이 달라지고, 2026-10-11 PFM PR #40에서는
// 그 조립 명령 안에 형제 PR의 생성 표기 줄을 이어 붙여 게시했다. 떼기·검사·게시를 여기 한 곳에 둔다.
//
// 하는 일:
//   - frontmatter(`---`~`---`)와 `[//]: #` 주석 줄을 뗀다. 첫 H1은 제목, 나머지는 본문이다.
//   - 아래 중 하나라도 걸리면 게시하지 않고 멈춘다.
//       남은 `[//]`, 코드 밖의 `[채울 내용]` 꼴 대괄호, 채점기(score.mjs) 기계 적발 합계 0 초과,
//       Claude Code 생성 표기 줄. 표기 줄은 `--accept-residual`로도 넘기지 못한다 — 사용자가 싣지 않기로 했다.
//   - 기본은 미리보기다. `--apply`를 줄 때만 `gh pr edit`을 실행한다.
//
// 사용:
//   node publish-pr.mjs <패키지.md> --pr <번호> [--repo owner/name] [--accept-residual] [--apply]
//
// `--accept-residual`은 write-refine 검수에서 사용자가 잔여 위반을 받아들인 글을 위한 것이다(채점 합계만 넘긴다).
// 시험용: 환경변수 PUBLISH_PR_GH에 node 스크립트 경로를 주면 진짜 gh 대신 그것을 node로 부른다.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SCORE = path.join(import.meta.dirname, "..", "pre-exit", "augmentations", "score.mjs");

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
  const lines = text.split("\n").filter((ln) => !/^\[\/\/\]: #/.test(ln));
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

// 코드블록·인라인 코드·링크(인라인·참조식)·체크박스·GitHub alert(`> [!NOTE]`)의 대괄호는 채울 자리가 아니다.
function placeholders(body) {
  const prose = body
    .replace(/(```|~~~)[\s\S]*?\1/g, "")
    .replace(/`[^`\n]*`/g, "")
    .replace(/\[[^\]\n]*\]\([^)\n]*\)/g, "")
    .replace(/\[[^\]\n]*\]\[[^\]\n]*\]/g, "")
    .replace(/^\[[^\]\n]+\]:\s.*$/gm, "")
    .replace(/^\s*[-*] \[[ xX]\]/gm, "")
    .replace(/^\s*>\s*\[![A-Z]+\]/gm, "");
  return prose.match(/\[[^\]\n]+\]/g) ?? [];
}

function scoreTotal(file) {
  const run = spawnSync(process.execPath, [SCORE, file], { encoding: "utf8" });
  const m = (run.stdout ?? "").match(/기계 적발 합계[^:]*:\s*(\d+)건/);
  if (!m) throw new Error(`채점기 출력에서 합계를 못 찾았다: ${SCORE}\n${run.stderr ?? ""}`);
  return Number(m[1]);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file || !args.pr) {
    console.error("사용: node publish-pr.mjs <패키지.md> --pr <번호> [--repo owner/name] [--accept-residual] [--apply]");
    process.exit(1);
  }
  const { title, body } = split(fs.readFileSync(args.file, "utf8"));

  const stops = [];
  if (!title) stops.push("H1이 없다 — 첫 `# 제목` 줄이 PR 제목이 된다.");
  if (body.includes("[//]")) stops.push("`[//]` 주석이 본문에 남아 있다 — 패키지에서 그 주석을 지운다.");
  for (const ph of placeholders(body).filter((p) => p !== "[//]")) {
    stops.push(`채울 자리가 남아 있다: ${ph} — 지어 채우지 말고 들어갈 내용을 사용자에게 받는다.`);
  }
  const tagged = body.split("\n").filter((ln) => ATTRIBUTION_LINE.test(ln));
  for (const ln of tagged) {
    stops.push(
      `Claude Code 생성 표기 줄이 있다: ${ln.trim()} — 사용자가 PR 본문에 싣지 않기로 한 줄이라 ` +
        "--accept-residual로도 못 넘긴다. 형제 PR 본문 끝에 있던 것을 양식으로 보고 따라 붙였다면 패키지에서 그 줄을 지운다.",
    );
  }
  const total = scoreTotal(args.file);
  if (total > 0 && !args.acceptResidual) {
    stops.push(`채점기 기계 적발 합계가 ${total}건이다 — 고치거나, 사용자가 잔여를 받아들였으면 --accept-residual.`);
  }

  console.log(`제목: ${title ?? "(없음)"}\n${"-".repeat(60)}\n${body}${"-".repeat(60)}`);
  console.log(`채점기 기계 적발 합계: ${total}건${total > 0 && args.acceptResidual ? " (잔여 허용)" : ""}`);
  if (stops.length) {
    console.error(`\n게시하지 않는다:\n${stops.map((s) => `  - ${s}`).join("\n")}`);
    process.exit(1);
  }

  const target = [`#${args.pr}`, args.repo].filter(Boolean).join(" · ");
  if (!args.apply) {
    console.log(`\n미리보기다(${target}). 게시하려면 같은 명령에 --apply를 붙여 다시 실행한다.`);
    return;
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "publish-pr-"));
  const bodyFile = path.join(dir, "body.md");
  fs.writeFileSync(bodyFile, body);
  const ghArgs = ["pr", "edit", String(args.pr), "--title", title, "--body-file", bodyFile];
  if (args.repo) ghArgs.push("--repo", args.repo);
  const fake = process.env.PUBLISH_PR_GH;
  const run = fake
    ? spawnSync(process.execPath, [fake, ...ghArgs], { stdio: "inherit" })
    : spawnSync("gh", ghArgs, { stdio: "inherit" });
  fs.rmSync(dir, { recursive: true, force: true });
  if (run.error) throw run.error;
  process.exit(run.status ?? 1);
}

main();
