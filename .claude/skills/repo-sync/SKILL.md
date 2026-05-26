---
name: repo-sync
description: ~/WebstormProjects/main/ 와 ~/WebstormProjects/my-else/ 하위 1뎁스 git 레포를 일괄로 양방향 동기화한다. 현재 브랜치는 fetch + ff/push로 origin과 맞추고, 일반 브랜치에서 미커밋 변경이 있으면 WIP 커밋 후 푸시한다. 보호 브랜치(master/main/develop/release)는 자동 커밋·푸시 금지. 원격·로컬 양쪽에 새 커밋이 쌓여 fast-forward 불가능한 경우는 손대지 않고 보고. "레포 동기화", "전부 sync", "다 풀받자" 같은 일괄 동기화 요청 시 사용.
---

# Repo Sync

`~/WebstormProjects/main/*`, `~/WebstormProjects/my-else/*`의 1뎁스 디렉토리를 순회하며 각 레포의 현재 브랜치를 origin과 양방향 동기화한다. 컴퓨터 2대 이상에서 작업을 이어갈 때 미푸시 작업 유실을 막는 게 목적이다.

## 용어

- **현재 브랜치**: 그 워크트리가 지금 체크아웃 중인 브랜치. 동기화 대상.
- **보호 브랜치**: 이름이 `master`, `main`, `develop`, `release` 중 하나이거나 `release/`로 시작하는 브랜치. 자동 커밋·푸시 금지.
- **일반 브랜치**: 보호 브랜치가 아닌 모든 브랜치.
- **미커밋 변경**: tracked 변경(diff·index) **또는** untracked 파일 중 하나라도 있으면 미커밋 변경으로 간주.

## 순회 범위

- `~/WebstormProjects/main/` 직속 디렉토리
- `~/WebstormProjects/my-else/` 직속 디렉토리
- 재귀 없음. 디렉토리가 git 워크트리가 아니면 (`.git` 없음) 스킵.

## 레포 1개당 절차

### 1. 사전 점검 (해당하면 스킵하고 사유 기록)

- 원격 `origin` 없음 (`git remote get-url origin` 실패)
- detached HEAD (`git symbolic-ref -q HEAD` 실패)

### 2. fetch — 모든 브랜치 ref 갱신

- `git fetch origin` (refspec 없이) 실행 → 모든 `origin/*` ref 갱신. 워킹트리·로컬 브랜치 영향 없음.
- 실패 시 그 레포는 `failed: fetch — <stderr 요약>` 기록 후 다음 레포로.

### 3. 현재 브랜치 동기화

#### 3-1. ahead/behind 계산

- `origin/<현재 브랜치>` ref가 없으면:
  - 일반 브랜치: ahead = HEAD 커밋 수, behind = 0으로 간주 (= 새 원격 브랜치 생성을 위한 첫 push 대상).
  - 보호 브랜치: `blocked: no origin tracking` 기록 후 다음 레포로.
- ref가 있으면 다음 명령으로 산출.
  ```
  git rev-list --left-right --count origin/<현재 브랜치>...HEAD
  ```
  출력은 `<behind>\t<ahead>` (왼쪽=origin에만 있음=behind, 오른쪽=로컬에만 있음=ahead).

#### 3-2. 분기 — 미커밋 변경 **없는** 경우

