# 커밋 컨벤션

워크플로우 단계별 커밋 메시지 양식 + `[PR{N}]` 접두사 라이프사이클 + history rewriting 안전 절차 단일 출처.

프로젝트의 commitlint(`type(scope): subject`, scope-enum, subject 한글 필수 등) 위에 얹는 워크플로우 추가 룰만 본 컨벤션이 정의한다.

## 커밋 메시지 라이프사이클

| 시점 | 양식 |
|---|---|
| stub 커밋 (PR 골조 생성) | `chore(<scope>): [PR{N}] 초기 골조 stub` |
| 잔존 md 커밋 (`/plan/pr{N}/` 산출물) | `docs(<scope>): [PR{N}] <산출물 요약>` |
| IMPL·리뷰 수정 커밋 | `feat(<scope>): [PR{N}] <슬라이스 메시지>` |
| 1차 정리 (슬라이스별 재정렬) | `[PR{N}]` 접두사 유지, 슬라이스 단위로 묶음 |
| 2차 정리 (마지막 PR 한정) | `[PR{N}]` 접두사 제거, 슬라이스·도메인 기준 재작성 |

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
- 제거 시점: 마지막 PR의 2차 정리

대괄호로 통일하는 이유: 2차 정리에서 일괄 제거(grep·sed)가 쉽다.

## 슬라이스 분할 정리 예시

```
git commit -m "feat(<scope>): [PR{N}] <슬라이스 1 메시지>"
git commit -m "feat(<scope>): [PR{N}] <슬라이스 2 메시지>"
```

## PR 간 시간순 섞임 수용

2차 정리에서 `[PR{N}]` 접두사를 제거하고 나면 PR 단위 식별 가치는 사라진다. rebase로 재배열하지 않는다 — 재배열은 추가 history rewrite 부담.

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

### force-push 요청 보고 양식

재작성 완료 후 사용자에게 force-push 요청. 다음을 보고에 포함:

- 백업 브랜치 이름
- 재정렬 후 커밋 목록 (`git log` 결과)
