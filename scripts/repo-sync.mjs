#!/usr/bin/env node
// 스캔 루트 하위 1뎁스 git 레포를 origin과 양방향 동기화한다 — `/repo-sync` 스킬의 기계 파트.
//
// 왜 스크립트인가: 판정이 전부 결정론이다(보호 브랜치인가 · ahead/behind가 몇인가 · ff가 되는가).
// 그런데 레포마다 git을 예닐곱 번 부르고 그 출력을 읽어 분기하는 일을 매 실행마다 사람이 손으로
// 하면, 한 레포를 건너뛰거나 한 분기를 잘못 읽어도 표에는 `up-to-date`로 적힌다. 이 스킬의 목적이
// 미푸시 작업 유실을 막는 것이라, 조용히 빠지는 것이 곧 이 도구가 존재하는 이유의 실패다.
//
// 판단이 남는 자리는 둘이고 여기서 하지 않는다:
//   - WIP 커밋 메시지 — 무엇을 하던 중이었는지는 사람·AI가 안다. 그 레포는 `wip-needed`로 내고 멈춘다
//   - 「사용자 조치 필요」 추천 — blocked/failed 행을 보고 무엇을 하라고 할지
//
// 사용법:
//   node scripts/repo-sync.mjs
//       → 전 레포 순회. WIP이 필요한 레포는 손대지 않고 변경 목록과 함께 `wip-needed`로 낸다
//   node scripts/repo-sync.mjs --wip <레포경로> --message "<커밋 메시지>"
//       → 그 레포만 WIP 커밋하고 이어서 동기화한다
//   node scripts/repo-sync.mjs --json
//       → 표 대신 JSON. 결과를 다른 스크립트가 읽을 때
//   node scripts/repo-sync.mjs --root <dir>
//       → 스캔 루트를 바꾼다(쉼표로 여럿). 픽스처로 이 판정 자체를 검증할 때 쓴다 —
//         실제 레포에 대고 돌리면 검증이 곧 push라 되돌릴 수 없다
//
// 순서를 이렇게 고정한 이유: 일반 브랜치는 미커밋을 **먼저** 커밋해 ahead로 만든 뒤 판정한다.
// 그래야 stash가 보호 브랜치 갈래에만 남는다(스킬 「세부 절차」가 정한 제약).

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_ROOTS = ["WebstormProjects/main", "WebstormProjects/my-else", "WebstormProjects/simplify"].map((r) =>
  join(homedir(), ...r.split("/")),
);

const PROTECTED = /^(?:master|main|develop|release)$|^release\//;

// 이 회차가 만든 stash를 다른 세션 것과 갈라 보기 위한 이름. pop이 실패하면 이 이름으로 찾는다.
const STASH_LABEL = "repo-sync";

const argv = process.argv.slice(2);
const optOf = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const WIP_REPO = optOf("wip");
const WIP_MESSAGE = optOf("message");
const AS_JSON = argv.includes("--json");
const ROOTS = optOf("root") ? optOf("root").split(",").map((s) => s.trim()).filter(Boolean) : DEFAULT_ROOTS;

if (WIP_REPO && !WIP_MESSAGE) {
  console.error("--wip 에는 --message 가 필요합니다 (WIP 커밋 메시지는 스크립트가 못 정합니다).");
  process.exit(2);
}

// git 한 번. 실패를 예외가 아니라 값으로 돌려준다 — 레포 하나가 깨져도 순회는 계속돼야 한다.
// raw: 출력을 다듬지 않는다. porcelain 상태 코드는 첫 칸이 공백일 수 있어(` M a.txt`),
// trim하면 경로가 한 글자씩 잘린 채 그대로 `git add`로 넘어간다.
function git(cwd, args, { raw = false } = {}) {
  try {
    const out = execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, out: raw ? out : out.trim() };
  } catch (e) {
    return { ok: false, out: "", err: `${e.stderr || e.message}`.trim().split("\n").pop() };
  }
}

function repoDirs() {
  const out = [];
  for (const root of ROOTS) {
    if (!existsSync(root)) continue;
    for (const name of readdirSync(root)) {
      const full = join(root, name);
      if (!statSync(full).isDirectory()) continue;
      if (!existsSync(join(full, ".git"))) continue; // 워크트리도 .git 파일을 가지므로 둘 다 걸린다
      out.push(full);
    }
  }
  return out.sort();
}

// 표에 쓰는 짧은 이름. 루트 하나만 남겨 `main/ai-contexts` 꼴로 만든다.
function label(dir) {
  const parts = dir.replace(/\\/g, "/").split("/");
  return parts.slice(-2).join("/");
}

// tracked 변경(diff·index)이든 untracked든 하나라도 있으면 미커밋 변경이다.
function changedPaths(dir) {
  const res = git(dir, ["status", "--porcelain=v1", "-z", "--untracked-files=all"], { raw: true });
  if (!res.ok) return [];
  const fields = res.out.split("\0").filter(Boolean);
  const paths = [];
  for (let i = 0; i < fields.length; i++) {
    const entry = fields[i];
    const code = entry.slice(0, 2);
    paths.push(entry.slice(3));
    // rename/copy는 옛 경로가 다음 필드로 따로 온다. 커밋에 넘길 때 둘 다 필요하다.
    if (code[0] === "R" || code[0] === "C") paths.push(fields[++i]);
  }
  return paths;
}

