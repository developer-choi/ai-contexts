import { splitSegments, tokenize } from "./git-command-parser.mjs";
import { deny, getCommand, readPayload } from "./hook-utils.mjs";

// code-review의 추가 주석 판정표는 기준 문서를 대조하는 리뷰어만 만든다. 메인이 명령이 도는지·주석이
// 있는지 미리 보려고 스크립트를 돌리면 그 출력이 메인 컨텍스트에 쌓인다(b2e7c49f 벤치: 막기 전 3/3).
// 서브에이전트·in-process 팀원의 도구 호출에만 payload에 agent_id가 실려 오므로 그것으로 가른다
// (2026-11-11 실측: 메인·이름 없는 서브에이전트·이름 있는 팀원이 같은 셸 훅에서 갈림).
// 실행만 본다 — 명령 단위로 나눠 앞붙임을 걷은 뒤 첫 토큰이 node인 것만 잡아, 커밋 메시지·검색어 안의 인용은 통과시킨다.
// 레포 원본 경로(deploy/skills/code-review/…)를 적어 돌리는 것은 스크립트를 고치며 시험하는 일이라 막지 않는다.
// 명령 치환·`bash -c`·단일 `&` 안의 실행과, 옵션·인자가 붙은 감싸기 명령(`time -p`·`timeout 60` 등)은 보지 않는다 — 메인이 미리 볼 때 쓰는 모양은 code-review가 리뷰어
// 지시문에 넣는 완성 명령이라, 그 꼴이 바뀌면 이 판정 범위도 다시 본다.
const NODE = /(?:^|[\\/])node(?:\.exe)?$/i;
const SCRIPT = /added-comments\.mjs$/;
const WRAPPERS = new Set(["", "&", "env", "time", "command", "exec"]);
const SOURCE = /deploy[\\/]skills[\\/]code-review[\\/]scripts[\\/]added-comments\.mjs$/;

function runsDeployedScript(command) {
  return splitSegments(command).some((seg) => {
    const tokens = tokenize(seg);
    // 서브셸 여는 괄호, PowerShell 호출 연산자, `NAME=값` 환경변수 앞붙임, 실행을 감싸는 명령은 걷는다.
    if (tokens[0]?.startsWith("(")) tokens[0] = tokens[0].replace(/^\(+/, "");
    while (tokens.length && (WRAPPERS.has(tokens[0]) || /^[A-Za-z_]\w*=/.test(tokens[0]))) tokens.shift();
    if (!NODE.test(tokens[0] ?? "")) return false;
    // 첫 비옵션 토큰이 아니라 스크립트 이름으로 찾는다 — `--require ./x.cjs`처럼 값을 먹는 옵션이 있다.
    // 서브셸 닫는 괄호가 경로에 붙어 오므로 떼고 본다.
    const script = tokens.slice(1).map((t) => t.replace(/\)+$/, "")).find((t) => SCRIPT.test(t));
    return script !== undefined && !SOURCE.test(script);
  });
}

const payload = readPayload();

if (!payload.agent_id && runsDeployedScript(getCommand(payload))) {
  deny(
    "added-comments.mjs는 code-review에서 기준 문서를 대조하는 리뷰어만 돌립니다. 메인은 명령이 도는지·주석이 있는지 " +
      "미리 보려고도 돌리지 않습니다. 완성 명령을 리뷰어 지시문에 넣어 넘기세요.",
  );
}
