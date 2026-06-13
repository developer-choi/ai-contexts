---
target: deploy/skills/workflow/
---

# [draft] 인수인계: starter 코드가 plan을 무력화하는 사고 재발 방지

> PR2 IMPL 세션에서 발생. 채용과제·외부 베이스 프로젝트처럼 "내 컨벤션과 다른 starter 코드"가 깔린 상태에서 plan을 그 위에 적용할 때 발생한 사고. 다음 세션(PLAN/IMPL) 착수 전 codebase-audit 절차 도입 검토.

---

## 발생한 문제

### 문제 1 — starter 코드의 안티패턴이 plan을 덮어씀 (AppProvider)

**상황**: PR2 c2/c10에서 `AppProvider`를 만들 때, plan(interface.md L198)은 "QueryClient + QueryClientProvider + OverlayProvider 합성한 단일 컴포넌트, layout.tsx에서 한 줄로 합성"이라고 명시. 그러나 IMPL은 layout.tsx에서 `<QueryClientProvider>`를 직접 import해서 `<html>` 바깥을 wrap하는 starter 패턴 그대로 작성하고 PR2를 종료. 사용자가 "Provider를 또 직접 감쌌어? plan에 AppProvider 언급이 없었어?"라고 지적해서야 발견.

**사용자 지적**: "왜 또 직접 감쌌어? plan 문서가 그렇게 되어있었니?"

**근본 원인**: starter 코드(`apps/web/app/components/react-query-client-provider.tsx` + layout.tsx에서 html 바깥 wrap)가 살아있는 코드로 보였고, 훈련 데이터의 Next.js+TanStack Query 표준 템플릿도 같은 패턴이었음. 즉 **세 신호 중 둘(starter+훈련데이터)이 한쪽**, plan이 반대편. plan을 "starter에 약간의 수정 지시"로 깎아 해석. 실제로는 plan이 starter 결함을 **교정**하라는 거였고 interface.md L346에 "starter 결함(Provider가 `<html>` 바깥) 교정"이라고 명시되어 있었지만 못 읽음.

### 문제 2 — file-top eslint-disable 그대로 둠

**상황**: starter `api-client.ts` 최상단의 `/* eslint-disable */` `// @ts-nocheck`을 PR2 작업 중 그대로 둔 채 새 코드를 추가. handleError 교체로 라인이 바뀌었는데도 file-top disable 유지.

**사용자 지적**: "내가 쓰지않은 코드 관련된건 그 코드라인으로 각각 무시커밋을넣어놔 꼭 이 파일이 아니어도 내가쓴코드아니면 라인당으로"

**근본 원인**: starter가 file-top disable로 lint 회피해놓은 상태를 그대로 받아들임. "어차피 이 파일은 건드리는 작업 PR에서 정리"라는 pre-existing 방침이 있었으나, 내가 그 파일을 건드리는 PR에서도 라인별 정리를 안 함.

### 문제 3 — 동일 파일의 패턴이 plan과 충돌해도 의심 안 함

**상황**: starter `react-query-client-provider.tsx`가 client component인데도 layout.tsx에서 server component layout이 그것을 import해서 html 바깥을 wrap. Next.js App Router 관점에서 정상이 아닌데 "그래도 동작하니까" 그대로 사용.

**근본 원인**: 코드가 빌드되고 동작하면 "올바른 패턴"으로 받아들이는 휴리스틱. plan에 명시적 "교정" 단어가 있는데도 그쪽 신호를 약하게 가중.

### 문제 4 — FOUNDATION 세션에서 starter의 폴더·스타일링을 답습 권고 (아키텍처 결정)

**상황** (`assignment-playground-test` 프로젝트, 2026-05-28): 채용과제 FOUNDATION 단계 1에서, create-next-app starter가 깔아둔 FSD스러운 구조(`app/pages/widgets/shared`)를 보고 AI가 "이 4계층 유지"를 1차 권고. 사용자가 "DDD로 해줘"로 교정. 이어 단계 3에서도 starter의 Tailwind(create-next-app 기본) 셋업을 "현 셋업 그대로 사용"으로 흘려 사용자가 "tailwind css는 나에게 물어봤니? scss같이 다른거 써야하는지"로 지적.

