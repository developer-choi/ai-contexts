# bench-ablation.mjs 사용법

`node <prompt-review 스킬 폴더>/benching/scripts/bench-ablation.mjs --eval-set <json> --out <json> [옵션]`
`node <prompt-review 스킬 폴더>/benching/scripts/bench-ablation.mjs --help`

eval-set의 시나리오 × 비교군 × 반복마다 격리된 `claude -p`로 응답을 받고, 채점 모델로 분류해 축마다 판정을 매긴다. `--help`(`-h`)는 이 문서를 stdout에 출력한다.

## 전제

- `claude` CLI가 PATH에 있고 로그인되어 있다. CLI의 OAuth 로그인을 쓰므로 `ANTHROPIC_API_KEY`는 필요 없다
- run 1개 = 생성 1 call + 채점 1 call. 한 번에 쏠 call이 100을 넘으면 call 없이 멈춘다(`--allow-over-cap`으로 넘긴다)

## 인자

- `--eval-set <경로>` 필수. 아래 [eval-set](#eval-set) 꼴의 JSON. BOM이 붙어도 읽는다
- `--out <경로>` 필수. 결과 JSON을 쓸 경로
- `--reps <n>` 시나리오 × 비교군당 반복 수. 기본 3
- `--target-reps <n>` 목표 반복 수. 기본 3, 0이면 끈다. 칸의 반복이 이보다 적으면 판정을 `보류(반복 미달)`로 찍는다. 0 이상의 정수가 아니면 멈춘다
- `--model <id>` 생성 모델. 기본 `sonnet`
- `--grader-model <id>` 채점 모델. 기본 `sonnet`
  - 두 모델 모두 call을 쓰기 전에 실제 모델 ID로 풀어 모든 run을 그 ID로 고정한다
- `--workers <n>` 동시 실행 상한. 기본 8
- `--timeout <초>` call 1회의 타임아웃. 기본 180. 타임아웃은 재시도하지 않는다(그 밖의 실패는 3회까지 시도)
- `--variants <a,b>` 이 비교군만 돌린다
- `--scenarios <a,b>` 이 시나리오 id만 돌린다
- `--dump-dir <경로>` run마다 `<시나리오>_<비교군>_r<반복>.json`을 남긴다. 없으면 만든다
- `--resume` `--dump-dir`에 실패 없이 끝난 run 파일이 있으면 call 대신 그 파일을 쓴다. 중간에 죽은 실행을 같은 명령으로 다시 치면 죽은 run만 나간다. 반복을 1, 2, 3으로 나눠 올릴 때도 같은 `--dump-dir`에 붙인다
- `--no-smoke` 본 실행 전 스모크를 건너뛴다
  - 스모크는 시나리오 × 비교군마다 남은 첫 run을 먼저 돌린다. 칸 수가 `--workers`보다 적으면 다음 run을 더 얹는다
  - 실행 실패가 한 건이라도 나면 본 실행 없이 멈춘다. 스모크 run은 본 실행이 그대로 쓴다
- `--max-fail-streak <n>` 실행 실패가 연달아 n건이면 남은 run을 버리고 멈춘다. 기본 3, 0이면 끈다. 0 이상의 정수가 아니면 멈춘다
- `--allow-over-cap` 100 call 상한을 일부러 넘길 때
- `--verbose` 진행 로그를 stderr에 출력한다

## eval-set

```jsonc
{
  "rule_id": "...",                            // 결과 머리와 eval-set 사본 파일명에 쓴다
  "base_system": "...{TARGET}...",             // {TARGET}이 비교군 텍스트로 치환된다
  "variants": {"ZERO": "", "V1": "..."},
  "variant_cwds": {"ZERO": "/path/to/wt-zero", "V1": "/path/to/wt-v1"},  // (선택) 비교군별 작업 폴더
  "worker_permission_mode": "acceptEdits",     // (선택) 생성 call의 --permission-mode. 없으면 안 붙인다
  "grader": {                                  // 전 시나리오 기본 채점 분류지
    "instruction": "(선택) 채점자에게 줄 추가 지시",
    "classes": [{"id": "ONE_AT_A_TIME", "desc": "..."}, {"id": "DUMP_ALL", "desc": "..."}]
  },
  "scenarios": [
    {"id": "P1", "type": "positive", "user": "...", "pass_when": ["ONE_AT_A_TIME"]},
    {"id": "M1", "type": "positive", "user": "...",  // 다축: 한 응답을 독립 항목 여럿으로 잰다
     "grader": {"axes": [
       {"id": "field_a", "question": "...",
        "classes": [{"id": "YES", "desc": "..."}, {"id": "NO", "desc": "..."}],
        "pass_when": ["YES"]}
     ]}}
  ],
  "inheritance_signatures": ["...", "..."]     // ZERO 응답이 이 문구를 재사용하면 환경 상속 의심
}
```

- 시나리오에 `grader`가 있으면 그것을, 없으면 최상위 `grader`를 쓴다
- `variant_cwds`가 없는 비교군은 call마다 빈 임시 폴더에서 돈다. 있는 비교군은 그 폴더에서 돌고, 폴더는 만들지도 지우지도 않는다. 채점 call은 늘 임시 폴더에서 돈다
- `worker_permission_mode`의 유효값은 CLI가 정한다. 틀린 값은 CLI가 거부해 그 call이 실행 실패로 잡힌다
- 시나리오 `user`가 `/`로 시작하면 CLI가 슬래시 명령으로 가로채므로 그 run은 실패로 잡힌다. 스킬 호출은 문장 안에 넣는다

call을 쓰기 전에 아래 중 하나면 멈춘다(exit 1).

- call 수가 상한(100)을 넘는다
- 분류지·`pass_when`이 비었거나, `pass_when`이 분류지에 없는 값을 가리킨다
- 돌릴 비교군의 `variant_cwds` 폴더가 없다
- 비교군 텍스트가 있는데 `base_system`에 `{TARGET}`이 없다
- `inheritance_signatures`가 있는데 `ZERO` 비교군이 없다
- 그 문구가 ZERO 쪽 텍스트(`base_system`·ZERO 변형·ZERO 작업 폴더의 텍스트 파일)에 이미 있다

## 출력

stderr:

- `eval-set 사본(변형 제외): <경로>` 명세 점검을 통과하면 `variants`·`variant_cwds`를 뺀 eval-set을 `%TEMP%/prompt-review-evals/<rule_id>.json`에 남긴다. `rule_id`가 없으면 남기지 않는다는 줄이 대신 나온다
- `주입 <비교군>: 시스템 프롬프트 <n>자[, 작업 폴더 <경로>]` 비교군마다. 실사용에서 대상이 실리는 경로와 같은지 본다
- `--verbose`면 run·call 수와 run마다 축별 분류

`--out` JSON:

- `rule_id`·`model`·`grader_model`·`reps`·`failed_total`·`failed_runs_by_variant`
- `table` 행마다 비교군별 `pass`·`n`·`failed`·`classes`와 `verdict`·`verdict_withheld`
- `inheritance_flags`·`permission_blocked`·`missing_file`
- 중단됐으면 `aborted`·`runs_done`·`runs_total`도 있다

stdout은 행(시나리오, 다축이면 `시나리오#축`)마다 비교군별 `통과/반복`·실패 수·판정 열을 단 표와 아래 줄이다.

- 판정 열: `갈림`·`델타 없음`·`바닥(양 비교군 다 실패)`·`안 갈림`·`비교 불가(비교군 1개 — --variants 확인)`·`보류(재측정)`·`보류(반복 미달)`·`보류(중단)`·`보류(상속 의심)`. 판정별 처리는 [../kinds/rule-ablation.md](../kinds/rule-ablation.md#한-패스로-닫는다-안-갈린-것은-다시-재지-않는다)
- `실행 실패: <n>건` 실패가 있는 행은 판정하지 않는다
- `실패가 비교군에 쏠렸다: …` 이 표의 델타는 못 쓴다. `--timeout`을 올리고 같은 명령에 `--resume`을 붙여 다시 친다
- `환경상속 의심: <n>건` ZERO 응답이 `inheritance_signatures`를 재사용한 시나리오
- `권한 거부 응답: <n>건` 워커가 권한이 없어 작업을 못 했다. eval-set에 `worker_permission_mode`를 주고 다시 잰다
- `파일 못 찾음 응답: <n>건` 워커가 시나리오 속 파일을 cwd에서 못 찾았다. 시나리오에서 그 파일을 지우거나 "파일은 못 여니 주어진 것만 보고 답해"를 넣고 다시 잰다
  - 위 두 줄은 근사 매칭이다. 응답 첫머리가 착수를 미뤘는지 보고 다시 잴지 정한다
- `중단: …` 스모크 실패나 연속 실패로 멈췄다. 실패한 run 목록이 따르고, 원인을 고친 뒤 같은 명령에 `--resume`을 붙여 다시 친다

## exit code

- 0 모든 run을 마쳤다. 판정이 갈리지 않아도 0이다
- 1 인자 오류(사유와 이 문서 경로를 stderr에 출력한다), call 전에 멈춤(위 목록·모델 ID를 풀지 못함), 또는 스모크 실패·연속 실패로 중단(결과 JSON과 부분 표는 쓴다)
