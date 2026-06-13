---
target: .claude/skills/full-refresh/
---

# full-refresh — DC↔AC 페어 문서 동기화

## [ideation] DC ↔ AC 페어 문서 동기화 반영

scope: global (.claude/skills/full-refresh/SKILL.md + 프로젝트 레지스트리)

### 동기

DC(developer-choi)는 채용담당자 과시용 서술형 외부 공개 문서, AC는 같은 주제를 AI에게 시키기 위한 실전 압축 문서로 같은 짝을 이루는 문서가 다수 존재한다. 한쪽이 수정되면 다른 쪽도 같이 갱신되어야 하는데 짝 관계가 명시되어 있지 않아 동기화 누락 위험이 크다. full-refresh가 이 페어 동기화를 점검·트리거하는 책임을 가져야 한다.

### 핵심 아이디어

- DC를 full-refresh 프로젝트 레지스트리에 추가
- DC 아티클 ↔ AC 실전 문서 페어를 명시하는 매핑(매칭표)을 두고, full-refresh가 한쪽 변경을 감지하면 다른 쪽 갱신 필요 여부를 보고
- 초기 도입 시 현존 페어 전수 대조(초기 동기화) 작업 1회 필요

### 페어 예시 (확정 1쌍)

- DC `docs/communication/pr-commit-guide.md` ↔ AC `deploy/skills/workflow/steps/step-2.md`
  - DC: 외부 공개용 서술형, 톤 다듬어짐 ("좋은 PR과 Commit을 작성하는 방법")
  - AC: AI 실전 명령형, 규칙·체크리스트 중심 ("Step 2: PR 분할 전략 수립")

### 미확정 사항 (다음 라운드에서 정리)

- 매칭표 저장 위치 (AC `meta/`? `deploy/`? 별도 디렉토리? DC 쪽에도 둘지)
- 매칭표 형식 (단일 md 테이블 한 장? per-skill metadata 분산?)
- 페어 비대칭 케이스(한쪽만 존재) 표기 방식
- DC 등록 시 Phase 3 Maintain 스킬 정의 (없으면 변경 감지만 하고 사용자에게 보고)
- 초기 동기화를 full-refresh 첫 도입 회차에서 흡수할지, 사전 별도 작업으로 분리할지

### 종료 조건

- 매칭표가 존재하고, full-refresh가 DC를 레지스트리에 포함하며, 양쪽 어느 쪽이든 변경되면 다른 쪽 갱신 후보로 보고하는 동작이 SKILL.md에 명세됨
- 초기 동기화 1회 완료 (현존 페어 전수 대조)

### 첫 행동

매칭표 위치·형식을 사용자와 짧게 합의 후, 빈 매칭표 파일 생성. 위 확정 1쌍을 첫 행으로 적어 형식을 굳힌다.
