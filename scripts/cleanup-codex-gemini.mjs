#!/usr/bin/env node
// 사용법: cleanup-codex-gemini.md (같은 폴더)
//
// 일회용: 예전 sync가 Codex·Gemini(Antigravity) 쪽에 배포한 AC 산출물을 걷는다.
//
// AC는 Claude Code 전용으로 줄었고, sync·unsync는 더 이상 ~/.codex·~/.gemini를 모른다.
// 그래서 이 커밋 전에 배포해 둔 기기에는 산출물이 그대로 남는다. 각 기기에서 한 번씩 돌린다.
//
// AC 산출물만 지운다. 사용자 소유 파일(auth.json·config.toml의 다른 섹션·sessions/·
// oauth_creds.json·antigravity-cli/ 등)은 건드리지 않는다.
//
// 모든 기기에서 돌린 뒤 이 파일을 지운다
// (backlog projects/ai-contexts/dev-active/sync/다른-기기에-남은-Codex·Gemini-배포-산출물을-걷은-뒤-일회용-정리-수단을-AC에서-지운다.md).
import childProcess from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { defaultLocalRoots, listLocalRepos } from './local-system/local-deploy-lib.mjs';

// 배포 렌더가 frontmatter 바로 뒤에 심는 두 줄. 본문이 마커만 인용한 사용자 스킬과 가르려고 다음 줄까지 본다.
const ANCHOR_BLOCK = /^<!-- deploy-anchor -->\r?\n이 파일은 `/m;

const args = process.argv.slice(2);
const unknown = args.filter((a) => a.startsWith('--') && a !== '--apply');
if (unknown.length > 0) {
  console.error(`알 수 없는 옵션: ${unknown.join(' ')} (쓸 수 있는 것은 --apply뿐)`);
  process.exit(1);
}
const apply = args.includes('--apply');
const roots = args.filter((a) => a !== '--apply').map((r) => path.resolve(r));

const actions = [];
const skipped = [];

// 레포가 git으로 추적하는 파일이 그 경로(파일 또는 폴더) 아래 하나라도 있는가.
function isTracked(repo, rel) {
  const result = childProcess.spawnSync('git', ['-C', repo, 'ls-files', '--', rel], { encoding: 'utf8' });
  return result.status === 0 && result.stdout.trim() !== '';
}

function isAcSkill(skillDir) {
  const skillMd = path.join(skillDir, 'SKILL.md');
  return isFile(skillMd) && ANCHOR_BLOCK.test(fs.readFileSync(skillMd, 'utf8'));
}

function plan(label, run) {
  actions.push({ label, run });
}

function exists(p) {
  return fs.existsSync(p);
}

function isDir(p) {
  return exists(p) && fs.statSync(p).isDirectory();
}

function isFile(p) {
  return exists(p) && fs.statSync(p).isFile();
}

function planRemove(p) {
  if (!exists(p)) return;
  plan(`DEL   ${p}`, () => fs.rmSync(p, { recursive: true, force: true }));
}

// AC가 배포한 스킬은 SKILL.md의 frontmatter 뒤에 deploy-anchor 표식이 있다. 표식 없는 스킬은 사용자 것이다.
function planRemoveAcSkills(home) {
  const skillsDir = path.join(home, 'skills');
  if (!isDir(skillsDir)) return;
  for (const name of fs.readdirSync(skillsDir)) {
    if (isAcSkill(path.join(skillsDir, name))) planRemove(path.join(skillsDir, name));
  }
}

// local/<X>를 그대로 복사한 .agents/<X>에서, 원본과 내용이 같은 파일만 지운다.
function planRemoveCopies(srcDir, destDir) {
  if (!isDir(srcDir) || !isDir(destDir)) return;
  for (const entry of fs.readdirSync(destDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) planRemoveCopies(src, dest);
    else if (isFile(src) && fs.readFileSync(src).equals(fs.readFileSync(dest))) planRemove(dest);
  }
}

// 지운 뒤 빈 폴더만 남으면 아래에서 위로 지운다.
function planRemoveEmptyDirs(dir) {
  if (!isDir(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) planRemoveEmptyDirs(path.join(dir, entry.name));
  }
  plan(`RMDIR ${dir} (비었으면)`, () => {
    if (isDir(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  });
}

// ~/.gemini/settings.json에서 AC가 넣은 키(.settings.json.ac-keys 매니페스트)만 뺀다.
function planSplitGeminiSettings(home) {
  const settings = path.join(home, 'settings.json');
  const manifest = path.join(home, '.settings.json.ac-keys');
  if (!isFile(manifest)) return;
  plan(`SPLIT ${settings} (AC 키만)`, () => {
    let keys = [];
    try {
      keys = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    } catch {
      keys = [];
    }
    if (isFile(settings)) {
      const raw = fs.readFileSync(settings, 'utf8').trim();
      const obj = raw ? JSON.parse(raw) : {};
      for (const key of Array.isArray(keys) ? keys : []) delete obj[key];
      if (Object.keys(obj).length === 0) fs.rmSync(settings, { force: true });
      else fs.writeFileSync(settings, `${JSON.stringify(obj, null, 2)}\n`, 'utf8');
    }
    fs.rmSync(manifest, { force: true });
  });
}

// ~/.codex/config.toml에서 AC hook trust 섹션만 뺀다. sync가 codex app-server로
// `[hooks.state.'<…>\.codex\hooks.json:<event>:<i>:<j>']` 섹션을 hook마다 써 두었다
// (전역 ~/.codex/hooks.json과 레포 로컬 .codex/hooks.json 둘 다).
// 섹션은 다음 `[` 머리줄 전까지다. 하위 섹션이 다 빠져 빈 `[hooks.state]`만 남으면 그것도 뺀다.
// 섹션을 뺀 자리에서 빈 줄이 겹치면 하나로 줄인다. 다른 곳의 빈 줄은 건드리지 않는다.
function planStripCodexTrust(home) {
  const config = path.join(home, 'config.toml');
  if (!isFile(config)) return;
  const text = fs.readFileSync(config, 'utf8');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  const isHeader = (line) => /^\s*\[/.test(line);
  const isAcTrust = (line) => /^\s*\[hooks\.state\.(?:'[^']*|"[^"]*)[\\/]\.codex[\\/]+hooks\.json:[^'"]*['"]\]\s*$/.test(line);
  const blank = (line) => line.trim() === '';

  const out = [];
  let skipping = false;
  let removed = 0;
  // 방금 섹션을 뺀 자리인가. 다음에 빈 줄 아닌 줄이 들어오면 풀린다.
  let atCut = false;
  for (const line of lines) {
    if (isHeader(line)) {
      skipping = isAcTrust(line);
      if (skipping) {
        removed += 1;
        atCut = true;
      }
    }
    if (skipping) continue;
    if (atCut && blank(line) && out.length > 0 && blank(out[out.length - 1])) continue;
    if (!blank(line)) atCut = false;
    out.push(line);
  }
  if (removed === 0) {
    if (/hooks\.state/.test(text) && /\.codex[\\/]+hooks\.json/.test(text)) {
      skipped.push(`${config} (hooks.state에 .codex hooks.json 항목이 있지만 섹션 머리줄 꼴이 달라 손대지 않음: 직접 확인)`);
    }
    return;
  }

  // 하위 섹션이 남지 않은 빈 [hooks.state] 머리줄을 뺀다.
  const hasSub = out.some((line) => /^\s*\[hooks\.state\./.test(line));
  let result = out;
  if (!hasSub) {
    result = [];
    for (let i = 0; i < out.length; i += 1) {
      if (/^\s*\[hooks\.state\]\s*$/.test(out[i])) {
        let j = i + 1;
        while (j < out.length && out[j].trim() === '') j += 1;
        if (j >= out.length || isHeader(out[j])) {
          i = j - 1;
          continue;
        }
      }
      result.push(out[i]);
    }
  }
  plan(`EDIT  ${config} (AC hook trust 섹션 ${removed}개)`, () => {
    fs.writeFileSync(config, result.join(eol), 'utf8');
  });
}

function planGlobal() {
  const codex = path.join(os.homedir(), '.codex');
  if (isDir(codex)) {
    for (const name of ['contexts', 'hooks', 'hooks.json', 'AGENTS.md']) planRemove(path.join(codex, name));
    planRemoveAcSkills(codex);
    planStripCodexTrust(codex);
  }
  const gemini = path.join(os.homedir(), '.gemini');
  if (isDir(gemini)) {
    for (const name of ['contexts', 'hooks', 'GEMINI.md']) planRemove(path.join(gemini, name));
    planRemoveAcSkills(gemini);
    planSplitGeminiSettings(gemini);
  }
}

// 레포 로컬: sync-local-skills가 local/<X>를 .agents/<X>로, CLAUDE.md를 AGENTS.md·GEMINI.md로
// 복사했고, sync-local-system이 .codex/hooks.json·.codex/hooks/를 썼다.
// git이 추적하는 경로는 레포가 커밋해 둔 것이라 지우지 않고 보고만 한다.
function planRepo(repo) {
  const localDir = path.join(repo, 'local');
  const agentsDir = path.join(repo, '.agents');
  if (isDir(localDir) && isDir(agentsDir)) {
    for (const entry of fs.readdirSync(localDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === 'hooks') continue;
      const dest = path.join(agentsDir, entry.name);
      if (!isDir(dest)) continue;
      if (isTracked(repo, path.join('.agents', entry.name))) {
        skipped.push(`${dest} (git이 추적함)`);
        continue;
      }
      if (entry.name === 'skills') {
        // 스킬은 렌더돼 원본과 내용이 달라, 배포 표식으로 가른다.
        for (const name of fs.readdirSync(dest)) {
          if (isAcSkill(path.join(dest, name))) planRemove(path.join(dest, name));
          else if (isDir(path.join(dest, name))) skipped.push(`${path.join(dest, name)} (배포 표식 없음)`);
        }
      } else {
        planRemoveCopies(path.join(localDir, entry.name), dest);
      }
    }
  }

  // CLAUDE.md 사본일 때만 지운다. 내용이 다르면 사용자가 따로 쓴 파일이다.
  // git이 추적하는 파일은 지우지 않는다. 레포가 커밋해 둔 AGENTS.md를 sync가 CLAUDE.md로 덮어쓴
  // 경우라, 지우면 커밋된 파일이 삭제로 잡힌다. 되돌릴지는 그 레포 주인이 정하게 보고만 한다.
  const claudeMd = path.join(repo, 'CLAUDE.md');
  if (isFile(claudeMd)) {
    const claude = fs.readFileSync(claudeMd);
    for (const name of ['AGENTS.md', 'GEMINI.md']) {
      const file = path.join(repo, name);
      if (!isFile(file)) continue;
      if (!fs.readFileSync(file).equals(claude)) {
        if (!isTracked(repo, name)) skipped.push(`${file} (CLAUDE.md와 내용이 달라 남김: 옛 sync 산출물이면 직접 지운다)`);
        continue;
      }
      if (isTracked(repo, name)) skipped.push(`${file} (git이 추적함, CLAUDE.md로 덮어써져 있음: git -C ${repo} checkout -- ${name}로 되돌릴지 확인)`);
      else planRemove(file);
    }
  }

  const codexDir = path.join(repo, '.codex');
  for (const name of ['hooks.json', 'hooks']) {
    const target = path.join(codexDir, name);
    if (!exists(target)) continue;
    if (isTracked(repo, path.join('.codex', name))) skipped.push(`${target} (git이 추적함)`);
    else planRemove(target);
  }

  planRemoveEmptyDirs(agentsDir);
  planRemoveEmptyDirs(codexDir);
}

planGlobal();
for (const repo of listLocalRepos(roots.length > 0 ? roots : defaultLocalRoots)) planRepo(repo);

for (const line of skipped) console.log(`SKIP  ${line}`);

const real = actions.filter((a) => !a.label.startsWith('RMDIR'));
if (real.length === 0) {
  console.log('지울 Codex·Gemini 산출물이 없다.');
  process.exit(0);
}

for (const action of actions) console.log(action.label);
if (!apply) {
  console.log('---');
  console.log(`위 ${real.length}건을 지우려면 --apply를 붙여 다시 돌린다.`);
  process.exit(0);
}
// 한 건이 실패해도 나머지는 계속 돌리고, 실패는 모아서 낸다.
const failures = [];
for (const action of actions) {
  try {
    action.run();
  } catch (error) {
    failures.push(`${action.label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
console.log('---');
console.log(`완료: ${real.length - failures.length}건`);
if (failures.length > 0) {
  console.error(`실패 ${failures.length}건:`);
  for (const line of failures) console.error(`  ${line}`);
  process.exit(1);
}
