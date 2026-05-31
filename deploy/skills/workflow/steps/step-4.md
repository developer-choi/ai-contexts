# Step 4: 구현 방침 상세화

> **Plan mode 필수**. Step 3에서 승인된 과제에 대해서만 작성한다.

Step 3이 "무엇을 구현할지"를 결정했다면, 이 단계는 "어떻게 구현할지"를 상세화한다. overview.md(의도)·decisions.md(기술 결정·근거)·reference.md(참조 인덱스)를 기반으로 파생 산출물(stub 코드 + 잔존 md)을 생성한다. Step 3의 기술 결정·근거를 반복하지 않는다.

---

## 사전 준비: 브랜치·워크트리 생성

이 단계 시작 시 작업 내용에 맞는 브랜치를 새로 생성하고, 워크트리도 함께 새로 만든다. 이전 세션의 브랜치를 이어서 사용하지 않는다.

- 브랜치명: `feature/{짧은-설명}` (예: `feature/login-form`)
- base: 프로젝트의 기본 브랜치 (main 또는 master)
- 워크트리는 프로젝트 루트의 형제 디렉토리에 생성한다
- 이전 브랜치/워크트리가 남아 있어도 새로 만든다 — 세션마다 깨끗한 상태에서 시작

이후 이 단계의 모든 작업(stub 파일 생성·stub 커밋 포함)은 새로 만든 워크트리 안에서 수행한다. 이전 step 산출물(`/plan/pr{N}/consumable/overview.md`, `/plan/pr{N}/persistent/` 하위 등)이 워크트리에 보이지 않을 때 처리는 두 갈래로 갈린다:

- **`.gitignore` 대상(예: `plan/`이 글로벌 ignore에 포함)** — 복사·심볼릭 만들지 말고 **main repo 절대경로로 그대로 참조**한다 (예: `C:\...\repo\backlog\pr4\persistent\decisions.md`). 복사 시 양쪽 동기화 부담·잔존 위험. 다음 세션도 같은 절대경로로 backlog를 참조하도록 진입 안내문에 경로를 명시한다
- **그 외(추적 대상인데 base 브랜치에 미커밋)** — base 브랜치에 먼저 커밋해 워크트리에 반영하거나, 작업 시작 전에 워크트리로 가져온다

메인 세션이 직접 cwd를 옮길 수 없으면 사용자에게 워크트리 디렉토리에서 새 세션을 띄워 이어가도록 안내한다.

---

## 1. 잔여 산출물 소비

`/plan/pr{N}/` 하위와 `/plan/background/`를 탐색하여 기존 AI 산출물을 읽고, **stub 코드(결정·코드 표현 가능 영역)와 잔존 md(narrative)로 분배**한다. 소비된 원본은 삭제한다 (`read-only/` 하위는 삭제하지 않는다).

컴포넌트 마크업(`.tsx` JSX·`.module.scss` 디자인 값)은 MARKUP 세션이 figma 0건으로 완성하므로 **step-4의 stub 대상이 아니다.** step-4는 figma를 `markup.md`(사용자 figma 시각 대조용) 작성 + 본 PR의 로직·페이지 조립 구조 참조에만 쓴다. MARKUP 세션이 figma 자료를 `background/retained/figma/`에 통합 누적하므로 PR 단위 `pr{N}/retained/page*.png`는 생성되지 않는다.

---

## 2. 구현 컨텍스트 수집

다음 세션에서 Lead가 팀에게 컨텍스트를 주입할 때, 산출물에 적힌 경로를 기반으로 분배한다. 따라서 파생 산출물을 작성하기 전에 구현에 필요한 컨텍스트를 미리 수집한다.

Step 3의 "컨벤션 사전 참조"에서 파악한 컨벤션을 기반으로, 추가 컨텍스트를 사용자에게 질문하여 수집한다:
- 관련 컨벤션 경로 (Step 3에서 확인한 것 외 추가분)
- 참조할 기존 코드 경로 (유사 구현, 재사용할 컴포넌트 등)
- 디자인 토큰 / 디자인시스템 경로 (피그마 연동 시)

### 코딩 스탠다드 · 베스트프랙티스

1. [coding-standards/map.md](../../../contexts/coding-standards/map.md) 읽기
2. 프로젝트 유형 판별 — 회사 프로젝트: `universal/`만, 개인 프로젝트: `universal/` + `personal/`
3. 해당하는 파일 중 현재 구현에 관련된 것을 선별 (`file-folder-structure` 태그 포함)
4. map.md의 베스트프랙티스 섹션에서 현재 구현에 매칭되는 패턴을 탐색한다
   - 매칭되는 엔트리가 있으면 해당 산출물에 참조 패턴으로 기록한다
   - 매칭되는 엔트리가 없으면 사용자에게 어떤 패턴을 따를지 문의한다
