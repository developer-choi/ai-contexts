# Step 6: 최종 점검

> **이 단계의 목표: 구현 결과를 검증한다**

모든 기능 구현 및 커밋 완료 후, **PR 생성 직전** 코드 품질을 최종 점검하는 단계입니다.

---

## Step 6.0. overview.md 대조 검사

구현 결과(커밋)가 overview.md의 범위(목표, 기술 선택)를 빠짐없이 반영했는지 확인한다 (대조 절차는 SKILL.md 「자가 검토 필수」 일반 규칙).

- 누락된 항목이 있으면 사용자에게 보고

---

## Step 6.1. Gap Analysis 및 추가 커밋 검증

계획되지 않은 추가 커밋(버그 수정, 엣지 케이스 등)을 식별하고 검증:

- **커밋 로그 분석**: `git log`로 추가된 커밋 식별
- **추가 검증**: 계획에 없던 코드에 대한 테스트 케이스 확인
- **보고서 기재 기준**: 계획 대비 차이가 있을 때만 기재. 차이가 없으면 섹션 생략.

---

## 잔존 md 정리

리뷰 파이프라인(Step 6.2) 진입 전, Lead가 잔존 md(`markup.md`, `logic.md`, `implementation.md`) 중 코드에 1:1 반영된 내용을 제거한다. stub 파일은 이미 코드의 일부이므로 별도 정리 불필요. 판단·결정·방향을 담은 내용은 step-7에서 PR 본문에 녹인 뒤 정리하므로 이 단계에서는 유지한다.

잔존 md 정리는 별도 커밋으로 만든다 (소스코드 커밋에 섞지 않는다 — 글로벌 규칙 「커밋 단위」). `plan/`이 untracked 또는 `.gitignore` 정책인 프로젝트는 working tree만 변경되고 커밋은 발생하지 않는다.

---

## Step 6.2. 리뷰 파이프라인

Lead가 [coding-standards/map.md](../../../contexts/coding-standards/map.md)에서 관련 coding-standards를 선별하고, `/code-review`를 advanced 모드로 호출한다.

```
code-review(advanced) → 이슈 목록 → Implementer 수정 → code-review(advanced, 수정 diff만) → 반복 (0건까지)
```

- code-review에 전달하는 입력: PR diff, coding-standards 목록, 리뷰 모드(advanced)
- code-review가 이슈 목록을 반환하면, Implementer에게 한번에 전달
- 수정은 step-5의 Markup/Feature Implementer가 수행한다

---

## Step 6.3. 사용자 리뷰 대기

AI 리뷰(Step 6.2 code-review) + 모든 수정 완료 후, **사용자가 직접 코드 리뷰**한다. 이 시점까지 stub 커밋부터 IMPL/리뷰 수정 커밋이 그대로 보존되어 있어야 사용자가 stub→IMPL diff를 추적하며 리뷰 가능.

Lead는 사용자 리뷰 진입을 안내하고 대기한다:

- 현재 커밋 목록 (stub + IMPL + 리뷰 수정) 출력
- 사용자가 `git log`로 커밋별 변경 추적
- 사용자 리뷰 통과 시 Step 6.4로 진행

사용자가 추가 수정 요청하면 step-5의 Implementer가 처리 → 다시 Step 6.2 AI 리뷰 → Step 6.3 사용자 리뷰 반복.

---

## Step 6.4. 커밋 정리·재정렬

사용자 리뷰 통과 후 step-7(PR 본문 작성) 진입 전, stub 커밋을 drop하고 슬라이스별로 커밋을 재정렬한다.

### Step 6.4.1. 백업 브랜치 [CRITICAL]

정리 작업은 history rewriting + force-push가 동반되어 사고 시 복구가 어렵다. **시작 전 반드시 백업 브랜치를 뜬다.**

```
git branch backup/<현재브랜치>-<YYYYMMDD-HHmm>
```

백업 없이 정리 작업을 시작하지 않는다. 사고가 났을 때 `git reset --hard backup/...`로 즉시 복구할 수 있어야 한다.

### Step 6.4.2. 케이스 분기

stub 커밋이 어떤 상태인지에 따라 정리 방식이 갈린다.

#### Step 6.4.2-A. stub이 빈 껍데기인 정상 케이스

stub 파일에 `TODO [USER_REVIEW]` / `TODO [AI_IMPL]` 마커 + 빈 본문만 있는 경우. 슬라이스별 IMPL 커밋이 본문을 다 가짐.

```
git rebase -i <stub 직전 커밋>   # stub은 drop, 슬라이스별 IMPL + 리뷰 수정은 fixup으로 squash
```

비대화형 환경(claude code 등 git rebase -i 불가)에서는 아래 6.4.2-B 방식을 그대로 적용해도 결과 동일.

#### Step 6.4.2-B. stub이 본문을 안고 있는 케이스

step-4 단계에서 사용자가 stub을 검토 후 본문까지 채워 사실상 단일 IMPL 커밋이 된 경우. soft reset으로 풀어 슬라이스별로 재분할한다.

```
git reset --soft <stub 직전 커밋>     # stub부터 마지막 리뷰 수정 커밋까지 모든 변경 staged
git reset HEAD                        # 모두 unstage
git add <슬라이스 1 파일들>
git commit -m "[feat]: <슬라이스 1 메시지>"
git add <슬라이스 2 파일들>
git commit -m "[feat]: <슬라이스 2 메시지>"
...
```

stub만 만들고 구현에서 한 번도 건드리지 않은 파일(예: 계획 변경으로 사용 안 된 utility stub)은 add하지 않으면 자동으로 사라진다 — 의도된 정리 효과.

### Step 6.4.3. 사용자에게 force-push 요청 안내

재정렬 완료 후 사용자에게 force-push 요청. 백업 브랜치 이름·재정렬 후 커밋 목록을 보고에 포함.

---

## 산출물

결과를 `/plan/pr{N}/review.md`에 작성한다.

---

## 보고 내용

산출물 작성 후 사용자에게 다음을 요약하여 보고:

- Gap Analysis 결과 (계획 대비 추가/변경된 커밋이 있는 경우)
- code-review 결과: 발견된 Critical/Minor 이슈 요약
- 사용자 리뷰 통과 여부
- 커밋 정리·재정렬 결과 (백업 브랜치 이름 + 재정렬 후 커밋 목록)
- 수정 사항

---

## 산출물 정리

리뷰 파이프라인이 완료되고 모든 이슈가 수정 커밋에 반영된 것을 확인한 뒤, `/plan/pr{N}/review.md`를 삭제한다. 리뷰 결과는 코드에 반영된 중간 산출물이므로 더 이상 유지할 필요가 없다.

---

## 세션 회고

이 세션의 마지막 step이다. 보고 후:

- 이 세션에서 새로 정립한 코드 패턴이 있으면 베스트프랙티스맵 엔트리 추가를, 선호 패키지에 변동이 있으면 목록 수정을 제안한다.
