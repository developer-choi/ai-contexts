const { deny, getCommand, readPayload } = require("./hook-utils");

const cmd = getCommand(readPayload());

if (/\bgit\s+commit\s+(-\S+\s+)*(-m|--message)\b/.test(cmd)) {
  deny("Bare git commit is not allowed. Specify files explicitly: git commit <files> -m msg");
}

if (/\bgit\s+commit\b.*--no-verify\b/.test(cmd)) {
  deny("--no-verify is not allowed. Do not bypass pre-commit hooks.");
}

if (/\bgit\s+commit\b/.test(cmd) && cmd.includes("\ufffd")) {
  deny("Commit message contains replacement character U+FFFD. Rewrite the message.");
}