**사용자 지적**: "DDD로 해줘" / "tailwind css는 나에게 물어봤니?"

**근본 원인**: 문제 1~3과 동일 — starter(기존 보일러플레이트) 상태를 살아있는 베이스라인으로 격상하고 답습. 차이는 세션·결정 종류: 문제 1~3은 IMPL 세션의 Provider·lint·컴포넌트 패턴, 문제 4는 FOUNDATION 세션의 **아키텍처 결정(폴더 구조·스타일링 방식)**. 폴더·스타일링은 모든 후속 마크업·컴포넌트에 영향 가는 결정인데, starter 디폴트를 사용자 확인 없이 답습. 같은 사고 패턴(기존 상태 앵커링 → MP 1차 소스 미확인 → 사용자 확인 생략)이 한 세션에서 폴더·스타일링 2회 반복. 폴더 결정의 MP 1차 소스 강제 읽기 게이트는 `workflow.md` 「FOUNDATION 단계 1 폴더 결정 시 FolderStructure.md 강제 읽기」 항 참조.

---

## 원인 (왜 발생하는가)

### 채용과제·외부 starter의 본질적 특성

채용과제 starter는 다음 셋 중 하나일 가능성이 높음:
- 회사 컨벤션과 무관한 generic boilerplate (create-next-app 등)
- 일부러 결함을 심어둔 코드 (실력 평가용)
- 오래된 패턴 그대로 (관리 안 됨)

**즉 starter는 "올바른 베이스라인"이 아니라 "재료"임**. 그러나 IMPL 세션은 starter를 살아있는 코드로 인식 → 자동으로 베이스라인으로 격상.

### LLM의 패턴 매칭 vs 정독

머릿속에 있는 "Next.js 표준 layout 패턴" + 눈앞의 starter 코드가 합쳐지면 강한 default가 형성됨. plan은 이 default를 뒤집는 결정인데, plan이 길고 구체적이라 "확인 도장"용으로만 흝게 됨. plan 한 줄 한 줄을 default와 대조 안 함.

---

## 해결 방법 (재발 방지)

### 안 1 — codebase-audit 절차 추가 (PLAN과 IMPL 사이)

PLAN 종료 후 IMPL 착수 전, 별도 세션 또는 워크플로우 스텝으로:
- starter 코드 전체를 grep/read
- plan과 충돌하는 패턴 추출 (Provider 위치, 폴더 구조, naming, lint disable 등)
- 충돌 항목을 **명시적 표**로 작성: `[파일:라인 | starter 패턴 | plan 결정 | 교정 필요 여부]`
- 이 표를 IMPL 세션 첫 컨텍스트로 주입

장점: 충돌이 IMPL 시작 전에 명문화됨. plan과 starter가 다르다는 사실을 IMPL이 무시 못 함.

단점: 절차 1개 추가. starter 변경이 적은 회사 내부 프로젝트엔 과함.

### 안 2 — 채용과제는 첫 커밋에 starter 정리 PR 별도 분리

PR1을 "starter 정리 PR"로 두고, file-top disable 제거·디렉터리 컨벤션 정렬·죽은 코드 삭제·layout 결함 교정을 모두 수행. 이후 PR2~ 는 깨끗한 베이스 위에서 작업.

이 프로젝트는 PR1 setup이 일부 했지만 충분치 않았음. 다음에는 PR1 범위를 더 넓게 잡거나 PR0(starter audit)을 추가.

### 안 3 — IMPL 세션 entry 체크리스트에 명시 항목 추가

`/workflow` 또는 IMPL 진입 시 다음 항목 강제:
- [ ] plan/interface.md, logic.md, implementation.md, markup.md 정독 완료 (요약 출력)
- [ ] starter 코드 스캔 완료 (충돌 항목 표)
- [ ] plan에서 "교정" "결함" "starter 폐기" 단어 grep 결과 보고

