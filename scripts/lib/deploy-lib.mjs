import childProcess from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CATEGORIES = ['contexts', 'hooks'];
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
// base-settings.json(공통 hook)과 Claude 전용 override(claude-settings.json).
const SOURCE_ONLY_ROOT_FILES = new Set(['base-settings.json', 'claude-settings.json']);

// 설정 = base에서 만든 것(hook) + override 파일. override가 우선(키 충돌 시 덮어씀).
function loadBaseSettings() {
  if (!fs.existsSync(baseSettingsSource) || !fs.statSync(baseSettingsSource).isFile()) {
    throw new Error(`base-settings.json을 찾을 수 없습니다: ${baseSettingsSource}`);
  }
  return readJson(baseSettingsSource);
}

// override 파일(없으면 {}). base 재료를 덮어쓰는 설정.
function loadOverride(name) {
  const overridePath = path.join(sourceDir, name);
  return fs.existsSync(overridePath) && fs.statSync(overridePath).isFile() ? readJson(overridePath) : {};
}

function claudeSettingsObject() {
  return { hooks: buildHooks(loadBaseSettings().hooks, 'claude'), ...loadOverride('claude-settings.json') };
}

function defaultClaudeDir() {
  return path.join(os.homedir(), '.claude');
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

// 배포는 바뀐 파일만 쓴다. 통째로 지우고 다시 쓰면 열려 있던 다른 세션이 바뀌지 않은 스킬까지
// 새로 받은 것으로 알림받아 다시 읽고(컨텍스트 낭비), 지운 뒤 다시 쓰는 사이에는 hook·스킬
// 파일이 수백 ms 동안 없다. 쓸 때는 같은 폴더의 임시 파일에 쓰고 rename해 반쯤 쓴 파일이
// 읽히지 않게 한다. 다른 프로세스가 잡고 있어 rename이 거부되면 직접 쓰기로 대신한다.
function writeIfChanged(file, content) {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
  if (fs.existsSync(file) && fs.statSync(file).isFile() && fs.readFileSync(file).equals(buf)) return false;
  ensureDir(path.dirname(file));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) removePath(file);
  const tmp = `${file}.ac-tmp`;
  fs.writeFileSync(tmp, buf);
  try {
    fs.renameSync(tmp, file);
  } catch (error) {
    if (!['EPERM', 'EBUSY', 'EACCES'].includes(error.code)) throw error;
    removePath(tmp);
    fs.writeFileSync(file, buf);
  }
  return true;
}

function listFilesRelative(dir, base = dir, found = []) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return found;
  for (const entry of listEntries(dir)) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listFilesRelative(full, base, found);
    else found.push(path.relative(base, full));
  }
  return found;
}

// 원본 폴더를 「상대 경로 → 내용」으로 읽는다. transform(rel, buf)이 배포본 내용을 돌려준다.
function readTreeEntries(srcDir, transform = (_rel, buf) => buf) {
  const entries = new Map();
  for (const rel of listFilesRelative(srcDir)) {
    entries.set(rel, transform(rel, fs.readFileSync(path.join(srcDir, rel))));
  }
  return entries;
}

// destDir을 entries 상태로 맞춘다. 내용이 다른 파일만 쓰고, entries에 없는 파일은 지운다.
// keep(rel)이 참인 파일은 AC 소유가 아니라 건드리지 않는다(외부 스킬 등).
function syncTree(destDir, entries, { keep = () => false } = {}) {
  const written = [];
  const removed = [];
  if (fs.existsSync(destDir) && !fs.statSync(destDir).isDirectory()) removePath(destDir);
  for (const [rel, buf] of entries) {
    if (writeIfChanged(path.join(destDir, rel), buf)) written.push(rel);
  }
  for (const rel of listFilesRelative(destDir)) {
    if (entries.has(rel) || keep(rel)) continue;
    removePath(path.join(destDir, rel));
    removed.push(rel);
  }
  removeEmptyDirs(destDir, keep);
  return { written, removed };
}

