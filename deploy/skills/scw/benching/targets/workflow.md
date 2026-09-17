# /workflow 벤치 — 단위 매핑

workflow 스킬 벤치의 단위·오라클·fixture 대입값.

이 스킬을 벤치할 때의 workflow 대입값. 일반 방법론은 [eval-delegation.md](../../eval-delegation.md), 여기엔 대입값만 둔다.

## 벤치 단위 (일반 원칙 1·2)

| 분류 | workflow 해당 | 방식 |
|---|---|---|
| 오케스트레이터 (내부 spawn) | 세션 spawn·도미노 배선(세션 표 (4)), MARKUP·PR_{N}_IMPL (내부 impl-review-loop 호출) | 메인 직접 |
| 단일 말단 (spawn 없음) | 개별 Reviewer·Implementer 1회, requirement-review 체크리스트, figma-reviewer 1회 | 서브에이전트 병렬 fan-out |

단위는 세션이 아니라 step/말단이다. step.md는 모든 PR이 공유하므로 step-N을 고치면 step-N을 여러 입력에 대해 재벤치하지, PR 도미노를 처음부터 다시 돌리지 않는다.

## 오라클·mock 입력 (일반 원칙 3·채점)

둘 다 workflow SKILL.md를 진실 원천으로 파생한다 — 별도 표를 두지 않는다 (drift 방지).

- **오라클(채점)**: 각 step의 1차 입력에 직접 대조. 1차 입력 = 세션 표 (2) 입력 중 figma·요구사항 원본·컨벤션 1차 소스·사용자 발화 (AI 산출물 제외 — SKILL.md 「검증 기준 = 진실 원천」과 동일). 고정 rubric 없이 AI 판단. 예: step-5 구현은 implementation.md(AI 캐시)가 아니라 그 근거인 요구사항·컨벤션 1차 소스로 채점.
- **mock 입력**: 각 step이 먹는 입력은 세션 표 (2) + 직전 step이 "출력한다"고 적은 산출물 계약 기준으로 생성(기억 아닌 정의 기준). 폴더 구조는 workflow `conventions/plan-folder.md`.
- **harvest 예외**: 산출물 → 다음 step 입력 정합(체이닝)을 볼 때만 실제 직전 step을 돌려 출력 수확.

## AP fixture

- 채용과제 입력 원본(요구사항·시안 등)은 AC backlog 보관 — 벤치 시 참조.
- 병렬 런은 **독립 .git 슬롯(클론)** 으로. workflow가 내부에서 워크트리·브랜치를 만들어(FOUNDATION의 PR·markup 워크트리, PR별 브랜치) 한 `.git` 공유 시 런끼리 브랜치 네임스페이스가 충돌하기 때문.
