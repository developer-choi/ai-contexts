# Step 4: 구현 방침 상세화

> **이 단계의 목표: 구현 방침을 구체적으로 설계한다**

> **Plan mode 필수**. Step 3에서 승인된 과제에 대해서만 작성한다.

Step 3이 "무엇을 구현할지"를 결정했다면, 이 단계는 "어떻게 구현할지"를 상세화한다. overview.md를 기반으로 파생 산출물(stub 코드 + 잔존 md)을 생성한다. Step 3의 기술 선택·결정·근거를 반복하지 않는다.

---

## 사전 준비: 브랜치·워크트리 생성

이 단계 시작 시 작업 내용에 맞는 브랜치를 새로 생성하고, 워크트리도 함께 새로 만든다. 이전 세션의 브랜치를 이어서 사용하지 않는다.

- 브랜치명: `feature/{짧은-설명}` (예: `feature/login-form`)
- base: 프로젝트의 기본 브랜치 (main 또는 master)
- 워크트리는 프로젝트 루트의 형제 디렉토리에 생성한다
- 이전 브랜치/워크트리가 남아 있어도 새로 만든다 — 세션마다 깨끗한 상태에서 시작

이후 이 단계의 모든 작업(stub 파일 생성·stub 커밋 포함)은 새로 만든 워크트리 안에서 수행한다. 이전 step 산출물(`/plan/pr{N}/overview.md` 등)이 base 브랜치에 commit되어 있지 않아 워크트리에 보이지 않으면, 작업 시작 전에 워크트리로 가져온다. 메인 세션이 직접 cwd를 옮길 수 없으면 사용자에게 워크트리 디렉토리에서 새 세션을 띄워 이어가도록 안내한다.

---

## 1. 잔여 산출물 소비

`/plan/pr{N}/` 하위와 `/plan/background/`를 탐색하여 기존 AI 산출물을 읽고, **stub 코드(결정·코드 표현 가능 영역)와 잔존 md(narrative)로 분배**한다. 소비된 원본은 삭제한다 (`read-only/` 하위는 삭제하지 않는다).

채용과제의 페이지 이미지(`/plan/pr{N}/` 하위 `page*.png`)는 해당 PR의 **stub `.tsx` 작성 시 + `markup.md` 작성 시** 시각적 참조로 사용한다. 소비 대상이 아니며 삭제하지 않는다.

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
5. 선별된 컨벤션·패턴 경로를 `overview.md`의 「컨벤션·컨텍스트」 섹션에 통합 명시한다. 각 stub 파일·잔존 md에는 적지 않는다.

결정 가능한 컨벤션은 전부 stub 코드와 `overview.md` 「컨벤션·컨텍스트」 섹션에 녹인다 (파일 경로·네이밍은 stub 자체로, 토큰 사용 규칙·에러처리 전략 같은 명시 규칙은 overview.md 섹션으로). 이를 통해 이후 구현 단계에서 컨벤션 원본을 가급적 덜 볼 수 있게 한다.

### 기존 린트/coding-standards 오류 확인 (채용과제)

채용과제에서는 린트 설정 PR이 앞단에 위치하는 경우가 많다. 이때 린트 설정 PR은 다른 PR 범위의 파일에서 발생하는 오류를 파일 단위로 린트 제외 처리하고 넘어간다 (해당 파일을 수정하는 것은 그 PR의 범위가 아니므로). 따라서 overview.md 또는 PR 분할에서 파악된 파일 목록을 기준으로, 해당 파일에 기존 린트/coding-standards 오류가 남아있는지 점검한다. 오류가 있으면 `implementation.md`에 포함하여, 해당 파일의 기능 변경 커밋보다 앞에 린트 정리 커밋을 별도로 배치하도록 계획한다.

### 이전 PR 산출물 비판적 검토

이전 PR의 코드·결정을 컨텍스트로 참조하면, 자기가 이미 로드한 컨벤션 안에서 비판적 검토를 수행한다.

- 검토 범위: 이번 PR이 참조·재사용·확장하는 부분에 한정한다 (전부 다 의심하지 않는다)
- 검토 근거: 「코딩 스탠다드 · 베스트프랙티스」에서 선별해 이미 로드한 컨벤션 문서로만 검증한다
- 추가 컨벤션 로드 금지 — 검토 영역을 자기 컨텍스트 밖으로 확장하지 않는다
- 위반·미흡 발견 시 사용자에게 보고한다. 별 PR/이슈로 분리할지 이번 PR에서 다룰지는 사용자가 결정한다

