# Step 5. Virtual List — 진행 중

> 상태: 진행 중 (②). MP `feature/virtual-list` 브랜치에 보류. [PR #10](https://github.com/developer-choi/monorepo-playground/pull/10)은 GitHub상 MERGED지만 이후 커밋에서 되돌려져 **현재 MP master엔 없음** (현 master `BoardListPage.tsx`는 `useInfiniteScroll` 사용). 2026-06-25 확인.

## 현재 상태

- 구현 위치: MP `~/WebstormProjects/main/monorepo-playground` 브랜치 `feature/virtual-list` (+ `HANDOVER.md`).
- `@tanstack/react-virtual`의 `useWindowVirtualizer`로 행(row) 단위 가상화 (4열 그리드 → 행당 4카드). `estimateSize` 동적 행 높이, `overscan: 5`.
- 브랜치가 stale함: master보다 8커밋 뒤처진 지점에서 갈라져, diff에 design-system 폴더 재편·문서 삭제(931줄) 등 virtual list와 무관한 노이즈가 섞여 있음. 재머지 전 현재 master 위로 rebase 필요.

## 성능 결과 (PR #10 본문 / DC test 브랜치 step5 = 동일)

4,000개+ 로드 후 스크롤 기준:

| | Before | After | 감소율 |
|---|---|---|---|
| Long Task | 194ms | 68ms | 65% |
| setAttribute | 54.6ms | 15.4ms | 72% |
| Layout | 43.7ms | 11.8ms | 73% |
| Recalculate style | 35.0ms | 11.1ms | 68% |
| DOM 노드 (article) | 600개 | 36개 | 94% |

## HANDOVER 미결 3건 (PR 공개 전 처리 필요)

1. **코드 이해 미완** — 저자 본인이 "virtual list 렌더링 메커니즘을 완전히 이해하지 못한 상태"라고 명시. 학습 필요: `getVirtualItems()`·`getTotalSize()`·`measureElement`, `position: absolute` + `translateY` 배치 원리, row 단위 가상화 이유.
2. **훅 추출 여부 미결정** — `useWindowVirtualizer` 코드를 커스텀 훅으로 뺄지. 추출 반대 논거: virtual list는 렌더 구조(absolute+translateY) 자체를 바꿔 훅으로 숨기기 어렵고, 1회성 조합이라 재사용성 낮음. 코드 이해 후 판단하기로.
3. **`no-floating-promises` 린트** — `void fetchNextPage()` 강제가 불편. 규칙 비활성화/조정 검토.

## 메커니즘 주의 (구 로드맵과의 모순)

구 DC `feature/infinite-scroll` 로드맵 Step 8은 virtual scroll을 "DOM 재사용(재배치)"로 설명했으나, **실제 `@tanstack/react-virtual`은 화면 밖 노드를 언마운트(제거)**한다 (DOM 600→36으로 줄어드는 것이 그 증거). 재머지/문서화 시 "DOM 재사용" 표현을 그대로 옮기지 말 것.

## step5 문서 초안

DC `test/infinite-scroll`의 `docs/infinite-scroll/step5.md` = PR #10 본문과 동일한 완성형 초안. test 브랜치는 삭제 예정이나, 동일 내용이 PR #10 본문으로 GitHub에 남아 있음. virtual list가 master에 재머지되면 이 초안을 MP `docs/guides/infinite-scroll/step5.md`로 승격.

## 반영 시 첫 행동

1. MP `feature/virtual-list`를 현재 master 위로 rebase하여 design-system 노이즈 제거, virtual list 변경분만 남긴다.
2. HANDOVER 미결 1번(메커니즘 이해)부터 해소 후 PR 재오픈.
</content>
