#!/usr/bin/env node
// 사용법: team-agent-results.md (같은 폴더)
//
// team-agent.md#claude-code 의 "여럿을 한 번에 기다릴 때" 절차에서 계산을 맡는다: 결과 폴더, 에이전트에게 붙일 작성 문안, 결과 파일 대기,
// 파일 없는 에이전트와 독촉 횟수, 뺀 에이전트. 메인이 산문을 읽고 손으로 세면 하나만 틀려도 대기가 바로 끝나거나
// (옛 파일·뺀 에이전트 파일이 개수에 듦) 590초씩 헛돈다(개수를 잘못 셈).
//
// 판단은 여기 없다. 가정·멈춘 이유를 어떻게 다룰지, 사용자에게 무엇을 물을지는 team-agent.md에 남는다.
//
// 독촉 횟수는 wait가 "독촉하라"고 낼 때 올린다. 따로 기록하는 명령을 두면 메인이 그 호출을 빠뜨려
// 상한에 영영 안 닿는다. 횟수는 라운드마다 따로 센다. 다음 라운드는 새로 맡긴 일이라 0부터다.
// 상한은 라운드의 첫 wait에서 상태 파일에 고정한다. 메인이 wait마다 다른 값을 주면 판정이 조용히 바뀐다.
// 사용자가 한 에이전트만 더 기다리기로 하면 reset --limit이 그 에이전트의 상한만 바꾼다.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// team-agent.md가 Bash를 timeout 600000(600초)으로 돌리라고 한다. 그보다 먼저 스스로 끝나야 한다.
// timeout을 넘긴 포그라운드 Bash는 죽지 않고 백그라운드로 넘어가, 끝날 때 메인을 다시 깨운다.
// TEAM_AGENT_RESULTS_WAIT_SECONDS는 테스트에서 대기를 줄이는 용도다. 절차 문서에는 적지 않는다.
const WAIT_SECONDS = /^\d+$/.test(process.env.TEAM_AGENT_RESULTS_WAIT_SECONDS ?? "")
  ? Number(process.env.TEAM_AGENT_RESULTS_WAIT_SECONDS)
  : 590;
const POLL_MS = 2000;
const DEFAULT_LIMIT = 2;
const STATE = ".team-agent-results.json";
// 이름은 파일명과 --expect의 쉼표 구분에 들어간다. `/`·`,`·공백이 들면 폴더가 갈리거나 이름이 쪼개진다.
const NAME_PATTERN = /^[A-Za-z0-9_.-]+$/;

const slash = (filePath) => filePath.replace(/\\/g, "/");

/**
 * 에이전트 프롬프트에 붙이는 작성 문안. 다 마친 뒤 작성하게 하는 것은 파일이 생긴 것이 메인의 완료 신호라서다.
 * 답을 기다리지 말고 가정을 정하게 하는 것은, 대기하는 동안 메인이 질문을 읽지 못해 답을 기다리는 에이전트는 파일을 남기지 않아서다.
 */
export const replyText = (out) =>
  `맡은 일을 다 마친 뒤 마지막 단계에서 결과를 \`${out}\`에 작성한다. 결과를 \`SendMessage\`로 보내지 않는다. ` +
  "물어볼 것이 생겨도 답을 기다리지 말고, 가정을 정해 진행한 뒤 그 가정을 파일 첫머리에 적는다. " +
  "끝내지 못하고 멈춰야 하면 멈춘 이유와 거기까지 한 일을 이 파일에 작성하고 멈춘다.";

const nudgeText = (file) =>
  `결과 파일 \`${file}\`가 아직 없다. 일을 마쳤으면 이 파일에 작성하고, 진행 중이면 계속한다.`;
const STOP_TEXT = "맡긴 일을 멈춘다. 결과 파일을 작성하지 않는다.";

function failUsage(reason) {
  console.error(`${reason}\n사용법: ${slash(import.meta.dirname)}/team-agent-results.md`);
  process.exit(1);
}

