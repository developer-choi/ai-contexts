// 사용법: build-review-request.md (같은 폴더)
//
// prompt-review가 리뷰어를 다른 회사 모델(ask-llm)에 맡길 때 보낼 내용을 묶는다.
// 받는 모델은 파일을 못 읽어서 기준 문서·대상·링크된 파일 전문을 보낼 내용에 넣어야 한다.
// 메인이 이 재료를 직접 읽어 붙이면 아끼려던 Claude 토큰이 그대로 남아 스크립트가 묶는다.
// 리뷰어별 기준 문서는 SKILL.md 「기준」 표에서 읽는다. 표를 사본으로 들고 있으면 표만 고쳤을 때 어긋난다.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const USAGE_DOC = path.join(import.meta.dirname, "build-review-request.md").replace(/\\/g, "/");
const REVIEWERS = ["BODY", "STRUCTURE", "AGENT", "WORKFLOW", "CODE"];
const CODE_EXTENSIONS = /\.(mjs|cjs|js|ts|json)$/;

function usageFail(message) {
  console.error(`${message}\n사용법: ${USAGE_DOC}`);
  process.exit(1);
}

function readOption(argv, name) {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) usageFail(`${name} 뒤에 값이 없다.`);
  argv.splice(index, 2);
  return value;
}

function git(cwd, args) {
  try {
    return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

const toSlash = (filePath) => filePath.replace(/\\/g, "/");

function listMarkdown(targetPath) {
  if (fs.statSync(targetPath).isFile()) return [targetPath];
  return fs.readdirSync(targetPath, { recursive: true })
    .map((entry) => path.join(targetPath, entry))
    .filter((filePath) => filePath.endsWith(".md") && fs.statSync(filePath).isFile())
    .sort();
}

// md 본문의 [..](경로) 중 로컬 파일로 풀리는 것. 개인 파일(이력서 등)도 거르지 않는다. 사용자가 보내도 된다고 정했고,
// 거르면 리뷰어가 대상이 기대는 내용을 못 본다(13차 벤치에서 메인이 손으로 묶다 resume.md를 스스로 뺐다). 코드 블록 안 링크도 잡지만 보내는 양이 조금 느는 것뿐이다.
function outgoingLinks(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const links = new Set();
  for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const raw = match[1].split("#")[0];
    if (!raw || /^[a-z]+:/i.test(raw)) continue;
    const resolved = path.resolve(path.dirname(filePath), decodeURI(raw));
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) links.add(resolved);
  }
  return [...links];
}

function headings(filePath) {
  return fs.readFileSync(filePath, "utf8").split("\n").filter((line) => /^#{1,4} /.test(line)).map((line) => line.trim());
}

const argv = process.argv.slice(2);
const reviewer = readOption(argv, "--reviewer");
const outPath = readOption(argv, "--out");
const findingsPath = readOption(argv, "--findings");
const askPath = readOption(argv, "--ask");
const targetArgument = argv[0];
if (!reviewer || !REVIEWERS.includes(reviewer)) usageFail(`--reviewer는 ${REVIEWERS.join("·")} 중 하나다: ${reviewer ?? "(없음)"}`);
if (!outPath) usageFail("--out이 없다.");
if (!targetArgument) usageFail("리뷰 대상 경로가 없다.");
if (argv.length > 1) usageFail(`모르는 인자: ${argv.slice(1).join(" ")}`);
const targetPath = path.resolve(targetArgument);
if (!fs.existsSync(targetPath)) usageFail(`대상이 없다: ${targetPath}`);
if (findingsPath && !fs.existsSync(findingsPath)) usageFail(`--findings 파일이 없다: ${findingsPath}`);
if (askPath && !fs.existsSync(askPath)) usageFail(`--ask 파일이 없다: ${askPath}`);

const targetDir = fs.statSync(targetPath).isFile() ? path.dirname(targetPath) : targetPath;
const repoRoot = git(targetDir, ["rev-parse", "--show-toplevel"]);
// 묶은 파일·지적 파일을 대상 레포 안에 두면 다음 회차에 리뷰 대상·STRUCTURE 목록으로 들어가 요청이 회차마다 불어나고 커밋에도 섞인다.
const inRepo = (filePath) => {
  if (!repoRoot) return false;
  const fromRoot = path.relative(repoRoot, path.resolve(filePath));
  return !fromRoot.startsWith("..") && !path.isAbsolute(fromRoot);
};
for (const [name, value] of [["--out", outPath], ["--findings", findingsPath], ["--ask", askPath]]) {
  if (value && inRepo(value)) usageFail(`${name} 파일이 대상 레포 안에 있다: ${value}\n세션 scratchpad처럼 대상 레포 밖의 경로를 준다.`);
}
const relative = (filePath) => toSlash(repoRoot ? path.relative(repoRoot, filePath) : filePath);

// 대상이 ai-contexts 체크아웃 안이면 그 체크아웃의 기준으로 리뷰한다(SKILL.md 「기준」 표 아래 문단).
const checkoutSkillDir = repoRoot && path.join(repoRoot, "plugins/ac/skills/prompt-review");
const isAcCheckout = checkoutSkillDir && fs.existsSync(path.join(checkoutSkillDir, "SKILL.md"));
const skillDir = isAcCheckout ? checkoutSkillDir : path.resolve(import.meta.dirname, "..");
const checkScriptDir = isAcCheckout ? path.join(repoRoot, "scripts/hooks") : path.join(os.homedir(), ".ai-contexts");

const skillText = fs.readFileSync(path.join(skillDir, "SKILL.md"), "utf8");
const criteria = [];
for (const line of skillText.split("\n")) {
  const cells = line.split("|").map((cell) => cell.trim());
  if (cells[1] !== reviewer) continue;
  const link = cells[3]?.match(/\]\(([^)]+)\)/)?.[1];
  if (!link) continue;
  criteria.push({ title: cells[2], file: path.resolve(skillDir, link.split("#")[0]) });
}
// 표에서 리뷰어 행을 못 찾으면 기준 없이 보내게 된다. 0건은 통과가 아니라 표 꼴이 바뀐 것이다.
if (criteria.length === 0) usageFail(`SKILL.md 「기준」 표에서 ${reviewer} 행을 못 찾았다: ${toSlash(path.join(skillDir, "SKILL.md"))}`);