5. 선별된 컨벤션·패턴 경로를 `/plan/pr{N}/persistent/reference.md`에 누적 명시한다. 누적 원칙·stub과의 분담은 [conventions/artifact/reference-curation.md](../conventions/artifact/reference-curation.md) 「누적 원칙」 참조.

### [CRITICAL] 컨벤션 1차 소스 직접 grep 의무

stub 폴더 구조·파일 배치·네이밍·import 경로를 결정할 때 관련 컨벤션 1차 소스를 **직접 grep**한 후 결과를 stub 주석 `[Convention]` 블록에 인용한다. "안다고 가정"·"이전 세션 기억"·"이전 PR에서 본 패턴"에 의존하지 않는다.

**결정 시점 트리거 (가장 빠뜨리기 쉬움)**: 아래 결정을 내리려는 그 순간이 grep 발동 시점이다. 결정·도구 호출·stub 파일 작성 전에 grep 결과를 받아야 한다. 결정 후 사후 검증은 늦다.

- stub 파일 경로 후보를 정하는 순간 (예: "`features/dashboard/ui/cards/StatusCard.tsx` vs `features/dashboard/ui/StatusCard.tsx`")
- "이전 PR에서 보던 패턴 그대로" 같은 기억 trigger 발화 직후
- `index.ts` 만들지 / 폴더 vs 단일 파일 / 서브폴더 허용 여부 같은 구조 선택
- 사용자 압박 발화("빨리", "그냥 해", "쉽지 않아?")로 grep 회피 유혹 시 — 압박은 면제 트리거 아님

대상 컨벤션 1차 소스:
- `docs/ARCHITECTURE.md` — 레이어 의존성, 폴더 구조, Public API 원칙
- `docs/conventions/*` — 네이밍·레이어·nuqs·patterns 등
- `_fsd/.../*` — 기존 슬라이스의 평행 사례

특히 다음 결정 전에 grep 의무:
- features/widgets/entities `ui/` 폴더 sub-folder 허용 여부 (예: `grep "ui/" docs/ARCHITECTURE.md docs/conventions/02-layers.md`)
- entities `api/types.ts`, `model/types.ts`, `lib/mapper.ts` 배치 — 컨벤션 명시 vs 기존 슬라이스 평행
- 슬라이스 도메인 그룹화 임계치 (`02-layers.md`의 슬라이스 수 기준)
- `index.ts` 중간 배럴 허용 여부

사유: 컨벤션 위반은 reviewer가 잡아내기 전 PLAN 단계에서 막아야 한다. PR3에서 features `ui/cards/` 서브폴더를 grep 없이 채택했다가 `docs/ARCHITECTURE.md:189,221` + `docs/conventions/02-layers.md:498`의 "서브폴더 금지" 명시 발견 후 일괄 평탄화한 사례 — 본 절차로 사전 차단.

### 기존 린트/coding-standards 오류 확인 (채용과제)

채용과제에서는 린트 설정 PR이 앞단에 위치하는 경우가 많다. 이때 린트 설정 PR은 다른 PR 범위의 파일에서 발생하는 오류를 파일 단위로 린트 제외 처리하고 넘어간다 (해당 파일을 수정하는 것은 그 PR의 범위가 아니므로). 따라서 overview.md 또는 PR 분할에서 파악된 파일 목록을 기준으로, 해당 파일에 기존 린트/coding-standards 오류가 남아있는지 점검한다. 오류가 있으면 `implementation.md`에 포함하여, 해당 파일의 기능 변경 커밋보다 앞에 린트 정리 커밋을 별도로 배치하도록 계획한다.

---

## 3. 파생 산출물

| 산출물 | 위치 | 형태 | 작성 조건 |
|--------|------|------|---------|
| stub 파일들 — 로직·조립 `.tsx`, hook, `*.test.tsx`, fixture, types 등 (PR이 만들 **외부 공개 모듈은 필수**. 내부 헬퍼는 권장). 컴포넌트 마크업(`.tsx` JSX·`.module.scss` 디자인값)은 MARKUP 완성본을 가져오므로 stub 대상 아님 | 소스 디렉토리 | 결정 가능하고 코드로 표현 가능한 모든 설계 (코드 분량 크거나 한글 명세가 더 명확하면 `// TODO [AI_IMPL]:` 주석에 한글 요약) | 항상 |
| `markup.md` | `pr{N}/retained/` | **「Figma 원본 링크 인덱스」 절(사용자 입력)** + 토큰 매핑표, 매칭표 | UI 컴포넌트가 있는 PR이면 필수. 사용자가 figma 컴포넌트·상태별 URL을 직접 입력. step-6.4.1 사용자 figma 시각 대조의 기준 (figma 충실도 검증 자체는 MARKUP 담당, SKILL.md 「검증 기준 = 진실 원천」). 그 외 PR은 생성 안 함 |
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

