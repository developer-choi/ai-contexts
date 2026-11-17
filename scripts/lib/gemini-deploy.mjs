import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  collectMarkdown,
  mainCheckoutDir,
  readJson,
  removePath,
  repoDir,
  sourceDir,
  writeIfChanged,
} from './deploy-lib.mjs';

const GEMINI_HOOK_GROUP_KEY = 'ac-global-shell-policy';
const GEMINI_RULES_HEADER = '<!-- managed-by: ai-contexts -->';
const CLAUDE_HOOK_COMMAND = /^node "\$\{CLAUDE_PLUGIN_ROOT\}\/hooks\/([^"/]+\.mjs)"$/;

// Claude Code 툴 매처 → Antigravity 툴 매처 변환표.
const TOOL_MATCHER_MAP = new Map([
  ['Bash|PowerShell|Monitor', 'run_command'],
  ['Write', 'write_file'],
  ['Edit|Write', 'write_file|edit_file'],
  ['Agent', 'invoke_subagent'],
]);

// Antigravity에 대응 툴이 없는 Claude 전용 매처.
const CLAUDE_ONLY_MATCHERS = new Set([
  'EnterWorktree',
  'Skill',
  'Read',
  'Glob|Grep|Edit|Write',
  'mcp__claude-in-chrome__.*',
  'mcp__claude-in-chrome__(computer|form_input|javascript_tool|file_upload|upload_image|shortcuts_execute|browser_batch)',
]);

// Antigravity에 대응 이벤트가 없거나 동작 방식이 달라 전역 투영에서 제외하는 이벤트.
const EXCLUDED_EVENTS = new Map([
  ['UserPromptSubmit', 'Antigravity에 UserPromptSubmit 이벤트 없음'],
  ['Stop', 'Antigravity continuationActive 동작 차이로 별도 검증 전 제외'],
]);

// Antigravity 스펙 차이로 제외하는 훅 목록 (파일명 → 사유).
// 새 훅이 plugins/ac/hooks/hooks.json에 추가되면 매핑되거나 여기에 사유와 함께 등록되어야 한다.
const EXCLUDED_HOOKS = new Map([
  ['check-artifact-write-policy.mjs', 'Antigravity 권한 모드에서 force_ask 프롬프트가 우회됨'],
  ['surface-claude-md.mjs', 'Antigravity PreToolUse 스펙에 additionalContext 없음'],
  ['surface-coupling.mjs', 'Antigravity PreToolUse 스펙에 additionalContext 없음'],
  ['check-md-code-labels.mjs', 'Antigravity PreToolUse 스펙에 additionalContext 없음'],
  ['check-md-hook-restatement.mjs', 'Antigravity PreToolUse 스펙에 additionalContext 없음'],
  ['check-md-rule-as-code.mjs', 'Antigravity PreToolUse 스펙에 additionalContext 없음'],
  ['check-md-rule-example.mjs', 'Antigravity PreToolUse 스펙에 additionalContext 없음'],
  ['check-skill-purpose-section.mjs', 'Antigravity PreToolUse 스펙에 additionalContext 없음'],
  ['surface-skill-creator.mjs', 'Antigravity PostToolUse 스펙에 additionalContext 없음'],
  ['surface-sub-file.mjs', 'Antigravity PostToolUse 스펙에 additionalContext 없음'],
  ['score-writing-package.mjs', 'Antigravity PostToolUse 스펙에 additionalContext 없음'],
  ['check-script-types.mjs', 'Antigravity PostToolUse 스펙에 additionalContext 없음'],
  ['surface-subagent-status.mjs', 'Antigravity PostToolUse 스펙에 additionalContext 없음'],
  ['check-company-analysis-agent.mjs', 'Claude Agent.name 파라미터 전용'],
  ['check-code-review-caller.mjs', 'Claude Skill 툴 전용'],
  ['check-browser-write-policy.mjs', 'Claude in Chrome MCP 전용'],
  ['record-browser-tab-url.mjs', 'Claude in Chrome MCP 전용'],
  ['hint-browser-disconnect.mjs', 'Claude in Chrome MCP 전용'],
  ['post-enterworktree-install.mjs', 'Claude EnterWorktree 툴 전용'],
  ['surface-backlog.mjs', 'UserPromptSubmit 이벤트 전용'],
  ['check-response-language.mjs', 'Stop 이벤트 제외'],
  ['check-table-render.mjs', 'Stop 이벤트 제외'],
]);

