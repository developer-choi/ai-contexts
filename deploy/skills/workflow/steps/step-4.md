# Step 4: 구현 (실행 또는 stub 분해)

> **Plan mode 필수**. Step 3에서 승인된 과제에 대해서만 진행한다.

이 단계는 Step 3에서 승인된 과제를 **구현한다**. 기본은 실행이다 — 코드로 표현 가능한 작업은 그 자리에서 실행·커밋한다. 무겁거나(한 세션에 다 못 끝냄) 후속 PR이 시그니처에 의존해 병렬화가 필요한 부분만 stub으로 분해해 본체를 다음 IMPL 세션으로 넘긴다. **PLAN/IMPL 분리는 기본 핸드오프가 아니라 무거운 구현을 위한 선택적 분해다** — "코드로 표현 가능하니 IMPL 몫"이라며 실행을 미루지 않는다.

overview.md(의도)·decisions.md(기술 결정·근거)·reference.md(참조 인덱스)를 입력으로 쓰며, Step 3의 기술 결정·근거를 반복하지 않는다. 무거워서 IMPL로 분해하는 경우 stub 코드 + 잔존 md가 그 핸드오프 산출물이 된다.

---

## 사전 준비: 브랜치·워크트리 생성

이 단계 시작 시 작업 내용에 맞는 브랜치를 새로 생성하고, 워크트리도 함께 새로 만든다. 이전 세션의 브랜치를 이어서 사용하지 않는다.

- 브랜치명: `feature/{짧은-설명}` (예: `feature/login-form`)
- base 브랜치 (스택 모델 — 각 PR은 앞 PR 위에 얹는다):
  - **N≥2**: PR_{N-1} 브랜치. 앞 PR의 stub 시그니처를 봐야 하므로 main이 아니라 앞 PR 브랜치에서 뻗는다.
  - **N=1**: 프로젝트 기본 브랜치(main 또는 master) — 스택할 앞 PR이 없다.
- 워크트리는 프로젝트 루트의 형제 디렉토리에 생성한다. **다른 PR·세션이 만든 워크트리로 들어가지 않는다** — 각 PR은 자기 브랜치·자기 워크트리에서 완결한다.

이후 이 단계의 모든 작업(구현 실행 또는 stub 파일 생성·커밋 포함)은 새로 만든 워크트리 안에서 수행한다. 이전 step 산출물(`/plan/pr{N}/persistent/` 하위 등)이 워크트리에 보이지 않을 때 처리는 두 갈래로 갈린다:

- **`.gitignore` 대상(예: `plan/`이 글로벌 ignore에 포함)** — 복사·심볼릭 만들지 말고 **main repo 절대경로로 그대로 참조**한다 (예: `C:\...\repo\backlog\pr4\persistent\decisions.md`). 복사 시 양쪽 동기화 부담·잔존 위험. 다음 세션도 같은 절대경로로 backlog를 참조하도록 진입 안내문에 경로를 명시한다
- **그 외(추적 대상인데 base 브랜치에 미커밋)** — base 브랜치에 먼저 커밋해 워크트리에 반영하거나, 작업 시작 전에 워크트리로 가져온다

메인 세션이 직접 cwd를 옮길 수 없으면, 워크트리 디렉토리에서 세션을 이어 이 단계의 구현을 진행하도록 안내한다 (IMPL로의 핸드오프가 아니라 cwd 이동을 위한 세션 연속 — 실행이든 stub 분해든 이 워크트리에서 수행).

---

## 1. 잔여 산출물 소비

`/plan/pr{N}/` 하위와 `/plan/background/`를 탐색하여 기존 AI 산출물을 읽고, **stub 코드(결정·코드 표현 가능 영역)와 잔존 md(narrative)로 분배**하며 소비한다. 소비 후 원본 정리는 각 산출물의 라이프사이클 폴더 규칙을 따른다 ([conventions/plan-folder.md](../conventions/plan-folder.md) 「라이프사이클 규칙」·「소비→삭제 메커니즘 SSOT」).

