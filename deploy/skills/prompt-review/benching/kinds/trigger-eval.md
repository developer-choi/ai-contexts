# Trigger Eval Bench

스킬 description의 트리거 정확도(false negative/positive)를 측정한다.

frontmatter에 `disable-model-invocation: true`가 있는 스킬은 대상이 아니다 — 그 description은 모델 컨텍스트에 올라가지 않아 측정할 트리거가 없다. 사용자만 부르게 하려는 스킬은 재려 하지 말고 그 필드를 켠다.

## 현재 상태 (2026-10-17 재확인)

**skill-creator 표준 도구(`run_eval.py`, `run_loop.py`)는 현재 broken**이고 공식 fix가 없다.

알려진 별개 문제:

| 문제 | 영향 | 출처 |
|---|---|---|
| `claude -p`가 `.claude/commands/` 로드 안 함 (architectural) | 모든 OS — 모든 should-trigger 쿼리 0% recall | [anthropics/skills#556](https://github.com/anthropics/skills/issues/556) OPEN. [anthropics/claude-code#36570](https://github.com/anthropics/claude-code/issues/36570)은 `NOT_PLANNED`로 닫힘(미수정) |
| Parallel worker UUID 충돌 (`--num-workers 10` default) | 모든 OS — `--num-workers 1`은 100%, default는 11% | [PR #794 OPEN](https://github.com/anthropics/skills/pull/794) |
| 윈도우 `select.select` pipe fd 비호환 (WinError 10038) | 윈도우만 — 모든 쿼리 실패 | 미보고 |

**근거**: 공식 docs https://code.claude.com/docs/en/headless 원문.

> User-invoked skills like `/commit` and built-in commands are only available in interactive mode. In `-p` mode, describe the task you want to accomplish instead.

`run_eval.py`(`run_single_query`)가 test artifact를 `.claude/commands/`에 쓰는데 `claude -p`는 commands를 안 본다 → 구조적 broken. 윈도우 patch만으로 해결 안 된다.

## 측정 도구: bench-trigger.mjs

표준 도구가 broken이라 자체 도구 `{{skill_dir}}/benching/scripts/bench-trigger.mjs`를 쓴다.

측정 타당성에 걸리는 차이는 하나다: **`.claude/commands/` 임시 파일을 안 만들고 설치된 `SKILL.md`를 그대로 잰다**(skills 디렉토리는 `claude -p`도 인식). 위 architectural 이슈를 비켜가는 지점이 여기다. 나머지 구현은 스크립트가 정본이다.

## 입력 eval set

쿼리를 어떻게 쓰고 양쪽을 몇 개씩 담는지는 skill-creator 「Description Optimization」의 eval 쿼리 생성 단계를 그대로 따른다. 파일 모양(키 이름·배열)도 같다.

## 호출

인자 목록은 `--help`가 정본이다. BEFORE/AFTER는 원본을 고치고 배포해 가며 재고, AFTER는 `--baseline`으로 BEFORE 결과를 주고 잰다.

벤치 산출물 정리는 [../operations.md](../operations.md)를 따른다.

## 결과 해석

FAIL이 **추상 쿼리**(예: "description 너무 길어")에서 났으면 description보다 eval set을 먼저 의심한다 — skill-creator 「How skill triggering works」.

## 함정

| 함정 | 증상 | 예방 |
|---|---|---|
| non-trigger run이 cwd 오염 | 트리거 안 되는 액션형 쿼리는 `claude -p`가 본문 작업까지 수행 → 파일 생성·`git add`까지 함(early-kill은 트리거 시에만 발동) | 로컬 스킬은 레포 안에서 돌 수밖에 없으니 측정 직후 `git status`로 stray 파일·staging을 점검·정리한다 |

## Limitations

- 트리거 결정은 모델별로 다름. 측정 모델과 사용자 환경 모델 다르면 결과 해석 주의.