const TIMEOUT_OVERRIDES = new Map([
  ['post-worktree-install.mjs', 30],
]);

/** Returns the default Antigravity global configuration directory (~/.gemini/config). */
function defaultGeminiConfigDir() {
  return path.join(os.homedir(), '.gemini', 'config');
}

function toPosixPath(p) {
  return p.split(path.sep).join('/');
}

function claudeHooksSourcePath() {
  return path.join(repoDir, 'plugins', 'ac', 'hooks', 'hooks.json');
}

function geminiMcpSourcePath() {
  return path.join(sourceDir, 'gemini-mcp.json');
}

/**
 * Projects supported hooks from plugins/ac/hooks/hooks.json into Antigravity hooks.json format.
 * Uses mainCheckoutDir() so syncing from a temporary worktree never writes stale worktree paths.
 */
function buildGeminiHooksObject(acRoot = mainCheckoutDir()) {
  const raw = readJson(claudeHooksSourcePath());
  const hooksByEvent = raw.hooks ?? {};
  const adapterPath = toPosixPath(path.join(acRoot, '.agents', 'agy-hook-adapter.mjs'));
  const groupObj = {};

  for (const event of ['PreToolUse', 'PostToolUse']) {
    const groups = hooksByEvent[event] ?? [];
    const projectedGroups = [];

    for (const group of groups) {
      const agyMatcher = TOOL_MATCHER_MAP.get(group.matcher);
      if (!agyMatcher) continue;

      const agyHooks = [];
      for (const h of group.hooks ?? []) {
        if (h.type !== 'command') continue;
        const match = h.command?.match(CLAUDE_HOOK_COMMAND);
        if (!match) continue;
        const file = match[1];
        if (EXCLUDED_HOOKS.has(file)) continue;

        const hookPath = toPosixPath(path.join(acRoot, 'plugins', 'ac', 'hooks', file));
        agyHooks.push({
          type: 'command',
          command: `node "${adapterPath}" "${hookPath}"`,
          timeout: TIMEOUT_OVERRIDES.get(file) ?? 10,
        });
      }

      if (agyHooks.length > 0) {
        projectedGroups.push({ matcher: agyMatcher, hooks: agyHooks });
      }
    }

    if (projectedGroups.length > 0) {
      groupObj[event] = projectedGroups;
    }
  }

  return { [GEMINI_HOOK_GROUP_KEY]: groupObj };
}

/**
 * Inspects every hook entry in plugins/ac/hooks/hooks.json and returns any entries
 * that are neither projected into Antigravity nor explicitly accounted for in EXCLUDED_HOOKS / EXCLUDED_EVENTS.
 */
function findUnclassifiedGeminiHooks() {
  const raw = readJson(claudeHooksSourcePath());
  const hooksByEvent = raw.hooks ?? {};
  const unclassified = [];

  for (const [event, groups] of Object.entries(hooksByEvent)) {
    if (EXCLUDED_EVENTS.has(event)) continue;
    for (const group of groups) {
      const matcher = group.matcher ?? '';
      if (CLAUDE_ONLY_MATCHERS.has(matcher)) continue;
      for (const h of group.hooks ?? []) {
        if (h.type !== 'command') continue;
        const match = h.command?.match(CLAUDE_HOOK_COMMAND);
        const file = match?.[1];
        if (!file) {
          unclassified.push(`${event} | ${matcher} | ${h.command}`);
          continue;
        }
        if (TOOL_MATCHER_MAP.has(matcher)) continue;
        if (!EXCLUDED_HOOKS.has(file)) {
          unclassified.push(`${event} | ${matcher} | ${file}`);
        }
      }
    }
  }
  return unclassified;
}

