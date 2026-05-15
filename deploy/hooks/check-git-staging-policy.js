const { deny, getCommand, readPayload } = require("./hook-utils");

const cmd = getCommand(readPayload());

if (/\bgit\s+(add\s+(-A|\.)(?=\s|$)|commit\s+-a(?=\s|$))/.test(cmd)) {
  deny("git add . / git add -A / git commit -a is not allowed. Specify files explicitly.");
}
