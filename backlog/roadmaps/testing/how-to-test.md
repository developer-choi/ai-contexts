# How to test?

> "How to test?" 블로그 글 골격·필기. testing 로드맵([../testing.md](../testing.md))의 How 섹션에서 분리.
> 헤딩(`##`/`###`)은 실제 글 섹션 구조. 각 절 아래는 담을 주장(1~2줄) + 들어갈 예시 코드 메모.
> 이번 스프린트 범위: 컴포넌트 테스트(RTL) + 함수 유닛테스트 작성 기법. 모킹·통합·E2E는 deferred(로드맵 색인 참조).
>
> 흡수 재료:
> - KA `rtl-overview.md` — RTL↔DOM Testing Library(19-33), DOM 노드 대상(38-48), AAA 패턴·API 매핑(81-102), 쿼리로 a11y 개선(106-120)
> - KA `philosophy.md` (114-125) — Guiding Principles: 인스턴스가 아니라 DOM 노드를 다루도록 API가 유도 (쿼리 우선순위의 근거)
> - KA `unit-test-strategies.md` (91-105) — best practices: automate / assert once
> - AC 백로그 [부모-자식-테스트-분배.md](../../projects/knowledge-archive/testing/부모-자식-테스트-분배.md) — 부모-자식 함수 호출 시 테스트 분배 + 커밋 2개
>
> 범위 밖(다른 글·deferred):
> - 함수 케이스 분류(로직·경계·에러 세 갈래)는 What `what-to-test.md`가 소유 — How는 그 코드 형태만 빌려오지 않고 What을 참조한다.
> - simulated browser 한계·E2E, API mock(MSW) = deferred. 로드맵 [testing.md](../testing.md) deferred 색인 참조.
>
> **작성 규칙**: 모든 설명 섹션에 예시 코드블록 필수 — 주장만 쓰지 말고 실제 테스트 코드/PR/스토리북으로 보여준다.

## 이제 실제로 쓴다 — What에서 고른 대상을 코드로

What의 결론("무엇을, 어디까지 테스트할지")을 한 문장으로 받고, 이 글은 그 대상을 **실제 테스트 코드로 어떻게 옮기나**를 다룬다. 도구는 컴포넌트는 RTL, 함수는 일반 유닛테스트.

- **예시 코드 메모**: 코드블록 없음(브릿지 문단).

## 무엇으로 테스트하나 — RTL은 react-dom 위 얇은 층, DOM 노드를 대상으로

RTL은 DOM Testing Library를 래핑해 React용 `render` 등을 더한 얇은 층이고, 쿼리 로직 본체는 DOM Testing Library에 있다. 핵심은 **컴포넌트 인스턴스의 내부 state·메서드가 아니라 실제 렌더된 DOM 노드를 대상**으로 한다는 점 — Why의 "구현상세 회피"가 도구 차원에서 강제되는 지점이다. (rtl-overview.md:19-48)

- **예시 코드 메모**: 본인 컴포넌트를 `render`하고 `screen`으로 DOM 노드를 집는 최소 예시 — 인스턴스(`wrapper.instance()`)를 만지는 옛 방식과 대비.

## AAA로 한 테스트의 뼈대 — Arrange / Act / Assert

한 테스트는 Arrange(준비·렌더) → Act(사용자 동작) → Assert(검증) 3단계로 구조화한다. RTL은 Arrange·Act API만 제공하고(=`render`/`userEvent`), Assert는 RTL이 아니라 Jest `expect` + 쿼리로 한다. (rtl-overview.md:81-102)

| 단계 | 역할 | API |
|---|---|---|
| Arrange | 렌더·준비 | `render` |
| Act | 사용자 동작 | `userEvent` (또는 `fireEvent`) |
| Assert | 결과 검증 | `expect` + `getByRole` 등 |

- **예시 코드 메모**: 본인 컴포넌트 테스트 하나를 AAA 주석으로 3등분 — `render`(A) → `userEvent.click`(A) → `expect(...).toBeVisible()`(A).

## 사용자처럼 찾는다 — 쿼리 우선순위

요소를 찾을 때 **사용자가 인식하는 방식**(role·label text·표시 텍스트)을 우선하고, `data-testid`는 그게 말이 안 될 때만 쓰는 escape hatch다. 이렇게 쓰면 통과시키려고 semantic 마크업·`label`을 챙기게 돼 a11y가 따라 개선된다. (rtl-overview.md:106-120, philosophy.md:114-125 — 인스턴스가 아니라 DOM 노드를 다루도록 API가 유도)

- **예시 코드 메모**: 같은 버튼을 ① `getByTestId('submit')` vs ② `getByRole('button', { name: '제출' })`로 찾는 두 코드 대비 — ②가 사용자 인식에 가깝고 마크업 개선을 유도.

## 부모-자식 호출 시 테스트 분배 — 부모는 많이, 자식은 전파확인 + 델타만

부모 함수가 자식을 내부 호출하는 구조면 ① 부모를 많이 테스트해 실제 흐름을 검증, ② 자식에선 부모로부터 잘 전파되는지만 짧게, ③ 자식 고유 확장분만 따로 테스트한다. (What의 "델타만"이 *무엇을 안 짜나*라면, 여기는 *그럼 어떤 코드를 짜나*) (재료: [부모-자식-테스트-분배.md](../../projects/knowledge-archive/testing/부모-자식-테스트-분배.md))

- **예시 코드 메모**: `validateIncludeString`이 `validateString`을 호출 — 코어 케이스 중복 없이 "전파 확인 + 포함검사 고유 로직"만 짠 본인 커밋(585ed1f). `calculateTotal`/`calculateNumberTotal`(54fddbf)도.

## 한 테스트 = 한 검증 — assert once / CI 자동화

테스트당 단언을 하나로 둬 실패 시 원인이 바로 짚이게 한다(assert once). 그리고 테스트는 브랜치 푸시·배포 같은 이벤트에 **자동 실행**되게 걸어 회귀 방어를 사람 손에 의존하지 않는다(automate) — Why의 "확신은 자동화라야 채워진다"가 작성 규율로 착지하는 지점. (unit-test-strategies.md:91-105)

- **예시 코드 메모**: 단언 여러 개를 한 `it`에 몰아 어디서 깨졌는지 흐려진 코드 vs `it.each`로 케이스별 1단언 분리 + lint-staged/CI에서 자동 실행되는 설정 한 조각.
