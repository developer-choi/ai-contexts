---
step: realize-plan
session: PR_{N}_PLAN
next:
  - to: implement
  - to: plan
    notice: gate
    on: realize-plan 커밋
    when: 이 PR에 의존하는 PR이 있을 때
---

# realize-plan: 구현 (실행 또는 stub 분해)

> **Plan mode 필수**. [과제 정의 단계](plan.md)에서 승인된 과제에 대해서만 진행한다.

이 단계는 [과제 정의 단계](plan.md)에서 승인된 과제를 **구현한다**. 기본은 실행이다 — 코드로 표현 가능한 작업은 그 자리에서 실행·커밋한다. 무거운(한 세션에 다 못 끝냄) 부분만 stub으로 분해해 본체를 다음 IMPL 세션으로 넘긴다.

이 PR에 의존하는 PR은 이 단계의 커밋(stub 또는 실행 결과)을 딛고 출발한다. 그래서 이 단계에서 커밋한 외부 공개 시그니처는 이후 바꾸지 않는다(freeze) — 바꿔야 하면 사용자에게 영향을 알리고 정한다.

overview.md(의도)·decisions.md(기술 결정·근거)·reference.md(참조 인덱스)를 입력으로 쓰며, [과제 정의 단계](plan.md)의 기술 결정·근거를 반복하지 않는다. 무거워서 IMPL로 분해하는 경우 stub 코드 + 잔존 md가 그 핸드오프 산출물이 된다.

---

## 입력·산출물·작업 위치