---

## 3. 파생 산출물

| 산출물 | 형태 | 작성 조건 |
|--------|------|---------|
| stub 파일들 — `.tsx`, `.module.scss`, hook, `*.test.tsx`, fixture, types 등 (PR이 만들 모든 파일) | 결정 가능하고 코드로 표현 가능한 모든 설계 | 항상 |
| `markup.md` | 토큰 선택 근거, 디자인 의도, 매칭표 | narrative(설명·근거·맥락 문장) 한 문장 이상 있을 때만. 헤딩·boilerplate만이면 만들지 않음 |
| `logic.md` | 분기 설계 근거, 미정 디테일, 외부 의존성 메모 | 동일 |
| `implementation.md` | 구현 순서·방침·`@deprecated` 흐름·it.todo 매핑 | 동일 (대부분 작성됨) |

interface와 test-cases는 별도 md를 만들지 않는다. interface narrative가 필요하면 다른 산출물 또는 stub 파일의 JSDoc에 적는다.

---

## 4. stub 파일 작성 룰

### 디폴트: 결정 미정 항목은 placeholder, 결정된 것만 코드로

step-4 시점에 결정 안 된 영역은 코드에 placeholder/`[stub]` 메모만 남기고 step-5로 미룬다. 케이스별 가이드:

| 케이스 | step-4 stub 처리 |
|-------|-----------------|
| `useEffect` | 의존성 배열·정리 함수가 결정됐으면 시그니처 + `[stub]` 본문. 미결이면 사용자 질문 |
| Context Provider | provider 트리 위치·value 타입 결정됐으면 stub 작성. 미결이면 logic.md narrative |
| 페이지 routing (Next.js app router) | `page.tsx`/`layout.tsx`/`loading.tsx`/`error.tsx` 파일은 항상 stub 생성 |
| Server Component vs Client | `'use client'` 지시문 결정됐으면 명시. 미결이면 사용자 질문 |
| 외부 라이브러리 호출 | API 메서드 결정됐으면 import + 호출 stub. 미결이면 placeholder 변수 |

### 상단 출처 주석 (회사 프로젝트 한정)

회사 프로젝트의 stub 파일은 상단에 다음 양식의 주석 블록을 첨부한다. 이후 IMPL/리뷰 시 컨벤션·참조 출처를 즉시 확인하기 위함.

양식:

```
/* TODO [USER_REVIEW]

[Convention]
설명 — 경로:라인번호
설명 — 경로:라인번호

[Reference]
설명 — 경로:라인번호

*/
```

규칙:

- 상단 출처 블록은 `/* TODO [USER_REVIEW]`로 시작한다. **사용자가 컨벤션·참조 정합성을 검토할 항목**임을 마커로 명시
- 사용자가 PLAN 종료 직전 블록을 검토한다. 검토 후 블록 전체를 삭제하거나 IMPL 진입을 승인 (step-5에서 IMPL이 출처 확인 후 일괄 삭제도 가능)
- IDE TODO highlight·검색 친화: `TODO [USER_REVIEW]` 또는 `TODO [AI_IMPL]`만으로 grep 가능
- `경로:라인번호`는 라인 끝에 둔다 (End 키로 라인 끝 선택 시 경로/라인번호만 잘라내기 편함)
- `[Convention]`: stub 코드를 검증할 수 있는 컨벤션 문서의 경로 + 라인 범위. 회사 컨벤션 문서가 있는 경우 우선
- `[Reference]`: 컨벤션 문서에 명시 패턴이 없는 경우에 한해, 코드 작성 근거가 된 기존 코드 경로 + 라인 범위
- 양쪽 모두 해당하면 둘 다 적는다 (Convention 우선, Reference는 보조)

제외 대상 (룰 미적용):

- 개인 레포
- 채용과제

이유: 회사 프로젝트는 컨벤션 문서가 정립되어 있어 stub 코드의 정당성을 출처로 명시할 수 있다. 개인 레포·채용과제는 컨벤션 문서가 없거나 적용 범위가 좁아 출처 명시 가치가 낮다.

