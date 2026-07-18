# 커밋 컨벤션

워크플로우 단계별 커밋 메시지 양식 + `[PR{N}]` 접두사 라이프사이클 + history rewriting 안전 절차 단일 출처.

프로젝트의 commitlint(`type(scope): subject`, scope-enum, subject 한글 필수 등) 위에 얹는 워크플로우 추가 룰만 본 컨벤션이 정의한다.

**commitlint 도입 책임**: 채용은 PR1 정식 구축 단계에서 도입한다 (foundation.md 「PR1 정식 구축 항목」 참조). 실무·개인은 프로젝트 셋업 초기에 이미 깔려있는 것이 전제 — 신규 프로젝트면 첫 PR에 포함한다.

## 커밋 메시지 라이프사이클

| 시점 | 양식 |
|---|---|
| stub 커밋 (PR 골조 생성) | `chore(<scope>): [PR{N}] 초기 골조 stub` |
| 잔존 md 커밋 (`/plan/pr{N}/` 산출물) | `docs(<scope>): [PR{N}] <산출물 요약>` |
| IMPL·리뷰 수정 커밋 | `feat(<scope>): [PR{N}] <슬라이스 메시지>` |
| 1차 정리 (각 PR step-6.5, 슬라이스별 재정렬) | `[PR{N}]` 접두사 유지, 슬라이스 단위로 묶음 |
| 2차 정리 (FINALIZE, 스택 전역 1회) | `[PR{N}]` 접두사 제거(strip), 슬라이스·도메인 기준 재작성 |

- `<scope>`는 프로젝트 commitlint scope-enum에 따라 결정
- PR 번호는 항상 subject 안 대괄호 접두사로 표기 (type/scope 자리 아님)

## stub 커밋

- PR 골조 모든 stub 파일을 하나의 커밋으로 묶음
- 양식: `chore(<scope>): [PR{N}] 초기 골조 stub`
- stub 파일만 담는다. md 산출물(`/plan/pr{N}/` 하위)은 아래 「잔존 md 커밋」 별도 분리

## 잔존 md 커밋

- `/plan/pr{N}/` 하위 산출물(decisions.md·reference.md·markup.md·implementation.md·overview.md 등) 작성·갱신을 묶는 커밋
- 양식: `docs(<scope>): [PR{N}] <산출물 요약>` (예: `docs(plan): [PR3] decisions·reference·implementation 초기 작성`)
- stub 파일과 같은 커밋에 섞지 않는다 (글로벌 규칙 「커밋 단위」). 한 step에서 여러 md를 함께 만들었으면 한 docs 커밋으로 묶어도 OK

## `[PR{N}]` 접두사

- 부여 시점: stub 이후 모든 IMPL·리뷰 수정 커밋
- 보존 기간: 1차 정리까지
- 제거 시점: FINALIZE의 2차 정리(strip) — 스택 전체 IMPL 완료 후 1회 ([conventions/session/finalize.md](session/finalize.md))

대괄호로 통일하는 이유: strip에서 일괄 제거(grep·sed)가 쉽다.

## 슬라이스 분할 정리 예시

```
git commit -m "feat(<scope>): [PR{N}] <슬라이스 1 메시지>"
git commit -m "feat(<scope>): [PR{N}] <슬라이스 2 메시지>"
```

## 머지 후 수정은 원 커밋에 폴드

머지(또는 2차 정리) 후 리뷰·수정이 발생해 히스토리를 다시 쌓는 경우, 수정분을 후속 커밋으로 남기지 않고 **해당 원 커밋에 폴드**한다. 기준은 "처음부터 그렇게 작성한 히스토리" — 사용자가 재스택을 지시하면 폴더 구조·코드 내용·카피까지 전부 이 기준으로 재구성한다.

**before** — 구조만 고치고 리뷰 수정을 후속 커밋으로 잔존:

```
feat(examples): 제출 생명주기 데모 + 도착 페이지
...
refactor(examples): [리뷰 반영] 데모 네이밍·카피·주석 정리
fix(examples): 머무름 데모 reset 버그 수정
```

**after** — 리뷰 수정분을 원 커밋에 폴드, 후속 커밋 없음:

```
feat(examples): 제출 생명주기 데모 + 도착 페이지   ← 네이밍·버그 수정 내장
```

## 커밋 메시지 톤 — 외부 독자 친화

커밋은 외부 독자(채용담당자·리뷰어·팀원)가 읽는다. 작업 중 섞인 캐주얼·은어·비속어를 정중·명확한 기술 문서 톤으로 통일한다.

