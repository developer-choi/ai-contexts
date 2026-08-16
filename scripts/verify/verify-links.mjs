#!/usr/bin/env node
// check-links.mjs 회귀 — 임시 git 레포에 3케이스(in-repo 앵커 깨짐·내레포 URL 경로 깨짐·
// 외부 404)를 재현해 검출을 단언한다. MP 5156a5fb 직전 상태(같은 3유형 3건 깨짐)를
// 픽스처로 대체한다(실레포 히스토리 체크아웃은 상태 의존이라 배제). 슬러그·헤딩 파싱도 단위로 검증.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import assert from "node:assert";
import { scan, githubSlug, headingSlugs } from "../check-links.mjs";

const TMP = path.join(os.tmpdir(), "ac-check-links-fixture");

function git(args, cwd) {
  execFileSync("git", ["-C", cwd, ...args], { stdio: "pipe" });
}

const README = `# Fixture Root

## Real Heading

- [valid anchor](#real-heading)
- [broken anchor](#nonexistent)
- [valid in-repo](docs/exists.md)
- [broken in-repo](docs/gone.md)
- [my-repo url gone](https://github.com/developer-choi/fixture-repo/blob/main/docs/gone.md)
- [my-repo url exists](https://github.com/developer-choi/fixture-repo/blob/main/docs/exists.md)
- [external 404](https://example.com/404)
- 인라인 코드 예시: \`[예시](inline-should-not-be-checked.md)\`
- 이중 백틱 예시: \`\`- [예시 → \`파일.md\`](double-inline-should-not-be-checked.md)\`\`
- \`code\` [inline code 뒤 진짜 링크](docs/gone-after-code.md)

\`\`\`md
# 코드펜스 안 헤딩 (무시돼야)
[코드펜스 안 링크](should-not-be-checked.md)
\`\`\`
`;

// 고아 검출 픽스처. README가 docs/ 안의 파일 셋을 개별 호명하므로 docs/는 바구니가
// 아니고, 거기서 혼자 안 불리는 stray.md가 고아다. bucket/은 폴더째만 언급되고 안의
// 파일은 아무도 호명하지 않으므로 통째 탐색 대상으로 걸러져야 한다.
const ORPHAN_SEED = `# Orphan Fixture

- 개별 호명: docs/named-a.md, docs/named-b.md, docs/named-c.md
- 폴더째 언급: bucket/ 아래를 전부 읽는다
- 남의 레포 같은 이름: other/stray.md
- 긴 이름의 꼬리: docs/checked-a.md
`;

