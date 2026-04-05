---
description: 최근 커밋이 있는 프로젝트를 찾아 프로젝트별 최신화 스킬로 검증하고 통합 보고한다. 레포지토리 점검, 주간 리뷰, 전체 프로젝트 검증 요청 시 사용.
argument-hint: [기간 (기본값: 7d) — 예: 7d, 14d, 30d]
---

# Full Refresh

최근 커밋이 있는 프로젝트를 탐지하여 프로젝트별 최신화 스킬로 검증·수정하고, README를 최신화한다. 기간은 인자로 받는다 (기본값: 7d).

## 프로젝트 레지스트리

| 약어 | 경로 | 최신화 스킬 | 스킬 경로 |
|------|------|-------------|-----------|
| KA | `~/WebstormProjects/main/knowledge-archive` | validate | `.claude/skills/validate/SKILL.md` |
| AC | `~/WebstormProjects/main/ai-contexts` | scw-refresh (하단 참조) | — |
| KQ | `~/WebstormProjects/my-else/knowledge-quiz` | update-quiz (하단 참조) | — |
| Blog | `~/WebstormProjects/my-else/blog` | update-blog (하단 참조) | — |

## 실행 흐름

### Phase 1: 커밋 탐색

레지스트리의 각 프로젝트에서 지정된 기간 내 커밋 목록을 조회한다. 프로젝트별로 커밋 ID, 메시지, 날짜를 보여주며 "여기 커밋부터 보면 되냐?"고 사용자에게 확인한다. 사용자가 시작점을 조정할 수 있다 (이전 full-refresh에서 이미 검증한 범위 제외).

커밋이 있는 프로젝트가 없으면 여기서 종료한다.

### Phase 2: 검증 계획 제출

커밋이 감지된 프로젝트 중 최신화 스킬이 등록된 프로젝트에 대해 검증 계획을 제출한다.

사용자가 조정할 수 있다 ("이건 이미 했으니 빼줘" 등). 승인 후 Phase 3으로 진행한다.

### Phase 3: 검증 및 수정

승인된 계획에 따라 프로젝트별로 서브에이전트를 위임한다. 각 스킬이 검증과 수정을 수행하고 커밋한다.

서브에이전트 지시:
- 대상 프로젝트의 스킬 파일(SKILL.md)을 읽고, 기술된 대로 실행하라
- 수정 후 커밋까지 완료하라

### Phase 4: README 최신화

Phase 3에서 변경된 파일 목록을 기반으로, 각 파일의 상위 경로에 README.md가 있는지 탐색한다. 해당 README가 하위 변경을 반영하고 있는지 검증하고, 반영되지 않았으면 `/write-doc`로 최신화한다.

## 프로젝트별 최신화 정의

### AC: scw-refresh

1. 커밋 diff에서 변경된 스킬을 식별한다
2. 변경된 부분이 잘 동작하는지 `/scw`로 검증한다
3. 이전 버전 대비 개선되었는지 eval한다

### KQ: update-quiz

KA validate 완료 후 실행한다. `npm run parse`로 KA 원본 문서를 그대로 generated/ JSON으로 갱신한다.

### Blog: update-blog

KA validate 완료 후 실행한다. KA 문서의 Official Answer(영어 팩트 나열)를 한글로 풀어써서 블로그 포스트로 변환한다. 블로그 CLAUDE.md의 KA 변환 규칙을 따른다.

## 범위

- **포함**: 커밋 탐색, 검증 계획/실행/수정, README 최신화
- **제외**: 스킬이 수정하지 못한 항목 (사용자가 직접 해결)
