# overview.md 컨벤션

`/plan/pr{N}/persistent/overview.md` — PR의 의도만 적는다. 기술 선택·근거는 [decisions.md](decisions-lifecycle.md)가 갖는다.

## 본문 항목

- 이 PR의 목표
- 의존 — `todo.md` 이 PR 절의 「의존」을 그대로 옮긴다. 없으면 `- 없음`
- 범위 요약 (뭘 만드는지의 경계)
- **열려있는 질문** — 본 PR **외부 의존성** (백엔드 합의·디자인 검수·인프라 결정 등 본 PR 안에서 해소 안 되지만 다른 PR로 옮기지도 않는 항목). 없으면 `- 없음`
- `## TODO` — 고정 헤딩. `todo.md` 이 PR 절의 TODO를 옮겨 오고, 소비 뒤에 생기는 이 PR의 TODO도 여기 쌓인다. 없으면 `- 없음`

**다른 PR로 넘긴 항목은 「열려있는 질문」이 아니라 그 PR의 TODO로 적는다** ([PR별 TODO 등록처](../pr-split.md#pr별-todo-등록처)).
