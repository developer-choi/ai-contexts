# 상태 관리: effect 동기화 대신 렌더 중 계산(useMemo)

## 문제

시간대 그룹(`groups`)을 처음엔 `useState` + `useEffect`로 뒀습니다. `items`가 바뀌면 effect에서 `groupByTime`을 다시 돌려 `setGroups`로 맞추는 구조입니다.

```tsx
const [groups, setGroups] = useState(() => groupByTime(items));

useEffect(() => {
  setGroups(groupByTime(items));
}, [items]);
```

그런데 `groups`는 `items`만으로 100% 계산되는 파생값입니다.

## 왜 이것이 문제인가?

한쪽을 바꿀 때 다른 쪽 갱신을 빠뜨리면 둘이 어긋납니다.

위 코드는 `useEffect`로 그 동기화를 걸어 뒀지만, 이렇게 손으로 맞추는 구조는 데이터를 건드리는 경로가 하나 늘 때마다 깨지기 쉽습니다.

```tsx
function addReservation(next: Reservation) {
  setItems((prev) => [...prev, next]);
  // setGroups(...)를 함께 부르는 걸 깜빡하면 groups는 옛 목록 그대로라 화면이 어긋난다
}
```

`items`는 갱신되지만 `groups`는 옛 값으로 남아 화면이 실제 데이터와 어긋납니다. state가 둘이면 이 동기화를 사람이 매번 챙겨야 합니다.

파생값을 애초에 state로 두지 않으면 이 문제 자체가 사라집니다: [Avoid redundant state](https://react.dev/learn/choosing-the-state-structure#avoid-redundant-state).

다른 값으로 부터, 계산할 수 있다면 그것은 state에 저장할 이유가 없습니다.

## 해결

```tsx
const groups = useMemo(() => groupByTime(items), [items]);
```

state·effect를 제거하고 렌더 중 계산으로 바꿨습니다.
