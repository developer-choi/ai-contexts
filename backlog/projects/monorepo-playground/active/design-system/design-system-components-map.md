# design-system 컴포넌트 이관 + components-map.md

## 동기

forworkchoe(채용과제) 레포의 `core/` 하위에 만들어둔 버튼·인풋 등 범용 컴포넌트를 MP `design-system` 패키지로 옮겨, 채용과제 PR 3에서 MP의 design-system을 참조해 사용하기 위함. 함께 "이런 컴포넌트를 새로 만들 거면 이걸 참고해라" 식의 가이드 맵(`components-map.md`)을 둬서, 이후 컴포넌트 추가 시 일관성을 잡는다.

종료 조건:

- forworkchoe core의 버튼·인풋 계열이 MP design-system에 이관 완료
- 채용과제 PR 3가 MP design-system을 import해서 동작
- `design-system/docs/components-map.md`(가칭) 작성 완료

## [draft] forworkchoe core → MP design-system 이관

- 대상: forworkchoe(`~/WebstormProjects/main/forworkchoe`) `core/` 하위의 버튼·인풋 류 컴포넌트
- 이동처: MP(`~/WebstormProjects/main/monorepo-playground`) `design-system` 패키지
- 채용과제 PR 3에서 MP design-system을 dependency로 참조
- 첫 행동: forworkchoe `core/` 디렉토리 트리 확인 → 어떤 컴포넌트가 있는지 목록화 → MP design-system 현재 구성과 대조 → 이관 단위 분할 결정
- 선행: [`../../../topics/design-system/inputbase-책임-범위.md`](../../../topics/design-system/inputbase-책임-범위.md)의 InputBase 방향성(children 주입) 확정 후 진행 (인풋 계열이 그 위에 얹힘)

## design-system/docs/components-map.md — 초안 완료

- 위치 확정: `packages/design-system/docs/components-map.md` (best-practices-map 포맷 차용)
- MP best-practices-map.md 인덱스에 진입점 추가됨(디자인 시스템 섹션)
- 현재 내용: apps/examples themes 제거 과정의 전 컴포넌트 부류별 판정(DS / examples 유지 / 컴포넌트 없음 / 범위 밖) + 각 DS 컴포넌트의 상태(있음·신규·보완)와 스펙 백로그 포인터
- 잔여: 컴포넌트를 실제 구현하면 각 항목에 패턴 문서 `- 참고:` 링크 보강. forworkchoe core 이관분도 같은 표에 합류시킬 것(현재는 examples 기준 컴포넌트만 등재)

## [ideation] examples/layout-map.md (먼 미래)

- examples 폴더에 다양한 웹페이지 레이아웃을 모은다 (스티키 헤더 레이아웃, 사이드바 레이아웃 등)
- 레이아웃 패턴을 components-map.md와 동일한 방식으로 `layout-map.md`에 정리
- 우선순위 낮음 — 컴포넌트 이관 + components-map이 안정된 뒤 검토
