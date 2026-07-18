# 코드 주석 컨벤션

워크플로우에서 stub·구현 코드의 주석 양식·라이프사이클·종료 게이트 단일 출처.

## 적용 대상

| 프로젝트 종류 | 상단 출처 블록 | 인라인 마커 |
|---|---|---|
| 회사 프로젝트 | 필수 | 필수 |
| 개인 레포 | 미적용 | 필수 |
| 채용과제 | 미적용 | 필수 |

### [CRITICAL] 적용 조건 해석

위 표 「프로젝트 종류」만으로 판단. 자체 변수 도입 금지:

- "컨벤션 문서 부재 → 출처 명시 가치 낮음" — **금지**. ESLint·prettier·기존 코드 패턴이 진실 원천이며 `[Reference]` 인용 가능
- "PR 크기 작음·위반 risk 낮음" — **금지**. 비용·risk 판단은 사용자 권한

명시 변수로 결정 안 되면 사용자 확인.

## 상단 출처 블록 (회사 프로젝트 한정)

신규 stub 파일 상단에 첨부.

```
/* TODO [USER_REVIEW]

[Convention]
설명 — 경로:라인번호

[Reference]
설명 — 경로:라인번호

*/
```

- `/* TODO [USER_REVIEW]`로 시작 (grep 가능 마커)
- `경로:라인번호`는 라인 끝
- `[Convention]`: 컨벤션 문서 경로 + 라인 범위
- `[Reference]`: 컨벤션에 없을 때만, 기존 코드 평행 사례 경로
- 둘 다 해당하면 둘 다 (Convention 우선)
- 사용자가 PLAN 종료 직전 검토 후 블록 삭제 또는 IMPL 진입 승인

### 상단 vs 인라인 분리 기준

상단 블록: 파일 경로·폴더 구조·파일명 컨벤션, 파일 전체 평행 사례

인라인 마커: 함수/변수 위 동작 설명, 호출·분기 패턴, placeholder 의도, scss 토큰 매핑

## 본문 인라인 마커

| 마커 | 처리자 | 수명 |
|---|---|---|
| `// TODO [USER_REVIEW]:` | 사용자(검토) | PLAN 승인 후 삭제 |
| `// TODO [AI_IMPL]:` | AI/개발자(구체화) | IMPL 시 코드로 채우며 삭제 |

대상:

- `TODO [USER_REVIEW]`: 사용자가 정합 검토할 컨벤션 출처·placeholder 의도·"이 결정 맞나요?" 메모
- `TODO [AI_IMPL]`: IMPL이 채울 placeholder·미정 값 (scss 토큰, 미정 분기, 상수)

### 출처 명시 의무 — `TODO [AI_IMPL]`

마커는 출처를 반드시 동반. 시점 단독 표현 금지.

- ❌ `// TODO [AI_IMPL]: IMPL 시점 토큰`
- ✓ `// TODO [AI_IMPL]: 설명 — plan/{prN}/markup.md "{절명}"` 또는 `docs/...:{line}` 또는 `_fsd/.../{file}:{line}`

### 출처 인용은 영속 파일만

- ✓ `docs/conventions/*`, `docs/ARCHITECTURE.md`, `_fsd/.../*`, `plan/{prN}/persistent/*`
- ❌ `plan/{prN}/consumable/*`, `plan/{prN}/retained/*`, 분배 후 삭제될 1차 입력 (사용자 작성 `page.md`, BG AI 산출물)

1차 입력 인용 필요 시 분배된 영속 파일로 우회. 예: `page.md:30` → stub 코드 한글 요약 또는 `decisions.md` 결정 항목.

### 양식 예시

```ts
/* TODO [USER_REVIEW]

[Convention]
파일 경로/폴더/네이밍 — docs/conventions/...:line

[Reference]
파일 전체 평행 사례 — _fsd/.../FileName.tsx:line-range

*/

import { ... } from '...';

// TODO [USER_REVIEW]: 호출 패턴 컨벤션 — docs/conventions/...:line
const result = await someCall();

// TODO [AI_IMPL]: gap 토큰 — markup.md "X.module.scss"
```

## PR 이연 마커 — 코드 안 금지

본 PR 아닌 다른 PR에서 처리할 작업은 코드 안 TODO 금지.

- ❌ `// TODO: PR4에서 X 추가`, `// TODO [PR4]: ...`
- ✓ `/plan/background/consumable/project.md` 해당 PR 섹션에 항목 추가

본 PR 외부 의존성(백엔드 합의·디자인 검수·인프라 등):

- ✓ `plan/{prN}/consumable/overview.md` 「열려있는 질문」

