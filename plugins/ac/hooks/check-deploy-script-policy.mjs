import { splitSegments, tokenize } from "./git-command-parser.mjs";
import { deny, getCommand, readPayload } from "./hook-utils.mjs";

// 배포는 사용자가 실행한다. AI가 sync:*·unsync:*를 호출하면 여기서 끊는다.
// 읽기 전용인 verify:*·scan:*과 로컬 등록인 prepare는 통과시킨다.
//
// 명령 해석은 git 정책 hook들과 같은 파서를 쓴다 — 따옴표 안(커밋 메시지 등)은 값이지
// 명령이 아니므로, `git commit -m "npm run sync:system 금지"`가 배포로 오탐되지 않는다.
// 타겟 이름을 나열하지 않고 접두사로 잡는다 — 새 sync 타겟이 생겨도 이 hook만 뒤처지지 않는다.
const DEPLOY_SCRIPT = /^(?:un)?sync:[\w:-]+$/;
// npm을 우회한 직접 호출(node scripts/system/sync-system.mjs)도 같은 배포다.
const DEPLOY_ENTRY = /(?:^|[\\/])(?:un)?sync-[\w-]*\.mjs$/;

const PACKAGE_MANAGERS = new Set(["npm", "pnpm", "yarn", "bun"]);

// 명령 치환·서브셸 표기($(npm …)·`npm …`)를 벗겨 알맹이만 본다.
function unwrap(token) {
  return token.replace(/^[$`(]+/, "").replace(/[)`]+$/, "");
}

// npm.cmd·/usr/bin/node 같은 표기를 같은 명령으로 본다.
function commandName(token) {
  return unwrap(token)
    .split(/[\\/]/)
    .pop()
    .replace(/\.(?:cmd|exe|ps1)$/i, "");
}

function findViolation(command) {
  for (const segment of splitSegments(command)) {
    const tokens = tokenize(segment);
    // FOO=1 npm run ... 형태의 앞선 환경변수 지정을 걷어낸다.
    while (tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[0])) tokens.shift();
    if (!tokens.length) continue;
    const name = commandName(tokens[0]);
    const args = tokens.slice(1).map(unwrap);
    if (PACKAGE_MANAGERS.has(name)) {
      const script = args.find((arg) => DEPLOY_SCRIPT.test(arg));
      if (script) return `${name} … ${script}`;
    }
    if (name === "node") {
      const entry = args.find((arg) => DEPLOY_ENTRY.test(arg));
      if (entry) return `node ${entry}`;
    }
  }
  return null;
}

const violation = findViolation(getCommand(readPayload()));

if (violation) {
  deny(
    `배포(${violation})는 사용자가 실행합니다 — AI는 호출하지 않습니다. `
      + "변경을 커밋까지 끝낸 뒤 사용자에게 실행할 명령을 안내하고 기다리세요. "
      + "읽기 전용인 verify:* 는 그대로 쓸 수 있습니다.",
  );
}