**페이지 마크업**(페이지 단위 `.tsx` JSX·`.module.scss` 디자인 값)은 MARKUP 세션이 디자인 진실 원천 0건으로 완성하므로(채용·실무 figma 대조 / 개인 마크업 시안 대조 + 사용자 시각 확인) **step-4의 전면 stub 대상이 아니다.** 완성 마크업은 MARKUP 워크트리의 **검증된 페이지 파일을 그대로 PR 워크트리로 가져온다**(재작성 금지 — 검증본이 PR마다 어긋나지 않게. 배치 경로만 판단). 단 **공통 지정 컴포넌트**(MARKUP이 「공통 컴포넌트 확정」으로 추출한 재사용 단위)는 예외로 껍데기(위치·이름·시그니처·props)를 step-4 stub으로 노출하고 시각 본문은 MARKUP에서 이동한다 — 재정의 상세는 [conventions/artifact/stub.md](../conventions/artifact/stub.md) 「마크업 예외 (재정의)」. PR 로직은 가져온 마크업 파일을 **수정하지 않고 별도 파일**(hook·컨테이너 등)에서 import·합성해 얹는다 — 디자인 변경으로 마크업을 다시 가져와도 로직이 덮이지 않도록(재수령은 Step 5.2.3). step-4는 figma를 `markup.md`(사용자 figma 시각 대조용) 작성 + 본 PR의 로직·조립 구조 참조에만 쓴다 (**개인 모드는 figma·markup.md 없음 — 로직·조립 구조 참조만**). MARKUP 세션이 figma 자료를 `background/retained/figma/`에 통합 누적하므로 PR 단위 `pr{N}/retained/page*.png`는 생성되지 않는다.

---

## 2. 구현 컨텍스트 수집

무거워서 IMPL로 분해하는 경우, 다음 IMPL 세션 Lead가 산출물에 적힌 경로를 기반으로 팀에게 컨텍스트를 분배한다. 직접 실행하든 stub으로 분해하든 구현에 컨텍스트가 필요하므로, 착수 전에 미리 수집한다.

Step 3의 "컨벤션 사전 참조"에서 파악한 컨벤션을 기반으로, 추가 컨텍스트를 사용자에게 질문하여 수집한다:
- 관련 컨벤션 경로 (Step 3에서 확인한 것 외 추가분)
- 참조할 기존 코드 경로 (유사 구현, 재사용할 컴포넌트 등)
- 디자인 토큰 / 디자인시스템 경로 (피그마 연동 시)

### 코딩 스탠다드 · 베스트프랙티스

[code-map.md](../../../contexts/code-map.md)의 탐색 절차를 따른다:

1. coding-standards `rules/`·`principles/`를 Glob → 프로젝트 유형 판별(회사: `universal/`만, 개인: `universal/` + `personal/`) → 해당하는 파일 중 현재 구현에 관련된 것을 선별 (`file-folder-structure` 태그 포함, frontmatter로 확인)
2. MP `docs/best-practices/*.md`에서 현재 구현에 매칭되는 패턴을 탐색한다 — 매칭되는 엔트리가 있으면 해당 산출물에 참조 패턴으로 기록한다
   - 매칭되는 엔트리가 없으면 사용자에게 어떤 패턴을 따를지 문의한다
5. 선별된 컨벤션·패턴 경로를 `/plan/pr{N}/persistent/reference.md`에 누적 명시한다. 누적 원칙·stub과의 분담은 [conventions/artifact/reference-curation.md](../conventions/artifact/reference-curation.md) 「누적 원칙」 참조.

### [CRITICAL] 컨벤션 1차 소스 직접 grep 의무

stub 폴더 구조·파일 배치·네이밍·import 경로를 결정할 때 관련 컨벤션 1차 소스를 **직접 grep**한 후 결과를 stub 주석 `[Convention]` 블록에 인용한다. "안다고 가정"·"이전 세션 기억"·"이전 PR에서 본 패턴"에 의존하지 않는다. 결정·도구 호출·stub 파일 작성 전에 grep 결과를 받는다 — 사후 검증은 늦다.

대상 컨벤션 1차 소스:
- `docs/ARCHITECTURE.md` — 레이어 의존성, 폴더 구조, Public API 원칙
- `docs/conventions/*` — 네이밍·레이어·nuqs·patterns 등
- `_fsd/.../*` — 기존 슬라이스의 평행 사례
- **작업 대상 디렉터리의 조상 체인 `CLAUDE.md`** — 내용이 다른 문서를 가리키는 포인터면 끝까지 따라가 실제 배치·네이밍 규칙 본문을 확인한다. 한 줄 포인터에서 멈추지 않는다 (하위 CLAUDE.md는 Read 전까지 자동 로드되지 않는다)

`/plan/background/retained/conventions-index.md`가 있으면 거기 등재된 경로를 grep 출발점으로 우선한다.

