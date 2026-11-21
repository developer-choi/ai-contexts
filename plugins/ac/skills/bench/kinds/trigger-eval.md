# Trigger Eval Bench

스킬 description의 트리거 정확도(false negative/positive)를 측정한다.

frontmatter에 `disable-model-invocation: true`가 있는 스킬은 대상이 아니다. 그 description은 모델 컨텍스트에 올라가지 않아 측정할 트리거가 없다. 사용자만 호출하게 하려는 스킬은 재려 하지 말고 그 필드를 켠다.

## 측정 도구: bench-trigger.mjs

skill-creator 표준 도구(`run_eval.py`, `run_loop.py`)는 `claude -p`가 `.claude/commands/`를 읽지 않는 구조적 문제 등으로 동작하지 않아 자체 도구 `${CLAUDE_SKILL_DIR}/scripts/bench-trigger.mjs`를 쓴다.
이슈·재시험 이력은 backlog `maintenance/upstream-bugs/skill-creator-trigger-eval.md`에 있다.

측정 타당성에 걸리는 차이는 하나다: **`.claude/commands/` 임시 파일을 안 만들고 `claude -p`가 발견하는 `SKILL.md`(plugin 스킬은 원본, 그 밖은 설치본)를 그대로 측정한다**(skills 디렉토리는 `claude -p`도 인식). 위 구조적 문제를 비켜가는 지점이 여기다.

## 입력 eval set

쿼리를 어떻게 작성하고 양쪽을 몇 개씩 담는지는 skill-creator "Description Optimization"의 eval 쿼리 생성 단계를 그대로 따른다. 파일 모양(키 이름·배열)도 같다.

## 호출

전제(설치·배포가 필요한지)와 인자는 [../scripts/bench-trigger.md](../scripts/bench-trigger.md)를 따른다. AFTER는 `--baseline`으로 BEFORE 결과를 주고 측정한다.

## 결과 해석

FAIL이 **추상 쿼리**에서 났으면 description보다 eval set을 먼저 의심한다(skill-creator "How skill triggering works").
