# MARKUP — figma 모드 (채용·실무)

figma 원본이 디자인 진실 원천인 모드. 본 파일은 figma 고유 부분만 담는다.

커버리지 원천·공통 컴포넌트 판정(공통 절차의 「공통 컴포넌트 확정」)의 직독 대상은 **figma 전 페이지**다 — 누적된 figma URL·캡처를 훑어 반복 컴포넌트를 확정한다.

## 재료

- (채용·실무 공통) 누적한 figma URL·캡처 — [requirement 「자료 받기」](../requirement.md#step-11-자료-받기)/BG가 `background/retained/figma-url.md`·`background/retained/figma/`에 수집. **다시 요청하지 않는다** — 빠진 컴포넌트만 콕 집어 요청
- (실무) 매칭표 (아래 「매칭표 생성」)
- (채용) 아래 「(채용 전용) 스타터 코드·MP 재사용·스타일링 라이브러리」 참조

## (채용 전용) 스타터 코드·MP 재사용·스타일링 라이브러리

시각 진실 원천은 스펙(과제요구사항 등)과 figma/캡처뿐이다. 워크트리에 이미 있는 코드는 아래처럼 갈라 다룬다:

- **FOUNDATION PR 뒤의 코드**(폴더 구조·코딩 스탠다드·폰트) — 코드 스타일 기준이다. 따른다
- **회사 제공 부분 마크업** — 베이스다. 재작성하지 않고 남은 화면만 채운다. 회사 제공인지는 커밋 author로 가른다(회사 author = 제공, 과제 진행 계정 = 내 작업). "진입 시점 기존 커밋 = 회사 제공"으로 추정하지 않는다
- **그 밖의 보일러플레이트**(스타터 컴포넌트·스타일) — 진실 원천이나 참고 패턴으로 쓰지 않는다. 자유롭게 재작성·삭제한다 ([requirement-review/recruitment/guide.md](../../requirement-review/recruitment/guide.md)와 같은 원칙)

**디자인시스템 컴포넌트가 필요하면 MP `packages/design-system`의 컴포넌트를 복사해 온다.**

가져올 때는 **이 스펙에 필요한 만큼만 차감**한다. 통째 오버포트(쓰지 않는 variant·prop까지 들이기)는 금지, 차감 복사는 권장. 시각 토큰은 캡처가 진실 원천이므로 캡처에 맞게 restyle한다.

Markup Implementer 투입 전, BG가 확정한 스타일링 라이브러리(`background/retained/tech-constraints.md` 등)가 없을 때만 **스타일링 라이브러리를 사용자에게 질문**한다. 기본값은 **scss**다 — Tailwind를 기본으로 가정하지 않는다. 워크트리에 이미 Tailwind로 작성된 스타터 코드가 있어도 그것만으로 결정된 사실로 보지 않는다. 답변을 「Markup Implementer 필수 지침」에 반영한다.

## 진실검사 A — figma 원본 직접 fetch

Figma Reviewer ↔ 구현자 대조 루프. 대조형(실행 오라클 없음). 검증 기준은 [검증 기준](../../conventions/artifact/markup-spec.md#검증-기준--figma-원본-직접-fetch).

## Markup Implementer 필수 지침

엔진에 Markup Implementer를 주입할 때 함께 전달한다:

1. **(실무) "피그마 참조 코드의 CSS 토큰을 매칭표와 대조하라"**
2. **구현 후 피그마 자동 대조** — 피그마 다시 fetch해서 토큰/레이아웃/props 비교
3. **피그마 MCP 연결인 경우** — 아이콘·이미지 색은 [figma-color-tokens-guide.md](../../conventions/figma-color-tokens-guide.md)에 따라 노드 id로 `get_variable_defs`를 호출해 확정한다 (인라인 응답·styles 카탈로그 추론 금지)
4. **(채용)** 위 「스타터 코드·MP 재사용·스타일링 라이브러리」 절 전체 (확정된 스타일링 라이브러리 포함)

## 매칭표 생성 (실무 프로젝트만)

실무 프로젝트 + 피그마 MCP 연결인 경우, Markup Implementer 주입 전에 [figma-component-mapping-guide.md](../../conventions/figma-component-mapping-guide.md)에 따라 매칭표를 생성하고 재료에 포함한다. 채용은 캡처를 기준으로 삼는다 — 본 절이 그 게이트의 단일 출처다.