#### 상단 블록 vs 인라인 분리 기준

출처 주석은 적용 대상에 따라 위치를 분리한다. 매핑이 흐려지지 않도록 컨벤션 단위로 배치한다.

상단 `/* TODO [USER_REVIEW] [Convention] [Reference] */` 블록에 적는 항목:

- 파일 경로·폴더 구조·파일명에 관한 컨벤션 (예: `{domain}-api.ts` 네이밍, `entities/{domain}/api` 폴더 구조)
- 파일 전체 평행 사례 (`[Reference]`)

코드 라인 바로 위 `// TODO [USER_REVIEW]:` 또는 `// TODO [AI_IMPL]:` 주석으로 분리할 항목:

- `// TODO [USER_REVIEW]:` — 함수 시그니처·호출 패턴·분기 패턴 등 사용자가 정합성을 검토해야 하는 컨벤션 출처
  - 예: `서버 컴포넌트 에러 분기 (fetchQuery + result 분기) — docs/conventions/04-patterns.md:123-131`은 `const result = await queryClient.fetchQuery(...)` 줄 바로 위
- `// TODO [AI_IMPL]:` — IMPL 세션이 코드로 채워야 하는 placeholder·미정 값
  - 예: `gap 토큰 매핑 — markup.md "IMPL 시점 Figma 확인 체크리스트 > X.module.scss"`는 비어있는 scss 속성 줄 바로 위

이유: 컨벤션 출처를 코드 라인과 1:1로 매핑하면 IMPL 단계에서 "이 줄이 어느 컨벤션 근거인지" 즉시 확인 가능. 상단에 모아두면 매핑이 흐려져 리뷰 시 컨벤션 위배 식별이 어려워진다.

양식 예시 (상단 + 인라인 혼합):

```ts
/* TODO [USER_REVIEW]

[Convention]
파일 경로/폴더/네이밍 관련 — docs/conventions/...:line

[Reference]
파일 전체 평행 사례 — _fsd/.../FileName.tsx:line-range

*/

import { ... } from '...';

// TODO [USER_REVIEW]: 특정 코드 패턴 관련 컨벤션 — docs/conventions/...:line
function someHelperFollowingConvention() { ... }

export function MainComponent() {
  // TODO [USER_REVIEW]: 호출 패턴 관련 컨벤션 — docs/conventions/...:line
  const result = await someConventionFollowingCall();

  // TODO [AI_IMPL]: 토큰 매핑 — markup.md "IMPL 시점 Figma 확인 체크리스트 > X.module.scss"
  return ...;
}
```

PR 이연 후속 작업(예: "PR4에서 X 추가")은 코드 안 마커가 아닌 `plan/{prN}/overview.md` 「열려있는 질문」 절에서 관리한다. 코드 안 TODO는 본 PR 안에서 모두 해소되어야 한다.

#### 재추가 금지 — 기존 stub 파일 갱신 시

stub 주석(`/* TODO [USER_REVIEW] ... */` 상단 블록, `// TODO [USER_REVIEW]:` / `// TODO [AI_IMPL]:` 인라인) 적용은 **stub 초기 생성 시점(파일 신규 작성)에 한정**한다. 기존 stub 파일의 코드 본문을 갱신할 때 stub 주석을 자동 재추가하지 않는다.

세부 조항:

- 신규 stub 파일 작성 시: 「상단 출처 주석」 + 「본문 주석은 TODO 마커 분리 필수」 룰 적용
- 기존 stub 파일 코드 본문 갱신 시: **기존 TODO 주석 상태를 그대로 보존**. 제거된 TODO 주석을 다시 박지 않는다. 사용자가 직접 정리한 주석은 의도된 상태로 본다
- `system-reminder`로 "modified, intentional, don't revert"가 안내된 파일은 TODO 주석 재추가 절대 금지

도구 선택:

- 기존 stub 파일 본문 갱신은 **Edit 우선** (부분 수정 → 기존 TODO 주석 자동 보존)
- Write는 stub 신규 생성 또는 본문 구조 자체를 전면 재작성하는 경우에만. Write로 갱신할 때는 기존 파일의 TODO 주석 보존 여부를 의식적으로 확인한다