- 은어·감탄사·비속어("존나", "촤르륵", "죽음", "그짓" 등) → 중립 기술 표현으로 치환하거나 삭제
- 무엇을·왜 바꿨는지가 드러나는 명확한 서술로. 감정·구어체는 걷어낸다
- **모드 공통** — 실무·개인도 리뷰어·팀원이 커밋을 본다. 채용은 강도만 더한다(은어 0건 목표)
- 최종 스캔 시점: FINALIZE 2차 정리(strip/replace와 함께 수행). 커밋 메시지뿐 아니라 `project.md` 등 외부 노출 가능 메모도 함께 스캔한다

## 스택 모델 전제

큰 작업은 여러 PR로 쪼개고 **각 PR 브랜치는 앞 PR 브랜치 위에 얹는다(스택)** — main에서 각자 뻗지 않는다 (base 결정은 [../steps/step-4.md](../steps/step-4.md) 「사전 준비」). 구현 페이즈는 머지 없이 도미노로 진행하므로, 종료 페이즈(FINALIZE) 진입 시점엔 스택의 어느 PR도 아직 머지되지 않았다. 아래 strip(접두사 일괄 제거)·replace(오배치 재배치)가 성립하는 근거가 이 미머지 스택 전제다.

## PR 간 시간순 섞임 vs 오배치

두 현상을 구분한다 — 처리가 정반대다.

- **시간순 섞임 (소속은 맞음)**: 커밋이 원래 자기 PR에 있는데 시간 순서만 다른 PR 커밋과 뒤섞임. **재배열하지 않는다** — 2차 정리(strip)로 `[PR{N}]` 접두사를 제거하고 나면 PR 단위 식별 가치가 사라지므로, 시간순 재배열은 순이익 없는 추가 history rewrite 부담이다.
- **오배치 (소속이 틀림)**: "PR4 브랜치에 있지만 실은 PR2 작업인 커밋"처럼 커밋이 잘못된 PR에 얹혀 있음. 원래 PR로 **재배치(replace)** 한다 — 이건 소속을 바로잡는 조작이라 위 "재배열 금지"의 예외가 아니라 별개 사안이다.

### replace 절차 (오배치 재배치)

FINALIZE에서 1회 수행한다 ([conventions/session/finalize.md](session/finalize.md) 「replace」). 스택이라 대상 PR(상류)에 커밋을 옮기면 하류 PR 브랜치들을 연쇄 rebase해야 한다(다중 브랜치 rewrite). 스택이 다 완성돼야 대상 PR이 확정되므로 종료 페이즈 1회 조작이다. 「history rewriting 안전 절차」의 백업 브랜치를 대상·하류 브랜치마다 적용한다.

### strip 대상 경계 — 조기 개별 머지분 제외

strip "전 커밋 일괄 제거"의 대상은 **미머지 스택**이다. 앞 PR에 독립인 PR을 스택 완성 전에 개별 조기 머지하는 것(문서 기본 흐름 밖 1% — 사용자 수동)은 FINALIZE 일괄 strip/replace에서 빠진다. 조기 머지분은 머지 직전 **그 PR만 수동 strip** + (스택 상류 섞임 방지) base retarget 또는 상류 선머지로 처리한다.

---

## history rewriting 안전 절차

다음 작업 직전에 적용한다:

- stub 커밋 drop + 슬라이스별 재정렬
- 커밋 메시지 재작성 (`[PR{N}]` 접두사 제거 등)
- rebase·soft reset으로 커밋 history를 다시 쓰는 모든 작업

### 백업 브랜치 [CRITICAL]

history rewriting 시작 전 반드시 백업 브랜치를 뜬다.

```
git branch backup/<현재브랜치>-<YYYYMMDD-HHmm>
```

백업 없이 history rewriting을 시작하지 않는다. 사고 시 다음 명령으로 즉시 복구:

```
git reset --hard backup/<현재브랜치>-<YYYYMMDD-HHmm>
```

**스택 전역(FINALIZE) 확장**: replace는 대상 PR + 그 하류 PR 브랜치를 모두 재작성하므로, **재작성 대상 브랜치마다** 백업을 뜬다. 한 브랜치만 백업하고 연쇄 rebase에 들어가지 않는다.

### force-push 요청 보고 양식

재작성 완료 후 사용자에게 force-push 요청. 다음을 보고에 포함:

- 백업 브랜치 이름
- 재정렬 후 커밋 목록 (`git log` 결과)