- **입력**: plan 산출물 `pr{N}/persistent/`의 overview.md·decisions.md·reference.md + `/plan/pr{N}/`·`/plan/background/`의 잔여 산출물(아래 [잔여 산출물 소비](#1-잔여-산출물-소비)에서 소비)
- **산출물**:
  - 코드 변경 + 커밋 — stub 커밋(무거운 PR) 또는 그 자리 실행·커밋(가벼운 PR)
  - `pr{N}/persistent/`: implementation.md, reference.md 누적
  - `pr{N}/retained/`: markup.md (UI 컴포넌트 PR만, figma 없는 모드 제외)
- **작업 위치**: PR_{N} 워크트리 — 아래 [사전 준비](#사전-준비-브랜치워크트리-생성)에서 만든다(이름 `{메인 디렉토리}-pr{N}`). `/plan/` 산출물은 main repo 절대경로로 참조한다

---

## 사전 준비: 브랜치·워크트리 생성

이 단계 시작 시 작업 내용에 맞는 브랜치를 새로 생성하고, 워크트리도 함께 새로 만든다. 이전 세션의 브랜치를 이어서 사용하지 않는다.

- 브랜치명: `feature/{짧은-설명}` — 영문 슬러그(소문자 + 하이픈)
- **base 브랜치는 사용자 확인 사항이다.** 어느 커밋을 기준으로 브랜치·워크트리를 딸지 사용자에게 확인받고 뻗는다. AI는 판단거리만 제시한다:
  - **선행 PR에 의존하면** → 그 PR 브랜치 위가 후보. 선행의 realize-plan 커밋(stub 또는 실행 결과)을 딛는 경우다 (무엇이 필요한지는 `todo.md`의 「의존」 절 — 적는 기준은 [의존 — 판단거리 노출](../conventions/pr-split.md#의존--판단거리-노출)).
  - **의존하지 않으면** → 프로젝트 기본 브랜치(main 또는 master)가 후보. 독립인 PR을 습관적으로 앞 PR 위에 쌓지 않는다.
- 워크트리는 프로젝트 루트의 형제 디렉토리에 `{메인 디렉토리}-pr{N}` 이름으로 생성한다.

이후 이 단계의 모든 작업(구현 실행 또는 stub 파일 생성·커밋 포함)은 새로 만든 워크트리 안에서 수행한다. 이전 step 산출물(`/plan/pr{N}/persistent/` 하위 등)이 워크트리에 보이지 않을 때 처리는 두 갈래로 갈린다:

- **`.gitignore` 대상** — 복사·심볼릭 만들지 말고 **main repo 절대경로로 그대로 참조**한다. 다음 세션도 같은 절대경로로 참조하도록 진입 안내문에 경로를 명시한다
- **그 외(추적 대상인데 base 브랜치에 미커밋)** — base 브랜치에 먼저 커밋해 워크트리에 반영하거나, 작업 시작 전에 워크트리로 가져온다

cwd 이동이 필요하면 SKILL.md 「워크트리 cwd 이동은 사용자 세션으로」를 따른다.

---

## 1. 잔여 산출물 소비

`/plan/pr{N}/` 하위와 `/plan/background/`를 탐색하여 기존 AI 산출물을 읽고, **stub 코드(결정·코드 표현 가능 영역)와 잔존 md(narrative)로 분배**하며 소비한다. 소비 후 원본 정리는 각 산출물의 라이프사이클 폴더 규칙을 따른다 ([라이프사이클 규칙](../conventions/plan-folder.md#라이프사이클-규칙)·「소비→삭제 메커니즘 SSOT」).

**페이지 마크업**(페이지 단위 `.tsx` JSX·`.module.scss` 디자인 값)은 MARKUP 완성본을 가져오므로 **realize-plan의 전면 stub 대상이 아니다.** 가져오기·공통 지정 컴포넌트 껍데기·로직 합성의 재정의는 [conventions/artifact/stub.md](../conventions/artifact/stub.md) 「마크업 예외 (재정의)」 참조(재수령은 [IMPL 중 디자인·기획 변경 감지](implement.md#step-523-impl-중-디자인기획-변경-감지)). realize-plan은 figma를 `markup.md`(사용자 figma 시각 대조용) 작성 + 본 PR의 로직·조립 구조 참조에만 쓴다 — figma가 없는 모드는 `markup.md` 없이 로직·조립 구조 참조만 한다([modes.md](../conventions/modes.md) 매트릭스). PR 단위 `pr{N}/retained/page*.png`는 만들지 않는다 — figma 자료는 MARKUP이 `background/retained/figma/`에 누적한다.

---

## 2. 구현 컨텍스트 수집

직접 실행하든 stub으로 분해하든 착수 전에 구현 컨텍스트를 수집한다. IMPL로 분해하면 다음 IMPL 세션 Lead가 산출물에 적힌 경로로 팀에게 컨텍스트를 분배한다.

[과제 정의 단계의 컨벤션 사전 참조](plan.md#컨벤션-사전-참조)에서 파악한 컨벤션을 기반으로, 추가 컨텍스트를 사용자에게 질문하여 수집한다:
- 관련 컨벤션 경로 (거기서 확인한 것 외 추가분)
- 참조할 기존 코드 경로 (유사 구현, 재사용할 컴포넌트 등)
- 디자인 토큰 / 디자인시스템 경로 (피그마 연동 시)

### 코딩 스탠다드 · 베스트프랙티스

[code-map.md](../../../contexts/code-map.md)의 탐색 절차를 따른다:

1. coding-standards `rules/`·`principles/`를 Glob → 프로젝트 유형 판별(회사: `universal/`만, 개인: `universal/` + `personal/`) → 해당하는 파일 중 현재 구현에 관련된 것을 선별 (`file-folder-structure` 태그 포함, frontmatter로 확인)
2. MP `docs/best-practices/*.md`에서 현재 구현에 매칭되는 패턴을 탐색한다 — 매칭되는 엔트리가 있으면 해당 산출물에 참조 패턴으로 기록한다
   - 매칭되는 엔트리가 없으면 사용자에게 어떤 패턴을 따를지 문의한다
3. 선별된 컨벤션·패턴 경로를 `/plan/pr{N}/persistent/reference.md`에 누적 명시한다. 누적 원칙·stub과의 분담은 [누적 원칙](../conventions/artifact/reference-curation.md#누적-원칙) 참조.

### 컨벤션 1차 소스 직접 grep 의무

stub 폴더 구조·파일 배치·네이밍·import 경로를 결정할 때 관련 컨벤션 1차 소스를 **직접 grep**한 후 결과를 stub 주석 `[Convention]` 블록에 인용한다. "안다고 가정"·"이전 세션 기억"·"이전 PR에서 본 패턴"에 의존하지 않는다. 결정·도구 호출·stub 파일 작성 전에 grep 결과를 받는다.

대상 컨벤션 1차 소스:
- 프로젝트의 아키텍처·컨벤션 문서와 기존 슬라이스의 평행 사례
- **작업 대상 디렉터리의 조상 체인 `CLAUDE.md`** — 내용이 다른 문서를 가리키는 포인터면 끝까지 따라가 실제 배치·네이밍 규칙 본문을 확인한다

`/plan/background/retained/conventions-index.md`가 있으면 거기 등재된 경로를 grep 출발점으로 우선한다.

### prop 설계 타당성 — HTML 표준 속성 우선

stub의 외부 공개 컴포넌트 prop을 설계할 때, **HTML 표준 속성과 중복되는 비표준 래퍼 prop을 만들기 전에 표준 속성을 직접 쓸 수 있는지 검토한다.**

- 판단 기준: 도입하려는 prop이 사실상 표준 DOM 속성의 별칭인가?
- 표준 속성 래퍼면 `ComponentProps<'element'>`를 extend해 해당 속성을 직접 노출(필요 시 필수 override)하는 쪽이 더 표준적이다.

### 기존 린트/coding-standards 오류 확인 (채용과제)

채용과제에서 앞단의 SETUP 종류 PR은 다른 PR 범위 파일의 오류를 파일 단위로 린트 제외 처리하고 넘어간다. overview.md 또는 PR 분할에서 파악된 파일 목록을 기준으로, 해당 파일에 기존 린트/coding-standards 오류가 남아있는지 점검한다. 오류가 있으면 `implementation.md`에 포함하여, 해당 파일의 기능 변경 커밋보다 앞에 린트 정리 커밋을 별도로 배치하도록 계획한다.

---

## 3. 파생 산출물

| 산출물 | 위치 | 형태 | 작성 조건 |
|--------|------|------|---------|
| stub 파일들 — 로직·조립 `.tsx`, hook, `*.test.tsx`, fixture, types 등 (범위는 [정의·범위](../conventions/artifact/stub.md#정의범위)) | 소스 디렉토리 | 결정 가능하고 코드로 표현 가능한 모든 설계 (코드 분량 크거나 한글 명세가 더 명확하면 `// TODO [AI_IMPL]:` 주석에 한글 요약) | 항상 |
| `markup.md` | `pr{N}/retained/` | **「Figma 원본 링크 인덱스」 절(사용자 입력)** + 토큰 매핑표, 매칭표 | UI 컴포넌트가 있는 PR이면 필수. 사용자가 figma 컴포넌트·상태별 URL을 직접 입력. [verify 「Figma 시각 대조」](verify.md#step-641-figma-시각-대조--승인-게이트-ui-컴포넌트-pr-한정) 사용자 figma 시각 대조의 기준. 그 외 PR은 생성 안 함. figma 없는 모드는 생성 안 함 ([modes.md](../conventions/modes.md)) |
| `implementation.md` | `pr{N}/persistent/` | 구현 계획 ([conventions/artifact/implementation-spec.md](../conventions/artifact/implementation-spec.md) 단일 출처) | 대부분 작성됨 |

interface와 test-cases는 별도 md를 만들지 않는다. interface narrative가 필요하면 다른 산출물 또는 stub 파일의 JSDoc에 적는다.

---

## 4. stub 파일 작성 룰

stub 파일 작성 룰은 [conventions/artifact/stub.md](../conventions/artifact/stub.md), `markup.md` 「Figma 원본 링크 인덱스」 절 양식·검증 기준은 [conventions/artifact/markup-spec.md](../conventions/artifact/markup-spec.md)가 단일 출처다.

---

## 5. realize-plan 커밋 (stub 또는 실행)

이 절의 커밋이 모두 끝난 시점(종료 시퀀스 전)이 「realize-plan 커밋」 사건이다.

### LLM 분석 + 사용자 제안 (PR 번호 무관)

1. **LLM이 PR 작업 분석** — 아래 조건으로 "코드/stub로 갈 것"을 가른다 (하나라도 해당하면 코드로):
   - **조건 1 (외부 공개 시그니처)**: PR이 만들 props·타입·함수 시그니처 등 외부 공개 모듈.
   - **조건 2 (코드로 표현 가능한 모든 계획)**: 시그니처가 없어도 **파일로 표현 가능한 계획은 전부 코드/stub로** 만든다 — 의존성(`package.json` 추가 + 설치), 설정(`vite.config`·`tsconfig`·`eslint` 등), 테스트 의도(`*.test.tsx`의 `it.todo`).
   - **조건 3 (stub 불가 + 코드표현 가능)**: rename·파일/폴더 이동·설정 한 줄 치환처럼 **코드가 이미 있어 stub 대상이 없지만 편집이 100% 코드로 표현되는** 것:
     - trivial(실행하면 끝 — 순수 rename 등)이면 **문서·세션 핸드오프로 이연하지 말고 그 자리에서 실행·커밋**한다.
     - 이 PR에 의존하는 PR이 있으면 이연하지 않는다 — 뒤 PR이 이동·추출 결과를 딛는다.
     - 그 밖에 실행을 이연해야 하면 md엔 **탐색 패턴 하나**만 남긴다 — "grep `<찾을 패턴>` → 새 이름으로 치환" 형태. 각 매치의 before→after 쌍(식별자·경로·줄번호)은 어느 md에도 적지 않는다 — 개별 치환은 implement가 파일 보고 수행한다.

   **md 산출물 전체**에는 **코드로 표현 못 하는 narrative만** 남긴다 (의도·커밋 분할·gotcha·근거). 코드로 표현 가능한 것은 *어느 산출물에도* 산문으로 넣지 않는다. impl/plan 역할 경계가 희미해져도 무방. stub 상세도(granularity)는 [conventions/artifact/stub.md](../conventions/artifact/stub.md)의 공개 API 수준 예시를 따른다.
2. **사용자에게 제안**: "이번 PR stub [필요/불필요]. 동의?" — 조건 2까지 따져서 판단한다(deps·설정·it.todo가 있으면 *필요*).
3. **사용자 동의·수정 후 진행** — 두 갈래: (a) stub 만들어 본체를 IMPL로 분해(무거운 PR) / (b) stub 없이 **그 자리에서 실행·커밋**(가벼운 PR — 구현은 realize-plan에서 끝낸다)

**"외부 시그니처 없음"을 "stub 없음"으로 확장하지 않는다** — deps·설정·`it.todo`도 조건 2에 의해 stub 대상이다.

### stub 커밋 작성

stub 만들기로 동의되면, 모든 stub을 하나의 커밋으로 묶는다.

- 이 커밋은 IMPL이 본체를 채울 기반이며(무거워서 분해한 경우), 구현이 끝나면 base 위에서 제거된다 ([verify의 1회차 커밋 정리·재정렬](verify.md#step-65-1회차-커밋-정리재정렬))
- stub 파일만 담는다 — 잔존 md(`/plan/pr{N}/` 하위)는 별도 커밋. 두 종류를 한 커밋에 섞지 않는다
- stub 커밋이 lint·tsc·prettier·테스트 명령을 통과하는지 확인 후 커밋한다

#### 포맷팅·prettier 영역 한정

**프로젝트 전역 포맷팅 금지.** 본 PR 영역만 한정 적용한다.

- ❌ 금지: `yarn format`, `yarn prettier` 처럼 대상 경로 없이 도는 형태
- ✓ 허용: 경로를 한정한 prettier 실행, staged 파일만 처리하는 pre-commit hook, 에디터 저장 시 자동 포맷

---

## 종료 시퀀스 (모두 필수, 스킵 금지)

산출물 작성 완료 + 사용자 OK 발화 직후, 후속 세션 spawn 안내·보고 출력 전에 아래 단계를 **순서대로 모두** 수행한다.

가벼운 PR이라 구현을 이 자리에서 끝냈어도 이 세션에서 implement·verify로 넘어가지 않는다. 아래 종료 단계를 마치면 PR 무게와 상관없이 PR_{N}_IMPL을 안내한다 — 리뷰·사용자 테스트·커밋 정리는 IMPL의 verify가 돈다.

### 1. 산출물 리뷰 (Reviewer 팀 에이전트 spawn)

파생이 끝나면 리뷰어 팀 에이전트를 spawn한다. [team-agent](../../../contexts/team-agent.md) 규칙을 따른다.

```
Lead (메인 세션) — 리뷰 결과 종합 + 사용자 보고
└── Reviewer — 산출물 전체 리뷰
```

리뷰 체크리스트:

**컨벤션 대조**
- 각 산출물에 적힌 내용 기반으로 관련 코딩 컨벤션을 찾아 대조한다 (컴포넌트 설계가 있으면 컴포넌트 컨벤션, 테스트 계획이 있으면 테스트 컨벤션)
- **`reference.md`에 컨벤션 경로가 누적 명시되어 있는지** 확인한다 ([plan 「산출물: overview.md」](plan.md#산출물-planprnpersistentoverviewmd) 절의 산출물 분담 표 참조)
- 프로젝트 유형(회사/개인)에 맞는 경로만 포함되었는지 확인한다
- stub 파일의 컨벤션 위반 (네이밍, 파일 구조, import 순서 등)을 reviewer가 직접 검증
- **stub 작성 룰 준수** ([conventions/artifact/stub.md](../conventions/artifact/stub.md)) — lint가 못 잡는 항목 직접 점검: `.module.scss` layout vs 디자인 값 분리, Hook 시그니처·throw 패턴, `.tsx` placeholder 변수 패턴, 주석 양식 (comments.md cross-ref)
- **코드-narrative 오배치 검출** — **모든 md 산출물**에 *코드로 표현 가능한 내용*(deps·설정·`it.todo`·시그니처)이 산문으로 들어가 있지 않은지 점검. 있으면 stub 코드로 옮기도록 지적(§5 조건 2). **단 `implementation.md` 「행동 결정 커버리지」 표의 `it.todo`는 예외** — 상위 결정과의 대조표라 코드에 대응물이 없다 ([conventions/artifact/implementation-spec.md](../conventions/artifact/implementation-spec.md) 참조). 특히 "판정 전 단일출처(`stub.md`) 미독으로 stub을 통째 생략"한 흔적이 없는지 확인.

**설계 타당성 역추적**
- `decisions.md`의 기술 결정과 `overview.md`의 의도(목표·범위)를 기준으로, 파생 산출물(stub 코드 + 잔존 md)이 해당 결정·의도를 충실히 반영하는지 검증한다
- 결정된 설계 방향과 모순되는 구현 계획·stub 코드 구조가 없는지 확인한다

**산출물 간 정합성**
- stub `.tsx`의 props 타입을 `.module.scss`/hook stub이 일관되게 소비하는지 대조한다
- hook stub의 API 응답 placeholder가 호출자 타입과 일치하는지 확인한다
- `it.todo` 자연어가 logic stub의 에러/엣지 시나리오를 커버하는지 확인한다
- implementation.md의 각 컴포넌트/모듈 커밋에 해당 테스트가 포함되어 있는지 확인한다

**채용과제 관점 (채용과제인 경우에만)**
- 대기업 채용과제 평가자의 시선으로 산출물을 검토한다
- 이 계획대로 구현했을 때 감점 요인이 될 만한 부분을 지적한다
- 가점 요인이나 차별화 포인트가 될 수 있는 부분을 제안한다 (과잉 설계가 아닌 선에서)

**자유 리뷰**
- 위 체크리스트에 해당하지 않더라도, 리뷰어 판단으로 문제가 있다고 보이는 부분을 자유롭게 지적한다

모순·누락·컨벤션 위반·정합성 불일치·감점 요인·차별화 제안이 있으면 다음 단계 보고에 포함한다.

### 2. 종료 게이트 (`it.todo` 매칭)

산출물 리뷰와 별개로 직접 수행한다 (리뷰 결과와 무관, 매번 수행). [`it.todo` 매칭 게이트](../conventions/artifact/implementation-spec.md#ittodo-매칭-게이트)의 **PLAN 시점 매칭**(decisions 행동 결정 → `it.todo`, implementation.md 「행동 결정 커버리지」 표 산출)을 적용한다. 표 미산출·미완(면제 없는 빈 행)이면 종료 불가. 게이트 결과(커버리지 표)는 보고에 포함.

stub 없는 PR이라도 decisions에 **행동 결정이 있으면** 그 결정은 대응 `it.todo`(→stub)를 요구한다 — "외부 시그니처 없음"을 "행동 결정 없음"으로 확장하지 않는다. 행동 결정이 실제 0건인 PR만 `it.todo` 0건 → 면제로 분류하고 면제 사유를 명시한다.

### 3. 부정 명시 메아리 자가 점검

SKILL.md 「부정 명시 메아리 자가 점검」 절차를 산출물 전체에 발동한다. 사용자 부정 지시 메아리·근거 없는 자체 판단 0건 수렴까지 반복.

### 4. 자가 검토

SKILL.md 「자가 검토 필수」의 「세션 종료 시 셀프 리뷰」 적용 — 본 세션에서 만든 산출물을 검증 소스와 1:1 대조. 이슈 발견 시 수정 후 다음 단계 보고에 포함.

### 5. 보고 내용

- 파생된 산출물 핵심 요약
- 산출물 리뷰 결과 (1단계)
- 종료 게이트 결과 (2단계 — 행동 결정 커버리지 표)
- 자가 검토 결과 (3·4단계 통과/이슈 발견 여부)