| ahead | behind | 일반 브랜치 | 보호 브랜치 |
|---|---|---|---|
| 0 | 0 | `up-to-date` | `up-to-date` |
| 0 | >0 | ff merge → `pulled +N` | ff merge → `pulled +N` |
| >0 | 0 | push → `pushed +N` | `blocked: protected branch ahead +N` |
| >0 | >0 | `blocked: ahead N, behind M (fast-forward 불가)` (단, [3-2-α](#3-2-α-ac-backlog-특화-분기) 적용 대상이면 그 분기로) | `blocked: ahead N, behind M (fast-forward 불가)` |

#### 3-2-α. AC backlog 특화 분기

**트리거 지점**: 3-2 표의 일반 브랜치 `ahead>0 & behind>0` 셀에서, 일반 `blocked` 처리 직전에 평가한다.

**적용 조건** (모두 충족 시):

- 레포 origin url에 `ai-contexts`가 포함됨 (AC 본체 또는 그 워크트리)
- 현재 브랜치명이 `backlog`
- ahead > 0 AND behind > 0
- 미커밋 변경 없음 (3-3에는 적용하지 않는다 — 미커밋이 있으면 `reset --keep`이 abort되어 무의미)

**판단 근거**: backlog 브랜치는 master 위에 `backlog/`만 변경되고, 정기적으로 squash + force push가 일어난다 (`/backlog` 스킬의 「스쿼시 (정리 시점)」). 양쪽에 커밋이 쌓여 있어도 backlog/ 최종 내용이 동일하거나 origin에만 추가 변경이 있는 경우는 결국 origin이 정답이다. 로컬에만 있는 변경이 있을 때만 squash 누락·미푸시 가능성이 있어 사용자 판단이 필요하다.

**판정 알고리즘**:

```
git diff origin/backlog HEAD -- backlog/
```

출력에서 `+`로 시작하는 라인(`+++` 파일 헤더 제외) 개수를 센다.

| `+` 라인 | 의미 | 처리 |
|---|---|---|
| 0 | origin 변경이 squash 또는 다른 머신의 진척만으로 이루어짐 (추가·삭제 무관). 로컬에만 있는 backlog/ 변경은 없음 | 사용자에게 `git diff origin/backlog HEAD -- backlog/ --stat` 요약 제시 후 확인 받고 `git reset --keep origin/backlog`. 결과 표기: `force-resynced (squash/progress)` |
| >0 | 로컬에만 있는 backlog/ 변경 존재 — 다른 머신 squash 시 누락인지, 이 머신에서 미푸시 작업인지 구분 불가 | reset 하지 않고 보고. 결과 표기: `blocked: local-only backlog changes` |

`--keep`은 워킹트리에 미커밋 변경이 있으면 abort하므로 데이터 손실을 막는다. 위 적용 조건에서 미커밋 변경을 이미 배제했지만, 안전망으로 `--keep`을 유지한다.

#### 3-3. 분기 — 미커밋 변경 **있는** 경우

| ahead | behind | 일반 브랜치 | 보호 브랜치 |
|---|---|---|---|
| 0 | 0 | WIP 커밋 → push → `wip-pushed +1` | `dirty` (그대로 둠, stash·커밋·푸시 안 함) |
| 0 | >0 | stash → ff merge → stash pop → WIP 커밋 → push → `pulled +M, wip-pushed +1` | stash → ff merge → stash pop → `pulled +M, dirty` |
| >0 | 0 | WIP 커밋 → push (기존 ahead와 함께) → `wip-pushed +N` | `blocked: protected branch ahead +N (uncommitted)` |
| >0 | >0 | `blocked: ahead N, behind M (uncommitted, fast-forward 불가)` (WIP 커밋·stash 안 함) | 동일 |

#### 3-4. 세부 절차

**stash**:
- `git stash push -m "repo-sync <ISO 시각>"` (untracked 제외 — `-u` 금지). 보호 브랜치 분기에서만 사용.
- stash pop 충돌 시 stash 남겨두고 `stash-conflict: stash@{0}에 남김` 기록. 자동 해결 금지.

**WIP 커밋** (일반 브랜치 한정):
- `git add -A`로 미커밋 변경(tracked·untracked 모두) staging 후 커밋.
- 커밋 메시지는 해당 레포의 commitlint 규칙을 통과하는 양식이면 된다. 작업 중이던 변경의 성격을 반영해 작성.
- 커밋 실패(commitlint 등) 시 메시지를 조정해 재시도. 그래도 실패하면 `failed: wip commit — <stderr 요약>` 기록.

**push**:
- upstream 있으면 `git push origin HEAD`.
- upstream 없으면 (일반 브랜치만 도달) `git push -u origin <현재 브랜치>`.
- `--force`·`+<refspec>` 등 force 옵션 절대 금지.
- push 실패 시 WIP 커밋이 만들어졌다면 `failed: wip committed locally; push failed — <stderr 요약>` 기록 (커밋은 그대로 남김, 사용자가 직접 처리).

### 4. 다른 보호 브랜치 ff merge 시도

현재 브랜치가 아닌 보호 브랜치들 각각에 대해 워킹트리를 건드리지 않고 ff merge를 시도한다.

- 로컬에 그 브랜치가 존재하지 않으면 스킵.
- 그 브랜치가 다른 워크트리에 체크아웃돼 있으면 스킵 (해당 워크트리가 자기 차례에 처리).
- 그 외:
  - `git fetch origin <branch>:<branch>` 시도.
  - 성공 = fast-forward 완료 → `<branch> ff +N` 기록 (N은 갱신 전후 커밋 차이).
  - 실패 = fast-forward 불가 → `<branch> ff 불가` 기록. 보고만, 자동 처리 안 함.

이 트릭은 fast-forward만 허용하고 working tree·HEAD·현재 브랜치를 건드리지 않으므로 안전하다.

### 5. 실패 처리

- 어느 단계에서 git 명령이 실패해도 다음 레포로 계속 진행.
- 실패한 레포는 가능한 한 원래 상태로 복귀 (stash가 있으면 pop 시도) 후 결과 행에 `failed: <명령> — <stderr 요약>` 기록.
- 마지막에 모든 실패·차단·dirty 사유를 사용자에게 한 번에 보고.

## 결과 리포트

순회 완료 후 표로 출력. 필수 컬럼:

- 레포 경로 (`main/ai-contexts` 형태로 축약)
- 현재 브랜치
- 현재 브랜치 상태 (`up-to-date` / `pulled +N` / `pushed +N` / `pulled +M, wip-pushed +1` 등 / `dirty` / `blocked: <사유>` / `failed: <명령>`)
- 보호 브랜치 결과 (변동·차단 있는 것만, 예: `master ff +1, develop ff 불가`)

`blocked`·`failed`·`dirty`·`ff 불가` 행이 있으면 표 아래에 "사용자 조치 필요" 섹션을 만들어 레포별로 추천 액션을 짧게 안내.

## ai-contexts 배포

레포 동기화가 끝나면 `ai-contexts` 레포에서 아래 명령을 순서대로 실행한다.

먼저 시스템 자산을 Claude/Codex 홈에 동기화한다.

```
npm run sync:system
```

그 다음 로컬 Claude 스킬을 Codex 스킬 위치로 동기화한다.

```
npm run sync:local-skills
```

- `npm run sync:system`은 `deploy/`의 시스템 자산을 `~/.claude`, `~/.codex`, `~/.gemini`에 동기화하고 `git wt-add` alias를 갱신한다.
- 순회 범위는 repo-sync와 동일하게 `~/WebstormProjects/main/`, `~/WebstormProjects/my-else/` 하위 1뎁스 git 레포다.
- 각 레포의 `.claude/skills`와 `CLAUDE.md`를 원본으로 보고, `.agents/skills`와 `AGENTS.md`/`GEMINI.md`를 생성/갱신한다.
- 로컬 스킬 수정이 필요하면 `.agents/`나 배포된 지시문 파일을 직접 수정하지 말고 해당 레포의 `.claude/` 및 `CLAUDE.md`를 수정한 뒤 다시 배포한다.

## 안전 가드

- 다음 명령은 사용하지 않는다: `git pull`(기본 동작 위험), `git pull --rebase`, `git reset --hard`, `git push --force`(또는 `+`를 붙인 force refspec), `git stash drop`, `git stash clear`.
- merge·ff는 항상 `--ff-only` 또는 `fetch origin <b>:<b>` 트릭. fast-forward 불가능한 경우는 ahead·behind 분기에서 이미 보고됐어야 한다.
- 보호 브랜치는 어떤 경우에도 자동 커밋·푸시 금지. fast-forward만 허용.
- WIP 커밋은 일반 브랜치 한정. 보호 브랜치는 미커밋이 있어도 stash·복원만 한다.
- 사용자에게 보고하기 전, 모든 레포에서 stash pop이 시도됐는지 마지막에 한 번 더 검증.