function setupFixture() {
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(path.join(TMP, "docs"), { recursive: true });
  fs.mkdirSync(path.join(TMP, "bucket"), { recursive: true });
  fs.writeFileSync(path.join(TMP, "README.md"), README);
  fs.writeFileSync(path.join(TMP, "docs", "exists.md"), "# Exists\n");
  fs.writeFileSync(path.join(TMP, "orphan-seed.md"), ORPHAN_SEED);
  for (const n of ["named-a", "named-b", "named-c", "checked-a"]) {
    fs.writeFileSync(path.join(TMP, "docs", `${n}.md`), `# ${n}\n`);
  }
  fs.writeFileSync(path.join(TMP, "docs", "stray.md"), "# Stray\n");
  fs.writeFileSync(path.join(TMP, "docs", "a.md"), "# A\n");
  for (const n of ["one", "two", "three"]) {
    fs.writeFileSync(path.join(TMP, "bucket", `${n}.md`), `# ${n}\n`);
  }
  execFileSync("git", ["init", "-q", TMP], { stdio: "pipe" });
  git(["remote", "add", "origin", "https://github.com/developer-choi/fixture-repo.git"], TMP);
  git(["add", "-A"], TMP);
  git(["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "fixture", "--no-verify"], TMP);
}

const failures = [];
function check(desc, fn) {
  try {
    fn();
    console.log(`  PASS  ${desc}`);
  } catch (e) {
    console.error(`  FAIL  ${desc}\n        ${e.message}`);
    failures.push(desc);
  }
}

console.log("check-links 회귀 검증 중...");

// ── 단위: githubSlug ──
check("githubSlug: 공백→하이픈·소문자", () => assert.equal(githubSlug("Hello World"), "hello-world"));
check("githubSlug: 구두점 제거", () => assert.equal(githubSlug("foo.bar!"), "foobar"));
check("githubSlug: 한글 보존", () => assert.equal(githubSlug("API 설계"), "api-설계"));
check("githubSlug: 인라인 코드·강조 제거", () => assert.equal(githubSlug("`code` *heading*"), "code-heading"));

// ── 단위: headingSlugs 중복 dedup + 코드펜스 무시 ──
check("headingSlugs: 중복 헤딩 -1 부여", () => {
  const s = headingSlugs("# A\n\n# A\n");
  assert.ok(s.has("a") && s.has("a-1"), [...s].join(","));
});
check("headingSlugs: 코드펜스 안 # 무시", () => {
  const s = headingSlugs("# Real\n\n```\n# Fake\n```\n");
  assert.ok(s.has("real") && !s.has("fake"), [...s].join(","));
});

// ── 통합: scan 픽스처 3케이스 ──
setupFixture();
const { broken, external, orphans } = scan([TMP]);
const orphanFiles = orphans.map((o) => o.file);

check("케이스1 — in-repo 앵커 깨짐 검출", () =>
  assert.ok(broken.some((b) => b.category === "anchor" && b.target === "#nonexistent"), JSON.stringify(broken)),
);
check("케이스1b — in-repo 파일 깨짐 검출", () =>
  assert.ok(broken.some((b) => b.category === "in-repo" && b.target.includes("gone.md"))),
);
check("케이스2 — 내레포 GitHub URL 경로 깨짐 검출", () =>
  assert.ok(broken.some((b) => b.category === "myrepo-url" && b.target.includes("gone.md"))),
);
check("케이스3 — 외부 404는 외부 pile로 (실패 아님)", () =>
  assert.ok(external.some((e) => e.url.includes("example.com")) && !broken.some((b) => b.target.includes("example.com"))),
);

// ── 오탐 가드 ──
check("오탐 없음 — 유효 앵커 #real-heading", () => assert.ok(!broken.some((b) => b.target === "#real-heading")));
check("오탐 없음 — 유효 in-repo docs/exists.md", () => assert.ok(!broken.some((b) => b.target === "docs/exists.md")));
check("오탐 없음 — 유효 내레포 URL exists.md", () =>
  assert.ok(!broken.some((b) => b.category === "myrepo-url" && b.target.includes("exists.md"))),
);
check("오탐 없음 — 코드펜스 안 링크 미검사", () =>
  assert.ok(!broken.some((b) => b.target === "should-not-be-checked.md")),
);
check("오탐 없음 — 인라인 코드 안 링크 미검사", () =>
  assert.ok(!broken.some((b) => b.target === "inline-should-not-be-checked.md"), JSON.stringify(broken)),
);
check("오탐 없음 — 이중 백틱 인라인 코드 안 링크 미검사", () =>
  assert.ok(!broken.some((b) => b.target === "double-inline-should-not-be-checked.md"), JSON.stringify(broken)),
);
check("인라인 코드 뒤 진짜 링크는 여전히 검사", () =>
  assert.ok(broken.some((b) => b.category === "in-repo" && b.target === "docs/gone-after-code.md"), JSON.stringify(broken)),
);
check("README 깨진 링크는 readme=true로 분류", () =>
  assert.ok(broken.filter((b) => b.target === "#nonexistent").every((b) => b.readme)),
);

// ── 고아 검출 ──
check("고아 — 호명되는 형제들 사이에서 혼자 안 불리는 파일 검출", () =>
  assert.ok(orphanFiles.includes("docs/stray.md"), orphanFiles.join(",")),
);
check("고아 아님 — 개별 호명된 파일", () =>
  assert.ok(!orphanFiles.includes("docs/named-a.md"), orphanFiles.join(",")),
);
check("고아 아님 — 폴더째 탐색되는 바구니 안의 파일", () =>
  assert.ok(!orphanFiles.some((f) => f.startsWith("bucket/")), orphanFiles.join(",")),
);
check("고아 아님 — README 등 진입점 이름은 제외", () =>
  assert.ok(!orphanFiles.includes("README.md"), orphanFiles.join(",")),
);
check("고아 — 다른 폴더 경로로 적힌 같은 이름은 호명으로 치지 않음", () =>
  assert.ok(orphanFiles.includes("docs/stray.md"), orphanFiles.join(",")),
);
check("고아 — 긴 이름의 꼬리로 걸린 것은 호명이 아님 (checked-a.md 안의 a.md)", () =>
  assert.ok(orphanFiles.includes("docs/a.md"), orphanFiles.join(",")),
);
check("고아 검출은 exit code를 바꾸지 않음 (broken에 안 섞임)", () =>
  assert.ok(!broken.some((b) => b.file === "docs/stray.md")),
);

fs.rmSync(TMP, { recursive: true, force: true });

if (failures.length) {
  console.error(`\ncheck-links 회귀 실패: ${failures.length}건`);
  process.exit(1);
}
console.log("\ncheck-links 회귀 정상");
