> 출처: 2026-06-14 MP design-system 유닛테스트 정책 토론. "시각은 유닛이 아니라 Chromatic" 결론의 1차 소스. 공식 문서 기반(verified).

---
tags: [testing, chromatic, visual-regression, storybook]
source: verified
priority:
---
# 시각 회귀 테스트 (Chromatic)

## 핵심

유닛/스냅샷 테스트는 "어떻게 보이는가(픽셀)"를 못 잡는다. 컴포넌트 복잡도의 상당 부분이 시각(HTML·CSS가 화면에 어떻게 나타나는가)인데, **기계는 HTML 태그·CSS 클래스 나열만 보고 UI 정합을 판정할 수 없다.** 그래서 시각 회귀 테스트는 실제 브라우저에서 렌더해 **이미지 스냅샷을 찍고 베이스라인과 픽셀 비교**, 차이가 나면 사람이 승인/거부한다.

**비유 — 도면 vs 사진.** 유닛테스트(jsdom)는 **건축 도면**만 가진 상태다. 방 개수·문 위치(구조)는 도면으로 알지만, 벽이 무슨 색인지는 도면만 봐선 모른다. 색을 보려면 실제로 칠한 집을 **사진** 찍어 비교해야 한다 — 그 사진 찍기가 Chromatic이다. jsdom은 태그 구조는 만들지만 그걸 실제 픽셀로 칠하지 않으므로, "버튼이 있나"는 알아도 "빨간색인가·가려졌나·위치가 맞나"는 모른다.

## 유닛 vs 시각 — 무엇을 잡나

- **유닛(RTL+jsdom)**: DOM 구조·동작·로직. 픽셀은 못 봄(jsdom은 layout/paint 엔진 없음).
- **시각(Chromatic)**: 색·간격·레이아웃·CSS 깨짐. 동작·로직은 못 봄(정지 스냅샷).
- **상보적**: 기능 테스트는 통과해도 시각 버그는 못 잡는다. 예) 버그 CSS로 체크아웃 버튼이 알림창 뒤에 숨음 → DOM상 클릭은 가능해 기능 테스트 통과하나 사용자는 못 누름 → 시각 테스트만 잡음.

## 왜 "pragmatic"인가

UI 정합은 본질적으로 시각적·주관적이라 완전 자동화에 안 맞는다. 시각 테스트는 사람을 빼는 대신, 도구(Storybook 등 컴포넌트 익스플로러)로 **"사람이 봐야 할 정확한 컴포넌트·상태"에만 주의를 집중**시킨다. 스냅샷 테스트가 "핵심을 못 잡으니 전부 캡처한다"는 패배 선언인 반면, 시각 테스트는 사람의 시각 판단을 한계가 아니라 기능으로 활용한다.

> "a large portion of components' inherent complexity is visual — the specifics of how generated HTML and CSS appears when it reaches the user's screen."
> "Snapshot testing entails an admission of defeat in capturing the essential details of a component: instead we capture them all."

## 과금·운영 메모

- **스냅샷 단위 과금**, 스토리 1개 = 스냅샷 1개 (단 viewport·브라우저·a11y 테스트마다 곱). → prop 조합은 개별 스토리 대신 **매트릭스 1스토리**로 몰면 1스냅샷.
- **TurboSnap**: 변경 없는 스토리는 베이스라인 복사로 1/5 비용.

## References

- [Visual tests • Chromatic docs](https://www.chromatic.com/docs/visual/) — 기능 테스트는 픽셀을 검증 안 함("don't validate the pixels"), 체크아웃 버튼 가림 예시
- [Introduction to visual testing • Storybook Visual Testing Handbook](https://storybook.js.org/tutorials/visual-testing-handbook/react/en/introduction/) — "machines can't determine UI correctness from sequences of HTML tags and CSS classes" → 이미지 픽셀 비교
- [Visual Testing — the pragmatic way to test UIs • Chromatic blog](https://www.chromatic.com/blog/visual-testing-the-pragmatic-way-to-test-uis/) — 시각은 주관적이라 사람 판단 + 도구 효율을 결합
- [Billing • Chromatic docs](https://www.chromatic.com/docs/billing/) — 스냅샷 과금 단위
