# 문제 리스트업 + 규칙화

세션에서 문제를 찾아 백로그 항목으로 남긴다. 잘한 것은 다루지 않는다.

## 재료

- 사용자 발화 전부 — `node {{skill_dir}}/scripts/session-state.mjs user-turns --session <session_id>`. 압축된 구간도 나온다
- 세션 중 task에 적어둔 회고 메모 — `node {{skill_dir}}/scripts/session-state.mjs tasks --session <session_id>`
- 앞 회고 항목이 넘긴 것

## 발화 표

`user-turns`가 낸 번호마다 한 행을 둔다. 지적이 아닌 발화도 「지적 없음」으로 행을 남긴다.

| # | 지적 | 어디로 갔나 |
|---|---|---|

채운 표를 파일로 써서 빠진 번호가 없는지 맞대 본다.

```
node {{skill_dir}}/scripts/session-state.mjs retro-table --session <session_id> --table <표를 적은 md>
```

## 무엇을 문제로 보나

- 사용자가 지적·반려·방향 수정한 것
- 내 제안을 사용자가 다르게 고른 것 — 실수가 아니라 선호 신호로 올린다
- 발화엔 안 나오고 결과로만 드러나는 것 — 내 반박이 확정본에서 뒤집힘, 검수를 통과한 산출물의 반복 반려, 같은 지적의 반복
- 재작업 — [rework.md](rework.md)
- 스킬이 데이터를 산문으로 직접 다루게 시킨 자리 — [데이터를 CRUD하는 지시](../../contexts/rules-as-code.md#데이터를-crud하는-지시--일을-대신한다)
- 읽고 안 쓴 문서 — [read-usage.md](read-usage.md)
- 걷어낼 규칙 — 문구가 이미 덮는데 어긴 것, 겹치는 규칙, 따랐는데 반려된 것

## 규칙화

규칙·문서는 이 세션에서 고치지 않고 백로그 항목으로 낸다. 교정 직후의 세션은 규칙을 늘리는 쪽으로 기울고, 형제 규칙과 나란히 놓고 판단할 수 없다. 같은 문제가 이미 백로그에 있으면 사례만 덧붙인다.

## 승인

백로그 항목은 제목이 아니라 들어갈 문안(발생한 문제·기대상황·생각중인 방법)으로 보여 승인받는다. 승인된 것만 [`/backlog`](../backlog/SKILL.md)로 만든다.
