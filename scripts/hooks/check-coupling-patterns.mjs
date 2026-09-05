#!/usr/bin/env node
// 전역 git pre-commit 훅. 이 레포의 `meta/coupling.json`에 등록된 짝꿍 패턴이 실물 파일을
// 하나라도 가리키는지 **패턴 하나하나** 확인해 경고한다(차단하지 않는다).
// ~/.ai-contexts/에 그대로 복사돼 어느 레포에서든 돌므로 AC의 다른 모듈을 import하지 않는다.
//
// 왜 필요한가: 짝꿍을 표면화하는 훅(deploy/hooks/surface-coupling.mjs)은 "편집 중인 파일이
// 어느 묶음에 드는가"만 본다. 묶음 쪽 패턴이 낡아 아무 파일도 안 가리키게 되면 그 훅에서는
// 「이 파일은 짝꿍이 아니다」와 똑같은 모양(hits 0건)이 되어, 짝꿍 대조가 통째로 꺼진 상태가
// 매 편집마다 통과처럼 보인다. `deploy/contexts/rules-as-code.md` 「대상 0개는 통과가 아니라
// 고장이다」가 세운 규칙을 짝꿍 등록부에 강제하는 쪽이 이 검사다.
//
// 언제 도는가: coupling.json을 건드린 커밋만이 아니라 **그 레포의 모든 커밋**에서 돈다.
// 패턴이 죽는 계기는 등록부를 고칠 때가 아니라 *다른 파일이 옮겨갈 때*라, 등록부를 건드린
// 커밋만 보면 죽은 뒤 아무도 등록부를 안 여는 동안 계속 안 잡힌다. 비용은 커밋당 인덱스 파일
// 목록 한 번과 패턴 수만큼의 정규식이라 상시로 돌려도 싸다.
//
// 무엇을 출력하는가: 죽은 패턴이 없으면 조용하다 — 단, coupling.json을 건드린 커밋에서는
// 깨끗해도 한 줄 요약을 낸다. 면제(pending)는 **출력할 때마다 건수를 함께** 낸다. 면제가
// 늘어나는 것이 안 보이면 이 검사는 「죽은 패턴에 면제를 붙인다」로 우회되어 초록불인 채
// 꺼진다(rules-as-code 같은 절). 면제가 늘어나는 계기는 등록부를 고치는 것뿐이고 그때는
// 이 훅이 반드시 요약을 내므로, 건수는 늘어나는 그 자리에서 항상 보인다.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const DATA_FILE = "meta/coupling.json";

// 면제 사유는 "TODO"·"나중에" 같은 한 낱말로는 못 적게 최소 길이를 둔다. 사유를 요구하는
// 목적이 "왜 비어 있는지 다음 사람이 판단할 수 있게"이므로, 길이 0만 막으면 통과 문자열
// 한 글자로 면제가 스위치가 된다.
const MIN_REASON_LEN = 20;

// 한 등록부가 무너져도 출력이 화면을 덮지 않게 자른다.
const MAX_REPORTS = 20;

