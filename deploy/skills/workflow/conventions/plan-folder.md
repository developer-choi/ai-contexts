# /plan/ 폴더 구조

## 폴더 트리

```
/plan/
  background/
    persistent/
      공고.md           ← BG.step-1.1 산출 (채용만)
      메일.md           ← (채용만)
      과제요구사항.md   ← (채용만)
      requirement-review-retrospect.md ← requirement-review/retrospect.md 산출물
    retained/
      folder-structure.md ← FOUNDATION 산출 (채용만)
      tech-constraints.md ← BG.step-1 산출
      conventions-index.md ← step-1.1 수집 (레포 미확보 시 레포 확보 시점 세션이 생성)
      figma-url.md      ← step-1.1 수집 (figma 쓰는 모드)
      figma/            ← step-1.1 수집 캡처 이미지 (figma 쓰는 모드). `[meaningful-name].[이미지확장자]` 단위
      mockup/           ← step-1.1 수집 (개인 모드)
      spec.md           ← step-1.1 수집 (개인 모드, 선택 — 화면에 안 담기는 동작을 저자가 미리 아는 경우)
      design-root.md    ← step-1.1 산출. 양식·규칙은 [conventions/artifact/design-root.md] 참조
      cross-analysis.md ← step-1 requirement-review (recruitment) 산출물 (채용 한정). 추론한 평가 기준만 담는다
      service-analysis.md ← step-1 requirement-review (recruitment) 산출물 (채용 한정). [requirement-review/recruitment/service-analysis.md] 참조
    consumable/
      project.md        ← step-1 recruitment 분석 중 직접 기록 시작(없으면 이 시점에 생성). step-1 진행 중 PR이 확정될 때마다 그 PR 섹션을 append (일괄 분할 없음 — [conventions/pr-split.md]). PR별 섹션은 각 PR의 step-3에서 overview로 이관 (절 단위 큐). 확정 전 TODO는 미분류 절에 쌓인다
      global.md         ← step-1 requirement-review (planning) 산출물. step-4 「잔여 산출물 소비」에서 소비. 본문 양식은 [requirement-review/planning/output-template.md] 참조
      layout.md         ← step-1 requirement-review (planning) 산출물 (조건부 — 여러 페이지가 공유하는 레이아웃이 식별된 경우만)
      page-{페이지명}.md ← 페이지명은 영문 슬러그(소문자 + 하이픈). step-1 페이지별 분석 결과의 **PR 확정 전** 자리. 그 페이지를 담을 PR이 확정되면 `pr{N}/consumable/page.md`로 이동
      figma-component-mapping.md ← step-5 Lead 산출물 (실무 한정). 양식은 [template/figma-component-mapping.md], 생성 절차는 [conventions/figma-component-mapping-guide.md] 참조
      design-system.md  ← recruitment 4단계 산출물 (채용 한정). step-3·step-4 PRESET_COMPONENTS 입력 재료
  pr{N}/
    persistent/
      decisions.md      ← step-3 산출물 + step-6.6 갱신
      reference.md      ← step-3·4 누적
      implementation.md ← step-4 산출물. 소비처는 [conventions/artifact/implementation-spec.md] 참조
      overview.md       ← step-3 산출물
    retained/           ← step-6.5(커밋 정리·재정렬) 진입 시 일괄 폐기
      markup.md         ← step-4 산출물 (조건부 — UI 컴포넌트 PR만, 개인 모드 제외: figma 없음). **Figma 원본 링크 인덱스(컴포넌트 종류별 × 상태별, 사용자 입력)** + 토큰 매핑표·매칭표. 마지막 소비자는 step-6.4.1 (figma 충실도 검증 자체는 MARKUP 담당)
    consumable/
      page.md           ← step-1 requirement-review 페이지별 분석 결과 (PR 확정 시 `background/consumable/page-{페이지명}.md`에서 이동). step-4 「잔여 산출물 소비」에서 분배·소비
      review.md         ← step-6 리뷰 결과. step-6 자체 소비
      user-test-cases.md ← step-6.4 동작 테스트. WRITING_REFINER가 PR 본문 Test plan으로 재활용
      pr-body.md        ← WRITING_IDEATOR가 초안 저작(잠정) → WRITING_REFINER가 확정·PR 본문 복사·게시. 게시 후 스윕 대상 — step-4 「잔여 산출물 소비」 스윕은 pr-body를 다루지 않는다(REFINER 전용)
```