// 상태 파일이 깨졌을 때 빈 상태로 넘어가면 뺀 에이전트가 다시 개수에 들고 독촉이 0부터 돌아, 원인이 안 보인 채 헛돈다.
function readState(dir) {
  const file = path.join(dir, STATE);
  if (!fs.existsSync(file)) return { excluded: [], nudges: {}, limits: {} };
  try {
    const state = JSON.parse(fs.readFileSync(file, "utf8"));
    return { excluded: state.excluded ?? [], nudges: state.nudges ?? {}, limits: state.limits ?? {} };
  } catch (error) {
    console.error(`상태 파일을 읽지 못했다: ${slash(file)} (${error.message})`);
    process.exit(1);
  }
}

const writeState = (dir, state) => fs.writeFileSync(path.join(dir, STATE), JSON.stringify(state, null, 2));
const resultFile = (dir, name, round) => slash(path.join(dir, `${name}-r${round}.md`));

function removeResult(dir, name, round) {
  fs.rmSync(resultFile(dir, name, round), { force: true });
}

function setNudges(state, round, name, count) {
  state.nudges[round] = { ...(state.nudges[round] ?? {}), [name]: count };
}

function split(dir, round, expect) {
  const state = readState(dir);
  const active = expect.filter((name) => !state.excluded.includes(name));
  const skipped = expect.filter((name) => state.excluded.includes(name));
  const missing = () => active.filter((name) => !fs.existsSync(resultFile(dir, name, round)));
  return { state, active, skipped, missing };
}

// 다 모였거나 남은 에이전트가 없으면 출력하고 true. 아니면 출력 없이 false.
function printSettled(dir, round, active, skipped, left) {
  if (skipped.length) console.log(`뺀 에이전트(개수에서 뺐다): ${skipped.join(", ")}`);
  if (!active.length) {
    console.log("남은 에이전트 없음(전원 뺐다. 읽을 결과가 없다)");
    return true;
  }
  if (left.length) return false;
  console.log("다 모임");
  for (const name of active) console.log(`- ${name}: ${resultFile(dir, name, round)}`);
  return true;
}

function status(dir, round, expect) {
  const { active, skipped, missing } = split(dir, round, expect);
  const left = missing();
  if (printSettled(dir, round, active, skipped, left)) return;
  console.log(`모인 파일: ${active.filter((name) => !left.includes(name)).join(", ") || "없음"}`);
  console.log(`없는 파일: ${left.join(", ")}`);
}