function removeEmptyDirs(dir, keep, base = dir) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return;
  for (const entry of listEntries(dir)) {
    if (!entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    if (keep(path.relative(base, full))) continue;
    removeEmptyDirs(full, keep, base);
    if (fs.readdirSync(full).length === 0) fs.rmdirSync(full);
  }
}

function logTreeChanges(log, prefix, { written, removed }) {
  for (const rel of written) log(`  WRITE ${prefix}${rel.replaceAll(path.sep, '/')}`);
  for (const rel of removed) log(`  DEL   ${prefix}${rel.replaceAll(path.sep, '/')}`);
  return written.length + removed.length;
}

function readJson(file) {
  const raw = fs.readFileSync(file, 'utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

// 전역 CLAUDE.md·rules는 복사하지 않는다. 타겟 `CLAUDE.md`에 AC 원본을 가리키는 `@` import 줄을 두어
// Claude Code가 원본을 직접 읽게 한다(공식 기능, https://code.claude.com/docs/en/memory). 그래서 원본을
// 고치면 sync 없이 다음 세션에 실리고, 타겟 `rules/`는 사용자 영역으로 남는다.
const IMPORTED_ROOT_FILES = new Set(['CLAUDE.md']);

// AC가 넣은 import 줄. 체크아웃 위치가 달라도 같은 줄로 알아보게 경로 꼬리로 가른다.
const AC_IMPORT_LINE = /^@\S*\/deploy\/(?:CLAUDE\.md|rules\/\S+\.md)$/;

// import 줄이 가리킬 원본은 본 체크아웃의 `deploy/`다. 워크트리에서 sync해도 워크트리 경로를 박으면,
// 워크트리를 지우는 순간 전역 규칙이 조용히 사라진다.
function importSourceDir() {
  const result = childProcess.spawnSync('git', ['-C', repoDir, 'rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8' });
  if (result.status !== 0) return sourceDir;
  return path.join(path.dirname(path.resolve(result.stdout.trim())), 'deploy');
}

// 홈 아래 경로는 `~/`로 적는다. 기기마다 사용자 이름이 달라도 같은 줄이 된다.
function importPath(file) {
  const rel = path.relative(os.homedir(), file);
  const inHome = rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
  return inHome ? `~/${rel.split(path.sep).join('/')}` : file.split(path.sep).join('/');
}

function claudeImportLines(srcRoot = importSourceDir()) {
  const files = [...IMPORTED_ROOT_FILES]
    .map((name) => path.join(srcRoot, name))
    .filter((file) => fs.existsSync(file));
  files.push(...collectMarkdown(path.join(srcRoot, 'rules')));
  return files.map((file) => `@${importPath(file)}`);
}

function hasAcImportLine(content) {
  return content.split(/\r?\n/).some((row) => AC_IMPORT_LINE.test(row.trim()));
}

// 예전 sync가 통째로 복사해 둔 사본인가. 지금 원본만이 아니라 git 이력의 모든 버전과 대조한다 —
// pull로 원본이 함께 바뀐 기기에는 옛 버전 사본이 남아 있다. 어느 것과도 다르면 사용자가 쓴 파일이다.
function isPastClaudeMdCopy(content) {
  const normalize = (text) => text.replace(/\r\n/g, '\n');
  const target = normalize(content);
  const current = path.join(sourceDir, 'CLAUDE.md');
  if (fs.existsSync(current) && normalize(fs.readFileSync(current, 'utf8')) === target) return true;
  const git = (args) => childProcess.spawnSync('git', ['-C', repoDir, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const history = git(['log', '--format=%H', '--', 'deploy/CLAUDE.md']);
  if (history.status !== 0) return false;
  return history.stdout.split('\n').filter(Boolean).some((sha) => {
    const shown = git(['show', `${sha}:deploy/CLAUDE.md`]);
    return shown.status === 0 && normalize(shown.stdout) === target;
  });
}

function trimBlankEdges(rows) {
  let start = 0;
  let end = rows.length;
  while (start < end && rows[start].trim() === '') start += 1;
  while (end > start && rows[end - 1].trim() === '') end -= 1;
  return rows.slice(start, end);
}

// AC import 줄을 뺀 나머지(사용자가 적은 줄).
function userRows(content) {
  return trimBlankEdges(content.split(/\r?\n/).filter((row) => !AC_IMPORT_LINE.test(row.trim())));
}

// 타겟 CLAUDE.md의 새 내용. 예전 사본이면 import 줄로 바꾸고(남기면 같은 규칙이 두 번 실린다),
// 사용자가 쓴 줄은 import 줄 아래에 남긴다.
function claudeMdContent(current, lines) {
  const head = `${lines.join('\n')}\n`;
  if (current === null) return head;
  const kept = hasAcImportLine(current) ? userRows(current)
    : isPastClaudeMdCopy(current) ? []
      : trimBlankEdges(current.split(/\r?\n/));
  return kept.length > 0 ? `${head}\n${kept.join('\n')}\n` : head;
}

// 예전 sync가 타겟 `rules/`에 복사한 원본 이름의 파일을 지운다. 남기면 import와 함께 두 번 실린다.
// 타겟 CLAUDE.md에 AC import 줄이 없을 때(첫 전환, 사용자가 줄을 지운 뒤 다시 sync)만 부른다.
// import 줄이 있는 동안 사용자가 같은 이름으로 만든 파일은 사용자 것이다.
function retireRuleCopies(targetDir, log, srcRoot = sourceDir) {
  const srcRules = path.join(srcRoot, 'rules');
  const targetRules = path.join(targetDir, 'rules');
  let removed = 0;
  for (const file of collectMarkdown(srcRules)) {
    const rel = path.relative(srcRules, file);
    const copy = path.join(targetRules, rel);
    if (!fs.existsSync(copy)) continue;
    removePath(copy);
    log(`  DEL   rules/${rel.replaceAll(path.sep, '/')}`);
    removed += 1;
  }
  if (fs.existsSync(targetRules) && fs.statSync(targetRules).isDirectory() && listFilesRelative(targetRules).length === 0) {
    removePath(targetRules);
  }
  return removed;
}

function deployClaudeImports(targetDir, log, srcRoot = importSourceDir()) {
  const file = path.join(targetDir, 'CLAUDE.md');
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  const transition = current === null || !hasAcImportLine(current);
  const changed = writeFileLogged(file, claudeMdContent(current, claudeImportLines(srcRoot)), log, 'CLAUDE.md (import)');
  return changed + (transition ? retireRuleCopies(targetDir, log) : 0);
}

// 대조: AC import 줄이 원본 목록과 같은 순서로 다 있다.
function verifyClaudeImports(targetDir, srcRoot = importSourceDir()) {
  const file = path.join(targetDir, 'CLAUDE.md');
  if (!fs.existsSync(file)) return false;
  const actual = fs.readFileSync(file, 'utf8').split(/\r?\n/).map((row) => row.trim()).filter((row) => AC_IMPORT_LINE.test(row));
  return actual.join('\n') === claudeImportLines(srcRoot).join('\n');
}

// AC import 줄만 걷는다. 사용자가 적은 줄이 남으면 파일을 두고, 없으면 지운다. import 줄 없는 파일은
// 예전 사본일 때만 지우고(그 사본이 둔 rules 사본도 함께), 사용자가 쓴 파일이면 손대지 않는다.
function uninstallClaudeImports(targetDir, log) {
  const file = path.join(targetDir, 'CLAUDE.md');
  if (!fs.existsSync(file)) return 0;
  const content = fs.readFileSync(file, 'utf8');
  if (!hasAcImportLine(content)) {
    if (!isPastClaudeMdCopy(content)) return 0;
    removePath(file);
    log('  DEL   CLAUDE.md');
    return 1 + retireRuleCopies(targetDir, log);
  }
  const rest = userRows(content);
  if (rest.length > 0) {
    fs.writeFileSync(file, `${rest.join('\n')}\n`, 'utf8');
    log('  EDIT  CLAUDE.md (ai-contexts가 넣은 import 줄만 걷음)');
    return 0;
  }
  removePath(file);
  log('  DEL   CLAUDE.md');
  return 1;
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

  const settingsChanged = writeIfChanged(targetPath, `${JSON.stringify({ ...existing, ...deploy }, null, 2)}\n`);
  const manifestChanged = writeIfChanged(settingsManifestPath(targetPath), `${JSON.stringify(deployKeys)}\n`);
  return settingsChanged || manifestChanged;
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

function stableJson(value) {
  return JSON.stringify(value);
}

function listEntries(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
}

// SKILL.md frontmatter에 name이 없으면 폴더명을 주입한 내용을 반환한다.
// 소스가 name을 빠뜨렸을 때의 안전망이다. 이미 name이 있으면 그대로 둔다(멱등).
// 원래는 frontmatter name이 있어야 스킬을 인식하던 다른 런타임 때문에 넣었다. Claude는 폴더명으로
// 잡으므로 지금은 배포본에 name 한 줄을 더할 뿐이고, 걷으면 배포본이 바뀌어 따로 정한다.
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
// 있는지를 알아야 한다. Claude Code는 SKILL.md를 로드할 때 그 경로를 대화에 함께 넣지만,
// 스킬이 Read로 여는 하위 md에는 그런 안내가 없다. 그래서 배포가 대신 적어둔다 — 배포
// 시점에는 타겟 경로가 확정돼 있다. SKILL.md에서는 같은 정보가 한 줄 겹칠 뿐이다.
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
// 전역 contexts(`~/.claude/contexts`)를 직접 넘긴다.
function contextsDirForSkill(skillDir) {
  return path.resolve(skillDir, '..', '..', 'contexts');
}

const CONTEXTS_TOKEN = '{{contexts}}';

// 여러 스킬이 함께 쓰는 contexts 스크립트를 부를 때 쓴다. `{{skill_dir}}`은 자기 폴더와 형제 스킬
// 폴더만 가리킬 수 있어 이 경우를 못 덮는다.
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
// 채운다 — 어느 하위 파일에 적든 `{{skill_dir}}/scripts/session-state.mjs`가 같은 곳을 가리키게.
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

// 배포할 skills/ 내용(skills 폴더 기준 상대 경로). 복사한 뒤 injectSkillName을 돌린 결과와
// 같은 것을 파일에 쓰기 전에 만든다. 최상위의 스킬 폴더가 아닌 파일은 그대로 둔다.
function skillEntries(srcSkillsDir, targetSkillsDir, contextsFor = contextsDirForSkill) {
  const entries = new Map();
  for (const entry of listEntries(srcSkillsDir)) {
    const src = path.join(srcSkillsDir, entry.name);
    if (!entry.isDirectory()) {
      entries.set(entry.name, fs.readFileSync(src));
      continue;
    }
    const skillDir = path.join(targetSkillsDir, entry.name);
    const contextsDir = contextsFor(skillDir);
    const rendered = readTreeEntries(src, (rel, buf) => {
      const file = path.join(skillDir, rel);
      if (!rel.endsWith('.md') || anchorExcluded(skillDir, file)) return buf;
      const raw = buf.toString('utf8');
      return Buffer.from(rel === 'SKILL.md'
        ? renderSkillMd(raw, skillDir, contextsDir)
        : renderSkillSubMd(raw, path.dirname(file), skillDir, contextsDir), 'utf8');
    });
    for (const [rel, buf] of rendered) entries.set(path.join(entry.name, rel), buf);
  }
  return entries;
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

// 아래 deploy* 함수는 바꾼 파일 수(쓰기·지우기)를 돌려준다. 0이면 그 타겟은 손대지 않았다.

function writeFileLogged(file, content, log, label) {
  if (!writeIfChanged(file, content)) return 0;
  log(`  WRITE ${label}`);
  return 1;
}

function deployRootFiles(targetDir, log) {
  let changed = 0;
  for (const entry of listEntries(sourceDir)) {
    if (!entry.isFile()) continue;
    if (SOURCE_ONLY_ROOT_FILES.has(entry.name) || IMPORTED_ROOT_FILES.has(entry.name)) continue;

    changed += writeFileLogged(path.join(targetDir, entry.name), fs.readFileSync(path.join(sourceDir, entry.name)), log, entry.name);
  }
  changed += deployClaudeImports(targetDir, log);

  if (mergeSettings(claudeSettingsObject(), path.join(targetDir, 'settings.json'))) {
    log('  MERGE settings.json');
    changed += 1;
  }
  return changed;
}

// contexts·hooks 중 하나를 원본 상태로 맞춘다. 폴더 전체가 AC 소유라 원본에 없는 파일은 지운다.
function deployCategory(targetDir, category, log, srcRoot = sourceDir) {
  const src = path.join(srcRoot, category);
  if (!fs.existsSync(src) || !fs.statSync(src).isDirectory()) return 0;
  return logTreeChanges(log, `${category}/`, syncTree(path.join(targetDir, category), readTreeEntries(src)));
}

// 예전 배포에만 있던 카테고리가 남아 있으면 지운다.
function removeLegacyCategories(targetDir, log) {
  let removed = 0;
  for (const category of LEGACY_CATEGORIES) {
    const target = path.join(targetDir, category);
    if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) continue;
    removePath(target);
    log(`  DEL   ${category}/`);
    removed += 1;
  }
  return removed;
}

function deploySkills(targetDir, log, srcRoot = sourceDir) {
  const srcSkills = path.join(srcRoot, 'skills');
  if (!fs.existsSync(srcSkills) || !fs.statSync(srcSkills).isDirectory()) return 0;

  const targetSkills = path.join(targetDir, 'skills');
  // 보존 목록의 스킬은 AC가 배포한 것이 아니라 건드리지 않는다.
  const keep = (rel) => SKILLS_PRESERVE.has(rel.split(path.sep)[0]);
  return logTreeChanges(log, 'skills/', syncTree(targetSkills, skillEntries(srcSkills, targetSkills), { keep }));
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
  removed += uninstallClaudeImports(targetDir, log);

  for (const entry of listEntries(sourceDir)) {
    if (!entry.isFile()) continue;
    if (SOURCE_ONLY_ROOT_FILES.has(entry.name) || IMPORTED_ROOT_FILES.has(entry.name)) continue;

    const target = path.join(targetDir, entry.name);
    if (fs.existsSync(target) && fs.statSync(target).isFile()) {
      removePath(target);
      log(`  DEL   ${entry.name}`);
      removed += 1;
    }
  }

  if (splitSettings(claudeSettingsObject(), path.join(targetDir, 'settings.json'))) {
    log('  SPLIT settings.json');
    removed += 1;
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
  IMPORTED_ROOT_FILES,
  SOURCE_ONLY_ROOT_FILES,
  baseSettingsSource,
  claudeImportLines,
  deployClaudeImports,
  uninstallClaudeImports,
  verifyClaudeImports,
  claudeSettingsObject,
  comparePaths,
  compareSkillPaths,
  copyPath,
  defaultClaudeDir,
  deployCategory,
  deployRootFiles,
  deploySkills,
  ensureDeploySource,
  ensureDir,
  injectSkillName,
  listEntries,
  mergeSettings,
  logTreeChanges,
  readJson,
  readManagedKeys,
  readTreeEntries,
  removeLegacyCategories,
  skillEntries,
  syncTree,
  writeIfChanged,
  renderSkillMd,
  renderSkillSubMd,
  withAnchor,
  removePath,
  unsetWtAddAlias,
  repoDir,
  resolveUserPath,
  settingsManifestPath,
  sourceDir,
  splitSettings,
  writeJson,
  uninstallTarget,
  verifySettings,
};
