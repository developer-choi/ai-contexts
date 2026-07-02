# 피그마 → 코드 변환 최적화 로드맵

## 문제

피그마 디자인을 리액트 컴포넌트로 변환하는 현재 워크플로우가 비효율적이다.

- **현재 방식**: Figma MCP로 디자인 컨텍스트를 AI에게 전달 → AI가 마크업 생성 → 피그마와 1:1 대조 리뷰 → 0건 나올 때까지 반복
- **비용**: 모바일 페이지 8개 생산에 9시간 + Claude Max 20x 주간 할당량 30% 소모
- **근본 원인**: 피그마 CSS 출력이 개발 코드로 직접 사용 불가
  - 불필요한 속성 포함 (`align-self: stretch` 등 기본값)
  - 의도가 아닌 결과 출력 (`width: 463px` — 실제로는 `flex: 1`일 수 있음)
  - 토큰 문법 불일치 (피그마 `semantic/color/canvas/primary` → CSS `--semantic--color--canvas--primary`)
  - MCP 출력이 Tailwind 기반 → 프로젝트는 SCSS Modules → 매번 변환 필요

## 목적

1. 피그마 → 코드 변환의 가능한 방법들을 직접 학습하고 검증한다
2. 각 방법의 시간·비용·품질을 실측 비교한다
3. 최적의 워크플로우를 선택한다

## 배경

- 디자인 시스템(`@langdy/langdy-design-system`) 보유, 피그마 Variables와 동기화됨
- 프로젝트 스택: Next.js 14 + React 18 + TypeScript + SCSS Modules
- 워크플로우 스킬(Step 5)에 이미 `figma-component-mapping.md` 매칭표 구조 존재
- Adobe XD 사용 경험 있으나 피그마 경험 없음
- 라포랩스 Codegen 플러그인 사례 참고 확보

## 해결 방법 후보

| 방법 | 설명 | AI 토큰 |
|---|---|---|
| A. 현재 유지 (MCP + AI 반복 리뷰) | 기존 방식 | 많음 |
| B. Code Connect 도입 | MCP 출력 품질 향상 → 리뷰 사이클 감소 | 줄어듦 |
| C. Codegen 플러그인 자체 제작 | 피그마에서 클릭 → 코드 복붙 → 수동 조립 | 0 |

### 방법별 비교

| | A. MCP + AI | B. Code Connect + MCP | C. Codegen 플러그인 |
|---|---|---|---|
| 변환 단위 | 페이지 전체 | 페이지 전체 | 컴포넌트 하나씩 |
| 조립 | AI가 해줌 | AI가 해줌 | 개발자가 수동 |
| 토큰 소모 | 많음 | 줄어듦 | 0 |
| 로직 작성 | AI가 초안 | AI가 초안 | 직접 |
| 초기 셋업 | 없음 | 1-2일 | 3-4일 |

---

## 학습 로드맵

### Phase 1: 피그마 기본 조작 (반나절)

**인터페이스**
- 좌측 레이어 패널, 우측 속성 패널, 상단 도구바 역할
- Design Mode와 Dev Mode 전환, 각 모드에서 보이는 정보 차이

**기본 요소**
- 프레임 vs 그룹 vs 섹션 차이
- 도형 그리기, 텍스트 입력, 이미지 배치
- 프레임 이름 변경, 배경색/테두리 설정

**Auto Layout**
- 방향 (Vertical / Horizontal)
- 간격 (Item Spacing), 패딩 (Padding)
- 정렬 (Primary Axis, Counter Axis)
- Fill / Hug / Fixed 사이징
- CSS flexbox 대응 관계: direction, gap, padding, justify-content, align-items, flex/width

**컴포넌트 시스템**
- 메인 컴포넌트 생성, 인스턴스 배치
- 인스턴스 오버라이드 (텍스트, 색상, 중첩 컴포넌트 교체)
- Variant: 하나의 컴포넌트에 여러 상태 정의 (size, state, type 등)
- Component Property: Boolean, Text, Instance Swap

**스타일 & 토큰**
- Color Styles, Text Styles, Effect Styles
- Variables: 색상, 숫자, 문자열, Boolean 변수
- Variable Collection, Mode (라이트/다크 등)
- Variables가 디자인 토큰이고, CSS 변수와 대응됨

### Phase 2: 피그마 데이터 모델 (1일)

**노드 트리 구조**
- 모든 요소가 트리 형태, DOM과 유사
- 플러그인 콘솔에서 `figma.currentPage.selection[0]` 찍어보며 탐색

