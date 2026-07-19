# /plan/ 폴더 구조

워크플로우 산출물 폴더 구조 + 라이프사이클 규칙 + consumable 자가 정리 양식 + 피그마 캐싱 룰 단일 출처.

## 폴더 트리

```
/plan/
  background/
    persistent/         ← PR·프로젝트 종료 후에도 보존. 회고·재참조 가치
      공고.md           ← 채용 원본 (채용만) — BG.step-1.1 산출
      메일.md           ← 채용 메일 (채용만)
      과제요구사항.md   ← 과제 요구사항 (채용만)
      requirement-review-retrospect.md ← requirement-review/retrospect.md 산출물. 체크리스트 개선 회고
    retained/           ← 사용자 제공 원본 + 누적 캐시. BG 컨텍스트(= 프로젝트 전체) 유효한 동안 보존
      folder-structure.md ← FOUNDATION 단계 1 산출 (채용만). 디렉토리 구조 명세 (PR2~N 참조)
      tech-constraints.md ← BG.step-1 기술 제약 스캔 결과
      conventions-index.md ← step-1.1 수집 (레포 미확보 시 레포 확보 시점 세션이 생성). 프로젝트 컨벤션 소스 "경로 + 한 줄 트리거" 인덱스. 양식·작성 절차는 step-1 「컨벤션 소스 수집」 참조
      figma-url.md      ← step-1.1 수집 (figma 쓰는 모드). 대상 이름 + URL 누적
      figma/            ← step-1.1 수집 캡처 이미지 (figma 쓰는 모드). `[meaningful-name].[이미지확장자]` 단위
      mockup/           ← step-1.1 수집 (개인 모드). 사용자가 미리 만든 마크업 시안 = 시각 진실 원천
      spec.md           ← step-1.1 수집 (개인 모드, 선택). 화면에 안 담기는 동작(API·에러·로딩·엣지값)을 저자가 미리 아는 경우
      design-root.md    ← step-1.1 산출. 프로젝트별 시각 원본 진입 문서(root) — "원본이 어느 파일에 있고 대조는 어느 절차문서(markup/figma.md·personal.md) 대로". 양식·규칙은 [conventions/artifact/design-root.md] 참조
      cross-analysis.md ← step-1 requirement-review (recruitment) 산출물 (채용 한정). 추론한 평가 기준만 담는다(프로젝트 라이프타임 내내 구현 우선순위 판단에 참조) — 세부 스펙·교차 분석 발견·기술 결정 후보·모호한 부분은 처음부터 `background/consumable/project.md`에 직접 기록한다(중간 산출물에 임시로 적어두지 않는다)
      service-analysis.md ← step-1 requirement-review (recruitment) 산출물 (채용 한정). 대상 서비스 분석 ([requirement-review/recruitment/service-analysis.md] 참조). 개발 내내 컨셉 판단 기준으로 참조되므로 retained
    consumable/         ← AI 산출물·분류 모호 자료. 소비 시 즉시 폐기 (큐 모델)
      project.md        ← step-1 recruitment 분석 중 직접 기록 시작(놓치기 쉬운 세부 스펙·교차 분석 발견·기술 결정 후보·모호한 부분·TODO — 없으면 이 시점에 생성), step-2에서 PR별 섹션으로 구조화. PR별 섹션은 각 PR의 step-3에서 overview로 이관 (절 단위 큐). FOUNDATION이 PRESET_SETUP 섹션에 자연어 지시 추가 (채용 한정)
      global.md         ← step-1 requirement-review (planning) 산출물. 전체 서비스 맥락·공통 컴포넌트·TODO. 본문 양식은 [requirement-review/planning/output-template.md] 참조
      layout.md         ← step-1 requirement-review (planning) 산출물 (조건부 — 여러 페이지가 공유하는 레이아웃이 식별된 경우만)
      figma-component-mapping.md ← step-5 Lead 산출물 (실무 한정). 피그마 CSS 토큰 → DS 컴포넌트 props 매핑표. 양식은 [template/figma-component-mapping.md], 생성 절차는 [conventions/figma-component-mapping-guide.md] 참조
      design-system.md  ← recruitment 4단계 산출물 (채용 한정). 필요한 컴포넌트 종류·props 요구사항 설계. step-3·step-4 PRESET_COMPONENTS 입력 재료, 사용 후 폐기
  pr{N}/
    persistent/         ← PR 종료 후에도 영구 보존. 미래 다른 프로젝트·후속 PR의 참조 자료
      decisions.md      ← step-3 산출물 + step-6.6 갱신. 회사·프로젝트 컨텍스트 의존 결정의 흐름 보존
      reference.md      ← step-3·4 누적. 외부 자료 링크 + 회사·프로젝트 컨벤션·베스트프랙티스 경로 인덱스
      implementation.md ← step-4 산출물. 소비 = step-5·step-5.4·step-6.1·step-6.5·WRITING_REFINER (PR body 확정 시 참조). 커밋 정리 시점이 PR 머지 이후로 길 수 있어 보존
      overview.md       ← step-3 산출물. 이 PR 전체(step-4~6·미래 step)에 대한 청중-중립 목표·범위 기록. WRITING_IDEATOR·WRITING_REFINER를 포함한 다독자가 읽으며(read), 어느 소비처도 삭제하지 않는다 — persistent라 소비 후에도 보존
    retained/           ← PR 라이프타임 동안 보존. step-6.5(커밋 정리·재정렬) 진입 시 일괄 폐기
      markup.md         ← step-4 산출물 (조건부 — UI 컴포넌트 PR만, 개인 모드 제외: figma 없음). **Figma 원본 링크 인덱스(컴포넌트 종류별 × 상태별, 사용자 입력)** + 토큰 매핑표·매칭표. step-6.4.1 사용자 figma 시각 대조의 기준 (figma 충실도 검증 자체는 MARKUP 담당). 마지막 소비자는 step-6.4.1
    consumable/         ← 소비 시 즉시 폐기 (큐 모델 — 절 단위 소비 시 절 삭제, 비면 파일 삭제)
      page.md           ← step-1 requirement-review 페이지별 분석 결과. step-3 「잔여 산출물 소비」에서 분배
      review.md         ← step-6 리뷰 결과. step-6 자체 소비
      user-test-cases.md ← step-6.4 동작 테스트. WRITING_REFINER가 PR 본문 Test plan으로 재활용
      pr-body.md        ← WRITING_IDEATOR가 초안 저작(잠정) → WRITING_REFINER가 확정·PR 본문 복사·게시. 게시 후 스윕 대상(다른 산출물로 이관·녹이는 소비가 아니라 REFINER 자신의 저작물이므로 「소비」가 아니다). step-4 「잔여 산출물 소비」 스윕은 pr-body를 다루지 않는다(REFINER 전용)
```

