# 무한 스크롤 로드맵

DC(`developer-choi`) 게시판 목록 예제로 무한 스크롤을 단계별로 구현·문서화한 코스. 구현은 MP(`monorepo-playground`)에서, 문서는 DC `docs/infinite-scroll/`에서 진행됐다.

이 로드맵은 2026-06-25 기준으로, 흩어져 있던 DC 임시 브랜치 2개의 내용을 진행 상태별로 정리해 캡처한 것이다. 임시 브랜치는 캡처 후 삭제 예정.

## 원본 (캡처 후 삭제 예정)

- 레포: `~/WebstormProjects/my-else/developer-choi` (= DC, `github.com/developer-choi/developer-choi`)
- 브랜치:
  - `feature/infinite-scroll` (2026-02-24) — 구버전 8단계 학습 로드맵 (`docs/infinite-scroll-roadmap.md`). UX 개론·CRUD 처리 등 **여기에만 있는 자료**는 아래 todo 파일로 캡처함.
  - `test/infinite-scroll` (2026-03-27) — 정제된 5단계 문서 (`docs/infinite-scroll/step1~5.md`). step1~4는 MP master 가이드와 동일 계열, step5(virtual)는 PR #10 본문과 동일.
- 구현 레포: MP `~/WebstormProjects/main/monorepo-playground` (`github.com/developer-choi/monorepo-playground`)

## 진행 상태

### ① 완료 — MP master에 반영됨

GitHub MP master 코드로 검증함 (2026-06-25). 문서는 MP `docs/guides/infinite-scroll/step1~4.md`에 존재.

| 단계 | 내용 | PR |
|---|---|---|
| Step 1 | 렌더링 전략 CSR → SSR Prefetch → Streaming | [PR #6](https://github.com/developer-choi/monorepo-playground/pull/6) |
| Step 2 | 이미지 최적화 — srcset + sizes + Cloudinary CDN (용량 97% 감소) | [PR #7](https://github.com/developer-choi/monorepo-playground/pull/7) |
| Step 3 | 무한 스크롤 구현 — IntersectionObserver, `staleTime: Infinity` + `gcTime: 30_000`, React.memo (렌더 600→120회) | [PR #8](https://github.com/developer-choi/monorepo-playground/pull/8) |
| Step 4 | 에러 방어 — 무한 재요청 방지(`enabled = hasNextPage && !isFetchingNextPage && !isError`), 빈 목록 안내 | [PR #9](https://github.com/developer-choi/monorepo-playground/pull/9) |
| 상태별 UI | Skeleton·`isFetchingNextPage` 로딩 인디케이터·빈 목록 (구 로드맵 Step 4 "상태별 UI 제어"에 해당) | Step 1·3·4에 포함 |

> 주의: 구 로드맵의 캐싱 값 `gcTime: 0`은 **폐기**됨. 현재는 `gcTime: 30_000`(스크롤 위치 복원 위해). 구버전 자료를 참고할 때 이 값만 갈아끼울 것.

### ② 진행 중 — MP `feature/virtual-list`

Step 5 Virtual List. [virtual-list.md](./infinite-scroll/virtual-list.md) 참고.

- [PR #10](https://github.com/developer-choi/monorepo-playground/pull/10)은 GitHub상 MERGED지만 **이후 커밋에서 되돌려져 현재 master엔 없음**. 현 master `BoardListPage.tsx`는 virtualizer가 아니라 `useInfiniteScroll`을 씀.
- 구현은 MP `feature/virtual-list` 브랜치에 보류돼 있고, HANDOVER에 미결 3건(메커니즘 이해·훅 추출 여부·lint 규칙)이 남음.

### ③ 앞으로 반영할 것 (active todo)

- [crud-mutation.md](./infinite-scroll/crud-mutation.md) — 무한 스크롤 중 데이터 추가/삭제/수정 (Optimistic Update). 현재 MP에 mutation/optimistic 코드 0건.
- [ux-intro.md](./infinite-scroll/ux-intro.md) — 무한 스크롤 UX 개론 intro 문서.

## References (구 로드맵 상단 자료 링크)

- [포카마켓 task PR](https://github.com/developer-choi/pocamarket-frontend-task/pull/4)
- [useInfiniteQuery, Paginated Query](https://docs.google.com/document/d/1T73VImuRBctQUfQzwBx6yljP9s7LvKSnWak3neSobGE/edit)
- [Infinite Scroll](https://docs.google.com/document/d/1IeMIvPc-18TKEscvuRYmktziMxieeKW_wJGB779nOXg/edit)
- [페이지 최신화 방법 fetch() / RQ](https://docs.google.com/document/d/1ir7P3J1WbsIrqa2vNQ1Co39QYmkV4ef6MHcluH6m90s/edit)
- [Virtual List](https://docs.google.com/document/d/1z2U7x3FFcdUNTtFdq-t5kg6XTE7tptUaCAxMgbt7VfE/edit)
</content>
</invoke>