function counts(dir, upstream) {
  const res = git(dir, ["rev-list", "--left-right", "--count", `${upstream}...HEAD`]);
  if (!res.ok) return null;
  const [behind, ahead] = res.out.split(/\s+/).map(Number);
  return { ahead, behind };
}

// 다른 워크트리가 체크아웃 중인 브랜치는 그 워크트리가 자기 차례에 처리한다.
function branchesCheckedOutElsewhere(dir) {
  const res = git(dir, ["worktree", "list", "--porcelain"]);
  if (!res.ok) return new Set();
  const here = dir.replace(/\\/g, "/").toLowerCase();
  const out = new Set();
  let current = null;
  for (const line of res.out.split("\n")) {
    if (line.startsWith("worktree ")) current = line.slice(9).replace(/\\/g, "/").toLowerCase();
    else if (line.startsWith("branch ") && current !== here) out.add(line.slice(7).replace("refs/heads/", ""));
  }
  return out;
}

// 현재 브랜치가 아닌 보호 브랜치들을 체크아웃 없이 ff 한다.
// `fetch origin <b>:<b>`는 fast-forward가 아니면 거부되므로, 실패가 곧 「ff 불가」다.
function ffOtherProtected(dir, currentBranch) {
  const listed = git(dir, ["for-each-ref", "--format=%(refname:short)", "refs/heads/"]);
  if (!listed.ok) return [];
  const busy = branchesCheckedOutElsewhere(dir);
  const notes = [];
  for (const b of listed.out.split("\n").filter(Boolean)) {
    if (b === currentBranch || !PROTECTED.test(b) || busy.has(b)) continue;
    if (!git(dir, ["rev-parse", "--verify", "--quiet", `refs/remotes/origin/${b}`]).ok) continue;
    const before = git(dir, ["rev-list", "--count", b]);
    const res = git(dir, ["fetch", "origin", `${b}:${b}`]);
    if (!res.ok) {
      notes.push(`${b} ff 불가`);
      continue;
    }
    const after = git(dir, ["rev-list", "--count", b]);
    const delta = Number(after.out) - Number(before.out);
    if (delta > 0) notes.push(`${b} ff +${delta}`);
  }
  return notes;
}

function syncRepo(dir, { wipMessage } = {}) {
  const row = { repo: label(dir), dir, branch: "", state: "", protectedNotes: [], wipPaths: [] };

  if (!git(dir, ["remote", "get-url", "origin"]).ok) {
    row.state = "skipped: no origin";
    return row;
  }
  const head = git(dir, ["symbolic-ref", "-q", "--short", "HEAD"]);
  if (!head.ok) {
    row.state = "skipped: detached HEAD";
    return row;
  }
  row.branch = head.out;
  const isProtected = PROTECTED.test(row.branch);

  const fetched = git(dir, ["fetch", "origin"]);
  if (!fetched.ok) {
    row.state = `failed: fetch — ${fetched.err}`;
    return row;
  }

  let dirty = changedPaths(dir);

  // 일반 브랜치의 미커밋은 먼저 커밋해 ahead로 만든다. 메시지는 스크립트가 못 정하므로,
  // 이번 실행에 메시지를 안 받았으면 그 레포는 손대지 않고 넘긴다.
  if (!isProtected && dirty.length) {
    if (!wipMessage) {
      row.state = `wip-needed (${dirty.length}건)`;
      row.wipPaths = dirty;
      return row;
    }
    const staged = git(dir, ["add", "--", ...dirty]);
    if (!staged.ok) {
      row.state = `failed: wip stage — ${staged.err}`;
      return row;
    }
    const committed = git(dir, ["commit", "-m", wipMessage, "--", ...dirty]);
    if (!committed.ok) {
      row.state = `failed: wip commit — ${committed.err}`;
      return row;
    }
    row.wipCommitted = true;
    dirty = changedPaths(dir);
  }

  const upstream = `origin/${row.branch}`;
  const hasUpstream = git(dir, ["rev-parse", "--verify", "--quiet", `refs/remotes/${upstream}`]).ok;

  if (!hasUpstream) {
    if (isProtected) {
      row.state = "blocked: no origin tracking";
      row.protectedNotes = ffOtherProtected(dir, row.branch);
      return row;
    }
    // 원격에 없는 일반 브랜치 = 첫 push 대상. HEAD 커밋 전부가 ahead다.
    const total = git(dir, ["rev-list", "--count", "HEAD"]);
    const pushed = git(dir, ["push", "--set-upstream", "origin", row.branch]);
    row.state = pushed.ok
      ? `${row.wipCommitted ? "wip-pushed" : "pushed"} +${total.out} (새 원격 브랜치)`
      : `failed: ${row.wipCommitted ? "wip committed locally; " : ""}push failed — ${pushed.err}`;
    row.protectedNotes = ffOtherProtected(dir, row.branch);
    return row;
  }

  const c = counts(dir, upstream);
  if (!c) {
    row.state = "failed: ahead/behind 계산 실패";
    return row;
  }

  if (c.ahead && c.behind) {
    row.state = `blocked: ahead ${c.ahead}, behind ${c.behind} (fast-forward 불가)`;
  } else if (c.behind) {
    // 여기 도달하는 미커밋은 보호 브랜치 것뿐이다(일반은 위에서 이미 커밋됐다).
    let stashed = false;
    if (dirty.length) {
      const res = git(dir, ["stash", "push", "-m", `${STASH_LABEL}: ${row.branch}`]);
      stashed = res.ok;
      if (!stashed) {
        row.state = `failed: stash — ${res.err}`;
        return row;
      }
    }
    const merged = git(dir, ["merge", "--ff-only", upstream]);
    if (stashed) {
      const popped = git(dir, ["stash", "pop"]);
      if (!popped.ok) {
        row.state = `stash-conflict: ${label(dir)} 스택에 '${STASH_LABEL}: ${row.branch}'로 남김`;
        return row;
      }
    }
    row.state = merged.ok ? `pulled +${c.behind}` : `failed: ff merge — ${merged.err}`;
  } else if (c.ahead) {
    if (isProtected) {
      // 「자동 push 안 함」에서 이 기록이 파생되지 않아 따로 둔다 — 조용히 up-to-date로 넘어가면
      // 올릴 커밋이 있다는 사실이 묻힌다. 미푸시 유실을 막는 것이 이 도구의 목적이므로 그 침묵이 곧 실패다.
      row.state = `blocked: protected branch ahead +${c.ahead}${dirty.length ? " (uncommitted)" : ""}`;
    } else {
      const pushed = git(dir, ["push", "origin", row.branch]);
      row.state = pushed.ok
        ? `${row.wipCommitted ? "wip-pushed" : "pushed"} +${c.ahead}`
        : `failed: ${row.wipCommitted ? "wip committed locally; " : ""}push failed — ${pushed.err}`;
    }
  } else {
    row.state = dirty.length && isProtected ? "dirty" : "up-to-date";
  }

  row.protectedNotes = ffOtherProtected(dir, row.branch);
  return row;
}