/** Builds consolidated GEMINI.md content from deploy/CLAUDE.md and deploy/rules/*.md. */
function buildGeminiRulesContent(srcRoot = sourceDir) {
  const parts = [];
  const rootClaude = path.join(srcRoot, 'CLAUDE.md');
  if (fs.existsSync(rootClaude)) {
    parts.push(fs.readFileSync(rootClaude, 'utf8').trim());
  }
  for (const ruleFile of collectMarkdown(path.join(srcRoot, 'rules'))) {
    parts.push(fs.readFileSync(ruleFile, 'utf8').trim());
  }
  return `${GEMINI_RULES_HEADER}\n\n${parts.join('\n\n')}\n`;
}

function geminiMcpObject() {
  return readJson(geminiMcpSourcePath());
}

function mcpManifestPath(targetPath) {
  return path.join(path.dirname(targetPath), `.${path.basename(targetPath)}.ac-keys`);
}

function readManagedMcpKeys(targetPath) {
  const manifest = mcpManifestPath(targetPath);
  if (!fs.existsSync(manifest)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJsonIfChanged(file, obj) {
  return writeIfChanged(file, `${JSON.stringify(obj, null, 2)}\n`);
}

/** Deploys global hooks, MCP config, and GEMINI.md to ~/.gemini/config. */
function deployGeminiTarget(geminiConfigDir = defaultGeminiConfigDir(), log = console.log, acRoot = mainCheckoutDir()) {
  let changed = 0;

  const hooksFile = path.join(geminiConfigDir, 'hooks.json');
  const existingHooks = fs.existsSync(hooksFile) ? readJson(hooksFile) : {};
  const projectedHooks = buildGeminiHooksObject(acRoot);
  const mergedHooks = { ...existingHooks, ...projectedHooks };
  if (writeJsonIfChanged(hooksFile, mergedHooks)) {
    log('  WRITE hooks.json (gemini)');
    changed += 1;
  }

  const mcpFile = path.join(geminiConfigDir, 'mcp_config.json');
  const existingMcp = fs.existsSync(mcpFile) ? readJson(mcpFile) : {};
  const sourceServers = geminiMcpObject().mcpServers ?? {};
  const prevKeys = readManagedMcpKeys(mcpFile);
  const nextKeys = Object.keys(sourceServers);
  const nextServers = { ...(existingMcp.mcpServers ?? {}) };
  for (const stale of prevKeys) {
    if (!(stale in sourceServers)) delete nextServers[stale];
  }
  Object.assign(nextServers, sourceServers);
  const mergedMcp = { ...existingMcp, mcpServers: nextServers };
  if (writeJsonIfChanged(mcpFile, mergedMcp)) {
    log('  WRITE mcp_config.json (gemini)');
    changed += 1;
  }
  writeJsonIfChanged(mcpManifestPath(mcpFile), nextKeys);

  const rulesFile = path.join(geminiConfigDir, 'GEMINI.md');
  if (writeIfChanged(rulesFile, buildGeminiRulesContent())) {
    log('  WRITE GEMINI.md (gemini)');
    changed += 1;
  }

  return changed;
}

/** Verifies that ~/.gemini/config matches the projected hooks, MCP servers, and GEMINI.md. */
function verifyGeminiTarget(geminiConfigDir = defaultGeminiConfigDir(), acRoot = mainCheckoutDir()) {
  const failures = [];

  const hooksFile = path.join(geminiConfigDir, 'hooks.json');
  const expectedHooks = buildGeminiHooksObject(acRoot)[GEMINI_HOOK_GROUP_KEY];
  if (!fs.existsSync(hooksFile)) {
    failures.push('gemini hooks.json 존재하지 않음');
  } else {
    const actual = readJson(hooksFile)[GEMINI_HOOK_GROUP_KEY];
    if (JSON.stringify(actual) !== JSON.stringify(expectedHooks)) {
      failures.push('gemini hooks.json 내용 불일치');
    }
  }

  const mcpFile = path.join(geminiConfigDir, 'mcp_config.json');
  const expectedServers = geminiMcpObject().mcpServers ?? {};
  if (!fs.existsSync(mcpFile)) {
    failures.push('gemini mcp_config.json 존재하지 않음');
  } else {
    const actualServers = readJson(mcpFile).mcpServers ?? {};
    for (const [name, cfg] of Object.entries(expectedServers)) {
      if (JSON.stringify(actualServers[name]) !== JSON.stringify(cfg)) {
        failures.push(`gemini mcp_config.json 서버 불일치: ${name}`);
      }
    }
  }

  const rulesFile = path.join(geminiConfigDir, 'GEMINI.md');
  if (!fs.existsSync(rulesFile)) {
    failures.push('gemini GEMINI.md 존재하지 않음');
  } else {
    const actualRules = fs.readFileSync(rulesFile, 'utf8').replace(/\r\n/g, '\n');
    if (actualRules !== buildGeminiRulesContent()) {
      failures.push('gemini GEMINI.md 내용 불일치');
    }
  }

  return failures;
}

/** Removes AC-managed entries from ~/.gemini/config while preserving user entries. */
function uninstallGeminiTarget(geminiConfigDir = defaultGeminiConfigDir(), log = console.log) {
  let removed = 0;

  const hooksFile = path.join(geminiConfigDir, 'hooks.json');
  if (fs.existsSync(hooksFile)) {
    const hooksObj = readJson(hooksFile);
    if (GEMINI_HOOK_GROUP_KEY in hooksObj) {
      delete hooksObj[GEMINI_HOOK_GROUP_KEY];
      if (Object.keys(hooksObj).length === 0) {
        removePath(hooksFile);
        log('  DEL   gemini/hooks.json');
      } else {
        writeJsonIfChanged(hooksFile, hooksObj);
        log('  EDIT  gemini/hooks.json (ac-global-shell-policy 제거)');
      }
      removed += 1;
    }
  }

  const mcpFile = path.join(geminiConfigDir, 'mcp_config.json');
  const manifest = mcpManifestPath(mcpFile);
  if (fs.existsSync(mcpFile)) {
    const mcpObj = readJson(mcpFile);
    const managedKeys = readManagedMcpKeys(mcpFile);
    const fallbackKeys = Object.keys(geminiMcpObject().mcpServers ?? {});
    const keysToRemove = managedKeys.length > 0 ? managedKeys : fallbackKeys;
    const servers = { ...(mcpObj.mcpServers ?? {}) };
    let changedMcp = false;
    for (const key of keysToRemove) {
      if (key in servers) {
        delete servers[key];
        changedMcp = true;
      }
    }
    if (changedMcp) {
      if (Object.keys(servers).length === 0 && Object.keys(mcpObj).every((k) => k === 'mcpServers')) {
        removePath(mcpFile);
        log('  DEL   gemini/mcp_config.json');
      } else {
        writeJsonIfChanged(mcpFile, { ...mcpObj, mcpServers: servers });
        log('  EDIT  gemini/mcp_config.json (AC 서버 제거)');
      }
      removed += 1;
    }
  }
  if (fs.existsSync(manifest)) {
    removePath(manifest);
  }

  const rulesFile = path.join(geminiConfigDir, 'GEMINI.md');
  if (fs.existsSync(rulesFile)) {
    const content = fs.readFileSync(rulesFile, 'utf8');
    if (content.startsWith(GEMINI_RULES_HEADER)) {
      removePath(rulesFile);
      log('  DEL   gemini/GEMINI.md');
      removed += 1;
    }
  }

  return removed;
}

export {
  EXCLUDED_EVENTS,
  EXCLUDED_HOOKS,
  GEMINI_HOOK_GROUP_KEY,
  buildGeminiHooksObject,
  buildGeminiRulesContent,
  defaultGeminiConfigDir,
  deployGeminiTarget,
  findUnclassifiedGeminiHooks,
  uninstallGeminiTarget,
  verifyGeminiTarget,
};