IMPL 단계 라이프사이클과의 관계: step-5의 「TODO 주석 해결 시 즉시 삭제」 룰은 IMPL에서 코드 구체화하며 `TODO [AI_IMPL]` 주석을 제거하라는 룰이다. 본 룰(재추가 금지)은 PLAN 단계 안에서도 동일 정신 — 사용자가 TODO 주석을 정리한 시점이 곧 "그 결정의 의도 확정"이므로 그 후에는 TODO 주석 재생성을 하지 않는다.

양식 예시:

```
// ❌ Bad — 기존 파일 갱신 시 사용자가 정리한 TODO 주석을 다시 박는 패턴
// (Write로 전면 재작성하며 룰만 따라 TODO 주석 자동 추가)

// ✅ Good — 기존 TODO 주석 상태를 그대로 보존하고, 제거된 TODO 주석은 재생성하지 않음
// (Edit로 부분 수정, 사용자 정리 의도 존중)
```

### 본문 주석은 `TODO [USER_REVIEW]` / `TODO [AI_IMPL]` 마커 분리 필수

stub 단계에서 본문에 추가하는 설명 주석은 **처리자**에 따라 두 마커로 분리한다. 모두 `TODO` prefix를 사용하므로 IDE TODO highlight·뷰어 지원을 함께 받는다.

| 마커 | 처리자 | 수명 | 의미 |
|---|---|---|---|
| `// TODO [USER_REVIEW]:` | **사용자**(검토) | PLAN 단계에서 사용자 승인 후 삭제 | 사용자가 봐달라고 적는 검토 요청. 컨벤션 출처, placeholder 의도, "이 결정 맞나요?" 메모 |
| `// TODO [AI_IMPL]:` | **AI/개발자**(구체화) | IMPL 단계에서 코드로 채우며 삭제 | IMPL이 채워야 하는 placeholder·미정 값. scss 토큰 매핑, 미정 분기, "여기 채워야 함" |

사유:
- **분류 명료**: 누가 처리하는지가 마커에서 즉시 보임
- **IDE 지원**: 모두 `TODO` prefix라 IDE Todo Tree·Comment highlighter가 자동 인식
- **자동 게이트**: step-5 시작 시 `grep "TODO \[USER_REVIEW\]"` 0건 확인 (사용자 검토 완료 확인). IMPL 종료 시 `grep "TODO"` 0건 확인 (모두 처리됨)

`// TODO [USER_REVIEW]:` 대상:

- 함수/변수 위의 동작 설명 주석으로 사용자가 정합성 검토할 항목 (예: `// TODO [USER_REVIEW]: 빈 값 처리 — nuqs가 자동으로 null 처리`)
- 컨벤션 출처 인라인 메모 (위 「상단 블록 vs 인라인 분리 기준」 참조)
- placeholder 의도·구현 결정의 근거 메모 (예: `// TODO [USER_REVIEW]: 외부 링크 아이콘 Open16Regular은 placeholder — 디자인 토큰 확정 시 교체`)

`// TODO [AI_IMPL]:` 대상:

- IMPL이 채워야 하는 미정 값·placeholder (예: `// TODO [AI_IMPL]: gap 토큰 매핑 — markup.md "IMPL 시점 Figma 확인 체크리스트 > X.module.scss"`)
- 결정된 로직이지만 IMPL 시점 코드로 구체화될 부분 (예: scss 토큰, 상수 값)

**출처 명시 의무**: `TODO [AI_IMPL]:` 마커는 IMPL이 채울 정보의 **출처를 반드시 명시**한다. 시점 단독 표현 금지.

- ❌ Bad: `// TODO [AI_IMPL]: IMPL 시점 토큰`, `// TODO [AI_IMPL]: 디자인 검수 라운드에서 확정`
- ✓ Good: `// TODO [AI_IMPL]: 설명 — plan/{prN}/markup.md "{절명}"` 또는 `docs/...:{line}` 또는 `_fsd/.../{file}:{line}`

출처 없으면 IMPL이 어디서 채울 정보를 찾는지 모호. 종료 게이트(IMPL 종료 grep `TODO` 0건) 통과 전 모든 `TODO [AI_IMPL]`은 출처 동반.

**PR 이연 후속 작업은 코드 안 마커가 아닌 plan md 「열려있는 질문」 절에서 관리**:

