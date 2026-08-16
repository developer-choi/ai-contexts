---
name: repo-sync
description: ~/WebstormProjects/main/, ~/WebstormProjects/my-else/, ~/WebstormProjects/simplify/ 하위 1뎁스 git 레포를 일괄로 양방향 동기화한다. 현재 브랜치는 fetch + ff/push로 origin과 맞추고, 일반 브랜치에서 미커밋 변경이 있으면 WIP 커밋 후 푸시한다. 보호 브랜치(master/main/develop/release)는 자동 커밋·푸시 금지. 원격·로컬 양쪽에 새 커밋이 쌓여 fast-forward 불가능한 경우는 손대지 않고 보고. "레포 동기화", "전부 sync", "다 풀받자" 같은 일괄 동기화 요청 시 사용.
---

# Repo Sync

## 목적

내가 자주 쓰는 프로젝트들을 origin과 동기화한다.

`~/WebstormProjects/main/*`, `~/WebstormProjects/my-else/*`, `~/WebstormProjects/simplify/*`의 1뎁스 디렉토리를 순회하며 각 레포의 현재 브랜치를 origin과 양방향 동기화한다. 컴퓨터 2대 이상에서 작업을 이어갈 때 미푸시 작업 유실을 막는 게 목적이다.

## 용어

- **현재 브랜치**: 그 워크트리가 지금 체크아웃 중인 브랜치. 동기화 대상.
- **보호 브랜치**: 이름이 `master`, `main`, `develop`, `release` 중 하나이거나 `release/`로 시작하는 브랜치. 자동 커밋·푸시 금지.
- **일반 브랜치**: 보호 브랜치가 아닌 모든 브랜치.
- **미커밋 변경**: tracked 변경(diff·index) **또는** untracked 파일 중 하나라도 있으면 미커밋 변경으로 간주.

## 순회 범위

- `~/WebstormProjects/main/` 직속 디렉토리
- `~/WebstormProjects/my-else/` 직속 디렉토리
- `~/WebstormProjects/simplify/` 직속 디렉토리
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
- ref가 있으면 `origin/<현재 브랜치>`와 HEAD의 양쪽 전용 커밋 수를 센다.

#### 3-2. 분기 — 미커밋 변경 **없는** 경우

| ahead | behind | 일반 브랜치 | 보호 브랜치 |
|---|---|---|---|
| 0 | 0 | `up-to-date` | `up-to-date` |
| 0 | >0 | ff merge → `pulled +N` | ff merge → `pulled +N` |
| >0 | 0 | push → `pushed +N` | `blocked: protected branch ahead +N` |
| >0 | >0 | `blocked: ahead N, behind M (fast-forward 불가)` | `blocked: ahead N, behind M (fast-forward 불가)` |

#### 3-3. 분기 — 미커밋 변경 **있는** 경우

| ahead | behind | 일반 브랜치 | 보호 브랜치 |
|---|---|---|---|
| 0 | 0 | WIP 커밋 → push → `wip-pushed +1` | `dirty` (그대로 둠, stash·커밋·푸시 안 함) |
| 0 | >0 | stash → ff merge → stash pop → WIP 커밋 → push → `pulled +M, wip-pushed +1` | stash → ff merge → stash pop → `pulled +M, dirty` |
| >0 | 0 | WIP 커밋 → push (기존 ahead와 함께) → `wip-pushed +N` | `blocked: protected branch ahead +N (uncommitted)` |
| >0 | >0 | `blocked: ahead N, behind M (uncommitted, fast-forward 불가)` (WIP 커밋·stash 안 함) | 동일 |

#### 3-4. 세부 절차

**stash**: 보호 브랜치 분기에서만 쓰고, untracked는 담지 않는다. 다른 세션이 같은 stash 스택을 쓰므로 이 회차가 만든 항목을 식별할 수 있게 이름을 남긴다. pop 충돌 시 stash를 남겨두고 `stash-conflict: <위치>에 남김` 기록 — 자동 해결 금지.

**WIP 커밋** (일반 브랜치 한정):
- 무엇이 바뀌었는지 모르는 상태에서 커밋하는 단계라, 경로 목록을 먼저 얻어 개별 지정한다(untracked 포함). rename 항목은 새 경로·옛 경로가 따로 나오므로 둘 다 넘긴다.
- 목록이 비면 미커밋 변경이 없다는 뜻이므로 이 단계를 건너뛴다 (「미커밋 변경 있는 경우」 분기로 들어왔는데 비었다면 그 사이 상태가 바뀐 것이니 재판정한다).
- 커밋 메시지는 작업 중이던 변경의 성격을 반영해 작성.
- 커밋 실패 시 메시지를 조정해 재시도. 그래도 실패하면 `failed: wip commit — <stderr 요약>` 기록.

**push**: upstream이 없으면(일반 브랜치만 도달) 이번 push에서 함께 설정한다. push 실패 시 WIP 커밋이 만들어졌다면 `failed: wip committed locally; push failed — <stderr 요약>` 기록 (커밋은 그대로 남김, 사용자가 직접 처리).

### 4. 다른 보호 브랜치 ff merge 시도

현재 브랜치가 아닌 보호 브랜치들 각각에 대해 워킹트리를 건드리지 않고 ff merge를 시도한다.

- 로컬에 그 브랜치가 존재하지 않으면 스킵.
- 그 브랜치가 다른 워크트리에 체크아웃돼 있으면 스킵 (해당 워크트리가 자기 차례에 처리).
- 그 외:
  - `git fetch origin <branch>:<branch>` 시도.
  - 성공 = fast-forward 완료 → `<branch> ff +N` 기록 (N은 갱신 전후 커밋 차이).
  - 실패 = fast-forward 불가 → `<branch> ff 불가` 기록. 보고만, 자동 처리 안 함.

### 5. 실패 처리

실패한 레포는 가능한 한 원래 상태로 복귀시킨다 (stash가 있으면 pop 시도).

## 결과 리포트

순회 완료 후 표로 출력. 필수 컬럼:

- 레포 경로 (`main/ai-contexts` 형태로 축약)
- 현재 브랜치
- 현재 브랜치 상태 (위 3-2·3-3 표의 결과 문자열)
- 보호 브랜치 결과 (변동·차단 있는 것만, 예: `master ff +1, develop ff 불가`)

`blocked`·`failed`·`dirty`·`ff 불가` 행이 있으면 표 아래에 "사용자 조치 필요" 섹션을 만들어 레포별로 추천 액션을 짧게 안내.

## 안전 가드

- 다음 명령은 사용하지 않는다: `git pull`(기본 동작 위험), `git pull --rebase`, `git stash drop`, `git stash clear`.
- merge·ff는 항상 `--ff-only` 또는 `fetch origin <b>:<b>` 트릭. fast-forward 불가능한 경우는 ahead·behind 분기에서 이미 보고됐어야 한다.
- 보호 브랜치는 어떤 경우에도 자동 커밋·푸시 금지. fast-forward만 허용.
- WIP 커밋은 일반 브랜치 한정. 보호 브랜치는 미커밋이 있어도 stash·복원만 한다.
- 사용자에게 보고하기 전, 모든 레포에서 stash pop이 시도됐는지 마지막에 한 번 더 검증.