특히 다음 결정 전에 grep 의무:
- features/widgets/entities `ui/` 폴더 sub-folder 허용 여부 (예: `grep "ui/" docs/ARCHITECTURE.md docs/conventions/02-layers.md`)
- entities `api/types.ts`, `model/types.ts`, `lib/mapper.ts` 배치 — 컨벤션 명시 vs 기존 슬라이스 평행
- 슬라이스 도메인 그룹화 임계치 (`02-layers.md`의 슬라이스 수 기준)
- `index.ts` 중간 배럴 허용 여부

### prop 설계 타당성 — HTML 표준 속성 우선

stub의 외부 공개 컴포넌트 prop을 설계할 때, **HTML 표준 속성과 중복되는 비표준 래퍼 prop을 만들기 전에 표준 속성을 직접 쓸 수 있는지 검토한다.** 기존 패턴을 그대로 따라 래퍼를 만들지 말고, 표준 경로가 있으면 그쪽을 채택한다.

- 판단 기준: 도입하려는 prop이 사실상 표준 DOM 속성의 별칭인가? (예: `label: string` ≈ `aria-label`, `disabled`·`type`·`name` 등 네이티브 속성)
- 표준 속성 래퍼면 `ComponentProps<'element'>`를 extend해 해당 속성을 직접 노출(필요 시 필수 override)하는 쪽이 더 표준적이다.
- 위반 사례: `IconButton`의 `label: string`이 `aria-label` 래퍼인데, `ComponentProps<'button'>` extend + `'aria-label': string` 필수 override로 표준화 가능했음.

### 기존 린트/coding-standards 오류 확인 (채용과제)

채용과제에서는 린트 설정 PR이 앞단에 위치하는 경우가 많다. 이때 린트 설정 PR은 다른 PR 범위의 파일에서 발생하는 오류를 파일 단위로 린트 제외 처리하고 넘어간다 (해당 파일을 수정하는 것은 그 PR의 범위가 아니므로). 따라서 overview.md 또는 PR 분할에서 파악된 파일 목록을 기준으로, 해당 파일에 기존 린트/coding-standards 오류가 남아있는지 점검한다. 오류가 있으면 `implementation.md`에 포함하여, 해당 파일의 기능 변경 커밋보다 앞에 린트 정리 커밋을 별도로 배치하도록 계획한다.

---

## 3. 파생 산출물

| 산출물 | 위치 | 형태 | 작성 조건 |
|--------|------|------|---------|
| stub 파일들 — 로직·조립 `.tsx`, hook, `*.test.tsx`, fixture, types 등 (PR이 만들 **외부 공개 모듈은 필수**. 내부 헬퍼는 권장). 페이지 마크업(`.tsx` JSX·`.module.scss` 디자인값)은 MARKUP 완성본을 가져오므로 stub 대상 아님(공통 지정 컴포넌트 껍데기는 예외 — stub.md) | 소스 디렉토리 | 결정 가능하고 코드로 표현 가능한 모든 설계 (코드 분량 크거나 한글 명세가 더 명확하면 `// TODO [AI_IMPL]:` 주석에 한글 요약) | 항상 |
| `markup.md` | `pr{N}/retained/` | **「Figma 원본 링크 인덱스」 절(사용자 입력)** + 토큰 매핑표, 매칭표 | UI 컴포넌트가 있는 PR이면 필수. 사용자가 figma 컴포넌트·상태별 URL을 직접 입력. step-6.4.1 사용자 figma 시각 대조의 기준 (figma 충실도 검증 자체는 MARKUP 담당, SKILL.md 「검증 기준 = 진실 원천」). 그 외 PR은 생성 안 함. **개인 모드는 figma가 없어 생성 안 함** ([conventions/artifact/markup-spec.md](../conventions/artifact/markup-spec.md)) |
| `implementation.md` | `pr{N}/persistent/` | 구현 순서·방침·`@deprecated` 흐름·it.todo 매핑·회귀 체크리스트 ([conventions/artifact/implementation-spec.md](../conventions/artifact/implementation-spec.md) 참조) | 대부분 작성됨 |

interface와 test-cases는 별도 md를 만들지 않는다. interface narrative가 필요하면 다른 산출물 또는 stub 파일의 JSDoc에 적는다.

---

## 4. stub 파일 작성 룰