async function wait(dir, round, expect, limitArg) {
  const { state, active, skipped, missing } = split(dir, round, expect);
  // all: 라운드 상한, byName: reset --limit으로 바꾼 에이전트별 상한. 이름과 키가 섞이지 않게 나눈다.
  const limits = state.limits[round] ?? { byName: {} };
  if (limits.all !== undefined && limitArg !== undefined && limits.all !== limitArg) {
    failUsage(
      `r${round}의 독촉 상한은 첫 wait에서 ${limits.all}로 정해졌다. 이후 wait에서는 --limit을 빼고, ` +
        "한 에이전트의 상한을 바꾸려면 reset --limit을 쓴다",
    );
  }
  limits.all ??= limitArg ?? DEFAULT_LIMIT;
  state.limits[round] = limits;
  const limitOf = (name) => limits.byName[name] ?? limits.all;

  const deadline = Date.now() + WAIT_SECONDS * 1000;
  while (missing().length && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }

  const left = missing();
  if (printSettled(dir, round, active, skipped, left)) {
    writeState(dir, state);
    return;
  }

  // 상한 판정과 횟수 올리기는 대기가 끝난 이 시점에만 한다.
  const counts = state.nudges[round] ?? {};
  const toNudge = left.filter((name) => (counts[name] ?? 0) < limitOf(name));
  const toAsk = left.filter((name) => (counts[name] ?? 0) >= limitOf(name));
  for (const name of toNudge) setNudges(state, round, name, (counts[name] ?? 0) + 1);
  writeState(dir, state);

  console.log(`모인 파일: ${active.filter((name) => !left.includes(name)).join(", ") || "없음"}`);
  if (toNudge.length) {
    console.log(
      toAsk.length
        ? "독촉할 에이전트(아래 문안을 그 에이전트에게 보낸다. 사용자에게 물을 대상이 있으니 wait를 다시 돌지 않는다):"
        : "독촉할 에이전트(아래 문안을 그 에이전트에게 보낸 뒤 같은 wait를 다시 돈다):",
    );
    for (const name of toNudge) {
      console.log(`- ${name} (독촉 ${state.nudges[round][name]}/${limitOf(name)}): ${nudgeText(resultFile(dir, name, round))}`);
    }
  }
  if (toAsk.length) console.log(`사용자에게 물을 대상(독촉 상한에 닿은 에이전트): ${toAsk.join(", ")}`);
}

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const opt = (flag) => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined);
  const need = (flag) => opt(flag) ?? failUsage(`${cmd}에 ${flag}이 없다`);
  const dirOf = () => {
    const dir = path.resolve(need("--dir"));
    if (!fs.existsSync(dir)) failUsage(`결과 폴더가 없다: ${slash(dir)}`);
    return dir;
  };
  const roundOf = () => {
    const round = need("--round");
    if (!/^[1-9]\d*$/.test(round)) failUsage(`--round는 1 이상의 정수다: ${round}`);
    return round;
  };
  const checkName = (name) => {
    if (!NAME_PATTERN.test(name)) failUsage(`이름은 영문·숫자·_·.·-만 쓴다: ${name}`);
    return name;
  };
  const nameOf = () => checkName(need("--name"));
  const expectOf = () => {
    const names = need("--expect").split(",").map((name) => name.trim()).filter(Boolean);
    if (!names.length) failUsage("--expect에 이름이 없다");
    return names.map(checkName);
  };

  switch (cmd) {
    case "init": {
      const parent = path.resolve(opt("--parent") ?? os.tmpdir());
      fs.mkdirSync(parent, { recursive: true });
      console.log(slash(fs.mkdtempSync(path.join(parent, "team-agent-results-"))));
      return;
    }
    // 경로를 메인이 손으로 적게 두면 wait의 --expect 이름과 어긋나 파일이 있어도 못 찾는다.
    case "reply":
      console.log(replyText(resultFile(dirOf(), nameOf(), roundOf())));
      return;
    case "path":
      console.log(resultFile(dirOf(), nameOf(), roundOf()));
      return;
    case "wait": {
      const limit = opt("--limit");
      if (limit !== undefined && !/^\d+$/.test(limit)) failUsage(`--limit은 0 이상의 정수다: ${limit}`);
      return wait(dirOf(), roundOf(), expectOf(), limit === undefined ? undefined : Number(limit));
    }
    case "status":
      return status(dirOf(), roundOf(), expectOf());
    case "reset": {
      const dir = dirOf();
      const round = roundOf();
      const name = nameOf();
      const limit = opt("--limit");
      if (limit !== undefined && !/^\d+$/.test(limit)) failUsage(`--limit은 0 이상의 정수다: ${limit}`);
      const state = readState(dir);
      setNudges(state, round, name, 0);
      if (limit !== undefined) {
        const limits = state.limits[round] ?? { byName: {} };
        limits.byName[name] = Number(limit);
        state.limits[round] = limits;
      }
      writeState(dir, state);
      console.log(`${name}: r${round} 독촉 횟수를 0으로 되돌렸다${limit !== undefined ? `. 상한 ${limit}` : ""}`);
      return;
    }
    case "reassign": {
      const dir = dirOf();
      const round = roundOf();
      const name = nameOf();
      const state = readState(dir);
      setNudges(state, round, name, 0);
      writeState(dir, state);
      // 출력은 에이전트에게 그대로 보낼 문안뿐이다. 처리 결과 줄을 섞으면 메인이 문안에서 걸러 내야 한다.
      removeResult(dir, name, round);
      console.log(replyText(resultFile(dir, name, round)));
      return;
    }
    case "exclude": {
      const dir = dirOf();
      const round = roundOf();
      const name = nameOf();
      const state = readState(dir);
      if (!state.excluded.includes(name)) state.excluded.push(name);
      writeState(dir, state);
      removeResult(dir, name, round);
      console.log(STOP_TEXT);
      return;
    }
    default:
      failUsage(cmd ? `모르는 명령: ${cmd}` : "명령이 없다");
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
