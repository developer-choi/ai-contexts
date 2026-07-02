# QueryClient 인스턴스 생성 best practice 조사

## [draft] QueryClient 인스턴스 생성 best practice 조사

### 배경

`apps/examples/src/shared/AppProvider.tsx`에서 QueryClient를 `useState(() => new QueryClient(...))`로 생성하는 패턴이 무한 리렌더링을 유발한 사례 발생.

원인 체인: `useSuspenseQuery` 첫 suspend가 Suspense 경계 부재로 AppProvider까지 propagate → AppProvider 재마운트 시 useState가 매번 새 QueryClient 생성 → 캐시가 비워져 다시 suspend → 무한 루프.

수정 commit: monorepo-playground@f40420bf "fix(examples): useSuspenseQuery → useQuery + keepPreviousData 전환".

이번 사건은 useSuspenseQuery → useQuery 전환으로 회피했지만, QueryClient 생성 패턴 자체에 대한 best practice는 미해결. 다음 옵션들이 등장하는데 어느 게 표준인지 모호:

- `new QueryClient()` 모듈 스코프 — SSR에서 요청 간 캐시 누수 위험
- `useState(() => new QueryClient(...))` lazy init — 부모 재마운트 시 새 인스턴스 생성 (이번 사건)
- `QueryClient.getClient()` 같은 API (공식 문서에서 본 기억 있음, 정확한 시그니처/맥락 미확인)

### 조사 항목

- TanStack Query 공식 문서(tanstack.com/query/latest)의 SSR / Next.js App Router 권장 패턴
- 모듈 스코프 vs useState lazy init vs 그 외(`getClient` 등)의 사용 맥락과 trade-off
- useState lazy init이 부모 재마운트에 취약한 점이 공식 문서·이슈에서 인지된 위험인지, 회피 가이드가 있는지 (예: `<QueryClientProvider>`를 더 위로 올리라는 권장 등)

### 산출물

- 1차 소스(tanstack.com, react.dev)에서 원문 인용 함께 정리
- MP의 `apps/examples/src/shared/AppProvider.tsx` 적용 검토 — 변경 필요 시 후속 PR로 분리
- 정리 위치: `apps/examples/docs/best-practices/` 또는 `best-practice-map`의 적절한 항목

### 검증

- 정리한 패턴을 `AppProvider.tsx`에 적용해도 검색 페이지의 useDeferredValue + 새 useQuery 흐름이 정상 동작 (현재 회피 fix가 그대로 살아있는지)
- 다른 useQuery 사용처에 부작용 없는지 lint·타입체크·dev 동작 확인
