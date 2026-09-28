# /plan/ 폴더 구조

## 폴더 트리

```
/plan/
  background/
    persistent/
      공고.md           ← BG의 requirement 「자료 받기」 산출 (채용만)
      메일.md           ← (채용만)
      과제요구사항.md   ← (채용만)
    retained/
      folder-structure.md ← FOUNDATION PR 산출 (채용만)
      tech-constraints.md ← BG의 requirement 산출
      conventions-index.md ← requirement 「자료 받기」 수집 (레포 미확보 시 레포 확보 시점 세션이 생성)
      figma-url.md      ← requirement 「자료 받기」 수집 (figma 쓰는 모드)
      figma/            ← requirement 「자료 받기」 수집 캡처 이미지 (figma 쓰는 모드). `[meaningful-name].[이미지확장자]` 단위
      mockup/           ← requirement 「자료 받기」 수집 (개인 모드)
      spec.md           ← requirement 「자료 받기」 수집 (개인 모드, 선택 — 화면에 안 담기는 동작을 저자가 미리 아는 경우)
      design-root.md    ← requirement 「자료 받기」 산출. 양식·규칙은 [conventions/artifact/design-root.md] 참조
      cross-analysis.md ← requirement의 requirement-review (recruitment) 산출물 (채용 한정). 추론한 평가 기준만 담는다
      service-analysis.md ← requirement의 requirement-review (recruitment) 산출물 (채용 한정). [requirement-review/recruitment/service-analysis.md] 참조
    consumable/
      todo.md        ← requirement의 recruitment 분석 중 직접 기록 시작(없으면 이 시점에 생성). requirement 진행 중 PR이 확정될 때마다 그 PR 섹션을 append (일괄 분할 없음 — [conventions/pr-split.md]). PR별 섹션은 각 PR의 plan에서 overview로 이관 (절 단위 큐 — 소비된 절은 헤딩·「의존」이 남는다, 아래 「라이프사이클 규칙」). 확정 전 TODO는 미분류 절에 쌓인다
      global.md         ← requirement의 requirement-review (planning) 산출물. realize-plan 「잔여 산출물 소비」에서 소비. 본문 양식은 [requirement-review/planning/output-template.md] 참조
      layout.md         ← requirement의 requirement-review (planning) 산출물 (조건부 — 여러 페이지가 공유하는 레이아웃이 식별된 경우만)
      page-{페이지명}.md ← 페이지명은 영문 슬러그(소문자 + 하이픈). requirement 페이지별 분석 결과의 **PR 확정 전** 자리. 그 페이지를 담을 PR이 확정되면 `pr{N}/consumable/page.md`로 이동
      figma-component-mapping.md ← MARKUP Lead 산출물 (실무 한정). 양식은 [template/figma-component-mapping.md], 생성 절차는 [conventions/figma-component-mapping-guide.md] 참조
      design-system.md  ← recruitment 4단계 산출물 (채용 한정). COMPONENTS 종류 PR이 소비 ([conventions/pr-types/components.md])
  pr{N}/
    persistent/
      decisions.md      ← plan 산출물 + verify 「decisions.md 최신화」 갱신
      reference.md      ← plan·realize-plan 누적
      implementation.md ← realize-plan 산출물. 소비처는 [conventions/artifact/implementation-spec.md] 참조
      overview.md       ← plan 산출물
    retained/           ← verify 「1회차 커밋 정리·재정렬」 진입 시 일괄 폐기
      markup.md         ← realize-plan 산출물 (조건부 — UI 컴포넌트 PR만, 개인 모드 제외: figma 없음). **Figma 원본 링크 인덱스(컴포넌트 종류별 × 상태별, 사용자 입력)** + 토큰 매핑표·매칭표. 마지막 소비자는 verify 「Figma 시각 대조」 (figma 충실도 검증 자체는 MARKUP 담당)
    consumable/
      page.md           ← requirement의 requirement-review 페이지별 분석 결과 (PR 확정 시 `background/consumable/page-{페이지명}.md`에서 이동). realize-plan 「잔여 산출물 소비」에서 분배·소비
      review.md         ← verify 리뷰 결과. verify 자체 소비
      user-test-cases.md ← verify 「사용자 동작 테스트」. WRITING_REFINER가 PR 본문의 동작 설명 재료로 재활용
      pr-body.md        ← WRITING_IDEATOR가 초안 저작(잠정) → WRITING_REFINER가 확정·PR 본문 복사·게시. 게시 후 스윕 대상 — realize-plan 「잔여 산출물 소비」 스윕은 pr-body를 다루지 않는다(REFINER 전용)
```