코드 안 `TODO`는 본 PR 안 모두 해소. IMPL 종료 시 0건.

## file-level(blanket) eslint-disable 라이프사이클

파일 최상단에 `/* eslint-disable -- ... */` 같은 file-level(blanket) disable 블록을 **새로 다는** 경우(정적분석 도입류 PR에서 미리팩토링 코드를 격리할 때), 격리하는 각 파일을 그 자리에서 `/plan/background/consumable/project.md`의 **담당 PR 섹션에 "PR{N}에서 disable 제거 + 규칙 준수 수정" TODO로 등록**한다. 배정의 단일 출처(SSOT) — disable을 만드는 사람이 곧 어느 PR이 걷어낼지 함께 적는다.

- 격리 마커에 **추적 가능한 고정 문구**를 남긴다 (예: `/* eslint-disable -- 미리팩토링 코드(정적 분석 도입 PR). 후속 리팩토링 PR에서 규칙 준수 후 이 disable 제거 */`) — step-6 백스톱이 이 문구로 고아를 탐지한다.
- 등록된 항목의 집행은 기존 step-3 「project.md 현재 PR 절 소비」가 담당한다 (새 게이트 없음).
- 생성 시 등록을 빠뜨려 어느 PR에도 안 걸린 고아는 step-6 백스톱(step-6.md 「미배정 blanket eslint-disable 고아 점검」)이 잡는다.

인라인 disable(`// eslint-disable-next-line`)은 본 소절 대상이 아니다 — file-level blanket 블록만.

## 라이프사이클

### 생성 (신규 stub 작성 시)

- 상단 블록(회사 프로젝트) + 인라인 마커 적용
- **기존 stub 파일 갱신 시 재추가 금지** — 사용자가 정리한 TODO 주석 보존. Edit 우선, Write로 갱신 시 보존 의식
- `system-reminder` "modified, intentional, don't revert" 안내된 파일은 재추가 절대 금지

### IMPL 시작 게이트 (구현 진입 시)

```bash
grep -rn "TODO \[USER_REVIEW\]" _fsd/<slice>/ src/<scope>/
```

- 0건 → IMPL 진행
- 1건 이상 → IMPL 중단, 잔존 라인 사용자 보고
- 상단 블록 `/* TODO [USER_REVIEW] ... */`도 같은 검사 대상

### 처리 (구현 중)

| 만난 마커 | 처리 |
|---|---|
| `// TODO [USER_REVIEW]:` 잔존 | 시작 게이트에서 차단됐어야 함. 만나면 사용자 보고 |
| `// TODO [AI_IMPL]:` | 코드로 채우며 같은 커밋에서 즉시 삭제 |
| `/* TODO [USER_REVIEW] ... */` 상단 블록 | 출처 확인 완료 후 블록 전체 삭제 |

- 미해결 `TODO [AI_IMPL]` 잔존 채 구현 종료 X
- 별도 정리 커밋 X (해결 커밋에 주석 삭제 함께)

### 종료 게이트 (구현 마무리)

```bash
grep -rn "TODO" _fsd/<slice>/ src/<scope>/
```

`TODO [USER_REVIEW]`·`TODO [AI_IMPL]`·상단 블록·기타 `// TODO:` 형태 모두 0건. 잔존 시 종료 불가.

## 판단 경계 사례

| 사례 | 분류 |
|---|---|
| 헬퍼 함수 동작 설명, 컨벤션 출처 인라인 메모, placeholder 의도 | `TODO [USER_REVIEW]` |
| scss 토큰 매핑, 미구현 컴포넌트·기능, 본 PR 안 끝나는 디자인/백엔드 후속 작업 | `TODO [AI_IMPL]` |
| 본 PR 외부 의존성 (디자인 검수 별도 일정, 백엔드 합의 지연 등) | `plan/{prN}/consumable/overview.md` 「열려있는 질문」 |
| 다른 PR로 이연 (PR4에서 X 추가 등) | `/plan/background/consumable/project.md` 해당 PR 섹션 |

판단 기준: 본 PR IMPL 처리 → 코드 안 TODO. 외부 의존성 → overview.md. 다른 PR 이연 → project.md.

## 제외 대상

본 컨벤션 인라인 마커 룰 대상 아님:

- 파일 최상단 `/* TODO [USER_REVIEW] ... */` 블록 (위 「상단 출처 블록」 별도 룰)
- 코드 카테고리 마커 (`// 404`, `// 400` 등)
- 컨벤션상 명시된 JSDoc (`@param`, `@returns`)

원칙: stub 단계 본문 주석 최소화. 글로벌 룰 "Default to writing no comments" 우선. placeholder 의도가 의도적으로 비명확한 경우만 마커 사용.
