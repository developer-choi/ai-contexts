const { deny, getCommand, readPayload } = require("./hook-utils");

const cmd = getCommand(readPayload());

// cmd 전체를 regex로 보면 commit 메시지 안의 옵션 단어가 false positive를 만든다.
// 명령 chain을 분리해 segment 단위로, commit 옵션은 메시지 인수(-m / --message) 이전까지만 검사한다.
for (const segment of cmd.split(/(?:&&|\|\||;)/)) {
  const trimmed = segment.trim();

  if (/^git\s+add\s+(-A|\.)(?=\s|$)/.test(trimmed)) {
    deny("git add . / git add -A 금지. 파일을 개별 지정하세요.");
  }

  // commit -a 단독, short option bundle(-am, -vam 등 a 포함), --all을 모두 차단.
  // --amend / --allow-empty는 단어 경계 매치 실패로 false positive 발생 안 함.
  const commitMatch = trimmed.match(/^git\s+commit\b(.*)/);
  if (commitMatch) {
    const beforeMessage = commitMatch[1].split(/\s(?:-m|--message)\b/)[0];
    if (/\s-[a-zA-Z]*a[a-zA-Z]*(?=\s|$)/.test(beforeMessage) || /\s--all\b/.test(beforeMessage)) {
      deny("git commit -a (auto-stage 옵션) 금지. 파일을 개별 지정하세요.");
    }
  }
}
