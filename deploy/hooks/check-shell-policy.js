const { deny, getCommand, readPayload } = require("./hook-utils");

const cmd = getCommand(readPayload());

if (/\bgit\b.*--(hard|mixed)\b/.test(cmd)) {
  deny("git reset --hard / --mixed is not allowed. Use --soft only.");
}

if (/(?:^|&&|\|\||[;|]|\$\(|`)\s*npx\b/.test(cmd)) {
  deny("npx is not allowed. Read the nearest package.json scripts and use npm run <script>.");
}