// 단순 glob(*, **, ?) → 정규식. **는 / 포함 임의, *는 세그먼트 내 임의, ?는 1자.
// 같은 규칙을 편집 시점 훅(deploy/hooks/surface-coupling.mjs)과 회차 점검
// (scripts/refresh-projects-scan.mjs)도 갖고 있다. 서로를 import할 수 없는 자리들이라
// (이 파일은 ~/.ai-contexts/로 복사돼 나가고, 훅은 배포돼 나간다) meta/coupling.json에
// 짝꿍으로 등록해 갈리는 것을 막는다.
function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        re += ".*";
        i++;
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${re}$`);
}

// 패턴 하나가 파일 목록 전체와 대조되므로 정규식은 패턴당 한 번만 만든다. 글로브 문자가 없는
// 패턴은 문자열 비교로 끝낸다 — 편집 시점 훅의 matchesPattern과 판정이 같다.
function matcherFor(pattern) {
  if (!/[*?]/.test(pattern)) return (rel) => rel === pattern;
  const re = globToRegExp(pattern);
  return (rel) => rel === pattern || re.test(rel);
}

function main() {
  const root = repoRoot();
  if (!root) return;

  const dataPath = path.join(root, DATA_FILE);
  if (!fs.existsSync(dataPath)) return;

  // 커밋될 내용을 본다 — 등록부를 이번 커밋에서 고쳤으면 고친 쪽이 판정 대상이다.
  const raw = stagedContent(DATA_FILE) ?? fs.readFileSync(dataPath, "utf8");
  let data;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    console.log(`[짝꿍 등록부] ${DATA_FILE} 파싱 실패 — 검사를 건너뛴다: ${error.message}`);
    return;
  }
  const groups = Array.isArray(data.groups) ? data.groups : [];
  if (!groups.length) return;

  // 인덱스(= 이번 커밋 이후의 파일 목록)를 실물의 정의로 쓴다. 작업 트리를 훑으면 추적 안 되는
  // 산출물·node_modules까지 실물로 세어, 지워진 짝꿍이 살아 있는 것처럼 보인다.
  const tracked = trackedFiles();
  const dead = [];
  const staleExempt = [];
  const badExempt = [];
  let patternCount = 0;
  let exemptCount = 0;

  for (const group of groups) {
    const name = group.name || "(이름 없음)";
    const files = Array.isArray(group.files) ? group.files : [];
    const pending = group.pending && typeof group.pending === "object" ? group.pending : {};

    for (const [pattern, reason] of Object.entries(pending)) {
      exemptCount++;
      if (!files.includes(pattern)) {
        badExempt.push({ name, pattern, why: "files에 없는 패턴을 면제하고 있다" });
      } else if (typeof reason !== "string" || reason.trim().length < MIN_REASON_LEN) {
        badExempt.push({ name, pattern, why: `사유가 없거나 너무 짧다(${MIN_REASON_LEN}자 이상)` });
      }
    }

    for (const pattern of files) {
      patternCount++;
      const matches = matcherFor(pattern);
      const alive = tracked.some(matches);
      const exempt = Object.prototype.hasOwnProperty.call(pending, pattern);
      if (alive && exempt) {
        staleExempt.push({ name, pattern, reason: pending[pattern] });
      } else if (!alive && !exempt) {
        dead.push({ name, pattern });
      }
    }
  }

  const registryTouched = stagedFiles().includes(DATA_FILE);
  if (!dead.length && !staleExempt.length && !badExempt.length && !registryTouched) return;

  if (dead.length) {
    printReports("[짝꿍 등록부 죽은 패턴] 등록된 패턴이 실물 파일을 하나도 안 가리킨다:", dead, [
      "판단: 그 파일이 어디로 갔는지 답한다 — 옮겨갔으면 새 경로로 고치고, 없어졌으면 그 줄을 묶음에서 뺀다.",
      "      패턴을 넓혀 무엇이든 잡히게 만드는 것은 고친 것이 아니다. 검사만 초록불이 되고 짝꿍 대조는 그대로 꺼져 있다.",
      "      아직 만들지 않은 짝을 자리만 잡아둔 것이면 그 묶음의 `pending`에 패턴과 사유를 적는다.",
    ]);
  }

  if (staleExempt.length) {
    printReports("[짝꿍 면제 낡음] 면제해 둔 패턴에 실물이 생겼다 — 면제를 걷을 자리다:", staleExempt, [
      "판단: 해당 묶음의 `pending`에서 그 줄을 지운다. 남겨두면 면제만 쌓이고 검사가 그 패턴을 다시 안 본다.",
    ]);
  }

  if (badExempt.length) {
    printReports("[짝꿍 면제 형식 오류] 면제가 사유 없이 붙어 있거나 엉뚱한 패턴을 가리킨다:", badExempt, [
      "판단: 면제에는 사유가 필수다 — 왜 실물이 없는지, 어떤 조건에서 이 면제를 걷는지 적는다.",
      "      사유를 못 적겠으면 그 자리는 면제가 아니라 죽은 패턴이다. 패턴을 고치거나 묶음에서 뺀다.",
    ]);
  }

  console.log(
    `[짝꿍 등록부] ${DATA_FILE}: 묶음 ${groups.length} · 패턴 ${patternCount} · 면제 ${exemptCount}` +
      (exemptCount ? " — 면제가 늘고 있으면 검사가 우회되는 중이다. 사유를 다시 읽는다." : ""),
  );
}

function printReports(heading, reports, advice) {
  console.log(heading);
  for (const { name, pattern, why, reason } of reports.slice(0, MAX_REPORTS)) {
    const tail = why ? `  (${why})` : reason ? `  (면제 사유: ${reason})` : "";
    console.log(`  묶음 "${name}": ${pattern}${tail}`);
  }
  if (reports.length > MAX_REPORTS) {
    console.log(`  ... 그 밖에 ${reports.length - MAX_REPORTS}건 더`);
  }
  for (const line of advice) console.log(line);
  console.log("");
}

function repoRoot() {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

// 인덱스에 든 경로 전부. pre-commit 시점의 인덱스가 곧 이번 커밋 이후의 파일 목록이라,
// 이번 커밋에서 새로 추가한 짝꿍은 살아 있고 `git rm`한 짝꿍은 죽은 것으로 바로 잡힌다.
function trackedFiles() {
  const out = execFileSync("git", ["ls-files", "-z"], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 64,
  });
  return out.split("\0").filter(Boolean);
}

function stagedFiles() {
  const out = execFileSync("git", ["diff", "--cached", "--name-only", "-z"], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 32,
  });
  return out.split("\0").filter(Boolean);
}

function stagedContent(file) {
  try {
    return execFileSync("git", ["show", `:${file}`], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 32,
    });
  } catch {
    return null;
  }
}

try {
  main();
} catch (error) {
  console.error(`[짝꿍 등록부 훅 내부 오류, 건너뜀] ${error.message}`);
}
// 등록부가 낡은 것이 사람의 커밋을 막을 일은 아니다 — 항상 통과시킨다.
process.exit(0);
