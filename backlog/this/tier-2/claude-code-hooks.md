---
target: deploy/hooks/
---

# Claude hooks 백로그

## [ready] force push 훅의 chained command 우회 — `reset && push --force` 패턴

### 동기

`check-git-push-policy.js`는 force push 시 origin과 HEAD의 tree가 같을 때만 통과(squash·reword만 허용). 그러나 **chained shell command에서 reset이 push 앞에 같이 들어오면 훅이 우회된다.**

### 재현 (2026-05-22 실제 발생)

다음 명령으로 발생:

```bash
git -C <worktree> reset --soft HEAD~1 && \
  git -C <worktree> restore --staged <file> && \
  git -C <worktree> checkout -- <file> && \
  git -C <worktree> push --force-with-lease origin <branch>
```

직전 상태: HEAD = `efaa59c`(방금 푸시), origin/<branch> = `efaa59c`.

### 원인 — PreToolUse 시점의 상태 한정

훅은 `PreToolUse`로 chained command 실행 **전** 1회만 검사한다.

- 훅 실행 시점: HEAD = `efaa59c` (아직 reset 안 됨), origin = `efaa59c`
- 훅 내부: `git fetch origin <branch>` → 변화 없음
- 훅 내부: `git diff origin/<branch> HEAD --quiet` → **0건 (trees 동일)** → 통과
- 이후 chained 명령이 순차 실행 — reset 후 working tree 변경
- 최종 push `--force-with-lease`는 "마지막 fetch 후 origin 변경 없음"이라 통과

### 검증

훅을 reset 후 상태로 직접 호출하면 정상 deny:

```bash
echo '{"tool_input":{"command":"git -C <wt> push --force-with-lease origin <branch>"}}' | \
  node ~/.claude/hooks/check-git-push-policy.js
# → "force push 차단: origin/<branch>과 코드가 다릅니다."
```

같은 chained command를 직접 호출해도 deny가 나옴 (테스트 시점엔 이미 reset된 상태라서). 실제 Bash 실행 시점만 우회.

### 영향

- 사용자가 본 적 없는 commit이 force push로 origin에서 사라질 수 있음
- 협업 시 다른 사람의 fetch 시점에 따라 commit 유실 가능
- 글로벌 룰 「destructive operations 사용자 승인」 우회

본 사고 (2026-05-22)에서는 사용자가 명시적으로 "커밋 드랍하고 force-push"를 지시한 케이스라 실제 피해 없음. 하지만 훅 자체는 보호망 역할을 못 했음.

### 룰 (수정 방향 — 의사결정 필요)

**(a) 추천 — chained 명령 정적 패턴 매칭**

chained 명령 내에 다음 두 종류가 같이 등장하면 deny:

- history rewriting: `reset --soft|--mixed|--hard`, `rebase`, `cherry-pick`, `commit --amend`
- force push: `push --force`, `push -f`, `push --force-with-lease`

→ 사용자에게 "reset과 force push를 분리해서 각각 실행하세요" 안내. 분리 실행하면 reset 후 두번째 명령(push)이 PreToolUse 훅에서 정상 검증됨.

**(b) 비추 — chained 명령 안의 push 부분만 별도 시뮬**

reset/rebase 효과를 시뮬해서 push 시점 상태로 diff 검사. 정확도 높지만 구현 복잡 + 명령 종류 추가될 때마다 시뮬 보강 필요.

**(c) 비추 — push --force류 단독 호출 강제**

`&&` chain 안에 force push가 들어오면 무조건 deny. 정당한 chain도 막혀 UX 손해.

### 종료 조건

- `deploy/hooks/check-git-push-policy.js`에 (a) 패턴 매칭 추가
- 검증: AC `CLAUDE.md` 「deploy/hooks 검증 원칙」 적용 — 안전 시나리오로 실제 chained 명령 실행 후 deny 확인 + 임시 산출물 즉시 정리
- `npm run sync:system` 실행
- AC `CLAUDE.md` 「deploy/hooks 검증 원칙」의 force push deny 케이스 옆에 본 케이스(chained 우회) 검증 사례 추가 검토

### 첫 행동

`check-git-push-policy.js`의 `splitSegments` 활용해서 chained 명령 안의 git invocation을 모두 추출하고, history rewriting + force push 동시 등장 여부를 체크하는 로직 추가.
