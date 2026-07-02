# PR2 — 공통 인프라 (런타임 의존성 / Provider / API 클라이언트 / 에러 처리)

> 채용과제용 PR2 본문 합집합 템플릿.
> 매번 채용과제마다 이 파일을 복사해서 시작하고, 해당 과제에서 안 한 항목은 삭제 후 사용한다.
> 각 섹션 끝의 `출처:` 표시는 어느 과제에서 가져온 문구인지 추적용이다 — 제출 본문에서는 제거한다.

---

## 안내

작업 과정을 체계적으로 관리하기 위해 기능 단위로 PR을 분리하여 진행하고 있습니다.

최종 제출은 모든 기능을 합친 `feature → master` PR로 진행하며, 과제 요구사항에 맞는 제출 양식은 최종 PR에 작성하겠습니다.

출처: stunning #3 (https://github.com/developer-choi/recruitment-stunning-202603/pull/3)

---

## 요약

이후 페이지에서 공통으로 쓸 인프라만 먼저 정리한 PR입니다. 페이지 코드는 없고, 각 요소의 설계 의도·사용 예시는 후속 페이지 PR에서 다룹니다.

- **셋업**: 폼·오버레이 패키지(`react-hook-form`·`zod`·`overlay-kit`)와 `@/*` 경로 별칭 추가, 도메인 최상위·`shared/`·`app/`로 나눈 DDD 폴더 골격
- **API 클라이언트**: `ky` + TanStack Query 기반 구성, `retry: 0` 통일
- **테스트 환경**: Vitest + React Testing Library 구축 및 공유 유틸 테스트 작성
- **에러 처리**: 응답·네트워크 두 클래스로 나눈 커스텀 에러 계층, 클라이언트(알림 모달)·서버(4xx 에러 페이지 / 5xx throw) 핸들러, 알림 모달·에러 페이지 템플릿 컴포넌트
- **디자인 토큰**: 피그마 기준 SCSS 디자인 토큰 + 404 페이지 구현

출처: stunning #3 (https://github.com/developer-choi/recruitment-stunning-202603/pull/3) + wisebirds #2 (https://github.com/developer-choi/recruitment-wisebirds-20260505/pull/2)

---

## 배경: 테스트 코드의 포지션

PR1에서 정적 분석(린트, 타입 체크)을 도입하여 커밋 시점에 코드 품질을 자동으로 검증하는 구조를 만들었습니다.

PR2는 [리뷰 비용을 줄이는 구조](https://github.com/developer-choi/ai-contexts/blob/master/README.md) 로드맵의 2번 항목인 **테스트 코드**를 실행합니다.

정적 분석은 "이 코드가 규칙을 지키는가"를 검증하지만, "이 코드가 올바르게 동작하는가"는 검증하지 못합니다. 예를 들어 `validatePositiveInteger("01")`이 `null`을 반환해야 하는지 `1`을 반환해야 하는지는 린트가 판단할 수 없습니다. 테스트 코드가 이 영역을 담당합니다.

AI가 코드를 생성하거나 수정할 때마다 기존 동작이 깨지지 않았는지 테스트가 자동으로 확인하므로, 사람이 검증해야 할 범위가 줄어듭니다. **정적 분석이 "규칙 위반"을 막고, 테스트 코드가 "동작 변경"을 막는 2중 안전망 구조입니다.**

출처: stunning #3 (https://github.com/developer-choi/recruitment-stunning-202603/pull/3)

---

## 기술 결정: 재시도 전략

ky와 TanStack Query 양쪽 모두 `retry: 0`으로 설정하였습니다.

### 재시도를 비활성화한 이유

실패하는 API는 재시도해도 성공하지 않는 경우가 대부분입니다. 서버가 500을 반환하거나 인증이 만료된 상황에서 동일한 요청을 3회 더 보내봐야 결과는 같습니다. 그 사이 사용자는 아무런 피드백 없이 대기하게 되고, 이 대기 시간이 UX를 직접적으로 해칩니다.

출처: stunning #3 (https://github.com/developer-choi/recruitment-stunning-202603/pull/3)

---

## 에러 처리 — 응답·네트워크 두 클래스로 분리

응답 에러(4xx/5xx)와 네트워크 에러(요청 자체가 실패)를 별도 커스텀 에러 클래스로 나누고, axios/ky의 catch 분기에서 둘 중 하나로 매핑합니다. 이후 핸들러는 두 종류만 알면 됩니다.

- **클라이언트 핸들러**: 알림 모달로 사용자에게 안내
- **서버 핸들러**: 4xx → 에러 페이지로 응답, 5xx → throw하여 Next.js error boundary로 위임

알림 모달과 에러 페이지 템플릿 컴포넌트는 이 핸들러들이 사용하는 공용 UI입니다.

출처: wisebirds #2 (https://github.com/developer-choi/recruitment-wisebirds-20260505/pull/2)

---

## 디자인 토큰과 SCSS

피그마에 정의된 색상/타이포 값을 SCSS 변수와 mixin으로 1:1 대응시켰습니다.

### 왜 토큰화하는가

디자인 변경이 발생하면 변수 하나만 수정하면 전체에 반영됩니다. 하드코딩하면 모든 파일을 찾아 수정해야 하고, 그 과정에서 누락이 발생합니다.

예를 들어 주요 색상이 `#2656f6`에서 `#1a4fd6`으로 변경될 때:

```scss
// 토큰화: _variables.scss 한 곳만 수정
$blue500: #1a4fd6;

// 하드코딩: 사용된 모든 파일을 찾아 수정
// ContestCard.module.scss, Badge.module.scss, Button.module.scss ...
```

### primitive token과 semantic token의 분리

값(primitive)과 의미(semantic)를 분리하여 관리합니다.

```scss
// primitive token — 값 자체
$blue500: #2656f6;

// semantic token — 의미 부여
$info: $blue500;
```

`$info`를 사용하는 곳은 "이 색이 파란색이라서" 쓰는 것이 아니라 "정보를 나타내는 색이라서" 쓰는 것입니다. 나중에 info 색상이 파란색에서 보라색으로 바뀌더라도 `$info: $purple500`으로만 변경하면 되므로, 수정 범위가 최소화됩니다.

출처: stunning #3 (https://github.com/developer-choi/recruitment-stunning-202603/pull/3)
