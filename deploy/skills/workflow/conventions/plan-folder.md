# /plan/ 폴더 구조

## 폴더 트리

```
/plan/
  background/
    persistent/
      공고.md           ← BG의 requirement 「자료 받기」 산출 (채용만)
      메일.md           ← (채용만)
      과제요구사항.md   ← (채용만)
      prs.json          ← PR 진행 상태(번호·이름·종류·의존·단계·브랜치·base). `scripts/steps.mjs`가 쓰고 읽는다 — 손으로 고치지 않고 `pr add`·`pr set`·`next … --pr`으로
    retained/
      folder-structure.md ← FOUNDATION PR 산출 (채용만)
      tech-constraints.md ← 기술 제약·확정 스택·디자인시스템 원본 레포 경로. 쓰는 곳은 [steps/requirement.md] 「자료 받기」·[requirement-review/recruitment/step.md] 「산출물」·[steps/markup/figma.md] 「재료」
      conventions-index.md ← requirement 「자료 받기」 수집. 양식·수집은 [conventions/artifact/conventions-index.md] 참조
      figma-url.md      ← requirement 「자료 받기」 수집 (figma 쓰는 모드)
      figma/            ← requirement 「자료 받기」 수집 캡처 이미지 (figma 쓰는 모드). `[meaningful-name].[이미지확장자]` 단위
      mockup/           ← requirement 「자료 받기」 수집 (개인 모드)
      spec.md           ← requirement 「자료 받기」 수집 (개인 모드, 선택)
      component-list.md ← MARKUP 「공통 컴포넌트 확정」 산출. 전 컴포넌트 목록(공통 여부·범용/도메인). MARKUP 「마크업 구현·검사」의 재료, 공통 컴포넌트를 받는 PR의 plan이 소비
      code-target.md    ← requirement 「자료 받기」 수집 (코드 대용일 때만). 리뷰 대상 코드 경로
      cross-analysis.md ← requirement-review 채용과제 분석 step 산출물 (채용 한정). 추론한 평가 기준만 담는다
      service-analysis.md ← requirement-review 채용과제 분석 step 산출물 (채용 한정). [requirement-review/recruitment/service-analysis.md] 참조
      domain-analysis.md ← requirement-review 채용과제 분석 step 산출물 (채용 한정). 담는 것은 [requirement-review/recruitment/step.md] 「산출물」 참조
      figma-component-mapping.md ← MARKUP Lead 산출물 (실무 한정). MARKUP과, `markup.md`를 쓰는 각 PR realize-plan이 함께 읽는다. 양식은 [template/figma-component-mapping.md], 생성 절차는 [conventions/figma-component-mapping-guide.md] 참조
    consumable/
      todo.md        ← requirement-review 채용과제 분석 중 직접 기록 시작(없으면 이 시점에 생성). requirement 진행 중 PR이 확정될 때마다 그 PR 섹션을 append (일괄 분할 없음 — [conventions/pr-split.md]). PR별 섹션은 각 PR의 plan에서 overview로 이관(절 단위 큐). 확정 전 항목은 미분류 절에 쌓인다
      global.md         ← requirement-review 페이지 리뷰 step 산출물. realize-plan 「잔여 산출물 소비」에서 소비. 담을 내용은 [requirement-review/output-template.md] 참조
      layout.md         ← requirement-review 페이지 리뷰 「종합」 산출물 (조건부 — 여러 페이지가 공유하는 레이아웃이 식별된 경우만)
      page-{페이지명}.md ← 페이지명은 영문 슬러그(소문자 + 하이픈). requirement 페이지별 분석 결과의 **PR 확정 전** 자리. 그 페이지를 담을 PR이 확정되면 `pr{N}/consumable/page.md`로 이동
      design-system.md  ← requirement-review 채용과제 분석 step 「디자인 시스템 설계」 산출물 (채용 한정). COMPONENTS 종류 PR이 소비 ([conventions/pr-types/components.md])
  pr{N}/
    persistent/
      decisions.md      ← plan 산출물. 그 뒤로는 verify 「decisions.md 최신화」에서만 갱신
      reference.md      ← plan·realize-plan 누적
      overview.md       ← plan 산출물
    retained/           ← verify 「fixup 합치기」 진입 시 일괄 폐기
      implementation.md ← realize-plan 산출물. 이후 갱신 없음 — 마지막 소비는 verify 「Gap Analysis」. 소비처는 [conventions/artifact/implementation-spec.md] 참조
      markup.md         ← realize-plan 산출물 (조건부 — UI 컴포넌트 PR만, 개인 모드 제외). 담는 내용은 [conventions/artifact/markup-spec.md] 참조. 마지막 소비자는 verify 「Figma 시각 대조」 (figma 충실도 검증 자체는 MARKUP 담당)
    consumable/
      page.md           ← requirement의 requirement-review 페이지별 분석 결과 (PR 확정 시 `background/consumable/page-{페이지명}.md`에서 이동). realize-plan 「잔여 산출물 소비」에서 분배·소비
      user-test-cases.md ← verify 「동작 테스트」에서 AI가 돌리지 못해 사용자 몫으로 남긴 항목만 (조건부 — 남긴 항목이 없으면 만들지 않음). verify 자체 소비
```

realize-plan의 stub 코드는 `/plan/` 하위가 아닌 **소스 디렉토리(`src/...`) 하위**에 실제 파일로 생성된다.

## 라이프사이클 규칙

- **`persistent/`** — 소비 후에도 안 지움, PR·프로젝트 종료 후에도 안 지움.
- **`retained/`** — 소비 후에도 안 지움, 컨텍스트(BG는 BG 라이프타임, PR은 PR 라이프타임) 종료 시 폐기. 마지막 소비자가 보고 나면 정리.
- **`consumable/`** — 소비 시 즉시 폐기. 절 단위 큐 모델 — 사용처가 소비한 절을 제목·포인터째 삭제, 모든 절이 비면 파일 삭제.

## consumable/ 산출물 자가 정리 안내문

`consumable/` 하위 산출물은 상단에 자가 정리 안내문을 박는다 — `node {{skill_dir}}/scripts/plan-folder.mjs notice <파일>`.

`node {{skill_dir}}/scripts/plan-folder.mjs left /plan`이 남은 consumable과 안내문 누락분을 함께 낸다. 남은 것이 소비 전인지 소비 후 안 지운 것인지는 사람이 가른다.

## 소비→삭제 메커니즘 SSOT — 소비처 step은 "소비"만 선언

소비→삭제의 **메커니즘**(삭제 여부·granularity=절 단위·제목 보존 안 함·파일 삭제 조건)은 위 「라이프사이클 규칙」 + 「consumable/ 산출물 자가 정리 안내문」 두 곳에만 산다. 각 소비처 step은 **"소비" 선언만** 한다.

## 피그마 URL·캡처 캐싱

사용자가 피그마 URL을 제공하면, 그 URL이 어느 페이지·프레임·컴포넌트를 가리키는지 확인한 뒤(함께 말하지 않았으면 묻는다) `plan/background/retained/figma-url.md`에 누적 기록한다.

- 같은 대상의 피그마가 다시 필요할 때는 figma-url.md에서 조회한다

캡처 이미지는 `plan/background/retained/figma/[meaningful-name].[이미지확장자]`에 저장 (BG 「자료 받기」에서 수집). 어느 단위 캡처든 같은 폴더에.

requirement(전체 페이지 URL) ~ implement(컴포넌트·프레임 URL) 어느 시점에 받든 동일하게 적용한다.
