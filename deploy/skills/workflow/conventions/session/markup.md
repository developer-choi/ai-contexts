# MARKUP

전 페이지 markup 생성·검증. PR에 안 들어감 (PR_{N}_IMPL이 페이지 단위로 검증된 코드를 그대로 가져감).

## [CRITICAL] 메인 작업

**메인 작업은 markup 워크트리에서 마크업 코드(`.tsx`, `.module.scss`)를 작성하고 figma 원본과 0건까지 수렴 검증**하는 것이다. figma 자료는 step-1.1이 수집한 것을 참조한다 — 자료가 갖춰졌다고 세션이 끝난 게 아니다.

세션 종료 조건: **`background/consumable/project.md`의 모든 페이지·도메인 컴포넌트가 markup 워크트리에 마크업으로 존재하고, 컴포넌트별로 figma 원본 대조 0건 수렴**. 검증은 아래 「마크업 구현·검사」의 엔진이 담당하며, project.md의 PR별 컴포넌트 목록은 "전 컴포넌트를 다뤘는지"를 보는 커버리지 인덱스다 (파일 존재만이 아니라 figma 충실도까지 본다).

## 진입 조건

- (채용) FOUNDATION 단계 4 종료 후
- (실무) BG.step-1.1 후

## 자료 참조 (수집은 step-1.1)

MARKUP은 **step-1.1/BG가 수집해** `background/retained/figma-url.md`·`background/retained/figma/`에 저장한 figma 자료를 참조한다. **figma 자료를 다시 요청하지 않는다** — 빠진 컴포넌트가 있으면 그것만 콕 집어 요청한다. 만들 컴포넌트 종류·이름은 `background/consumable/project.md`의 PR별 컴포넌트 목록을 참조한다 — MARKUP 종료조건의 커버리지 인덱스와 **동일원**이라 모드 무관(채용·실무)하고 이름·커버리지가 단일화된다. (figma는 그 컴포넌트들의 디자인 디테일 원천.)

참조 자료가 갖춰지면 markup 워크트리로 이동하여 「마크업 구현·검사」로 진입한다.

## 마크업 구현·검사

마크업 코드 작성·검사는 [impl-review-loop](../../impl-review-loop/SKILL.md)를 호출해 컴포넌트별 figma 0건까지 수렴시킨다. 마크업 인자를 주입한다:

| 인자 | 주입값 |
|---|---|
| 구현자 | Markup Implementer (sonnet) — 마크업 전용 (CSS·최소 props). 로직·테스트 작성 안 함 |
| 재료 | 누적한 figma URL·캡처, 컴포넌트 목록, 디자인시스템 소스, 기존 mixin/레이아웃 패턴, (실무) 매칭표 |
| 진실검사 A | figma 원본 직접 fetch — Figma Reviewer ↔ 구현자 대조 루프. 대조형(실행 오라클 없음). 검증 기준은 [markup-spec.md](../artifact/markup-spec.md) 「검증 기준 — figma 원본 직접 fetch」. 종료 커버리지 = project.md 전 컴포넌트 |
| 규칙검사 B | 마크업 coding-standards (AC coding-standards/map.md + MP best-practices-map.md 중 마크업 rules) |
| 증분 단위 | 컴포넌트 |

### Markup Implementer 필수 지침

엔진에 Markup Implementer를 주입할 때 반드시 함께 전달:

1. **"피그마 참조 코드의 CSS 토큰을 매칭표와 대조하라"** — 스크린샷 보고 감으로 작성 금지
2. **구현 후 피그마 자동 대조** — 피그마 다시 fetch해서 토큰/레이아웃/props 비교
3. **피그마 MCP 연결인 경우** — 아이콘·이미지 색은 [figma-color-tokens-guide.md](../figma-color-tokens-guide.md)에 따라 노드 id로 `get_variable_defs`를 호출해 확정한다 (인라인 응답·styles 카탈로그 추론 금지)

### 매칭표 생성 (실무 프로젝트만)

실무 프로젝트 + 피그마 MCP 연결인 경우, Markup Implementer 주입 전에 [figma-component-mapping-guide.md](../figma-component-mapping-guide.md)에 따라 매칭표를 생성하고 재료에 포함한다.

## 산출물 형태

- **markup 워크트리의 `.tsx` / `.module.scss` 코드** (메인 산출물 — project.md의 모든 페이지·도메인 컴포넌트, figma 0건 수렴 상태)
- `background/retained/figma-url.md`, `background/retained/figma/...` (마크업 작성의 입력)

## 포트 룰

마크업 세션 = **포트 3000 점유**. /workflow 시작 시 사용자에게 안내.