위 셋 다 체크 안 되면 IMPL 시작 금지.

### 안 4 — "plan은 starter를 교정한다" 기본 가정 명시

CLAUDE.md 또는 workflow 규칙에:
- "starter 코드와 plan이 다르면 plan이 우선이다. starter는 재료이지 베이스라인이 아니다."
- "plan에 'AppProvider' 같은 신규 컴포넌트가 등장하면 starter의 유사 컴포넌트는 폐기 대상이다 (rename 아님)."

### 안 5 — FOUNDATION 진입 시 starter 아키텍처 디폴트 답습 금지 게이트 (문제 4 대응)

문제 1~3은 IMPL 세션(plan ↔ starter) 대상이라 안 1~4가 plan 존재를 전제. 그러나 문제 4는 **plan이 아직 없는 FOUNDATION 단계**의 아키텍처 결정(폴더·스타일링·빌드툴)이라 별도 게이트 필요.

`conventions/session/foundation.md`에:
- "FOUNDATION의 아키텍처 결정(폴더 구조·스타일링 방식·빌드툴)은 starter가 깔아둔 디폴트(create-next-app의 FSD스러운 구조·Tailwind 등)를 '유지'로 답습하지 않는다. starter는 재료이지 표준이 아니다."
- 각 결정 시 (1) MP 1차 소스 대조 (폴더 → `FolderStructure.md`, 스타일 → MP 스타일 컨벤션) (2) 사용자 확인을 게이트로 둔다.
- 폴더 결정의 MP 강제 읽기는 `workflow.md` 별도 항이 담당. 본 안은 "starter 디폴트 답습 금지 + 사용자 확인"이라는 상위 가드.

---

## 테스트 방법 (재발 방지 검증)

### 시나리오 1 — 일부러 결함 있는 starter 만들기

작은 테스트 레포에:
- `app/components/MyProvider.tsx`를 만들어 layout.tsx에서 `<html>` 바깥을 wrap하는 안티패턴 주입
- file-top `/* eslint-disable */`을 핵심 파일 3개에 추가
- naming convention 위반 (snake_case 변수, 케밥 컴포넌트 등) 의도 주입

plan 문서에:
- "Provider는 body 안쪽에서 합성한다"
- "file-top disable은 PR 작업 시 라인별로 분해한다"
- naming 규칙 명시

IMPL 에이전트에게 PR1 작업 지시 → starter 결함을 교정하지 않고 그대로 두는지 / plan을 따르는지 관찰. 교정 안 하면 안 1~4 중 어떤 절차가 있어야 잡히는지 비교.

### 시나리오 2 — codebase-audit 절차 도입 후 동일 시나리오 재실행

같은 starter로 IMPL 세션 시작 전 audit 단계를 강제 → 충돌 표가 만들어지는지 / IMPL이 그 표를 따라 교정하는지 관찰.

### 시나리오 3 — plan에 "교정" 단어 grep 안 했을 때 vs 했을 때

같은 starter에서 IMPL 진입 시 plan grep을 강제 vs 비강제 → grep 결과 ("교정 4건, 결함 2건") 컨텍스트가 들어오면 IMPL 행동이 달라지는지 측정.

---

## 우선순위 제안

- **즉시 적용 가능**: 안 4 (plan-우선 가정 명시) — CLAUDE.md 한 줄 추가만 하면 됨.
- **다음 채용과제/외부 프로젝트 진입 시**: 안 1 (codebase-audit 절차) — 가장 효과 큰 후보. 안 5 (FOUNDATION 아키텍처 답습 금지 게이트) — 문제 4 같은 FOUNDATION 단계 사고 직접 차단.
- **장기**: 안 3 (workflow entry 체크리스트) — `/workflow` 스킬에 통합.

다음 단계는 `/pre-exit`에서 위 안 1·3·4·5 중 어느 걸 먼저 시도할지 사용자와 결정.
