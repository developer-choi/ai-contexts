# MARKUP

전 페이지 markup 생성·검증. PR에 안 들어감 (PR_{N}_IMPL이 페이지 단위로 검증된 코드를 그대로 가져감).

모드 무관 공통 절차는 본 파일에 둔다. **디자인 진실 원천·재료·검사 방법은 모드마다 다르므로 모드 파일에 분리**한다 — figma 쓰는 모드(채용·실무)는 [figma.md](figma.md), figma 없이 사용자가 직접 정의하는 모드(개인)는 [personal.md](personal.md). 모드가 늘면 모드 파일만 추가하고 본 파일은 건드리지 않는다.

## [CRITICAL] 메인 작업

**메인 작업은 markup 워크트리에서 마크업 코드(`.tsx`, `.module.scss`)를 작성하고 디자인 진실 원천과 0건까지 수렴 검증**하는 것이다. 디자인 진실 원천이 무엇인지·어떻게 대조하는지는 모드 파일이 정의한다. 자료·승인이 갖춰졌다고 세션이 끝난 게 아니다.

세션 종료 조건: **`background/consumable/project.md`의 모든 페이지·도메인 컴포넌트가 markup 워크트리에 마크업으로 존재하고, 컴포넌트별로 디자인 진실 원천 대조 0건 수렴**. 검증은 아래 「마크업 구현·검사」의 엔진이 담당하며, project.md의 PR별 컴포넌트 목록은 "전 컴포넌트를 다뤘는지"를 보는 커버리지 인덱스다 (파일 존재만이 아니라 디자인 충실도까지 본다).

## 진입 조건

- (채용) FOUNDATION 단계 4 종료 후
- (실무·개인) BG.step-1.1 후

## 자료 참조 (수집은 step-1.1)

만들 컴포넌트 종류·이름은 `background/consumable/project.md`의 PR별 컴포넌트 목록을 참조한다 — MARKUP 종료조건의 커버리지 인덱스와 **동일원**이라 모드 무관하게 이름·커버리지가 단일화된다. 각 컴포넌트의 디자인 디테일 원천(재료)과 그 참조 방식은 모드 파일이 정의한다.

개인·실무 모드면 `background/retained/conventions-index.md`에 등재된 표준 참고처(simplified 레포)도 마크업 참고에 포함한다 — 등재 절차·목록은 step-1 「컨벤션 소스 수집」이 단일 출처.

참조 자료가 갖춰지면 markup 워크트리로 이동하여 「마크업 구현·검사」로 진입한다.

## 마크업 구현·검사

마크업 코드 작성·검사는 [impl-review-loop](../../../impl-review-loop/SKILL.md)를 호출해 컴포넌트별 디자인 진실 원천 0건까지 수렴시킨다. 마크업 인자를 주입한다:

| 인자 | 주입값 |
|---|---|
| 구현자 | Markup Implementer (sonnet) — 마크업 전용 (CSS·최소 props). 로직·테스트 작성 안 함 |
| 재료 | 컴포넌트 목록, 디자인시스템 소스, 기존 mixin/레이아웃 패턴 + 모드별 자료 (모드 파일 참조) |
| 진실검사 A | 모드 파일이 정의 — figma 대조([figma.md](figma.md)) / 사용자 시각 확인([personal.md](personal.md)). 종료 커버리지 = project.md 전 컴포넌트 |
| 규칙검사 B | 마크업 coding-standards (AC coding-standards/map.md + MP best-practices-map.md 중 마크업 rules) |
| 증분 단위 | 컴포넌트 |

구현자에게 주입하는 모드별 필수 지침은 해당 모드 파일을 따른다.

## 산출물 형태

- **markup 워크트리의 `.tsx` / `.module.scss` 코드** (메인 산출물 — project.md의 모든 페이지·도메인 컴포넌트, 디자인 진실 원천 0건 수렴 상태)
- 마크업 작성의 입력 자료는 모드 파일 참조

## 포트 룰

마크업 세션 = **포트 3000 점유**. /workflow 시작 시 사용자에게 안내.