stub 파일 작성 룰은 [conventions/artifact/stub.md](../conventions/artifact/stub.md) 단일 출처. 정의·범위(모든 파일·함수·컴포넌트 stub 필수), 디폴트(미정 placeholder), 양식(.tsx·.module.scss·Hook·test·Fixture·파일 분리), 주석(comments.md cross-ref), 라이프사이클(생성·보존·비판적 검토·정리) 모두 본 컨벤션이 담당.

#### markup.md 양식

「Figma 원본 링크 인덱스」 절 양식·검증 기준은 [conventions/artifact/markup-spec.md](../conventions/artifact/markup-spec.md) 참조.

### implementation.md 양식

양식·회귀 체크리스트 절은 [conventions/artifact/implementation-spec.md](../conventions/artifact/implementation-spec.md) 참조.

---

## 5. stub 커밋

### LLM 분석 + 사용자 제안 (PR 번호 무관)

stub 커밋은 step-4의 산출물이다. 절차:

1. **LLM이 PR 작업 분석** — 아래 두 조건으로 "코드/stub로 갈 것"을 가른다 (둘 중 하나라도 해당하면 코드로):
   - **조건 1 (외부 공개 시그니처)**: PR이 만들 props·타입·함수 시그니처 등 외부 공개 모듈.
   - **조건 2 (코드로 표현 가능한 모든 계획)**: 시그니처가 없어도 **파일로 표현 가능한 계획은 전부 코드/stub로** 만든다 — 의존성(`package.json` 추가 + 설치), 설정(`vite.config`·`tsconfig`·`eslint` 등), 테스트 의도(`*.test.tsx`의 `it.todo`). 이들을 **어떤 md 산출물에도 산문으로 나열하지 않는다**.
   - **조건 3 (stub 불가 + 코드표현 가능)**: rename·파일/폴더 이동·설정 한 줄 치환처럼 **코드가 이미 있어 stub 대상이 없지만 편집이 100% 코드로 표현되는** 것. stub이 없어 정확한 편집이 "구현 순서" 산문으로 새기 쉽다. **정확한 before/after 문자열·식별자·줄번호를 어느 md에도 적지 않는다**:
     - trivial(실행하면 끝 — 순수 rename 등)이면 **문서·세션 핸드오프로 이연하지 말고 그 자리에서 실행·커밋**한다.
     - 실행을 이연해야 하면 md엔 **탐색 패턴 하나**만 남긴다 — "grep `<찾을 패턴>` → 새 이름으로 치환" 형태. **각 매치의 before→after 쌍(식별자·경로·줄번호)을 나열하지 않는다**: 무엇을 찾을지(패턴)만 적고, 개별 치환은 step-5가 파일 보고 수행한다. (예: `ErrorFeedbackLayout→HandleSubmitLayout, ErrorFeedbackPage→...`처럼 쌍을 열거하면 위반 — `grep \`error-feedback|ErrorFeedback\` → 새 라우트명으로 치환` 한 줄로 접는다.)

   **md 산출물 전체**에는 **코드로 표현 못 하는 narrative만** 남긴다 (의도·구현 순서·커밋 분할·회귀 체크리스트·gotcha·근거). 코드로 표현 가능한 것은 *어느 산출물에도* 산문으로 넣지 않는다. impl/plan 역할 경계가 희미해져도 무방. stub 상세도(granularity)는 [conventions/artifact/stub.md](../conventions/artifact/stub.md)의 공개 API 수준 예시를 따른다.
2. **사용자에게 제안**: "이번 PR stub [필요/불필요]. 동의?" — 조건 2까지 따져서 판단한다(deps·설정·it.todo가 있으면 *필요*).
3. **사용자 동의·수정 후 진행** — 두 갈래: (a) stub 만들어 본체를 IMPL로 분해(무겁거나 후속 PR이 시그니처에 의존하는 병렬 PR) / (b) stub 없이 **그 자리에서 실행·커밋**(가벼운 PR — IMPL 분리 없이 step-4에서 완결)

PR 번호별 분기·조건문 없음. **"인프라성(빌드·린트·포맷·패키지) PR이라 stub 불필요"는 잘못된 디폴트다** — 그런 PR도 deps·설정·`it.todo`가 *코드로 표현 가능*하므로 조건 2에 의해 stub 대상이다. **"외부 시그니처 없음"을 "stub 없음"으로 확장하지 않는다**(it.todo·deps가 코드 stub 대신 `implementation.md` 산문으로 새는 사고의 원인). [conventions/pr-split.md](../conventions/pr-split.md) 「PR 분할 원칙」의 stub 시점 병렬·spawn 분기와 정합.