const targets = WIP_REPO ? [WIP_REPO] : repoDirs();
const rows = targets.map((dir) => syncRepo(dir, { wipMessage: WIP_REPO === dir ? WIP_MESSAGE : undefined }));

if (AS_JSON) {
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}

const width = (key, head) => Math.max(head.length, ...rows.map((r) => [...String(r[key])].length));
const pad = (s, w) => s + " ".repeat(Math.max(0, w - [...s].length));
const w1 = width("repo", "레포");
const w2 = width("branch", "브랜치");

console.log(`${pad("레포", w1)}  ${pad("브랜치", w2)}  상태`);
console.log(`${"-".repeat(w1)}  ${"-".repeat(w2)}  ${"-".repeat(20)}`);
for (const r of rows) {
  const notes = r.protectedNotes.length ? `  |  ${r.protectedNotes.join(", ")}` : "";
  console.log(`${pad(r.repo, w1)}  ${pad(r.branch, w2)}  ${r.state}${notes}`);
}

const wip = rows.filter((r) => r.wipPaths.length);
if (wip.length) {
  console.log("\n[WIP 커밋 필요] 메시지를 정해 레포마다 다시 부른다:");
  for (const r of wip) {
    console.log(`  ${r.repo} (${r.wipPaths.length}건): ${r.wipPaths.slice(0, 8).join(", ")}${r.wipPaths.length > 8 ? " …" : ""}`);
    console.log(`    node scripts/repo-sync.mjs --wip "${r.dir}" --message "<메시지>"`);
  }
}

const attention = rows.filter((r) => /^(blocked|failed|dirty|stash-conflict)/.test(r.state) || r.protectedNotes.some((n) => n.includes("불가")));
if (attention.length) {
  console.log(`\n[사용자 조치 필요] ${attention.length}건 — 레포별 추천 액션은 읽는 쪽이 정한다.`);
}

// 보고 직전에 한 겹 더 본다. 각 분기가 인라인으로 pop을 시도하지만, 그 인라인이 빠진 경로가
// 생기면 사용자 변경이 stash에 갇힌 채 "정상"으로 보고된다 — 스택에 이 회차 이름이 남았는지로 잡는다.
const stranded = rows
  .filter((r) => !r.state.startsWith("stash-conflict"))
  .map((r) => ({ repo: r.repo, list: (git(r.dir, ["stash", "list"]).out || "").split("\n").filter((l) => l.includes(STASH_LABEL)) }))
  .filter((r) => r.list.length);
if (stranded.length) {
  console.log(`\n[stash 남음] ${stranded.length}건 — 이 회차가 만든 stash가 pop 안 된 채 남았다:`);
  stranded.forEach((r) => console.log(`  ${r.repo}: ${r.list.join(' / ')}`));
}
