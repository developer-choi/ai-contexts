# Drag And Drop (리스트 순서 바꾸기)

## References

- [블로그 링크](https://simian114.gitbook.io/blog/undefined/react/drag-and-drop)

### dnd-kit

- [dnd-kit – Documentation](https://docs.dndkit.com/)
- [dnd-kit – Examples](https://master--5fc05e08a4a65d0021ae0bf2.chromatic.com/?path=/story/presets-sortable-grid--basic-setup)
- 직접 구현 예제: 드래그앤드롭으로 순서바꾸는 예제 추가 (커밋 링크 생략)
- 검토 후 반려: 드래그 시 버벅임 이슈로 반려
  - 2D DND 구현도 가능했으나 당시 검증 불충분
  - 최신화 주기는 `@hello-pangea/dnd`와 비슷하나 번들 용량은 더 작음
  - 지원 기능 셋이 `@hello-pangea/dnd`와 살짝 다름

### @hello-pangea/dnd

- [예제코드](https://github.com/hello-pangea/dnd/blob/main/docs/about/examples.md#basic-samples)
- [스토리북](https://dnd.hellopangea.com/?path=/docs/welcome--docs)

테스트 커밋에서 확인한 동작:
- 스타일 커스텀 가능
- 드래그 가능 / 불가능 영역 분리 가능
- 리스트에서 리스트로 이동 가능
- 가로 방향도 동작

아쉬운 부분:
- 기능이 많고 번들 용량이 큼 → dynamic import 필요

주의사항:
- 아이템 간 상하간격은 `gap` 대신 `margin`을 사용해야 함
- `gap` 사용 시 드롭 후 Layout Shift가 크게 발생함

## Required Features

### 최소 스타일링

1. 드래그 중인 아이템 (끌고 다니는 요소)
2. 드래그 가능 표시 (보통 좌측 햄버거 아이콘)
3. ~~드래그 중인 아이템의 원래 자리 스타일~~ → 애니메이션으로 대체
4. ~~드롭될 공간 미리 표시 스타일~~ → 공간에 맞게 벌어지는 애니메이션으로 대체

### 드래그 기능

- 마우스 드래그 시 버벅임이 없어야 함
- 드래그 가능 범위를 아이템 전체 vs 햄버거 아이콘만으로 구분 가능한지 (라이브러리 지원 여부 확인 필요)

### 드롭 기능

<!-- from PDF p.2 -->
드롭 동작 요구사항:

1. 컨테이너 우측으로 벗어나서 드래그해도 드롭이 정상 동작해야 함
2. 또는 컨테이너 너비를 벗어나지 못하도록 제한하는 기능이 필요한지 판단 (라이브러리 지원 가능 여부)

<!-- from PDF p.3 -->
- 다음 요소 높이의 절반을 넘겼을 때 그 다음 위치로 이동해야 함
- 아이템과 아이템 사이 여백에 드롭해도 정상 동작해야 함

### 드롭 후 순서 바꾸기 기능

1. 단순 리스트 순서 바꾸기 → original list를 전달하고 sorted list를 반환하는 방식
2. `useFieldArray` 기반 리스트 순서 바꾸기 → from index / to index 기반

## 직접 구현 시 TODO

### 요소 사이 드롭

<!-- from PDF p.3 -->
요소를 끌어서 요소와 요소 사이에 놓는 경우(아이템 사이 간격 영역)에 대한 대응이 필요함.

### 드래그 영역 분리

<!-- from PDF p.4 -->
텍스트를 드래그해서 복사하려 할 때 요소 전체 드래그가 발동되는 문제.

해결 방향: 드래그 핸들을 좌측 햄버거 아이콘으로만 지정하되, 핸들을 드래그하면 요소 전체가 따라가는 UI 구현 필요.
