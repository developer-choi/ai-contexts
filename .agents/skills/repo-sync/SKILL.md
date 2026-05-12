---
description: ~/WebstormProjects/main/ 와 ~/WebstormProjects/my-else/ 하위 1뎁스 git 레포를 일괄로 fetch + ff-only pull 한다. 작업 중인 변경은 tracked만 stash 했다가 끝나면 복구하고, 원래 브랜치로 돌아온다. ahead 커밋(diverged 포함)이 있으면 해당 레포는 건드리지 않고 보고. "레포 동기화", "전부 pull", "다 풀받자" 같은 일괄 최신화 요청 시 사용.
---

# Repo Sync

`~/WebstormProjects/main/*`, `~/WebstormProjects/my-else/*`의 1뎁스 디렉토리를 순회하며 각 레포의 default 브랜치를 안전하게 최신화한다. 직전 상태(브랜치 + 작업 변경)는 복원한다.

## 순회 범위

- `~/WebstormProjects/main/` 직속 디렉토리
- `~/WebstormProjects/my-else/` 직속 디렉토리
- 재귀 없음. 디렉토리가 git 워크트리가 아니면 (`.git` 없음) 스킵.

## 레포별 예외: ai-contexts-backlog

`ai-contexts-backlog` 레포는 원격 히스토리가 스쿼시·재작성될 수 있으므로 일반 ahead 차단 규칙 대신 아래 절차를 적용한다.

1. 상태 보존, default 브랜치 checkout, `git fetch origin <default>`까지는 일반 절차와 같다.
2. default 브랜치의 로컬 `HEAD`와 `origin/<default>`를 대상으로 `git merge-base HEAD origin/<default>`를 실행해 공통 조상을 확인한다.
3. 공통 조상이 있으면 일반 절차처럼 ahead/behind를 계산한다.
   - `ahead == 0 && behind > 0`: `git merge --ff-only origin/<default>`로 최신화한다.
   - `ahead > 0`: 일반 레포처럼 `blocked`로 보고한다.
4. 공통 조상이 없으면 히스토리가 다른 뿌리라고 보고, 로컬 작업이 원격에 반영돼 있는지 먼저 검증한다.
   - tracked 작업 변경을 stash한 뒤의 `HEAD`와 `origin/<default>`의 트리가 같으면 (`git diff --quiet HEAD origin/<default>` 성공), 로컬 작업이 원격에 반영된 뒤 스쿼시·정리된 것으로 간주한다. 자동 reset은 하지 않고, `blocked: unrelated history; equivalent tree; user may reset to origin/<default>`로 보고한다.
   - 트리가 다르면 유실 위험이 있다고 판단한다. 자동 reset 금지. `blocked: unrelated history; local tree differs from origin`으로 보고하고, `git diff --stat HEAD origin/<default>` 요약을 함께 남긴다.

## 레포 1개당 절차

### 1. 사전 점검 (해당하면 스킵하고 사유 기록)

- 원격 `origin` 없음 (`git remote get-url origin` 실패)
- detached HEAD (`git symbolic-ref -q HEAD` 실패)
- default 브랜치 미식별 (`git symbolic-ref refs/remotes/origin/HEAD` 실패 → 한 번 `git remote set-head origin -a` 재시도, 그래도 실패면 스킵)
- default 브랜치가 다른 워크트리에 체크아웃됨 (`git worktree list --porcelain`로 확인)

### 2. 상태 보존

- 현재 브랜치 기록
- tracked 변경 있으면 `git stash push -m "repo-sync <ISO 시각>"` (untracked는 stash하지 않음 — `-u` 금지)
- stash 했는지 플래그로 기록

### 3. default 브랜치 동기화

- 이미 default 브랜치면 checkout 스킵
- 아니면 `git checkout <default>`
- `git fetch origin <default>`
- ahead/behind 산출:
  ```
  git rev-list --left-right --count origin/<default>...HEAD
  ```
  출력은 `<behind>\t<ahead>` (왼쪽=origin에만 있음=behind, 오른쪽=로컬에만 있음=ahead).
- 분기:
  - `ahead > 0`: **중단**. merge·pull 하지 않는다. 리포트에 `blocked: ahead N, behind M` 기록.
  - `ahead == 0 && behind > 0`: `git merge --ff-only origin/<default>` → `updated (+N)` 기록.
  - 둘 다 0: `up-to-date` 기록.

### 4. 복원

- 원래 브랜치 != default면 `git checkout <원래 브랜치>`
- stash 플래그 있으면 `git stash pop`
  - 충돌 시 stash는 남겨두고 리포트에 `stash-conflict: stash@{0}에 남김` 기록. 자동 해결 금지.

## 실패 처리

- 어느 단계에서 git 명령이 실패해도 다음 레포로 계속 진행.
- 실패한 레포는 가능한 한 원래 브랜치로 복귀 + stash pop 시도 후, 결과 행에 `failed: <명령> — <stderr 요약>` 기록.
- 마지막에 모든 실패/차단 사유를 사용자에게 한 번에 보고.

## 결과 리포트

순회 완료 후 표로 출력. 필수 컬럼:

- 레포 경로 (`main/ai-contexts` 형태로 축약)
- 상태 (`updated` / `up-to-date` / `skipped` / `blocked` / `failed`)
- 사유·세부 (ahead/behind 수치, 스킵 원인, stash 충돌 여부 등)

`blocked`와 `failed` 행이 있으면 표 아래에 "사용자 조치 필요" 섹션을 만들어 레포별로 추천 액션을 짧게 안내.

## 안전 가드

- 어떤 경우에도 다음 명령은 사용하지 않는다: `git pull`(기본 동작 위험), `git pull --rebase`, `git push`, `git stash drop`, `git stash clear`.
- `git reset --hard`는 사용하지 않는다. `ai-contexts-backlog`에서 reset이 가능해 보이는 경우에도 사용자에게 판단 결과와 권장 조치만 보고한다.
- merge는 항상 `--ff-only`. ff 불가는 ahead 분기에서 이미 걸렀어야 한다.
- 사용자에게 보고하기 전, 모든 레포에서 원래 브랜치 복귀 + stash pop이 시도됐는지 마지막에 한 번 더 검증.
