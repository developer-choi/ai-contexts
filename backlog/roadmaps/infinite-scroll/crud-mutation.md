# 무한 스크롤 중 데이터 추가/삭제/수정 (Optimistic Update)

> 상태: active todo. MP에 반영 예정. 현재 MP master에 `setQueryData`·`useMutation`·optimistic 관련 코드 0건(2026-06-25 확인). 구 DC `feature/infinite-scroll` 로드맵 Step 6(저자가 ⭐ 표시)에만 있던 자료를 캡처한 것 — 원본 브랜치는 삭제 예정이라 본문으로 보존한다.

## 문제 상황

3페이지까지 스크롤해서 보는 중, 2페이지에 있던 내 댓글을 삭제/수정하면 어떻게 처리할 것인가.

> 저자 본인 메모(검토 필요): "페이지네이션이었으면 3페이지만 최신화하면 끝이라 편하다 — 고 적었으나 논리 부족. 페이지네이션이어도 *추가*했으면 1페이지로 가야 함. 무한스크롤에서 대댓글인 경우에나 이 비교가 통할 듯." → 반영 시 이 전제부터 재검토.

## ⚠️ v5 주의 — `refetchPage` 제거됨

아래 선택지·best practice 중 `refetchPage`를 쓰는 코드(선택지 5, 케이스별 "삭제"·"추가")는 **TanStack Query v5에서 제거된 API**라 현 MP(`@tanstack/react-query` v5.90.20)에서 동작하지 않는다. v5의 `invalidateQueries`는 무조건 누적된 전체 페이지를 refetch한다. "특정 페이지만" 갱신하려면 `refetchPage` 대신 `setQueryData`로 해당 page 객체를 직접 갱신하는 방식으로 재설계해야 한다. (구 로드맵 Step 6은 v4 기준이라 이 부분이 무효.)

## 선택지와 트레이드오프

### 1. 전체 페이지 리패칭 (1,2,3 모두)
```typescript
queryClient.invalidateQueries(['comments'])
```
- ✅ 가장 정확한 최신 데이터
- ❌ 서버 부하(N번 요청), 스크롤 위치 깨짐, 보던 내용이 순간 사라졌다 나타남

### 2. 현재 페이지만 리패칭 (3페이지만)
- ❌ 잘못된 방법. 그 사이 데이터 추가로 페이지네이션이 밀려 2페이지 끝 댓글이 3페이지로 넘어옴

### 3. Optimistic Update
```typescript
queryClient.setQueryData(['comments'], (old) => {
  // pages 배열 순회하며 해당 댓글만 수정/삭제
})
```
- ✅ 즉각 반응(네트워크 왕복 없음), 스크롤 위치 유지
- ❌ 실패 시 롤백 복잡, 다른 사람 변경은 반영 안 됨

### 4. Hybrid: Optimistic + 백그라운드 리패칭
```typescript
queryClient.setQueryData(...) // 즉시 화면 업데이트
queryClient.invalidateQueries(['comments'], { refetchType: 'none' }) // 다음 포커스/마운트 시 조용히
```

### 5. 부분 무효화 (Page-level Invalidation)
```typescript
queryClient.invalidateQueries({
  queryKey: ['comments'],
  refetchPage: (page, index) => index === targetPageIndex
})
```

## 케이스별 Best Practice (구 로드맵 제안 — 반영 시 검증 필요)

**삭제**: Optimistic Delete로 즉시 제거 + 해당 페이지만 백그라운드 재검증
```typescript
queryClient.setQueryData(['comments'], removeComment)
setTimeout(() => queryClient.invalidateQueries({
  queryKey: ['comments'],
  refetchPage: (page, index) => index === targetPageIndex
}), 1000)
```

**수정**: Optimistic Update만으로 충분 (다른 사람 데이터와 충돌 없음)
```typescript
queryClient.setQueryData(['comments'], updateComment)
```

**추가**: 맨 위에 추가(일반 댓글)
```typescript
queryClient.setQueryData(['comments'], (old) => { old.pages[0].data.unshift(newComment) })
// 또는 첫 페이지만 리패칭: refetchPage: (page, index) => index === 0
```

## 반영 시 첫 행동

1. `refetchPage`는 v5에서 제거됨(현 MP v5.90.20)이 확정 — 위 "v5 주의" 참고. 케이스별 best practice를 `setQueryData` 직접 갱신 기반으로 재설계.
2. MP 게시판 예제에 mutation 대상(댓글/게시글 CRUD)을 추가할지, 데모용 mock mutation으로 할지 결정.
3. 위 "저자 본인 메모"의 페이지네이션 비교 전제부터 재정리한 뒤 문서화.

## 실전 서비스 분석 (구 로드맵 아이디어 — 선택)

유튜브 댓글·네이버 카페·인스타그램·트위터(X)·페이스북이 즉시 반영/백그라운드 리패칭/스크롤 위치 유지/로딩 인디케이터/에러 처리를 각각 어떻게 하는지 비교. (반영 범위에 포함할지는 구현 시 판단)
</content>
