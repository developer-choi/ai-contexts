const { deny, getCommand, readPayload } = require("./hook-utils");

const cmd = getCommand(readPayload());

if (/\bgit\s+commit\s+(-\S+\s+)*(-m|--message)\b/.test(cmd)) {
  deny("bare git commit 금지. staging area race condition 방지를 위해 파일을 직접 지정하세요: git commit <files> -m msg");
}

if (/\bgit\s+commit\b.*--no-verify\b/.test(cmd)) {
  deny("--no-verify 금지. pre-commit hook을 우회하지 마세요.");
}

if (/\bgit\s+commit\b/.test(cmd) && cmd.includes("\ufffd")) {
  deny("커밋 메시지에 깨진 문자(U+FFFD)가 포함되어 있습니다. 메시지를 다시 작성하세요.");
}