### stub 커밋 작성

stub 만들기로 동의되면, 모든 stub을 하나의 커밋으로 묶는다.

- 커밋 메시지 양식은 [conventions/commits.md](../conventions/commits.md) 「stub 커밋」 참조
- 이 커밋은 IMPL이 본체를 채울 기반이며(무거워서 분해한 경우), 구현이 끝나면 base 위에서 제거된다 (다음 단계의 「커밋 재정렬」 참조)
- stub 파일만 담는다 — 잔존 md(`/plan/pr{N}/` 하위)는 별도 커밋. 두 종류를 한 커밋에 섞지 않는다 (글로벌 규칙 「커밋 단위」)
- stub 커밋이 lint·tsc·prettier·테스트 명령을 통과하는지 확인 후 커밋한다

#### [CRITICAL] 포맷팅·prettier 영역 한정

전체 `yarn format` / `npx prettier --write .` 같은 **프로젝트 전역 포맷팅 금지**. 본 PR 영역만 한정 적용한다.

- ❌ 금지: `yarn format`, `npx prettier --write .`, `yarn prettier`
- ✓ 허용:
  - 영역 한정 prettier: `npx prettier --write _fsd/<slice>/ src/<scope>/`
  - husky lint-staged (pre-commit hook이 staged 파일만 처리)
  - 에디터(IDE)의 파일 저장 시 자동 포맷

만약 husky lint-staged가 이미 설치되어 있으면 `yarn format` 단계 자체 생략 — pre-commit hook이 자동 처리.

---

## 종료 시퀀스 (모두 필수, 스킵 금지)

산출물 작성 완료 + 사용자 OK 발화 직후, 후속 세션 spawn 안내·보고 출력 전에 아래 단계를 **순서대로 모두** 수행한다. 사용자 "ㅇ"·"좋아" 같은 짧은 OK에 휩쓸려 건너뛰지 않는다.

**가벼운 PR 분기 (stub 없이 그 자리 실행·커밋 완결 — IMPL 세션 생략)**: IMPL 세션이 없으므로 step-5·6 수행 주체가 PLAN 자신이다. 아래 종료 단계로 넘어가기 전에 step-5로 진입해 step-5→6을 진행한다. "IMPL 세션 없음"을 "step-5·6 스킵"으로 확장하지 않는다. (stub을 만들어 IMPL로 분해한 PR은 5·6을 PR_{N}_IMPL 세션이 수행하므로 본 분기 N‑A.)

### 1. 산출물 리뷰 (Reviewer 팀 에이전트 spawn) [CRITICAL]

파생이 끝나면 리뷰어 팀 에이전트를 spawn한다. [CRITICAL] [team-agent](../../../contexts/team-agent.md) 규칙을 따른다. 팀 에이전트를 쓰는 이유: 컨텍스트 유지 → 반복 읽기 비용 감소 + 다라운드 리뷰 가능.

```
Lead (메인 세션) — 리뷰 결과 종합 + 사용자 보고
└── Reviewer — 산출물 전체 리뷰
```

리뷰 체크리스트:

**컨벤션 대조**
- 각 산출물에 적힌 내용 기반으로 관련 코딩 컨벤션을 찾아 대조한다 (컴포넌트 설계가 있으면 컴포넌트 컨벤션, 테스트 계획이 있으면 테스트 컨벤션)
- **`reference.md`에 컨벤션 경로가 누적 명시되어 있는지** 확인한다 (overview.md는 의도만, reference.md가 컨벤션 인덱스 단일 출처 — step-3 산출물 분담 표 참조)
- 프로젝트 유형(회사/개인)에 맞는 경로만 포함되었는지 확인한다
- stub 파일이 lint·tsc·prettier를 통과하는지 확인 (코드라서 가능)
- stub 파일의 컨벤션 위반 (네이밍, 파일 구조, import 순서 등)을 reviewer가 직접 검증
- **stub 작성 룰 준수** ([conventions/artifact/stub.md](../conventions/artifact/stub.md)) — lint가 못 잡는 항목 직접 점검: `.module.scss` layout vs 디자인 값 분리, Hook 시그니처·throw 패턴, `.tsx` placeholder 변수 패턴, 주석 양식 (comments.md cross-ref)
- **코드-narrative 오배치 검출** — **모든 md 산출물**에 *코드로 표현 가능한 내용*(deps·설정·`it.todo`·시그니처)이 산문으로 들어가 있지 않은지 점검. 있으면 stub 코드로 옮기도록 지적(§5 조건 2). 특히 "판정 전 단일출처(`stub.md`) 미독으로 stub을 통째 생략"한 흔적이 없는지 확인.

