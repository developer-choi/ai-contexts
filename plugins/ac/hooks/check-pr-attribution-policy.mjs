import fs from "node:fs";
import path from "node:path";
import { findGhPrBodyWrites, findRedirectTargets, invocationCwd, normalizeCwd } from "./git-command-parser.mjs";
import { deny, getCommand, getCwd, readPayload } from "./hook-utils.mjs";

// PR 본문에 Claude Code 생성 표기 줄(`🤖 Generated with [Claude Code](…)`)이 실린 채 게시되는 것을 막는다.
//
// settings의 `attribution.pr`을 비우면 Claude Code가 붙이라고 주입하는 리마인더는 사라지지만, 본문에 이미 든
// 줄은 못 막는다. 2026-10-11 PFM PR #36이 그 경로였다 — 옛 본문 끝의 표기 줄을 보고 게시용 본문에 그대로
// 이어 붙였다. 그래서 게시 명령 쪽에서 본문을 직접 본다.
//
// 본문을 볼 수 있는 자리는 둘이다. 명령 글자(`--body "…"`, heredoc, here-string)는 첫 `gh pr` 호출부터
// 명령 끝까지에서 찾고, `-F`/`--body-file <파일>`은 파일을 열어 찾는다. 앞부분을 안 보는 것은 같은 체인의
// 커밋 메시지에 든 표기까지 잡지 않기 위해서다(커밋은 대상이 아니다).
//
// 예외로, 같은 명령이 본문 파일에 리다이렉트(`>`·`>>`)로 쓰면 명령 글자 전체를 본다. 훅은 명령 실행 전에
// 파일을 읽어서 그 명령이 붙일 줄을 못 보고, 붙일 줄은 `gh pr` 앞의 `printf`·`echo`에 있다. 2026-10-11 PFM
// PR #40이 이 꼴(`printf '…표기…' >> "$S/body.md"; gh pr edit 40 --body-file "$S/body.md"`)로 빠져나갔다.
// 리다이렉트 대상과 본문 파일은 토큰 글자로 맞대므로 셸 변수로 쓴 경로도 양쪽이 같으면 잡는다.
//
// 보지 못하는 것: 다른 명령이 넘겨주는 본문(`cat x | gh pr create -F -`, `-F - < x`, `--body "$(cat x)"`),
// 셸 변수로 쓴 파일 경로(`-F "$TEMP/x.md"`)의 파일 내용, Git Bash의 `/tmp` 같은 MSYS 가상 경로, 리다이렉트가
// 아닌 수단으로 같은 명령 안에서 본문 파일에 쓰는 꼴(`tee -a body.md`, `sed -i`, 스크립트 실행), 리다이렉트
// 대상과 본문 파일을 서로 다른 글자로 쓴 같은 파일(`./b.md`와 절대경로, 다른 변수), 따옴표 바로 뒤에
// 공백 없이 붙인 리다이렉트(`printf '…'>>b.md` — 토큰 하나로 이어진다).
//
// 떼어서 실행하지 않고 막는다 — 본문 파일을 몰래 고치면 사용자가 보는 파일과 게시된 본문이 달라진다.
//
// 커밋의 `Co-Authored-By` trailer는 대상이 아니다(2026-10-11 사용자 결정: PR 표기만 막는다).

// 줄 전체가 표기일 때만 잡는다. 표기 문구를 설명하는 본문(이 훅을 소개하는 PR 등)까지 막지 않기 위해서다.
// 줄 경계는 진짜 줄바꿈 말고도 한 줄 명령에 쓰는 글자 그대로의 `\n`, PowerShell의 `` `n ``이 될 수 있고,
// 줄 끝 쪽은 본문을 닫는 따옴표·괄호일 수 있다(`--body "…\n\n🤖 Generated with …" --draft`).
const ATTRIBUTION_LINE =
  /(?:^|\\n|`n)[ \t]*(?:🤖[ \t]*)?Generated with \[?Claude Code\]?(?:\(https?:\/\/[^)\s]*\))?[ \t]*(?:["')]|\\n|`n|\r?$)/im;
// 본문 파일에 한 줄을 이어 쓰는 명령(`echo "🤖 Generated with …" >> body.md`)에서는 줄 앞쪽이 여는 따옴표다.
// 이 넓은 경계는 그 명령을 볼 때만 쓴다 — 표기 문구를 따옴표로 인용해 설명하는 본문까지 막지 않기 위해서다.
const ATTRIBUTION_IN_WRITE = new RegExp(ATTRIBUTION_LINE.source.replace("(?:^|", "(?:[\"']|^|"), "im");
const GH_PR_BODY_CALL = /\bgh(?:\.exe)?\b[^\n]*?\bpr\s+(?:create|new|edit)\b/;

const payload = readPayload();
const cmd = getCommand(payload);
if (!/\bgh(\.exe)?\b/.test(cmd)) process.exit(0);

const writes = findGhPrBodyWrites(cmd);
if (writes.length === 0) process.exit(0);

const found = [];
const redirected = new Set(findRedirectTargets(cmd));
const writesBodyFile = writes.some((inv) => inv.bodyFiles.some((file) => redirected.has(file)));
const callAt = cmd.search(GH_PR_BODY_CALL);
const scope = writesBodyFile || callAt < 0 ? cmd : cmd.slice(callAt);
if ((writesBodyFile ? ATTRIBUTION_IN_WRITE : ATTRIBUTION_LINE).test(scope)) {
  found.push(writesBodyFile ? "본문 파일에 이어 쓰는 명령" : "명령에 실린 본문");
}

for (const inv of writes) {
  const base = invocationCwd(inv, getCwd(payload)) || getCwd(payload);
  for (const file of inv.bodyFiles) {
    const normalized = normalizeCwd(file);
    const full = path.isAbsolute(normalized) || !base ? normalized : path.resolve(base, normalized);
    let body;
    try {
      body = fs.readFileSync(full, "utf8");
    } catch {
      // 못 읽는 파일은 gh도 못 읽어 실패하므로 여기서 막을 것이 없다.
      continue;
    }
    if (ATTRIBUTION_LINE.test(body)) found.push(`본문 파일 \`${file}\``);
  }
}

if (found.length > 0) {
  deny(
    `PR 본문에 Claude Code 생성 표기 줄(\`🤖 Generated with [Claude Code](…)\`)이 있습니다 (${found.join(", ")}). ` +
      "사용자는 PR 본문에 이 줄을 싣지 않기로 했습니다. 그 줄을 지우고 같은 명령을 다시 실행하세요. " +
      "본문 파일이면 파일에서 지운 뒤 다시 실행합니다. 옛 본문에 있던 줄을 보고 따라 붙였다면 그 줄도 같이 지웁니다.",
  );
}
