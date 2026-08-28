import childProcess from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CATEGORIES = ['rules', 'contexts', 'hooks'];
const LEGACY_CATEGORIES = ['agents'];
const SKILLS_PRESERVE = new Set([
  '.system',
  'vercel-composition-patterns',
  'vercel-react-best-practices',
  'web-design-guidelines',
]);

import { buildHooks } from '../settings/settings-projection.mjs';

const repoDir = path.resolve(import.meta.dirname, '..', '..');
const sourceDir = path.join(repoDir, 'deploy');
const baseSettingsSource = path.join(sourceDir, 'base-settings.json');
// 직접 복사하지 않고 settings 생성의 재료로만 쓰는 root 파일들.
// base-settings.json(공통 hook)과 타겟별 override(claude/gemini-settings.json).
const SOURCE_ONLY_ROOT_FILES = new Set(['base-settings.json', 'claude-settings.json', 'gemini-settings.json']);

// 각 타겟 설정 = base에서 만든 것(hook) + 타겟 override 파일. override가 우선(키 충돌 시 덮어씀).
function loadBaseSettings() {
  if (!fs.existsSync(baseSettingsSource) || !fs.statSync(baseSettingsSource).isFile()) {
    throw new Error(`base-settings.json을 찾을 수 없습니다: ${baseSettingsSource}`);
  }
  return readJson(baseSettingsSource);
}

// 타겟 override 파일(없으면 {}). base 재료를 덮어쓰는 타겟 전용 설정.
function loadOverride(name) {
  const overridePath = path.join(sourceDir, name);
  return fs.existsSync(overridePath) && fs.statSync(overridePath).isFile() ? readJson(overridePath) : {};
}

function claudeSettingsObject() {
  return { hooks: buildHooks(loadBaseSettings().hooks, 'claude'), ...loadOverride('claude-settings.json') };
}

function geminiSettingsObject() {
  // gemini는 hook 런타임이 없어 base hook을 받지 않는다. override 파일만(현재 없음 → {}).
  return { ...loadOverride('gemini-settings.json') };
}

function codexHooksObject() {
  return { hooks: buildHooks(loadBaseSettings().hooks, 'codex') };
}

function defaultClaudeDir() {
  return path.join(os.homedir(), '.claude');
}

function defaultCodexDir() {
  return path.join(os.homedir(), '.codex');
}

function defaultGeminiDir() {
  return path.join(os.homedir(), '.gemini');
}

function resolveUserPath(input) {
  if (!input || input === '~') return os.homedir();
  if (input.startsWith(`~${path.sep}`) || input.startsWith('~/') || input.startsWith('~\\')) {
    return path.join(os.homedir(), input.slice(2));
  }
  return path.resolve(input);
}