realize-plan의 stub 코드는 `/plan/` 하위가 아닌 **소스 디렉토리(`src/...`) 하위**에 실제 파일로 생성된다.

## 라이프사이클 규칙

- **`persistent/`** — 소비 후에도 안 지움, PR·프로젝트 종료 후에도 안 지움.
- **`retained/`** — 소비 후에도 안 지움, 컨텍스트(BG는 BG 라이프타임, PR은 PR 라이프타임) 종료 시 폐기. 마지막 소비자가 보고 나면 정리.
- **`consumable/`** — 소비 시 즉시 폐기. 절 단위 큐 모델 — 사용처가 소비한 절을 삭제, 모든 절이 비면 파일 삭제.
  - **`todo.md`는 예외** — PR 인덱스를 겸한다. PR 절을 소비하면 `## PR N. 이름` 헤딩과 `### 의존`은 남기고 나머지 본문만 지운 뒤, 헤딩 밑에 `소비됨: pr{N}/persistent/overview.md`를 단다. 모든 절이 비어도 파일은 지우지 않는다 — FINALIZE 잔존 점검에서만 지운다.

`persistent/`·`retained/` 하위는 WRITING_REFINER 「산출물 정리」의 정리 대상이 아니다 (REFINER는 consumable만 소비·정리).

## consumable/ 산출물 자가 정리 안내문

`consumable/` 하위 산출물은 상단에 자가 정리 안내문을 박는다 — `node {{skill_dir}}/scripts/plan-folder.mjs notice <파일>`.

`node {{skill_dir}}/scripts/plan-folder.mjs left /plan`이 남은 consumable과 안내문 누락분을 함께 낸다. 남은 것이 소비 전인지 소비 후 안 지운 것인지는 사람이 가른다.

## 소비→삭제 메커니즘 SSOT — 소비처 step은 "소비"만 선언

소비→삭제의 **메커니즘**(삭제 여부·granularity=절 단위·제목 보존 안 함·파일 삭제 조건)은 위 「라이프사이클 규칙」 + 「consumable/ 산출물 자가 정리 안내문」 두 곳에만 산다. 각 소비처 step은 **"소비" 선언만** 한다 — 삭제·절 단위·제목 보존 같은 동작 스펙을 재진술하지 않는다.

- 소비한 절은 제목·포인터도 남기지 않는다 (`todo.md`의 PR 절은 위 예외).

## 피그마 URL·캡처 캐싱

사용자가 피그마 URL을 제공하면, 그 URL이 어느 페이지·프레임·컴포넌트를 가리키는지 확인한 뒤(함께 말하지 않았으면 묻는다) `plan/background/retained/figma-url.md`에 누적 기록한다.

- 같은 대상의 피그마가 다시 필요할 때는 figma-url.md에서 조회 — 사용자에게 URL을 재요청하지 않는다

캡처 이미지는 `plan/background/retained/figma/[meaningful-name].[이미지확장자]`에 저장 ([requirement 「자료 받기」](../steps/requirement.md#step-11-자료-받기)에서 수집). 어느 단위 캡처든 같은 폴더에.

requirement(전체 페이지 URL) ~ implement(컴포넌트·프레임 URL) 어느 시점에 받든 동일하게 적용한다.