**노드 타입별 속성**
- `FRAME`: layoutMode, itemSpacing, paddingTop/Right/Bottom/Left, counterAxisAlignItems, primaryAxisAlignItems
- `TEXT`: characters, fontSize, fontWeight, lineHeight, fills
- `COMPONENT`: 메인 컴포넌트 정의, componentPropertyDefinitions
- `COMPONENT_SET`: Variant들의 컨테이너
- `INSTANCE`: componentProperties, overrides
- `VECTOR`, `RECTANGLE`, `ELLIPSE`: 단순 도형

**레이아웃 속성 → CSS 매핑**
- `layoutMode: 'VERTICAL'` → `flex-direction: column`
- `layoutMode: 'HORIZONTAL'` → `flex-direction: row`
- `primaryAxisAlignItems` → `justify-content`
- `counterAxisAlignItems` → `align-items`
- `layoutSizingHorizontal: 'FILL'` → `flex: 1` 또는 `width: 100%`
- `layoutSizingHorizontal: 'HUG'` → `width: fit-content`

**토큰 추출 경로**
- `node.boundVariables` → 어떤 Variable이 바인딩되어 있는지
- Variable name `semantic/color/canvas/primary` → CSS `--semantic--color--canvas--primary`로 변환

### Phase 3: Figma Plugin API (1일)

**개발 환경**
- TypeScript + esbuild 또는 Vite
- manifest.json 구조 (api, main, ui, codegen)
- 핫 리로드 세팅

**API 핵심 구조**
- `figma.currentPage`, `figma.currentPage.selection`
- 노드 탐색: `node.children`, `node.parent`
- 속성 읽기: `node.fills`, `node.strokes`, `node.effects`
- Variable 읽기: `figma.variables.getVariableById()`

**Codegen API**
- `codegen` 이벤트 리스너
- `CodegenResult` 반환 형식 (`{ title, code, language }`)
- Dev Mode에서 코드 패널에 표시되는 구조

**플러그인 UI**
- HTML + iframe 기반
- `figma.ui.postMessage()` ↔ `parent.postMessage()` 통신

### Phase 4: Code Connect (반나절)

- `.figma.tsx` 매핑 파일 작성법
- `figma connect` CLI로 등록
- Dev Mode에서 매핑된 코드 확인
- MCP 호출 시 매핑 정보가 포함되는지 검증

### Phase 5: Codegen 플러그인 MVP (2-3일)

- 2단계 변환 구조: Figma Node → ReactNode(중간 표현) → JSX
- 토큰 변환 로직: `/` → `--` 접두사 붙여서 `var()` 출력
- Auto Layout → SCSS flexbox 변환
- 컴포넌트 인스턴스 → `<ComponentName props />` 출력
- 출력 형식: TSX + SCSS Module

### Phase 6: 실전 비교 (1일)

같은 모바일 페이지를 3가지 방법으로 만들어서 측정:

| 측정 항목 | A. MCP + AI | B. Code Connect + MCP | C. Codegen 플러그인 |
|---|---|---|---|
| 소요 시간 | | | |
| 할당량 소모 | | | |
| 수동 조정량 | | | |
| 최종 품질 | | | |

기준선: 현재 방식(A)으로 모바일 8페이지 / 9시간 / 할당량 30%.

---

## 참고 자료

- [라포랩스 — 딸깍이면 끝, 피그마에서 바로 리액트 컴포넌트로 변환하기](https://blog.rapportlabs.kr/%EB%94%B8%EA%B9%8D%EC%9D%B4%EB%A9%B4-%EB%81%9D-%ED%94%BC%EA%B7%B8%EB%A7%88%EC%97%90%EC%84%9C-%EB%B0%94%EB%A1%9C-%EB%A6%AC%EC%95%A1%ED%8A%B8-%EC%BB%B4%ED%8F%AC%EB%84%8C%ED%8A%B8%EB%A1%9C-%EB%B3%80%ED%99%98%ED%95%98%EA%B8%B0-53261)
- [라포랩스 — 피그마 플러그인 디자이너 편](https://blog.rapportlabs.kr/figma-plugin-designer)
- [Figma 공식 — Introducing our Dev Mode MCP server](https://www.figma.com/blog/introducing-figma-mcp-server/)
- [Figma 공식 — Code Connect](https://www.figma.com/developers/code-connect)
- [Figma 공식 — Plugin API](https://www.figma.com/plugin-docs/)
- [Tokens Studio 공식 — Style Dictionary + SD Transforms](https://docs.tokens.studio/transform-tokens/style-dictionary)