function ensureDeploySource() {
  if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
    throw new Error(`Deploy source not found: ${sourceDir}`);
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function removePath(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function copyPath(src, dest) {
  removePath(dest);
  ensureDir(path.dirname(dest));
  fs.cpSync(src, dest, { recursive: true, force: true, errorOnExist: false });
}

function readJson(file) {
  const raw = fs.readFileSync(file, 'utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

// 규칙 본문이 contexts 파일을 가리킬 때 쓰는 자리표시자.
//
// 규칙은 타겟마다 사는 곳이 다르다 — claude·codex는 `rules/` 아래 파일로, gemini는 rules
// 디렉토리 없이 GEMINI.md 안에 통째로 합쳐진다. 그래서 어떤 상대 경로를 적어도 세 타겟을
// 동시에 맞출 수 없고, 소스 기준 경로(`deploy/contexts/...`)를 적으면 cwd가 AC일 때만
// 우연히 맞는다. 배포 시점에는 타겟이 확정되므로 여기서 절대 경로로 채운다.
const CONTEXTS_TOKEN = '{{contexts}}';

function withContextsPath(content, targetDir) {
  const contextsDir = path.join(targetDir, 'contexts');
  // 자리표시자 뒤의 `/`까지 함께 바꿔 구분자가 섞이지 않게 한다.
  return content
    .split(`${CONTEXTS_TOKEN}/`).join(`${contextsDir}${path.sep}`)
    .split(CONTEXTS_TOKEN).join(contextsDir);
}

// 배포된 rules/ 하위 md의 자리표시자를 채운다. 산출물만 고치고 소스는 건드리지 않는다.
function resolveRulePaths(targetDir) {
  for (const file of collectMarkdown(path.join(targetDir, 'rules'))) {
    const raw = fs.readFileSync(file, 'utf8');
    const updated = withContextsPath(raw, targetDir);
    if (updated !== raw) fs.writeFileSync(file, updated, 'utf8');
  }
}

// rules/ 대조: 자리표시자를 채운 결과와 일치해야 한다.
function compareRulePaths(src, target, targetDir) {
  if (!fs.existsSync(src) || !fs.existsSync(target)) return false;
  const sources = collectMarkdown(src);
  if (sources.length !== collectMarkdown(target).length) return false;

  for (const file of sources) {
    const mirrored = path.join(target, path.relative(src, file));
    if (!fs.existsSync(mirrored)) return false;
    const expected = withContextsPath(fs.readFileSync(file, 'utf8'), targetDir);
    if (expected !== fs.readFileSync(mirrored, 'utf8')) return false;
  }
  return true;
}

function buildAgentsContent(targetFileName, targetDir) {
  const sections = [
    {
      title: 'Global Instructions',
      file: path.join(sourceDir, 'CLAUDE.md'),
    },
  ];

  const rulesDir = path.join(sourceDir, 'rules');
  if (fs.existsSync(rulesDir) && fs.statSync(rulesDir).isDirectory()) {
    const files = fs.readdirSync(rulesDir)
      .filter((file) => file.endsWith('.md'))
      .sort((a, b) => a.localeCompare(b));

    for (const file of files) {
      const title = file === 'global.md' ? 'Global Rules' : `Global Rules - ${path.basename(file, '.md').toUpperCase()}`;
      sections.push({
        title,
        file: path.join(rulesDir, file),
      });
    }
  }

  const body = sections
    .filter((section) => fs.existsSync(section.file) && fs.statSync(section.file).isFile())
    .map((section) => {
      const relativePath = path.relative(sourceDir, section.file).replace(/\\/g, '/');
      const content = withContextsPath(fs.readFileSync(section.file, 'utf8').trim(), targetDir);
      return `# ${section.title}\n\n<!-- Source: deploy/${relativePath} -->\n\n${content}`;
    })
    .join('\n\n---\n\n');

  const lowerName = path.basename(targetFileName, '.md').toLowerCase();
  return `<!-- Generated by ai-contexts npm run sync:system. Do not edit ~/.${lowerName}/${targetFileName} directly. -->\n\n${body}\n`;
}

function buildCodexAgentsContent(targetDir) {
  return buildAgentsContent('AGENTS.md', targetDir);
}

function buildGeminiAgentsContent(targetDir) {
  return buildAgentsContent('GEMINI.md', targetDir);
}

// 머지된 settings.json 옆에 AC가 넣은 top-level 키 목록을 기록하는 사이드카.
// 다음 sync에서 "지난번엔 AC가 넣었지만 이번 소스엔 없는 키"(고아)를 식별해 제거하는 데 쓴다.
// mergeSettings는 소스 키를 추가만 하므로, 이 매니페스트 없이는 소스에서 사라진 키가 영영 잔존한다.
function settingsManifestPath(targetPath) {
  return path.join(path.dirname(targetPath), `.${path.basename(targetPath)}.ac-keys`);
}

function readManagedKeys(targetPath) {
  const manifestPath = settingsManifestPath(targetPath);
  if (!fs.existsSync(manifestPath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mergeSettings(deploy, targetPath) {
  const deployKeys = Object.keys(deploy);
  const existing = fs.existsSync(targetPath) ? readJson(targetPath) : {};

  // 지난 sync에서 AC가 넣었지만 이번 소스엔 없는 top-level 키(고아)를 제거한다.
  for (const key of readManagedKeys(targetPath)) {
    if (!deployKeys.includes(key)) delete existing[key];
  }

  writeJson(targetPath, { ...existing, ...deploy });
  fs.writeFileSync(settingsManifestPath(targetPath), `${JSON.stringify(deployKeys)}\n`, 'utf8');
}

function splitSettings(deploy, targetPath) {
  if (!fs.existsSync(targetPath)) {
    const manifestPath = settingsManifestPath(targetPath);
    if (fs.existsSync(manifestPath)) removePath(manifestPath);
    return false;
  }

  const existing = readJson(targetPath);
  // 현재 소스 키 + 지난 AC 관리 키(고아)를 모두 제거한다.
  const keysToRemove = new Set([...Object.keys(deploy), ...readManagedKeys(targetPath)]);
  for (const key of keysToRemove) {
    delete existing[key];
  }

  const manifestPath = settingsManifestPath(targetPath);
  if (fs.existsSync(manifestPath)) removePath(manifestPath);

  if (Object.keys(existing).length === 0) {
    removePath(targetPath);
  } else {
    writeJson(targetPath, existing);
  }
  return true;
}

function verifySettings(deploy, targetPath) {
  if (!fs.existsSync(targetPath)) return false;

  const target = readJson(targetPath);
  return Object.keys(deploy).every((key) => stableJson(deploy[key]) === stableJson(target[key]));
}

// whole-file 타겟(codex hooks.json)용: 부분키 비교가 아니라 전체 일치를 본다.
function verifyJsonExact(expected, targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  return stableJson(readJson(targetPath)) === stableJson(expected);
}

function stableJson(value) {
  return JSON.stringify(value);
}

function listEntries(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
}

// SKILL.md frontmatter에 name이 없으면 폴더명을 주입한 내용을 반환한다.
// Antigravity는 frontmatter name이 있어야 스킬을 인식하므로(Claude는 폴더명으로 잡음),
// 소스에는 name을 적지 않고 배포 시점에 주입한다. 이미 name이 있으면 그대로 둔다(멱등).
function withSkillName(content, name) {
  const frontmatter = content.match(/^---\r?\n([\s\S]*?\r?\n)---(\r?\n|$)/);
  if (!frontmatter) return `---\nname: ${name}\n---\n\n${content}`;
  if (/^name\s*:/m.test(frontmatter[1])) return content;
  return `---\n${frontmatter[1]}name: ${name}\n---${frontmatter[2]}${content.slice(frontmatter[0].length)}`;
}

const ANCHOR_MARK = '<!-- deploy-anchor -->';
// 앵커는 항상 본문 맨 앞(frontmatter 직후)에만 온다. 위치를 고정하지 않으면 본문이 이 마커를
// 인용할 때 — 이 메커니즘을 문서화하는 스킬에서 실제로 생긴다 — 그 대목이 조용히 지워진다.
const ANCHOR_BLOCK = new RegExp(`^${ANCHOR_MARK}\\r?\\n[^\\r\\n]*(?:\\r?\\n)*`);

// 산출물이 배포된 절대 경로를 본문 맨 앞에 심은 내용을 반환한다.
//
// 본문의 상대 경로 링크(`../../contexts/x.md`, `specialized/y.md`)를 풀려면 그 파일이 어디
// 있는지를 알아야 한다. Claude Code는 스킬을 로드할 때 그 경로를 대화에 함께 넣지만
// Antigravity는 넣지 않아, 같은 링크가 한쪽에서만 풀리고 다른 쪽에서는 조용히 무시된다
// (에러가 아니라 그 지시가 없던 것처럼 진행되므로 산출물을 봐야 드러난다).
// 그래서 런타임이 알려주지 않는 쪽을 위해 배포가 대신 적어둔다 — 배포 시점에는 타겟 경로가
// 확정돼 있다. 이미 알려주는 런타임에는 같은 정보가 한 줄 겹칠 뿐이라 타겟을 가리지 않는다.
//
// SKILL.md만이 아니라 스킬 폴더의 모든 md에 붙인다. 바깥으로 나가는 참조는 오히려 하위
// 파일에 몰려 있고(`specialized/`·`conventions/` 등), 그쪽이 단계도 더 깊다.
function withAnchor(content, dir) {
  const anchor = `${ANCHOR_MARK}\n이 파일은 \`${dir}\`에 있다. 본문의 상대 경로는 이 경로를 기준으로 푼다.`;
  const frontmatter = content.match(/^---\r?\n[\s\S]*?\r?\n---(\r?\n|$)/);
  const head = frontmatter ? content.slice(0, frontmatter[0].length) : '';
  const body = content.slice(head.length).replace(/^\r?\n+/, '').replace(ANCHOR_BLOCK, '');
  // head가 개행으로 끝나는지는 소스마다 다르므로(frontmatter만 있고 본문이 없는 파일 등)
  // 잘라낸 뒤 직접 맞춘다. 끝의 개행도 하나로 고정해야 재적용했을 때 같은 결과가 나온다.
  const prefix = head === '' ? '' : `${head.replace(/\r?\n+$/, '')}\n\n`;
  return `${prefix}${anchor}\n\n${body}`.replace(/\r?\n*$/, '\n');
}

// 스킬 본문이 자기 폴더의 스크립트를 실행하라고 할 때 쓰는 자리표시자.
//
// 전역 스킬은 어느 레포에서 불릴지 모르는데, `node scripts/foo.mjs`처럼 적으면 그때의 작업
// 디렉토리가 기준이 돼 엉뚱한 폴더를 뒤진다(2026-08-09 `/backlog` 실패). 맨 앞 앵커가 폴더
// 경로를 알려주긴 하지만 그건 모델이 읽고 이어붙여 주기를 기대하는 것이고, 여기서 채우면
// 배포본에 실제 경로가 그대로 박혀 기대할 일이 없어진다. 배포 시점엔 타겟이 확정돼 있다.
const SKILL_DIR_TOKEN = '{{skill_dir}}';

function withSkillDirPath(content, skillDir) {
  // 자리표시자 뒤의 `/`까지 함께 바꿔 구분자가 섞이지 않게 한다.
  return content
    .split(`${SKILL_DIR_TOKEN}/`).join(`${skillDir}${path.sep}`)
    .split(SKILL_DIR_TOKEN).join(skillDir);
}

// 전역 스킬은 `<타겟>/skills/<이름>`에 깔리므로 그 타겟의 contexts는 두 단계 위 형제다.
// 로컬 스킬은 레포 안(`.claude/skills/`)에 깔리는데 contexts는 레포에 없으므로, 부르는 쪽이
// 그 에이전트의 전역 contexts를 직접 넘긴다.
function contextsDirForSkill(skillDir) {
  return path.resolve(skillDir, '..', '..', 'contexts');
}

// 여러 스킬이 함께 쓰는 contexts 스크립트를 부를 때 쓴다. `{{skill_dir}}`은 자기 폴더 안만
// 가리킬 수 있어 이 경우를 못 덮는다.
function withSkillContextsPath(content, contextsDir) {
  return content
    .split(`${CONTEXTS_TOKEN}/`).join(`${contextsDir}${path.sep}`)
    .split(CONTEXTS_TOKEN).join(contextsDir);
}

// 배포된 SKILL.md의 최종 형태. 소스는 건드리지 않고 산출물만 이 모습이 된다.
function renderSkillMd(content, skillDir, contextsDir = contextsDirForSkill(skillDir)) {
  const named = withSkillName(content, path.basename(skillDir));
  return withSkillContextsPath(withSkillDirPath(withAnchor(named, skillDir), skillDir), contextsDir);
}

// 스킬 폴더 안의 SKILL.md 아닌 md. 앵커는 자기 디렉토리를 가리키지만 자리표시자는 스킬 루트로
// 채운다 — 어느 하위 파일에 적든 `{{skill_dir}}/augmentations/score.mjs`가 같은 곳을 가리키게.
function renderSkillSubMd(content, fileDir, skillDir, contextsDir = contextsDirForSkill(skillDir)) {
  return withSkillContextsPath(withSkillDirPath(withAnchor(content, fileDir), skillDir), contextsDir);
}

// 스킬 폴더 안의 md 중 앵커를 붙이지 않을 것. templates는 사용자 문서로 복사되는 재료라
// 앵커가 붙으면 그 문서에 그대로 새어 나간다.
const ANCHOR_EXCLUDED_DIRS = new Set(['templates']);

function anchorExcluded(skillDir, filePath) {
  return path.relative(skillDir, filePath).split(path.sep).slice(0, -1)
    .some((segment) => ANCHOR_EXCLUDED_DIRS.has(segment));
}

// 배포된 스킬 디렉토리의 md를 배포본 형태로 고친다. 산출물만 고치고 소스는 건드리지 않는다.
function injectSkillName(skillDir, contextsDir = contextsDirForSkill(skillDir)) {
  for (const file of collectMarkdown(skillDir)) {
    if (anchorExcluded(skillDir, file)) continue;

    const raw = fs.readFileSync(file, 'utf8');
    const updated = path.basename(file) === 'SKILL.md' && path.dirname(file) === skillDir
      ? renderSkillMd(raw, skillDir, contextsDir)
      : renderSkillSubMd(raw, path.dirname(file), skillDir, contextsDir);
    if (updated !== raw) fs.writeFileSync(file, updated, 'utf8');
  }
}

function collectMarkdown(dir, found = []) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return found;
  for (const entry of listEntries(dir)) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectMarkdown(full, found);
    else if (entry.name.endsWith('.md')) found.push(full);
  }
  return found;
}

// 스킬 항목 대조: 앵커가 붙는 md는 렌더 결과와, 나머지 파일은 원본과 일치해야 한다.
function compareSkillPaths(src, target, roots = { src, target }) {
  if (!fs.existsSync(src) || !fs.existsSync(target)) return false;
  if (!fs.statSync(src).isDirectory() || !fs.statSync(target).isDirectory()) return comparePaths(src, target);

  const leftEntries = listEntries(src);
  const rightEntries = listEntries(target);
  if (leftEntries.length !== rightEntries.length) return false;

  for (let i = 0; i < leftEntries.length; i += 1) {
    if (leftEntries[i].name !== rightEntries[i].name) return false;
    const left = path.join(src, leftEntries[i].name);
    const right = path.join(target, rightEntries[i].name);

    if (leftEntries[i].isDirectory()) {
      if (!compareSkillPaths(left, right, roots)) return false;
      continue;
    }
    if (!leftEntries[i].name.endsWith('.md') || anchorExcluded(roots.src, left)) {
      if (!comparePaths(left, right)) return false;
      continue;
    }

    const source = fs.readFileSync(left, 'utf8');
    const expected = leftEntries[i].name === 'SKILL.md' && src === roots.src
      ? renderSkillMd(source, roots.target)
      : renderSkillSubMd(source, target, roots.target);
    if (expected !== fs.readFileSync(right, 'utf8')) return false;
  }
  return true;
}

function comparePaths(left, right) {
  if (!fs.existsSync(left) || !fs.existsSync(right)) return false;

  const leftStat = fs.statSync(left);
  const rightStat = fs.statSync(right);
  if (leftStat.isDirectory() !== rightStat.isDirectory()) return false;

  if (leftStat.isDirectory()) {
    const leftEntries = listEntries(left);
    const rightEntries = listEntries(right);
    if (leftEntries.length !== rightEntries.length) return false;

    for (let i = 0; i < leftEntries.length; i += 1) {
      if (leftEntries[i].name !== rightEntries[i].name) return false;
      if (!comparePaths(path.join(left, leftEntries[i].name), path.join(right, rightEntries[i].name))) {
        return false;
      }
    }
    return true;
  }

  return fs.readFileSync(left).equals(fs.readFileSync(right));
}

function deployRootFiles(targetDir, log) {
  let copied = 0;
  for (const entry of listEntries(sourceDir)) {
    if (!entry.isFile()) continue;
    if (SOURCE_ONLY_ROOT_FILES.has(entry.name)) continue;

    const src = path.join(sourceDir, entry.name);
    const dest = path.join(targetDir, entry.name);
    copyPath(src, dest);
    log(`  COPY  ${entry.name}`);
    copied += 1;
  }

  mergeSettings(claudeSettingsObject(), path.join(targetDir, 'settings.json'));
  log('  MERGE settings.json');
  copied += 1;
  return copied;
}

function deploySkills(targetDir, log) {
  const srcSkills = path.join(sourceDir, 'skills');
  if (!fs.existsSync(srcSkills) || !fs.statSync(srcSkills).isDirectory()) return 0;

  const targetSkills = path.join(targetDir, 'skills');
  ensureDir(targetSkills);

  let copied = 0;
  for (const entry of listEntries(srcSkills)) {
    const src = path.join(srcSkills, entry.name);
    const dest = path.join(targetSkills, entry.name);
    copyPath(src, dest);
    if (entry.isDirectory()) injectSkillName(dest);
    log(`  COPY  skills/${entry.name}`);
    copied += 1;
  }
  return copied;
}

function uninstallSkills(targetDir, log) {
  const skillsDir = path.join(targetDir, 'skills');
  let removed = 0;
  for (const entry of listEntries(skillsDir)) {
    if (SKILLS_PRESERVE.has(entry.name)) continue;

    removePath(path.join(skillsDir, entry.name));
    log(`  DEL   skills/${entry.name}`);
    removed += 1;
  }
  return removed;
}

function deployCodexGlobals(targetDir, log = console.log) {
  ensureDir(targetDir);
  uninstallCodexGlobals(targetDir, log);

  let copied = 0;
  const srcContexts = path.join(sourceDir, 'contexts');
  if (fs.existsSync(srcContexts) && fs.statSync(srcContexts).isDirectory()) {
    copyPath(srcContexts, path.join(targetDir, 'contexts'));
    log('  COPY  contexts/');
    copied += 1;
  }

  const srcHooks = path.join(sourceDir, 'hooks');
  if (fs.existsSync(srcHooks) && fs.statSync(srcHooks).isDirectory()) {
    copyPath(srcHooks, path.join(targetDir, 'hooks'));
    log('  COPY  hooks/');
    copied += 1;
  }

  writeJson(path.join(targetDir, 'hooks.json'), codexHooksObject());
  log('  WRITE hooks.json');
  copied += 1;

  fs.writeFileSync(path.join(targetDir, 'AGENTS.md'), buildCodexAgentsContent(targetDir), 'utf8');
  log('  WRITE AGENTS.md');
  copied += 1;

  copied += deploySkills(targetDir, log);
  return copied;
}

function deployGeminiGlobals(targetDir, log = console.log) {
  ensureDir(targetDir);
  uninstallGeminiGlobals(targetDir, log);

  let copied = 0;
  const srcContexts = path.join(sourceDir, 'contexts');
  if (fs.existsSync(srcContexts) && fs.statSync(srcContexts).isDirectory()) {
    copyPath(srcContexts, path.join(targetDir, 'contexts'));
    log('  COPY  contexts/');
    copied += 1;
  }

  // gemini(Antigravity CLI)는 hook 러너가 없어 hook을 발동하지 못한다. hook 본문을
  // ~/.gemini/hooks/로 복사하지 않는다 (러너 없는 dead artifact 방지).

  fs.writeFileSync(path.join(targetDir, 'GEMINI.md'), buildGeminiAgentsContent(targetDir), 'utf8');
  log('  WRITE GEMINI.md');
  copied += 1;

  copied += deploySkills(targetDir, log);

  mergeSettings(geminiSettingsObject(), path.join(targetDir, 'settings.json'));
  log('  MERGE settings.json');
  copied += 1;

  return copied;
}

function uninstallGeminiGlobals(targetDir, log = console.log) {
  let removed = 0;
  const contextsDir = path.join(targetDir, 'contexts');
  if (fs.existsSync(contextsDir) && fs.statSync(contextsDir).isDirectory()) {
    removePath(contextsDir);
    log('  DEL   contexts/');
    removed += 1;
  }
  const hooksDir = path.join(targetDir, 'hooks');
  if (fs.existsSync(hooksDir) && fs.statSync(hooksDir).isDirectory()) {
    removePath(hooksDir);
    log('  DEL   hooks/');
    removed += 1;
  }
  const geminiFile = path.join(targetDir, 'GEMINI.md');
  if (fs.existsSync(geminiFile) && fs.statSync(geminiFile).isFile()) {
    removePath(geminiFile);
    log('  DEL   GEMINI.md');
    removed += 1;
  }
  {
    const target = path.join(targetDir, 'settings.json');
    if (splitSettings(geminiSettingsObject(), target)) {
      log('  SPLIT settings.json');
      removed += 1;
    }
  }

  removed += uninstallSkills(targetDir, log);
  return removed;
}

async function trustCodexHooks(targetDir, log = console.log, cwd = repoDir) {
  const hooksConfig = path.join(targetDir, 'hooks.json');
  if (!fs.existsSync(hooksConfig) || !fs.statSync(hooksConfig).isFile()) return 0;

  const response = await runCodexAppServer([
    { method: 'hooks/list', params: { cwds: [cwd] } },
  ]);
  const listResult = response.find((message) => Array.isArray(message?.result?.data))?.result;
  const hooks = listResult?.data?.flatMap((entry) => entry.hooks || []) || [];
  const deployedHooks = hooks.filter((hook) => path.resolve(hook.sourcePath || '') === path.resolve(hooksConfig));

  const state = {};
  for (const hook of deployedHooks) {
    if (!hook.key || !hook.currentHash || hook.isManaged) continue;
    state[hook.key] = {
      enabled: true,
      trusted_hash: hook.currentHash,
    };
  }

  if (Object.keys(state).length === 0) return 0;

  await runCodexAppServer([
    {
      method: 'config/batchWrite',
      params: {
        edits: [
          {
            keyPath: 'hooks.state',
            value: state,
            mergeStrategy: 'upsert',
          },
        ],
        reloadUserConfig: true,
      },
    },
  ]);

  log(`  TRUST hooks.state (${Object.keys(state).length})`);
  return Object.keys(state).length;
}

function resolveCodexCli() {
  const explicit = process.env.CODEX_CLI;
  if (explicit && isRunnableCodexCli(explicit)) return explicit;

  const pathHit = findOnPath(process.platform === 'win32' ? ['codex.exe', 'codex.cmd', 'codex.bat', 'codex'] : ['codex']);
  if (pathHit) return pathHit;

  if (process.platform === 'win32') {
    const candidates = [
      path.join(os.homedir(), 'AppData', 'Local', 'OpenAI', 'Codex', 'bin', 'codex.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'OpenAI', 'Codex', 'bin', 'codex.exe'),
      ...findLocalAppCodexBins(),
      ...findWindowsAppCodexBins(),
    ];
    return candidates.find(isRunnableCodexCli) || null;
  }

  return null;
}

function findOnPath(names) {
  const pathValue = process.env.PATH || '';
  const dirs = pathValue.split(path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    for (const name of names) {
      const candidate = path.join(dir, name);
      if (isRunnableCodexCli(candidate)) return candidate;
    }
  }
  return null;
}

function findLocalAppCodexBins() {
  const roots = [
    path.join(os.homedir(), 'AppData', 'Local', 'OpenAI', 'Codex', 'bin'),
    path.join(process.env.LOCALAPPDATA || '', 'OpenAI', 'Codex', 'bin'),
  ];
  const candidates = [];

  for (const root of [...new Set(roots)]) {
    if (!root || !fs.existsSync(root) || !fs.statSync(root).isDirectory()) continue;

    for (const entry of fs.readdirSync(root)) {
      const entryPath = path.join(root, entry);
      try {
        if (fs.statSync(entryPath).isDirectory()) {
          candidates.push(path.join(entryPath, 'codex.exe'));
        }
      } catch {
        // Ignore stale package directories while scanning Desktop-managed bins.
      }
    }
  }

  return candidates.sort((left, right) => {
    try {
      return fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs;
    } catch {
      return 0;
    }
  });
}

function findWindowsAppCodexBins() {
  const windowsApps = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'WindowsApps');
  if (!fs.existsSync(windowsApps) || !fs.statSync(windowsApps).isDirectory()) return [];

  try {
    return fs.readdirSync(windowsApps)
      .filter((entry) => entry.startsWith('OpenAI.Codex_'))
      .flatMap((entry) => [
        path.join(windowsApps, entry, 'app', 'resources', 'codex.exe'),
        path.join(windowsApps, entry, 'app', 'resources', 'codex'),
      ]);
  } catch {
    return [];
  }
}

function isExecutableFile(file) {
  if (!file) return false;
  try {
    return fs.existsSync(file) && fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function isRunnableCodexCli(file) {
  if (!isExecutableFile(file)) return false;

  const result = childProcess.spawnSync(file, ['--version'], {
    stdio: 'ignore',
    timeout: 5000,
    windowsHide: true,
  });

  return !result.error && result.status === 0;
}

function runCodexAppServer(requests, options = {}) {
  const cwd = options.cwd || repoDir;
  return new Promise((resolve, reject) => {
    const codexCli = resolveCodexCli();
    if (!codexCli) {
      reject(new Error(
        'Codex CLI not found. Install Codex Desktop/CLI, add codex to PATH, or set CODEX_CLI to the codex executable path.'
      ));
      return;
    }

    const child = childProcess.spawn(codexCli, ['app-server', '--listen', 'stdio://'], {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const results = [];
    const pending = new Map();
    let nextId = 1;
    let stderr = '';
    let settled = false;

    const timeout = setTimeout(() => {
      finish(new Error('codex app-server timed out'));
    }, options.timeoutMs || 30000);

    function finish(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      child.kill();
      if (error) {
        if (stderr.trim()) error.message += `\n${stderr.trim()}`;
        reject(error);
      } else {
        resolve(results);
      }
    }

    function send(method, params) {
      const id = nextId;
      nextId += 1;
      pending.set(id, results.length);
      results.push(null);
      child.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
    }

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (data) => {
      for (const line of data.split(/\r?\n/)) {
        if (!line.trim()) continue;
        let message;
        try {
          message = JSON.parse(line);
        } catch {
          continue;
        }

        if (!message.id || !pending.has(message.id)) continue;
        const index = pending.get(message.id);
        pending.delete(message.id);
        results[index] = message;

        if (message.error) {
          finish(new Error(`codex app-server ${message.id} failed: ${JSON.stringify(message.error)}`));
          return;
        }

        if (message.id === 1) {
          child.stdin.write(`${JSON.stringify({ method: 'initialized', params: {} })}\n`);
          for (const request of requests) send(request.method, request.params);
        } else if (pending.size === 0) {
          finish(null);
        }
      }
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (data) => {
      stderr += data;
    });

    child.on('error', finish);
    child.on('exit', (code) => {
      if (!settled && code !== 0) finish(new Error(`codex app-server exited with ${code}`));
    });

    send('initialize', {
      clientInfo: { name: 'ai-contexts-deploy', version: '1.0.0' },
      capabilities: { experimentalApi: true },
    });
  });
}

function uninstallCodexGlobals(targetDir, log = console.log) {
  let removed = 0;
  const contextsDir = path.join(targetDir, 'contexts');
  if (fs.existsSync(contextsDir) && fs.statSync(contextsDir).isDirectory()) {
    removePath(contextsDir);
    log('  DEL   contexts/');
    removed += 1;
  }
  const hooksDir = path.join(targetDir, 'hooks');
  if (fs.existsSync(hooksDir) && fs.statSync(hooksDir).isDirectory()) {
    removePath(hooksDir);
    log('  DEL   hooks/');
    removed += 1;
  }
  const hooksConfig = path.join(targetDir, 'hooks.json');
  if (fs.existsSync(hooksConfig) && fs.statSync(hooksConfig).isFile()) {
    removePath(hooksConfig);
    log('  DEL   hooks.json');
    removed += 1;
  }
  const agentsFile = path.join(targetDir, 'AGENTS.md');
  if (fs.existsSync(agentsFile) && fs.statSync(agentsFile).isFile()) {
    removePath(agentsFile);
    log('  DEL   AGENTS.md');
    removed += 1;
  }
  removed += uninstallSkills(targetDir, log);
  return removed;
}

function uninstallTarget(targetDir, options = {}) {
  const log = options.log ?? console.log;
  const removeAlias = options.removeAlias ?? true;
  let removed = 0;

  for (const category of [...CATEGORIES, ...LEGACY_CATEGORIES]) {
    const target = path.join(targetDir, category);
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      removePath(target);
      log(`  DEL   ${category}/`);
      removed += 1;
    }
  }

  removed += uninstallSkills(targetDir, log);

  for (const entry of listEntries(sourceDir)) {
    if (!entry.isFile()) continue;
    if (SOURCE_ONLY_ROOT_FILES.has(entry.name)) continue;

    const target = path.join(targetDir, entry.name);
    if (fs.existsSync(target) && fs.statSync(target).isFile()) {
      removePath(target);
      log(`  DEL   ${entry.name}`);
      removed += 1;
    }
  }

  {
    const settings = targetDir === defaultGeminiDir() ? geminiSettingsObject() : claudeSettingsObject();
    const target = path.join(targetDir, 'settings.json');
    if (splitSettings(settings, target)) {
      log('  SPLIT settings.json');
      removed += 1;
    }
  }

  if (removeAlias) {
    unsetWtAddAlias(log);
  }

  return removed;
}

// 구버전에서 등록하던 글로벌 git wt-add alias를 제거한다. 워크트리 의존성 복구는
// 이제 PostToolUse self-heal hook(post-worktree-install / post-enterworktree-install)이
// 전담하므로 alias는 폐기한다. sync/unsync 모두에서 호출해 잔여 alias를 정리한다.
function unsetWtAddAlias(log = console.log) {
  const result = childProcess.spawnSync('git', ['config', '--global', '--unset', 'alias.wt-add'], {
    stdio: 'ignore',
  });
  if (result.error && result.error.code !== 'ENOENT') {
    throw result.error;
  }
  log('  OK   git wt-add 제거 완료');
}

export {
  CATEGORIES,
  SOURCE_ONLY_ROOT_FILES,
  baseSettingsSource,
  buildCodexAgentsContent,
  buildGeminiAgentsContent,
  claudeSettingsObject,
  codexHooksObject,
  geminiSettingsObject,
  comparePaths,
  compareSkillPaths,
  copyPath,
  defaultCodexDir,
  defaultClaudeDir,
  defaultGeminiDir,
  deployCodexGlobals,
  deployGeminiGlobals,
  deployRootFiles,
  deploySkills,
  ensureDeploySource,
  ensureDir,
  injectSkillName,
  listEntries,
  mergeSettings,
  readJson,
  readManagedKeys,
  compareRulePaths,
  renderSkillMd,
  renderSkillSubMd,
  resolveRulePaths,
  withAnchor,
  removePath,
  unsetWtAddAlias,
  repoDir,
  resolveUserPath,
  settingsManifestPath,
  sourceDir,
  splitSettings,
  writeJson,
  trustCodexHooks,
  uninstallCodexGlobals,
  uninstallGeminiGlobals,
  uninstallTarget,
  verifyJsonExact,
  verifySettings,
};
