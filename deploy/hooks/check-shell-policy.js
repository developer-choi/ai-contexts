const { deny, getCommand, readPayload } = require("./hook-utils");

const cmd = getCommand(readPayload());

if (/\bgit\b.*--(hard|mixed)\b/.test(cmd)) {
  deny("git reset --hard / --mixed 금지. --soft만 사용하세요. 워킹 디렉토리 미커밋 변경이 복구 불가능하게 삭제됩니다.");
}

if (/(?:^|&&|\|\||[;|]|\$\(|`)\s*npx\b/.test(cmd)) {
  deny("npx is not allowed. 가장 가까운 package.json의 scripts 섹션을 읽고 적절한 npm run <script>를 사용하세요.");
}
