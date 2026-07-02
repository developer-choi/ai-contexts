# .styled 마크업/시각 분리 기준 다듬기

MP `docs/convention.md`의 마크업/시각 분리 기준을 "새 디자인 시안이 오면 이 속성이 바뀔 수 있는가"로 다듬는다 (2026-06-12 세션 논의).

## 현재상태

convention.md 기준은 "headless = `.styled` 미적용 상태" 정의 + 박스 모델 최소 구조(display·position·overflow·크기 제약) 단서까지 반영됨. 그러나 배치 속성 분류가 여전히 직관에 어긋나는 케이스가 있다 — 예: Dialog footer의 `display: flex`는 플레인인데 `justify-content: flex-end`는 styled.

## 다듬을 방향

판정 도구로 "**시안이 바꿀 수 있으면 `.styled`, 컴포넌트 정체성상 불변이면 플레인**"을 추가한다. 속성 종류(display냐 color냐)가 아니라 가변성으로 가른다.

사례:

- Dialog footer `display: flex` → 어떤 시안에서도 버튼은 가로 나열 = 불변 → 플레인
- Dialog footer `justify-content: flex-end` → 가운데 정렬 시안 가능 = 시안의 결정 → styled
- InputBase input 리셋(border:none 등) → "박스가 보더 소유"라는 현 스킨 설계의 일부. 밑줄형(material underline) 시안이면 input이 보더를 가짐 → styled

## 검증 거리

색·간격·radius는 이미 토큰이라 시안 교체의 8할은 토큰 스왑으로 끝난다. `.styled` 분리의 실익(토큰 밖 구조적 룩 차이 — 링 방식·정렬·리셋 전략)이 더블 클래스 유지비를 넘는지, 채용과제에서 실제 스킨 교체 1회로 검증한다.

## 종료 조건

convention.md에 가변성 판정 도구가 반영되고, 스킨 교체 1회 검증으로 분리 실익 판단이 끝나면 삭제.