- ❌ 코드 안 `// TODO: PR4에서 만료 안내 배너 추가` 금지
- ✓ `plan/{prN}/overview.md` 「열려있는 질문」 절에 "PR4 — 만료 안내 배너" 항목 추가

코드 안 TODO는 본 PR 안에서 모두 해소되어야 한다. PR 이연·외부 의존성·다음 PR 이연 항목은 plan md에서 영구 관리.

**출처 인용은 영속 파일만**:

`TODO [USER_REVIEW]` / `TODO [AI_IMPL]` 모두 출처 인용 시 영속 파일만 허용한다.

- ✓ 영속 파일: `docs/conventions/*`, `docs/ARCHITECTURE.md`, `_fsd/.../*`, `plan/{prN}/overview.md`/`logic.md`/`markup.md`/`implementation.md`/`decisions.md` 절
- ❌ 분배 후 삭제 예정인 1차 입력 (예: 사용자가 작성한 `page.md`, BG 세션 AI 산출물 등 step-4 「1. 잔여 산출물 소비」에서 삭제 대상). 라인 번호 인용 금지

1차 입력 인용이 필요하면 분배된 plan md 절로 우회 인용. 예: `page.md:30` → `plan/{prN}/logic.md "X 절"`.

사유: 1차 입력 파일이 분배 후 삭제되면 인용한 라인 번호가 무효가 된다. IMPL/리뷰 시점에 출처 추적 불가. 본 룰로 stub 주석의 출처 영속성 보장.

**판단 경계 사례 표** — 분류 모호한 케이스 가이드:

| 사례 | 분류 | 근거 |
|---|---|---|
| 평가 함수·헬퍼 함수 위 동작 설명 메모 | `TODO [USER_REVIEW]` | 사용자가 분기 로직·표시값 매핑 정합 검토 |
| 컨벤션 출처 인라인 메모 | `TODO [USER_REVIEW]` | 사용자가 컨벤션 정합 검토 |
| placeholder 의도 설명 (예: 외부 링크 아이콘 placeholder) | `TODO [USER_REVIEW]` | "이 결정 맞나요?" 검토 요청 |
| scss 토큰 매핑 (gap, color, padding, font, border 등) | `TODO [AI_IMPL]` | IMPL이 Figma 보고 채울 작업 |
| 미구현 컴포넌트·기능 (예: Info 아이콘 + 호버 툴팁) | `TODO [AI_IMPL]` | IMPL이 구체화할 작업 |
| 디자인 검수 라운드 후 확정 — 본 PR IMPL 흐름 안 | `TODO [AI_IMPL]` | 본 PR 안에서 끝나는 IMPL 작업 |
| 디자인 검수 후 확정 — 별도 일정 (라운드 본 PR 외) | plan md 「열려있는 질문」 | 본 PR 외부 |
| 백엔드 합의 후 nullable 재조정 — IMPL 안에서 끝 | `TODO [AI_IMPL]` | 본 PR 안 |
| 백엔드 합의 지연 가능 — 본 PR 종료 후 잔존 | plan md 「열려있는 질문」 | 외부 의존성 |
| PR 이연 작업 (예: PR4에서 X 추가) | plan md 「열려있는 질문」 | 본 PR 외부 (코드 안 금지) |

**판단 기준 한 줄**: "본 PR IMPL이 처리할 작업인가? Yes → 코드 안 TODO 마커. No → plan md 열려있는 질문 절."

제외:

- 파일 최상단의 `/* TODO [USER_REVIEW] [Convention] [Reference] */` 블록 주석 — 본 「본문 주석」 룰의 대상 아님. 별도 룰(위 「상단 출처 주석」)을 따라 `/* TODO [USER_REVIEW]`로 시작하고 PLAN 종료 또는 IMPL 진입 시 블록 전체를 삭제
- 코드 카테고리 마커 (예: `// 404`, `// 400`) — 기존 코드 컨벤션
- 컨벤션상 명시된 JSDoc (예: 02-layers.md의 `@param`/`@returns` 등)

원칙적으로 stub 단계에서 본문 주석을 최소화한다. 글로벌 룰 "Default to writing no comments"가 우선. placeholder 의도가 의도적으로 비명확한 경우만 TODO 마커로 남긴다.

기존 stub 파일을 갱신할 때 사용자가 정리한 `// TODO [USER_REVIEW]:` / `// TODO [AI_IMPL]:` 주석을 자동 재추가하지 않는다. 본 룰의 상세는 위 「상단 출처 주석 > 재추가 금지 — 기존 stub 파일 갱신 시」 참조.