**설계 타당성 역추적**
- `decisions.md`의 기술 결정과 `overview.md`의 의도(목표·범위)를 기준으로, 파생 산출물(stub 코드 + 잔존 md)이 해당 결정·의도를 충실히 반영하는지 검증한다
- 결정된 설계 방향과 모순되는 구현 방침·stub 코드 구조가 없는지 확인한다

**산출물 간 정합성**
- stub `.tsx`의 props 타입을 `.module.scss`/hook stub이 일관되게 소비하는지 대조한다
- hook stub의 API 응답 placeholder가 호출자 타입과 일치하는지 확인한다
- `it.todo` 자연어가 logic stub의 에러/엣지 시나리오를 커버하는지 확인한다
- **모든 `it.todo`가 implementation.md의 어느 커밋에서 다뤄지는지** 대조한다. 누락 시 추가하거나 의도적 제외 사유를 명시한다
- implementation.md의 각 컴포넌트/모듈 커밋에 해당 테스트가 포함되어 있는지 확인한다. 테스트를 별도 커밋으로 분리하지 않고 구현 커밋에 함께 포함시킨다

**채용과제 관점 (채용과제인 경우에만)**
- 대기업 채용과제 평가자의 시선으로 산출물을 검토한다
- 이 계획대로 구현했을 때 감점 요인이 될 만한 부분을 지적한다
- 가점 요인이나 차별화 포인트가 될 수 있는 부분을 제안한다 (과잉 설계가 아닌 선에서)

**자유 리뷰**
- 위 체크리스트에 해당하지 않더라도, 리뷰어 판단으로 문제가 있다고 보이는 부분을 자유롭게 지적한다

모순·누락·컨벤션 위반·정합성 불일치·감점 요인·차별화 제안이 있으면 다음 단계 보고에 포함한다.

### 2. 종료 게이트 (`it.todo` 매칭)

산출물 리뷰와 별개로 직접 수행한다 (리뷰 결과와 무관, 매번 수행). [conventions/artifact/implementation-spec.md](../conventions/artifact/implementation-spec.md) 「`it.todo` 매칭 게이트」의 PLAN 시점 매칭 두 갈래를 모두 적용 — **작성 시점(decisions 행동 결정 → `it.todo`, implementation.md 「행동 결정 커버리지」 표 산출)** 과 **종료 시점(`it.todo` → 커밋 계획)**. 앞 갈래는 표를 **필수 산출물**로 강제하므로, 표 미산출·미완(면제 없는 빈 행)이면 종료 불가 — 상류 대조를 산문 점검으로 두면 여러 종료 임무 속에 묻혀 스킵되기 쉬운 것을 표로 가시화하고, IMPL·step-6이 재검증할 계약으로 남긴다. 게이트 결과(커버리지 표 + `it.todo`↔커밋 매칭/누락/면제 분류)는 보고에 포함.

stub 없는 PR이라도 decisions에 **행동 결정이 있으면** 그 결정은 대응 `it.todo`(→stub)를 요구한다 — "외부 시그니처 없음"을 "행동 결정 없음"으로 확장하지 않는다(§5 정신과 정합). 행동 결정이 실제 0건인 순수 인프라 PR만 `it.todo` 0건 → 면제로 분류하고 면제 사유를 명시한다.

### 3. 부정 명시 메아리 자가 점검

SKILL.md 「부정 명시 메아리 자가 점검」 절차를 산출물 전체에 발동한다. 사용자 부정 지시 메아리·근거 없는 자체 판단 0건 수렴까지 반복.

### 4. 자가 검토

SKILL.md 「자가 검토 필수」의 「세션 종료 시 셀프 리뷰」 적용 — 본 세션에서 만든 산출물을 검증 소스와 1:1 대조. 이슈 발견 시 수정 후 다음 단계 보고에 포함.

### 5. 보고 내용

- 파생된 산출물 핵심 요약
- 산출물 리뷰 결과 (1단계)
- 종료 게이트 결과 (2단계 — 행동 결정 커버리지 표 + `it.todo`↔커밋 매칭/누락/면제 분류)
- 자가 검토 결과 (3·4단계 통과/이슈 발견 여부)
