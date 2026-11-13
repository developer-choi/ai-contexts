# bench-trigger.mjs 사용법

`node <prompt-review 스킬 폴더>/benching/scripts/bench-trigger.mjs --eval-set <json> --skill-path <dir> --out <json> [옵션]`
`node <prompt-review 스킬 폴더>/benching/scripts/bench-trigger.mjs --help`

쿼리마다 `claude -p`를 돌려 대상 스킬이 발동했는지 보고, 쿼리별 발동 비율과 판정을 매긴다. `--help`(`-h`)는 이 문서를 stdout에 출력한다.

## 전제

- `claude` CLI가 PATH에 있고 로그인되어 있다. 쿼리마다 실제 call이 나간다(쿼리 수 × `--runs-per-query`)
- `--skill-path`가 plugin 안의 스킬(`<plugin 루트>/skills/<이름>`, 루트에 `.claude-plugin/plugin.json`)이면 그 plugin을 `--plugin-dir`로 읽혀 잰다. 설치·배포가 필요 없고, 같은 이름으로 설치된 plugin보다 이것이 쓰인다. 트리거는 `<plugin>:<이름>`으로만 센다
- 그 밖의 스킬은 설치되어 있어야 한다. 설치본은 cwd에서 위로 올라가며 처음 만나는 `.claude`가 있는 폴더(홈이 아닐 때)의 `.claude/skills/<이름>`, 없으면 `~/.claude/skills/<이름>`이다
  - 설치본의 description이 `--skill-path`의 description과 같아야 한다. 원본을 고쳤으면 배포한 뒤 잰다
- description은 frontmatter에 한 줄 값으로 적혀 있어야 한다(`>`·`|`·이어지는 줄은 못 잰다)

## 인자

- `--eval-set <경로>` 필수. 최상위 배열, 항목마다 `query`(문자열)와 `should_trigger`(불리언). BOM이 붙어도 읽는다
- `--skill-path <경로>` 필수. 측정 대상 스킬 폴더. 여기서는 `SKILL.md`의 `name`(없으면 폴더 이름)과 description만 읽는다
- `--out <경로>` 필수. 결과 JSON을 쓸 경로
- `--baseline <경로>` BEFORE 측정의 `--out` JSON. 주면 쿼리별 BEFORE 대비 rate 변화 열을 함께 찍는다(실패가 섞인 행은 `보류`)
- `--num-workers <n>` 동시 실행 상한. 기본 3
- `--timeout <초>` 쿼리 1회의 타임아웃. 기본 240
- `--runs-per-query <n>` 쿼리당 반복. 기본 3
- `--trigger-threshold <f>` 쿼리 개별 통과 판정의 임계 비율. 기본 0.5
- `--model <id>` 측정 모델. 기본 `sonnet`. 시작할 때 실제 모델 ID로 풀어 모든 쿼리를 그 ID로 고정한다
- `--verbose` 진행 로그를 stderr에 출력한다
- 환경변수 `BENCH_DUMP_DIR=<경로>` 쿼리 1회마다 원본 stream-json을 그 폴더에 `<스킬 이름>_<난수>.jsonl`로 남긴다

## 출력

`--out` JSON: `model`·`description`·`summary`(`passed`·`total`·`pass_rate`·`failed_total`·두 평균 rate)·`results`(쿼리별 `triggers`·`runs`·`rate`·`pass`·`failed`·`verdict_withheld`·`errors`).

stdout:

- `model=<ID>  description=<해시 8자>` 줄과 쿼리별 표(`판정` 열: `PASS`·`FAIL`·`보류(재측정)`). 실행 실패가 있는 행은 판정하지 않는다
- `통과: <n>/<전체>   실행 실패: <n>건`
- `should_trigger 평균 rate`(0.7 이상이면 PASS)·`should_not_trigger 평균 rate`(0.1 이하면 PASS). 이 두 줄이 description 전체의 판정이다
- 실행 실패가 있으면 두 평균이 낮게 잡힐 수 있으니 재측정 전에는 FAIL을 확정으로 읽지 말라는 줄

plugin 스킬이거나 설치본이 전역 스킬이면 빈 임시 폴더에서 돌리고 끝나면 지운다. 지우지 못하면 `임시 폴더 정리 실패 — 직접 지운다: <경로>`를 stderr에 출력한다. 그 폴더는 직접 지운다.

## exit code

- 0 측정을 마쳤다. 판정이 FAIL이어도 0이다
- 1 인자 오류(사유와 이 문서 경로를 stderr에 출력한다). 또는 측정 전에 멈췄다: 모델 ID를 풀지 못함, 설치본 없음, `--skill-path`와 설치본의 description이 다름, `--baseline`과 description이 같음(변경이 측정되지 않는다), `--baseline`과 측정 모델이 다름(`--model <BEFORE 모델>`로 다시 잰다)
