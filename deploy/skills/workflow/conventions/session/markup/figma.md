# MARKUP — figma 모드 (채용·실무)

figma 원본이 디자인 진실 원천인 모드. 공통 절차는 [index.md](index.md), 본 파일은 figma 고유 부분만 담는다.

## 재료

- (채용·실무 공통) 누적한 figma URL·캡처 — step-1.1/BG가 `background/retained/figma-url.md`·`background/retained/figma/`에 수집. **다시 요청하지 않는다** — 빠진 컴포넌트만 콕 집어 요청
- (실무) 매칭표 (아래 「매칭표 생성」)
- (채용) 아래 「(채용 전용) 스타터 코드·MP 재사용·스타일링 라이브러리」 참조 — 디자인시스템 컴포넌트는 MP `packages/design-system`에서 복사해 스펙만큼 차감해 쓰고, 워크트리의 과제 스타터 코드는 참고 패턴으로 쓰지 않는다

## (채용 전용) 스타터 코드·MP 재사용·스타일링 라이브러리

채용과제는 회사가 지원자에게 준 **샘플/스타터 코드** 위에서 작업하는 경우가 흔하다. 진실 원천은 스펙(과제요구사항 등)과 figma/캡처뿐이다 — 워크트리에 이미 있는 **스타터 코드**(컴포넌트·스타일·폴더 구조)를 진실 원천이나 참고 패턴으로 쓰지 않는다. 자유롭게 재작성·삭제한다. (`requirement-review/recruitment/guide.md`의 "기존 코드베이스에 설치·사용 중인 스택을 결정된 사실로 흡수하지 않는다"와 같은 원칙 — 마크업 단계에서도 반복 적용)

**디자인시스템 컴포넌트가 필요하면 MP `packages/design-system`의 검증된 컴포넌트(Button·Card·TextField 등)를 복사해 온다 — 맨땅에서 다시 만들지 않는다.** 두 가지 이유: (a) 이미 테스트·스토리북까지 검증돼 품질·코딩스탠다드 정합이 따라온다, (b) 이 마크업을 그대로 가져가는 후속 구현 세션과 디자인시스템 컴포넌트 PR도 같은 MP를 소스로 쓰므로, MARKUP이 다른 데서 지으면 마크업을 실제 PR로 이식할 때 어긋난다 — 같은 원천을 써야 매끄럽게 합쳐진다.

가져올 때는 **이 스펙에 필요한 만큼만 차감**한다 — 과제요구사항의 "과도한 라이브러리·추상화 의존 지양, 직접 설계가 드러나도록"과 인터뷰 대비. 통째 오버포트(쓰지 않는 variant·prop까지 들이기)는 금지, 차감 복사는 권장. 시각 토큰은 캡처가 진실 원천이므로 캡처에 맞게 restyle한다.

Markup Implementer 투입 전, **스타일링 라이브러리를 사용자에게 질문**한다. 기본값은 **scss**다 — Tailwind를 기본으로 가정하지 않는다. 워크트리에 이미 Tailwind로 작성된 스타터 코드가 있어도 그것만으로 결정된 사실로 보지 않는다(위 원칙과 동일한 이유). 답변을 「Markup Implementer 필수 지침」에 반영한다. (MP design-system이 scss module 기반이라 scss 선택 시 복사 정합이 가장 높다.)

## 진실검사 A — figma 원본 직접 fetch

figma 원본 직접 fetch — Figma Reviewer ↔ 구현자 대조 루프. 대조형(실행 오라클 없음). 검증 기준은 [markup-spec.md](../../artifact/markup-spec.md) 「검증 기준」.

## Markup Implementer 필수 지침

엔진에 Markup Implementer를 주입할 때 반드시 함께 전달:

1. **"피그마 참조 코드의 CSS 토큰을 매칭표와 대조하라"** — 스크린샷 보고 감으로 작성 금지
2. **구현 후 피그마 자동 대조** — 피그마 다시 fetch해서 토큰/레이아웃/props 비교
3. **피그마 MCP 연결인 경우** — 아이콘·이미지 색은 [figma-color-tokens-guide.md](../../figma-color-tokens-guide.md)에 따라 노드 id로 `get_variable_defs`를 호출해 확정한다 (인라인 응답·styles 카탈로그 추론 금지)
4. **(채용)** 위 「스타터 코드·MP 재사용·스타일링 라이브러리」에서 확정한 스타일링 라이브러리로만 작성한다 — 워크트리 스타터 코드의 스타일링 방식을 따르지 않는다
5. **(채용)** 디자인시스템 컴포넌트는 MP `packages/design-system`에서 복사해 이 스펙에 필요한 만큼만 차감한다 — 맨땅 재작성·통째 오버포트 모두 금지

## 매칭표 생성 (실무 프로젝트만)

실무 프로젝트 + 피그마 MCP 연결인 경우, Markup Implementer 주입 전에 [figma-component-mapping-guide.md](../../figma-component-mapping-guide.md)에 따라 매칭표를 생성하고 재료에 포함한다. (채용은 피그마 dev 권한이 없어 MCP·매칭표 불가 — 캡처 기준.)

## 산출물 입력

`background/retained/figma-url.md`, `background/retained/figma/...`