1. **LLM이 PR 작업 분석** → step-3 산출물·`/plan/background/consumable/project.md` PR 정의·MARKUP 산출물을 기반으로 "이 PR에 stub 만들 외부 시그니처(props·타입·함수 시그니처 등)가 있나?" 판단
2. **사용자에게 제안**: "이번 PR stub [필요/불필요]. 동의?"
3. **사용자 동의·수정 후 진행** — stub 만들거나 빈 step-4 (stub 없이 step-5 진입)

PR 번호별 분기·조건문 없음. PR1·2 (인프라성: 빌드·린트·포맷·패키지)는 통상 stub 불필요로 LLM 분석 결과가 나옴. PR3+ 는 외부 공개 시그니처가 있어 stub 필요한 경우가 많음. step-2 「PR 분할 원칙」의 stub 시점 병렬·spawn 분기와 정합.

### stub 커밋 작성

stub 만들기로 동의되면, 모든 stub을 하나의 커밋으로 묶는다.

- 커밋 메시지 양식은 [conventions/commits.md](../conventions/commits.md) 「stub 커밋」 참조
- 이 커밋은 다음 단계의 작업 기반이 되며, 구현이 끝나면 base 위에서 제거된다 (다음 단계의 「커밋 재정렬」 참조)
- stub 파일만 담는다 — 잔존 md(`/plan/pr{N}/` 하위)는 별도 커밋. 두 종류를 한 커밋에 섞지 않는다 (글로벌 규칙 「커밋 단위」)
- stub 커밋이 lint·tsc·prettier·테스트 명령을 통과하는지 확인 후 커밋한다

#### [CRITICAL] 포맷팅·prettier 영역 한정

전체 `yarn format` / `npx prettier --write .` 같은 **프로젝트 전역 포맷팅 금지**. 본 PR 영역만 한정 적용한다.

- ❌ 금지: `yarn format`, `npx prettier --write .`, `yarn prettier`
- ✓ 허용:
  - 영역 한정 prettier: `npx prettier --write _fsd/<slice>/ src/<scope>/`
  - husky lint-staged (pre-commit hook이 staged 파일만 처리)
  - 에디터(IDE)의 파일 저장 시 자동 포맷

사유: 전체 포맷팅은 PR 외 파일(과거 prettier 미적용 잔존 파일)을 일괄 변경한다. 글로벌 규칙 「내 작업 외 변경은 커밋하지 않는다」 위반 → 일괄 되돌림 작업 발생. PR3 사례: `yarn format` 1회 실행 후 ~300개 파일 prettier 변경 → 본 PR 영역만 남기고 일괄 되돌림.

만약 husky lint-staged가 이미 설치되어 있으면 `yarn format` 단계 자체 생략 — pre-commit hook이 자동 처리.

---

## 종료 시퀀스 (모두 필수, 스킵 금지)

산출물 작성 완료 + 사용자 OK 발화 직후, 후속 세션 spawn 안내·보고 출력 전에 아래 6단계를 **순서대로 모두** 수행한다. 사용자 "ㅇ"·"좋아" 같은 짧은 OK에 휩쓸려 건너뛰지 않는다.

이 절이 분산되면 누락된다 (SKILL.md 「step 종료 시퀀스 미스킵」 메타 룰 참조). 산출물이 끝났다고 종료 시퀀스가 자동 발동되지 않는다 — 명시 점검 필요.

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

산출물 리뷰와 별개로 직접 수행한다 (리뷰 결과와 무관, 매번 수행). [conventions/artifact/implementation-spec.md](../conventions/artifact/implementation-spec.md) 「`it.todo` 매칭 게이트 > PLAN 종료 시점」 적용. 게이트 결과(매칭/누락/면제 분류)는 보고에 포함.

stub 없는 PR이면 `it.todo` 0건 → 면제로 분류하고 면제 사유를 명시한다.

### 3. 부정 명시 메아리 자가 점검

SKILL.md 「부정 명시 메아리 자가 점검」 절차를 산출물 전체에 발동한다. 사용자 부정 지시 메아리·근거 없는 자체 판단 0건 수렴까지 반복.

### 4. 자가 검토

SKILL.md 「자가 검토 필수」의 「세션 종료 시 셀프 리뷰」 적용 — 본 세션에서 만든 산출물을 검증 소스와 1:1 대조. 이슈 발견 시 수정 후 다음 단계 보고에 포함.

### 5. 보고 내용

- 파생된 산출물 핵심 요약
- 산출물 리뷰 결과 (1단계)
- 종료 게이트 결과 (2단계 매칭/누락/면제 분류)
- 자가 검토 결과 (3·4단계 통과/이슈 발견 여부)