const targetFiles = listMarkdown(targetPath);
if (targetFiles.length === 0) usageFail(`대상에 md 파일이 없다: ${targetPath}`);
const targetSet = new Set(targetFiles);
const criteriaSet = new Set(criteria.map((criterion) => criterion.file));
const linkedFiles = [...new Set(targetFiles.flatMap(outgoingLinks))]
  .filter((filePath) => !targetSet.has(filePath) && !criteriaSet.has(filePath))
  .sort();

const sections = [];
const fileBlock = (filePath) => `#### ${relative(filePath)}\n\n\`\`\`\`\n${fs.readFileSync(filePath, "utf8")}\n\`\`\`\``;

// --ask면 리뷰 답 꼴을 주지 않는다. 두 꼴을 함께 주면 리뷰를 통째로 다시 해 오거나 두 꼴을 섞은 답이 나온다.
sections.push(askPath
  ? [
    `너는 프롬프트 문서 리뷰의 ${reviewer} 리뷰어다. 이번에는 리뷰를 다시 하지 말고, 맨 끝 「이번에 따로 묻는 것」에 그 요청이 정한 꼴로만 답한다.`,
    "파일은 읽을 수 없으니 이 안에 붙인 내용만 근거로 삼는다.",
  ].join("\n")
  : [
    `너는 프롬프트 문서 리뷰의 ${reviewer} 리뷰어다. 아래 「기준 문서」만으로 「리뷰 대상」을 리뷰해 지적을 낸다.`,
    "지적마다 위치(파일·절·문장 원문), 문제, 걸리는 기준 문서 문장 원문, 고칠 안(Before/After)을 적는다. 지적이 없으면 없다고 적는다.",
    "파일은 읽을 수 없으니 이 안에 붙인 내용만 근거로 삼는다. 붙지 않은 파일에 대해서는 추측하지 않는다.",
  ].join("\n"));

// 표를 요구하지 않으면 리뷰어가 명령 없는 how 최소화 원칙을 건너뛰고 "0건"만 보고한다.
if (reviewer === "BODY" && !askPath) {
  sections.push("how 최소화 원칙(trimming.md)을 적용한 판정을 대상의 절마다 표(절 | 판정 | 근거)로 답에 넣는다. 지적이 0건이어도 표는 넣는다.");
}

