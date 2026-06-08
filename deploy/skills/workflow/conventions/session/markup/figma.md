# MARKUP — figma 모드 (채용·실무)

figma 원본이 디자인 진실 원천인 모드. 공통 절차는 [index.md](index.md), 본 파일은 figma 고유 부분만 담는다.

## 재료

- (채용·실무 공통) 누적한 figma URL·캡처 — step-1.1/BG가 `background/retained/figma-url.md`·`background/retained/figma/`에 수집. **다시 요청하지 않는다** — 빠진 컴포넌트만 콕 집어 요청
- (실무) 매칭표 (아래 「매칭표 생성」)

## 진실검사 A — figma 원본 직접 fetch

figma 원본 직접 fetch — Figma Reviewer ↔ 구현자 대조 루프. 대조형(실행 오라클 없음). 검증 기준은 [markup-spec.md](../../artifact/markup-spec.md) 「검증 기준」.

## Markup Implementer 필수 지침

엔진에 Markup Implementer를 주입할 때 반드시 함께 전달:

1. **"피그마 참조 코드의 CSS 토큰을 매칭표와 대조하라"** — 스크린샷 보고 감으로 작성 금지
2. **구현 후 피그마 자동 대조** — 피그마 다시 fetch해서 토큰/레이아웃/props 비교
3. **피그마 MCP 연결인 경우** — 아이콘·이미지 색은 [figma-color-tokens-guide.md](../../figma-color-tokens-guide.md)에 따라 노드 id로 `get_variable_defs`를 호출해 확정한다 (인라인 응답·styles 카탈로그 추론 금지)

## 매칭표 생성 (실무 프로젝트만)

실무 프로젝트 + 피그마 MCP 연결인 경우, Markup Implementer 주입 전에 [figma-component-mapping-guide.md](../../figma-component-mapping-guide.md)에 따라 매칭표를 생성하고 재료에 포함한다. (채용은 피그마 dev 권한이 없어 MCP·매칭표 불가 — 캡처 기준.)

## 산출물 입력

`background/retained/figma-url.md`, `background/retained/figma/...`
