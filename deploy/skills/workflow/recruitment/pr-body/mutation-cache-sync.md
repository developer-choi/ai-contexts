# 예약 거절 / 확정 후 목록 반영

## 문제

상세페이지에서 거절 / 확정 같은 결정을 내리고 목록으로 돌아오면, 그 예약 카드가 바뀐 상태로 보여야 합니다. 결정한 내용이 목록에 반영되지 않았습니다.

## 해결

결정을 내린 뒤 목록으로 돌아왔을 때 그 카드가 바뀌어 있으려면, 목록 캐시를 손봐야 합니다. 방법이 세 가지 있었고 하나씩 따져봤습니다.

처음 떠오른 건 캐시를 무효화하고 다시 받는 것(`invalidateQueries`)입니다. 그런데 목록은 무한스크롤이라, 사용자가 스크롤해 10페이지까지 쌓아둔 상태라면 1페이지부터 10페이지까지 요청이 한꺼번에 다시 나갑니다. 카드 하나 바꾸자고 목록 전체를 다시 받는 셈입니다.

그럼 캐시를 아예 지우면(`removeQueries`) 어떨까 했습니다. 요청은 한 번으로 줄지만, 목록이 1페이지부터 다시 로딩되며 스크롤 위치가 처음으로 튀고 로딩 스피너가 다시 돕니다. 사용자가 보고 있던 화면이 리셋되는 셈입니다.

남은 건 다시 받지 않고, 이미 가진 캐시에서 그 카드만 찾아 상태를 바꾸는 것(`setQueryData`)입니다. 서버 PATCH 응답으로 바뀐 상태를 정확히 알기 때문에 목록을 다시 받을 이유가 없습니다. 요청이 아예 나가지 않고 스크롤도 그대로라, 이 방법을 골랐습니다.

```tsx
// DecisionActions.tsx (클라이언트 컴포넌트): 서버 저장이 성공한 뒤, 목록 캐시에서 그 카드만 교체
async function submitDecision() {
  const decision: ServerDecision = popup === 'confirm' ? 'CONFIRMED' : 'DEFERRED';
  const updated = await patchReservationDecisionApi({id, decision}); // 서버 PATCH

  const date = reservedAt.slice(0, 10);
  queryClient.setQueryData(['reservations', date], (old) => ({
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      items: page.items.map((item) =>
        item.id === id ? {...item, status: toStatus(updated.status)} : item,
      ),
    })),
  }));

  router.back();
}
```

## 트레이드오프

`setQueryData`가 공짜는 아닙니다. 라이브러리에 맡기면 캐시를 알아서 갱신해 주지만, 이 방식은 캐시 구조를 개발자가 직접 알고 그 안에서 해당 카드를 짚어 바꿔야 합니다. 그만큼 손이 더 가고, 캐시 모양이 바뀌면 이 코드도 같이 손봐야 합니다.

그럼에도 이쪽을 택한 건, 결국 개발자의 수고와 사용자의 경험을 맞바꾸는 자리이기 때문입니다. 방금 "불가"로 처리한 예약이 목록에 그대로 "취소된 예약"으로 떠 있는 것보다 **직관적인 피드백**은 없기 때문입니다.