### `.tsx`

- Props 타입 + 컴포넌트 선언
- 다른 컴포넌트 합성 안 하면 `return null` (leaf)
- 합성하면 트리 골조 + 조건부 렌더링 골조
- 조건은 placeholder 변수 (`const isLoading = false; // [stub]: logic`)
- 짧은 책임 설명은 함수명 충분하면 생략, 아니면 1줄 JSDoc

### `.module.scss`

- 빈 파일이라도 같이 생성 (lint·import 통과)
- step-4에서 결정된 토큰 매칭은 코드로 적음 (`padding: var(--semantic-padding-lg)`)
- 미정인 토큰·정확한 값은 step-5에서

### Hook · 페이지 stub

- 시그니처 + Flow 주석 + placeholder 변수 + `throw new Error('not implemented')`
- step-4에서 결정된 사항(useMutation 사용, API endpoint 등)은 코드로 적음

### `*.test.tsx`

- `describe + it.todo('한 줄 자연어')`
- 위치·중첩 깊이는 프로젝트 컨벤션

### Fixture

- 컨벤션 위치, **logic 영역 분류** (mock = API 응답)
- test 파일은 import만

### 파일 분리 단위

- PR이 만들 모든 파일을 stub으로 생성
- 분리 단위는 **프로젝트 컨벤션**
- 컨벤션 부재 시 사용자에게 질문 (디폴트 안 박음)

### implementation.md 양식

각 커밋 항목은 본 파일과 대응 테스트 파일(stub `*.test.tsx`)을 sub-bullet으로 나란히 명시한다. "단위테스트 옵션" 같은 별도 섹션을 만들지 않는다. 면제는 사유를 함께 적는다 (예: "page/layout이라 단위테스트 면제, E2E에서 다룸").

예시:

```
### N. feat: shared/components/AlertModal
- 신규: AlertModal.tsx
- 신규: AlertModal.test.tsx — 다음 it.todo 다룸:
    - 'open=true 고정 시 콘텐츠 렌더링'
    - 'onClose 호출 검증'
    - 'whitespace-pre-line 줄바꿈 적용'
```

implementation.md 끝에 「회귀 체크리스트」 섹션을 둔다. 구현 종료 보고 직전 수행하는 점검 항목:

- **stub 테스트 파일의 `it.todo`와 작성된 `it(...)` 케이스가 매칭**되는지 (각 todo가 코드화됐거나 면제 사유가 기재돼 있는지)
- 프로젝트 테스트 명령 통과
- PR 성격에 따른 추가 항목

체크리스트가 통과되지 않으면 구현 종료를 보고하지 않는다.

---

## 5. stub 커밋

stub 파일 작성이 끝나면, 모든 stub을 하나의 커밋으로 묶는다.

- 커밋 메시지 예: `stub: pr{N} 초기 골조` (PR 번호 명시)
- 이 커밋은 다음 단계의 작업 기반이 되며, 구현이 끝나면 base 위에서 제거된다 (다음 단계의 「커밋 재정렬」 참조)
- stub 파일만 담는다 — 잔존 md(`/plan/pr{N}/` 하위)는 별도 커밋. 두 종류를 한 커밋에 섞지 않는다 (글로벌 규칙 「커밋 단위」)
- stub 커밋이 lint·tsc·prettier·테스트 명령을 통과하는지 확인 후 커밋한다

---

## 6. 산출물 리뷰

파생이 끝나면, 리뷰어 팀 에이전트를 spawn하여 산출물을 리뷰한다. [CRITICAL] [team-agent](../../../contexts/team-agent.md)의 규칙을 따른다. 팀 에이전트를 사용하는 이유: 컨텍스트가 유지되어 반복 읽기 비용이 줄고, 다라운드 리뷰가 가능하다.

```
Lead (메인 세션) — 리뷰 결과 종합 + 사용자 보고
└── Reviewer — 산출물 전체 리뷰
```

