# Trigger Eval Bench

스킬 description의 트리거 정확도를 정량 측정한다. false negative(트리거 되어야 하는데 안 됨), false positive(트리거되면 안 되는데 됨) 둘 다 잡는다.

## 왜 자체 도구

skill-creator 플러그인의 `run_loop.py`는 윈도우에서 `select.select`를 파이프 fd에 호출 → `WinError 10038 (operation on non-socket)`로 모든 query 실패. 우회 도구가 `scripts/bench-trigger.py` — `subprocess.run(capture_output=True)` + `ThreadPoolExecutor` 조합.

## 입력

eval set JSON. 쿼리는 현실적이고 백스토리·구체 정보 포함.

```json
[
  {"query": "사용자가 입력할 만한 문장 (구체적·현실적)", "should_trigger": true},
  {"query": "트리거되면 안 되는 문장 (인접 도메인 함정 포함)", "should_trigger": false}
]
```

should-trigger와 should-not-trigger 비슷한 비율로 (8~12개씩 권장).

## 호출

```bash
PYTHONUTF8=1 python <scw>/scripts/bench-trigger.py \
  --eval-set <path-to-eval.json> \
  --skill-path <path-to-skill-dir> \
  --runs-per-query 3 \
  --num-workers 5 \
  --timeout 90 \
  --model claude-sonnet-4-6 \
  --out <result.json> \
  --verbose
```

- `--skill-path`: 측정 대상 스킬 디렉토리. **`~/.claude/skills/<name>/`이 실제 트리거 환경**. deploy/와 동기화 상태 확인 후 선택.
- `--runs-per-query 3`: LLM 비결정성 보정용. 3 권장. 1로 줄이면 시간 절약하나 변동성 못 잡음.
- `--num-workers 5`: 병렬 워커. 윈도우 socket 한계 우려 시 줄임.
- 모델은 sonnet 기본 (SCW 룰).

**시간 추정**: `queries × runs / workers × 평균 60s`. 25 × 3 / 5 ≈ 15분.

## 결과 해석

`--out` JSON 핵심 필드:

- `summary.passed/total` — 통과 비율
- `summary.should_trigger_triggered_rate` — 트리거 평균 비율. 0.7 이상 권장 (1.0 이상)
- `summary.should_not_trigger_triggered_rate` — 0.0~0.1 (낮을수록 좋음)
- `results[].rate` — 쿼리별 trigger 비율 (3 runs 중 몇 번 트리거)

FAIL 케이스 분류 후 대응:

- **핵심 진입 신호인데 안 잡힘** → description에 자연어 키워드 추가
- **모호한 케이스** (단발성 작업으로도 해석 가능) → 안 잡혀도 무방. false positive 위험이 더 큼

## BEFORE/AFTER 비교

description 변경 효과 측정 흐름:

- BEFORE: 현재 SKILL.md description 그대로 측정
- 새 description 안 작성
- `~/.claude/skills/<name>/SKILL.md`를 백업 후 swap (또는 deploy/ 수정 + `npm run update`)
- AFTER: 새 description으로 측정
- 결과 비교 후 SKILL.md 복원 또는 confirm

**swap 중 사용자 다른 세션이 실제 사용에 영향 받을 수 있음** — 측정 종료 후 반드시 복원.

## Limitations

- 트리거 결정은 모델별로 다름. 측정 모델과 사용자 환경 모델이 다르면 결과 해석 주의.
- timeout이 짧으면(60s 등) LLM 응답 늦은 케이스가 false negative로 잡힘. **90~120s 권장**.
- 트리거 감지는 stream-json의 `Skill` tool_use에서 `"skill":"<name>"` 매칭. tool 호출 형태가 다른 환경에선 fall-through로 false negative 가능.

## 워크스페이스 컨벤션

```
$env:TEMP/<skill>-trigger-eval/
  eval_set.json
  iteration-1/
    before.json + before.log
    after.json + after.log
```

작업 종료 후 정리.