step-4의 stub 코드는 `/plan/` 하위가 아닌 **소스 디렉토리(`src/...`) 하위**에 실제 파일로 생성된다.

## 라이프사이클 규칙

- **`persistent/`** — 소비 후에도 안 지움, PR·프로젝트 종료 후에도 안 지움. 회사 컨텍스트 의존 결정·컨벤션 인덱스·구현 인수인계 자료(`implementation.md`)·PR 목표·범위 회고 기록(`overview.md`) 등 미래 비교·회고 가치. 파일별 예외 없이 균일하게 "안 지움" — 폴더명이 곧 라이프사이클 계약.
- **`retained/`** — 소비 후에도 안 지움, 컨텍스트(BG는 BG 라이프타임, PR은 PR 라이프타임) 종료 시 폐기. 마지막 소비자가 보고 나면 정리.
- **`consumable/`** — 소비 시 즉시 폐기. 절 단위 큐 모델 — 사용처가 소비한 절을 삭제, 모든 절이 비면 파일 삭제.

`persistent/`·`retained/` 하위는 WRITING_REFINER 「산출물 정리」의 정리 대상이 아니다 (REFINER는 consumable만 소비·정리).

## consumable/ 산출물 자가 정리 안내문

`consumable/` 하위 산출물은 상단에 다음 양식의 자가 정리 안내문을 박는다. 메인이 본문 룰을 따로 떠올리지 않아도 산출물 자체가 자기 정리 책임을 알린다.

```markdown
> 이 파일은 큐 모델로 운영됩니다.
> 각 절을 **소비**한 step은 그 절을 즉시 삭제합니다.
> 모든 절이 비면 파일째 삭제합니다.
>
> **소비** = 그 절의 내용을 다른 산출물(overview·stub·PR 본문·코드 등)로 이관·녹임
> **단순 읽기·참조 조회는 소비 아님** — 사용자 질문 응답을 위해 잠시 본 케이스 등은 삭제 금지
```

산출물별 소비 step 목록은 산출물 헤더(step-3·step-4 등)에 명시되어 있으므로, 자가 안내문에는 일반 큐 룰만 박는다.

## 소비→삭제 메커니즘 SSOT — 소비처 step은 "소비"만 선언

소비→삭제의 **메커니즘**(삭제 여부·granularity=절 단위·제목 보존 안 함·파일 삭제 조건)은 위 「라이프사이클 규칙」 + 「consumable/ 산출물 자가 정리 안내문」 두 곳에만 산다. 각 소비처 step은 **"소비" 선언만** 한다 — 삭제·절 단위·제목 보존 같은 동작 스펙을 재진술하지 않는다.

- 소비처 문구 통일형: **"step-N에서 `<산출물>`의 `<범위>`를 `<대상>`으로 소비한다"** (예: "step-3에서 project.md의 현재 PR 절을 overview.md로 소비"). 삭제 동작은 소비 선언이 위 안내문·라이프사이클을 발동시킨다.
- **제목·포인터를 남기지 않는다**: consumable은 순수 큐라 소비한 절을 통째 삭제하고, 모든 절이 비면 파일을 삭제한다. "제목만 남긴다"·"pointer skeleton" 같은 과보존은 절이 안 비어 파일 삭제가 영영 발동 안 하므로 금지.
- 소비처에 "삭제한다"를 재진술하면 메커니즘이 두 곳(SSOT + step)으로 갈라져 드리프트 원천이 된다. plan-folder만 고치면 전 소비처 동작이 바뀌도록 유지한다.

## 피그마 URL·캡처 캐싱

사용자가 피그마 URL을 제공하면, 그 URL이 어느 페이지·프레임·컴포넌트를 가리키는지 확인한 뒤(함께 말하지 않았으면 묻는다) `plan/background/retained/figma-url.md`에 누적 기록한다.

- 기록 형식: 대상 이름 + URL
- 파일이 없으면 새로 만든다
- 같은 대상의 피그마가 다시 필요할 때는 figma-url.md에서 조회 — 사용자에게 URL을 재요청하지 않는다

캡처 이미지는 `plan/background/retained/figma/[meaningful-name].[이미지확장자]`에 저장 (step-1.1에서 수집). 페이지·섹션·위젯·컴포넌트 어느 단위 캡처든 같은 폴더에.

step-1(전체 페이지 URL) ~ step-5(컴포넌트·프레임 URL) 어느 시점에 받든 동일하게 적용한다.