### 컨벤션 대조
- 각 산출물에 적힌 내용 기반으로 관련 코딩 컨벤션을 찾아 대조한다 (컴포넌트 설계가 있으면 컴포넌트 컨벤션, 테스트 계획이 있으면 테스트 컨벤션)
- **`overview.md` 「컨벤션·컨텍스트」 섹션에 컨벤션 경로가 통합 명시되어 있는지** 확인한다
- 프로젝트 유형(회사/개인)에 맞는 경로만 포함되었는지 확인한다
- stub 파일이 lint·tsc·prettier를 통과하는지 확인 (코드라서 가능)
- stub 파일의 컨벤션 위반 (네이밍, 파일 구조, import 순서 등)을 reviewer가 직접 검증
- **step-4 자체의 stub 작성 룰(위 「4. stub 파일 작성 룰」 섹션) 준수 여부도 직접 점검** — 특히 lint가 잡지 못하는 항목:
  - `.module.scss`: step-4에서 결정된 토큰 매핑(markup.md)이 raw px·hex 대신 디자인 토큰 변수(`var(--...)`, `utils.map-safe-get(tokens.$variables, ...)`)로 적혀 있는지
  - hook stub: 결정된 시그니처·반환 shape이 코드로 적혀 있고 미정 본문만 `[stub]` 메모/`throw new Error('not implemented')`인지
  - `.tsx`: 조건부 렌더링의 placeholder 변수(`const isLoading = false; // [stub]: logic`) 패턴 준수

### 설계 타당성 역추적
- overview.md(Step 3)와 decisions.md의 기술 결정을 기준으로, 파생 산출물(stub 코드 + 잔존 md)이 해당 결정을 충실히 반영하는지 검증한다
- 결정된 설계 방향과 모순되는 구현 방침·stub 코드 구조가 없는지 확인한다

### 산출물 간 정합성
- stub `.tsx`의 props 타입을 `.module.scss`/hook stub이 일관되게 소비하는지 대조한다
- hook stub의 API 응답 placeholder가 호출자 타입과 일치하는지 확인한다
- `it.todo` 자연어가 logic stub의 에러/엣지 시나리오를 커버하는지 확인한다
- **모든 `it.todo`가 implementation.md의 어느 커밋에서 다뤄지는지** 대조한다. 누락 시 추가하거나 의도적 제외 사유를 명시한다
- implementation.md의 각 컴포넌트/모듈 커밋에 해당 테스트가 포함되어 있는지 확인한다. 테스트를 별도 커밋으로 분리하지 않고 구현 커밋에 함께 포함시킨다

### 채용과제 관점 (채용과제인 경우에만)
- 대기업 채용과제 평가자의 시선으로 산출물을 검토한다
- 이 계획대로 구현했을 때 감점 요인이 될 만한 부분을 지적한다
- 가점 요인이나 차별화 포인트가 될 수 있는 부분을 제안한다 (과잉 설계가 아닌 선에서)

### 자유 리뷰
- 위 체크리스트에 해당하지 않더라도, 리뷰어 판단으로 문제가 있다고 보이는 부분을 자유롭게 지적한다

모순, 누락, 컨벤션 위반, 정합성 불일치, 감점 요인, 차별화 제안이 있으면 사용자에게 보고한다

---

## 7. 종료 게이트

산출물 리뷰와 별개로, 이 step 종료 직전에 직접 게이트를 수행한다 (리뷰 결과와 무관, 매번 수행).

절차:
- stub `*.test.tsx`의 모든 `it.todo` 항목을 추출한다
- 각 항목이 implementation.md 어느 커밋의 테스트 코드 계획과 매칭되는지 점검한다
- 매칭 안 된 항목은 "테스트 누락 또는 면제 사유 없음"으로 분류한다
- 면제 사유는 MP `docs/patterns/testing/WhatToTest.md` 화이트리스트 카테고리 매칭 + 사유 명시여야 인정한다
- 매칭률 100% 또는 면제 사유 100% 기재되지 않으면 이 step을 종료하지 않는다

게이트 결과(매칭/누락/면제 분류)는 「보고 내용」에 포함한다.

---

## 보고 내용

- 파생된 산출물 핵심 요약
- 산출물 리뷰 결과
- 종료 게이트 결과 (매칭/누락/면제 분류)

---

## 세션 회고

이 세션의 마지막 step이다. 보고 후:

- 이 세션에서 기술 결정 과정에서 반복된 패턴이나 컨벤션 누락이 있었으면 가이드 업데이트를 제안한다.