step-4의 stub 코드는 `/plan/` 하위가 아닌 **소스 디렉토리(`src/...`) 하위**에 실제 파일로 생성된다.

## 라이프사이클 규칙

- **`persistent/`** — 소비 후에도 안 지움, PR·프로젝트 종료 후에도 안 지움. 파일별 예외 없이 균일하게 "안 지움" — 폴더명이 곧 라이프사이클 계약.
- **`retained/`** — 소비 후에도 안 지움, 컨텍스트(BG는 BG 라이프타임, PR은 PR 라이프타임) 종료 시 폐기. 마지막 소비자가 보고 나면 정리.
- **`consumable/`** — 소비 시 즉시 폐기. 절 단위 큐 모델 — 사용처가 소비한 절을 삭제, 모든 절이 비면 파일 삭제.

`persistent/`·`retained/` 하위는 WRITING_REFINER 「산출물 정리」의 정리 대상이 아니다 (REFINER는 consumable만 소비·정리).

## consumable/ 산출물 자가 정리 안내문

`consumable/` 하위 산출물은 상단에 자가 정리 안내문을 박는다 — `node {{skill_dir}}/scripts/plan-folder.mjs notice <파일>`. 메인이 본문 룰을 따로 떠올리지 않아도 산출물 자체가 자기 정리 책임을 알린다. **안 박아도 파일은 정상으로 보이므로**, 나중에 그 파일을 소비하는 step이 「이건 큐인가 보존인가」를 모른 채 남겨둔다.

`node {{skill_dir}}/scripts/plan-folder.mjs left /plan`이 남은 consumable과 안내문 누락분을 함께 낸다. 남아 있는 것이 곧 잘못은 아니다 — 아직 안 소비된 것일 수도, 소비하고 안 지운 것일 수도 있어 그 판정은 사람 몫이다.


## 소비→삭제 메커니즘 SSOT — 소비처 step은 "소비"만 선언

소비→삭제의 **메커니즘**(삭제 여부·granularity=절 단위·제목 보존 안 함·파일 삭제 조건)은 위 「라이프사이클 규칙」 + 「consumable/ 산출물 자가 정리 안내문」 두 곳에만 산다. 각 소비처 step은 **"소비" 선언만** 한다 — 삭제·절 단위·제목 보존 같은 동작 스펙을 재진술하지 않는다.

- **제목·포인터를 남기지 않는다**: consumable은 순수 큐라 소비한 절을 통째 삭제하고, 모든 절이 비면 파일을 삭제한다. "제목만 남긴다"·"pointer skeleton" 같은 과보존은 절이 안 비어 파일 삭제가 영영 발동 안 하므로 금지.

## 피그마 URL·캡처 캐싱

사용자가 피그마 URL을 제공하면, 그 URL이 어느 페이지·프레임·컴포넌트를 가리키는지 확인한 뒤(함께 말하지 않았으면 묻는다) `plan/background/retained/figma-url.md`에 누적 기록한다.

- 같은 대상의 피그마가 다시 필요할 때는 figma-url.md에서 조회 — 사용자에게 URL을 재요청하지 않는다

캡처 이미지는 `plan/background/retained/figma/[meaningful-name].[이미지확장자]`에 저장 (step-1.1에서 수집). 어느 단위 캡처든 같은 폴더에.

step-1(전체 페이지 URL) ~ step-5(컴포넌트·프레임 URL) 어느 시점에 받든 동일하게 적용한다.
