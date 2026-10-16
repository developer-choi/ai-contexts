#!/usr/bin/env node
// 승인본 읽기 — AC `writing-guide/types/<type>/[<subtype>/]approved/`에서 성격 목록과 한 편을 낸다.
//
// 메인이 글을 쓰기 시작할 때 Read 대신 부른다. 승인본은 성격마다 한 편씩 쌓여, 통째로 읽으면 쓰지 않을 성격까지 실린다.
// 파일 꼴: 첫 줄 `# <성격>`이 성격 이름이고, 그 아래 바깥 펜스 안이 승인된 본문이다.
//
// 사용:
//   node approved.mjs <type> [--subtype <subtype>]                  고를 수 있는 승인본 성격 목록
//   node approved.mjs <type> [--subtype <subtype>] --kind <성격>    그 성격 승인본 한 편 (성격 이름이나 파일 slug)
//   node approved.mjs <type> [--subtype <subtype>] --kind <성격> --write --root <AC 워크트리> --slug <영문 slug>
//                     --source <출처(PR 주소·파일 경로)> --from <패키지.md>
//                                                                   패키지 본문을 승인본 파일로 쓴다(같은 slug면 덮어쓴다)
//
// 쓰기는 배포본이 아니라 --root로 받은 AC 워크트리의 `deploy/contexts/writing-guide/`에 한다. 패키지 frontmatter는 떼고,
// 날짜는 오늘, 바깥 펜스는 백틱 다섯 개 이상으로 본문 안 가장 긴 백틱 줄보다 한 개 길게 쓴다 — 짧으면 본문 펜스에서 승인본이 끊긴다.
//
// subtype이 있는 글은 `types/<type>/<subtype>/approved/`만 본다 — 채용 PR과 일반 PR은 분량이 달라,
// 다른 subtype의 승인본을 따르면 그 분량을 따라간다.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// 소스(deploy/skills/write-doc/scripts)와 배포본(<타겟>/skills/write-doc/scripts) 둘 다 세 단계 위가 contexts의 부모다.
const GUIDE = path.resolve(import.meta.dirname, "..", "..", "..", "contexts", "writing-guide");

const toLines = (text) => text.replace(/\r\n/g, "\n").split("\n");

// `types/<type>/[<subtype>/]approved/<slug>.md` → Map(성격 → {file, slug, body}). 성격 이름은 파일 첫 줄 `# <성격>`이다 —
// 패키지 `kind`와 같은 말로 맞춰야 고를 수 있다.
function acApproved(type, subtype) {
  const dir = path.join(GUIDE, "types", type, ...(subtype ? [subtype] : []), "approved");
  const out = new Map();
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
    const file = path.join(dir, name);
    const lines = toLines(fs.readFileSync(file, "utf8"));
    const head = lines.findIndex((ln) => /^#\s/.test(ln));
    const kind = head === -1 ? path.basename(name, ".md") : lines[head].replace(/^#\s+/, "").trim();
    out.set(kind, { file, slug: path.basename(name, ".md"), body: lines.slice(head + 1).join("\n").trim() });
  }
  return out;
}

const VALUE_FLAGS = ["kind", "subtype", "root", "slug", "source", "from"];

function parseArgs(argv) {
  const args = { type: null, write: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i].replace(/^--/, "");
    if (argv[i].startsWith("--") && VALUE_FLAGS.includes(flag)) args[flag] = argv[++i];
    else if (argv[i] === "--write") args.write = true;
    else args.type ??= argv[i];
  }
  return args;
}

export function renderApproved({ kind, source, body, date }) {
  const longest = Math.max(0, ...(body.match(/^\s*`{3,}/gm) ?? []).map((f) => f.trim().length));
  const fence = "`".repeat(Math.max(5, longest + 1));
  return `# ${kind}\n\n${source} · ${date} 승인\n\n${fence}markdown\n${body}\n${fence}\n`;
}

function write({ type, subtype, kind, root, slug, source, from }) {
  const missing = ["kind", "root", "slug", "source", "from"].filter((k) => !{ kind, root, slug, source, from }[k]);
  if (missing.length) {
    console.error(`--write에는 ${missing.map((k) => `--${k}`).join(" ")}가 필요하다`);
    process.exit(1);
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    console.error(`--slug는 영문 소문자·숫자·하이픈만 쓴다: ${slug}`);
    process.exit(1);
  }
  const body = fs.readFileSync(from, "utf8").replace(/\r\n/g, "\n").replace(/^---\n[\s\S]*?\n---\n/, "").trim();
  const dir = path.join(root, "deploy", "contexts", "writing-guide", "types", type, ...(subtype ? [subtype] : []), "approved");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${slug}.md`);
  const replaced = fs.existsSync(file);
  const date = new Date().toLocaleDateString("sv-SE");
  fs.writeFileSync(file, renderApproved({ kind, source, body, date }));
  console.log(`승인본 「${kind}」 ${replaced ? "덮어씀" : "새로 씀"}: ${file}`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { type, kind, subtype } = args;
  if (!type) {
    console.error("사용: node approved.mjs <type> [--subtype <subtype>] [--kind <성격>] [--write --root <AC 워크트리> --slug <slug> --source <출처> --from <패키지.md>]");
    process.exit(1);
  }
  if (args.write) return write(args);
  const kinds = acApproved(type, subtype);

  if (kind) {
    const hit = kinds.has(kind) ? kind : [...kinds].find(([, v]) => v.slug === kind)?.[0];
    if (hit) {
      const ac = kinds.get(hit);
      console.log(`승인본 「${hit}」 (${ac.file})\n\n${ac.body}`);
      return;
    }
    console.log(`승인본 「${kind}」 없음 — 있는 성격: ${[...kinds.keys()].join(", ") || "없음"}`);
    return;
  }

  console.log("## 승인본 성격 (--kind로 한 편만 읽는다)");
  console.log(`- ${[...kinds].map(([k, v]) => (k === v.slug ? k : `${k}(${v.slug})`)).join(", ") || "없음"}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