sections.push(`## 기준 문서\n\n${criteria.map((criterion) => `### ${criterion.title}\n\n${fileBlock(criterion.file)}`).join("\n\n")}`);
sections.push(`## 리뷰 대상\n\n${targetFiles.map(fileBlock).join("\n\n")}`);
if (linkedFiles.length) sections.push(`## 리뷰 대상이 링크하는 파일 (리뷰 대상 아님, 참고)\n\n${linkedFiles.map(fileBlock).join("\n\n")}`);

if (reviewer === "STRUCTURE") {
  const sizeScript = path.join(checkScriptDir, "check-md-size.mjs");
  let sizeReport;
  try {
    sizeReport = execFileSync(process.execPath, [sizeScript, "--report", targetPath], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    // 크기 검사기가 위반으로 0이 아닌 종료를 해도 보고는 stdout에 있다.
    sizeReport = `${error.stdout ?? ""}${error.stderr ?? ""}`;
  }
  sections.push(`## 크기 검사 출력 (닿는 곳 = 이 파일을 링크하는 파일)\n\n\`\`\`\n${sizeReport.trim()}\n\`\`\``);

  // 링크로 안 이어진 파일과의 중복은 링크를 따라가서는 안 보인다. md마다 절 제목을 붙여 그 자리를 짚게 한다.
  // 범위는 대상이 든 최상위 폴더와 레포의 모든 CLAUDE.md다. 레포 전체를 넣으면 백로그 데이터 md가 많은 레포(backlog)에서
  // 174KB까지 불어났다(2026-11-21 실측). 최상위 폴더로 좁히자 backlog 36KB, PP 67KB, AC 파일 하나 94KB·스킬 폴더 115KB였다.
  if (repoRoot) {
    // 대상이 레포 루트의 파일이면 최상위 폴더가 없으니 루트에 바로 있는 md만 넣는다.
    const targetRelative = relative(targetPath);
    const atRoot = !targetRelative.includes("/");
    const inScope = (file) => path.basename(file) === "CLAUDE.md"
      || (atRoot ? !file.includes("/") : file.startsWith(`${targetRelative.split("/")[0]}/`));
    const tracked = (git(repoRoot, ["ls-files", "--cached", "--others", "--exclude-standard", "*.md"]) ?? "").split("\n").filter(Boolean).filter(inScope);
    const outline = tracked
      .map((file) => path.join(repoRoot, file))
      .filter((filePath) => !targetSet.has(filePath) && fs.existsSync(filePath))
      .map((filePath) => {
        const titles = headings(filePath);
        return titles.length ? `- ${relative(filePath)}\n${titles.map((title) => `  - ${title}`).join("\n")}` : `- ${relative(filePath)}`;
      });
    sections.push(`## 같은 영역의 다른 md 파일과 절 제목 (대상이 든 최상위 폴더와 레포의 모든 CLAUDE.md. 링크로 안 이어진 파일 포함. 본문은 없다)\n\n같은 내용이 여기 다른 파일에 이미 있어 보이면 그 파일·절 제목을 들어 지적한다.\n\n${outline.join("\n")}`);
  }
}

if (reviewer === "CODE") {
  // SKILL.md 「기준」 CODE 행: 대상 md가 호출하는 스크립트·json 중 작업 브랜치에서 바뀐 것만 본다.
  const defaultBranch = (git(repoRoot, ["symbolic-ref", "refs/remotes/origin/HEAD"]) ?? "refs/remotes/origin/HEAD").replace("refs/remotes/", "");
  const changed = new Set([
    ...(git(repoRoot, ["diff", "--name-only", `${defaultBranch}...HEAD`]) ?? "").split("\n"),
    ...(git(repoRoot, ["diff", "--name-only", "HEAD"]) ?? "").split("\n"),
    ...(git(repoRoot, ["ls-files", "--others", "--exclude-standard"]) ?? "").split("\n"),
  ].filter((file) => CODE_EXTENSIONS.test(file)));
  const targetText = targetFiles.map((filePath) => fs.readFileSync(filePath, "utf8")).join("\n");
  const codeFiles = [...changed]
    .filter((file) => targetText.includes(path.basename(file)))
    .map((file) => path.join(repoRoot, file))
    .filter((filePath) => fs.existsSync(filePath));
  if (codeFiles.length === 0) usageFail("CODE 리뷰어가 볼 파일이 없다. 대상 md가 부르는 스크립트·json 중 작업 브랜치에서 바뀐 것이 없으면 CODE 리뷰어를 부르지 않는다.");
  sections.push(`## 리뷰할 코드·데이터 (작업 브랜치에서 바뀐 것)\n\n${codeFiles.map(fileBlock).join("\n\n")}`);
}

if (findingsPath) {
  sections.push(`## 지금까지의 지적과 판단\n\n앞 회차까지 나온 지적 중 넣지 않았거나 사용자에게 가져갈 것과 그 근거다. 근거를 반박할 것이 없으면 다시 내지 않는다.\n\n${fs.readFileSync(findingsPath, "utf8")}`);
}

if (askPath) sections.push(`## 이번에 따로 묻는 것\n\n${fs.readFileSync(askPath, "utf8")}`);

const request = sections.join("\n\n---\n\n") + "\n";
fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
fs.writeFileSync(outPath, request);
console.log(`${toSlash(path.resolve(outPath))} ${Buffer.byteLength(request)}B (기준 ${criteria.length}·대상 ${targetFiles.length}·링크 ${linkedFiles.length})`);
