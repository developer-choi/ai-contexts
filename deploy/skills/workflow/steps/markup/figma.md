# MARKUP — figma 모드 (채용·실무)

figma 원본(없으면 캡처)이 디자인 원본인 모드.

커버리지 출처·공통 컴포넌트 판정(공통 절차의 「공통 컴포넌트 확정」)의 직독 대상은 아래 「재료」에 누적된 figma URL·캡처 전부다.

## 재료

- (채용·실무 공통) 누적한 figma URL·캡처 — [requirement 「자료 받기」](../requirement.md#자료-받기)가 [모드 매트릭스](../../conventions/modes.md)의 저장 위치에 모은다. **다시 요청하지 않는다** — 빠진 컴포넌트만 콕 집어 요청
- (실무) 디자인시스템 소스 — `background/retained/tech-constraints.md`에 적힌 디자인시스템 원본 레포. 없으면 Markup Implementer 주입 전에 사용자에게 받아 그 파일에 적는다
- 매칭표 — 아래 「매칭표 생성」이 만드는 경우
- (채용) 아래 「(채용 전용) 스타터 코드·MP 재사용·스타일링 라이브러리」 참조

## (채용 전용) 스타터 코드·MP 재사용·스타일링 라이브러리

워크트리에 이미 있는 코드는 디자인 원본이 아니다. 아래처럼 갈라 다룬다:

- **FOUNDATION PR이 만든 코드**(폴더 구조·코딩 스탠다드·폰트) — 코드 스타일 기준이다. 따른다
- **회사 제공 부분 마크업**([회사 제공 베이스라인](../../conventions/pr-types/foundation.md#회사-제공-베이스라인-커밋) 중 화면 마크업) — 베이스다. 남은 화면만 채운다
- **그 밖의 보일러플레이트**(베이스라인의 스타터 컴포넌트·스타일) — 참고 패턴으로 쓰지 않는다. 자유롭게 재작성·삭제한다

**디자인시스템 컴포넌트가 필요하면 MP `packages/design-system`의 컴포넌트를 복사해 온다.**

가져올 때는 **이 스펙에 필요한 만큼만 차감**한다(쓰지 않는 variant·prop은 들이지 않는다). 시각 토큰은 디자인 원본에 맞게 restyle한다.

markup 워크트리 진입 직후 셋팅([입력·산출물·작업 위치](index.md#입력산출물작업-위치)) 전에, `background/retained/tech-constraints.md`에 BG가 확정한 스타일링 라이브러리가 없을 때만 **스타일링 라이브러리를 사용자에게 질문**한다.
기본값은 **scss**다.
워크트리에 이미 Tailwind로 작성된 스타터 코드가 있어도 그것만으로 결정된 사실로 보지 않는다.

## 정답 대조 A — figma 원본(없으면 캡처) 대조

impl-review-loop의 리뷰어 대조형 — Figma Reviewer ↔ 구현자 대조 루프. 검증 기준은 [검증 기준](../../conventions/artifact/markup-spec.md#검증-기준--figma-원본없으면-캡처-대조).

## Markup Implementer 필수 지침

[impl-review-loop](../../impl-review-loop/SKILL.md)에 Markup Implementer를 주입할 때 함께 전달한다:

1. **(매칭표가 있을 때) "`get_design_context` 응답 코드의 CSS 토큰을 매칭표와 대조하라"**
2. **구현 후 디자인 원본과 다시 대조** — 토큰/레이아웃/props를 비교한 뒤 Figma Reviewer에게 넘긴다
3. **피그마 MCP 연결인 경우** — 색은 [figma-color-tokens-guide.md](../../conventions/figma-color-tokens-guide.md)대로 확정한다
4. **(채용)** 위 「(채용 전용) 스타터 코드·MP 재사용·스타일링 라이브러리」 절의 코드 취급·MP 복사 규칙과 확정된 스타일링 라이브러리

## 매칭표 생성 (실무 프로젝트만)

실무 프로젝트 + 피그마 MCP 연결인 경우, Markup Implementer 주입 전에 [figma-component-mapping-guide.md](../../conventions/figma-component-mapping-guide.md)에 따라 매칭표를 생성하고 재료에 포함한다.
