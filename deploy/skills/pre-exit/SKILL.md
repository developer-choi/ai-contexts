---
disable-model-invocation: true
name: pre-exit
description: 세션을 마무리한다. 문제 리스트업, 규칙화+사례 축적, 미커밋 확인, 커밋 정리를 수행한다.
argument-hint: "[보강 회고: workflow | digest | write-refine | routine | refresh-prompts (무인자 시 자동 감지) / 오답노트: error-notebook]"
---

# 세션 마무리

## 목적

세션을 회고한다. 잘못된 것은 다음에 안 하고, 잘된 것은 다음에도 하게 만든다.

회고에서 건진 것은 대화와 함께 사라지고 다음 세션은 아무것도 모르는 채 시작한다. 그래서 세션이 닫히기 전에, 남겨야 할 것을 골라 규칙과 사례가 사는 자리에 심는다.

## 보강 회고 분기

본 절차 시작 전, 보강 회고가 필요한지 판단한다. 인자·자동 감지로 매칭된 보강이 있으면 해당 `augmentations/<키워드>.md`를 실행한다. 본 보강은 Step 1 진입 **전에** 수행하며, 발견 항목은 Step 1의 문제 목록에 합류한다.

| 인자 / 감지 조건 | 보강 파일 |
|---|---|
| `workflow` 인자, 또는 이 세션에 `plan/pr{N}/**` 변경 존재 | [augmentations/workflow.md](augmentations/workflow.md) |
| `digest` 인자, 또는 본 세션 `/digest` 호출·digest OFF 직후, 또는 `knowledge/**` 신규·수정 존재 | [augmentations/digest.md](augmentations/digest.md) |
| `write-refine` 인자, 또는 본 세션 `/write-refine` 호출 | [augmentations/write-refine.md](augmentations/write-refine.md) |
| `routine` 인자, 또는 cwd가 `private-playground`이고 세션에서 `/routine-*` 스킬 호출 | [augmentations/routine.md](augmentations/routine.md) |
| `refresh-prompts` 인자, 또는 본 세션 `refresh-prompts` 회차 진행, 또는 `backlog` 레포 `refresh-prompts/state.json` 변경 존재 | [augmentations/refresh-prompts.md](augmentations/refresh-prompts.md) |

감지 조건 중 **파일로 갈리는 쪽**은 `node {{skill_dir}}/scripts/session-state.mjs changed --repo <레포 경로>`가 낸다. 대화 쪽 조건(그 스킬을 이 세션에서 불렀는가)은 세션만 아는 사실이라 그대로 판단한다.

자동 감지로 매칭된 경우 보강 실행 전 사용자 확인을 받는다. 인자가 명시되면 확인 없이 바로 실행한다.

표에 없는 인자가 하나 더 있다 — `error-notebook`은 보강 파일을 부르지 않고 Step 1의 「몰라서 물어본 질문 수집」을 켠다.

회고 항목이나 보강을 **새로 만들** 때는 [new-retro.md](new-retro.md)를 따른다. 회고를 도는 세션은 열지 않는다.

## Step 1. 문제 리스트업 + 규칙화

세션에서 **문제만** 추출해 규칙으로 심는다. 절차는 [step-1.md](step-1.md)를 따른다.

## Step 2. 미커밋 변경사항 확인

커밋되지 않은 변경사항이 있는지 확인한다. 있으면:
- 파일 목록을 사용자에게 보고한다
- 커밋 여부를 묻고, 사용자가 지시하면 이어서 커밋까지 수행한다
- 지시가 없으면 그대로 둔다

## Step 3. 커밋 정리

이번 세션이 쌓은 커밋을 작업 단위로 합친다. **사용자 지시를 기다리지 않는다** — 세션마다 반복되는 정리라 매번 묻는 것 자체가 비용이다.

- 대상은 이번 세션이 만든, 아직 기본 브랜치에 머지되지 않은 커밋이다. 이전 세션 커밋과 머지된 것은 건드리지 않는다
- 파일 하나를 쓸 때마다 커밋하게 하는 스킬이 돌았으면 커밋이 잘게 남는 것이 정상이다. 그 조각들이 한 작업이면 하나로 합친다. 서로 다른 작업이면 작업 수만큼 남긴다
- 정리를 **시작하기 전에** 그 시점 SHA를 잡아두고, 합친 뒤 `node {{skill_dir}}/scripts/session-state.mjs squash-check --repo <레포 경로> --before <그 SHA>`로 파일 내용이 같은지 본다. 무엇을 무엇으로 합쳤는지는 함께 보고한다
- workflow 세션은 대상이 아니다 — 커밋 정리 시점을 그 스킬의 「1회차 커밋 정리·재정렬」이 소유한다

## Step 4. 워크트리 정리

이번 세션에서 `git worktree add`로 생성한 워크트리만 대상이다. 이전 세션부터 존재하던 워크트리는 그대로 두고 언급하지도 않는다.

지우기 전에 둘을 확인한다 — **미커밋 변경이 있는가**, **기본 브랜치에 아직 없는 커밋이 있는가**.

- 둘 다 없으면 사용자 지시를 기다리지 않고 제거한다
- 하나라도 있으면 무엇이 남았는지 보고하고 지시를 기다린다 — 브랜치까지 함께 지우는 제거 경로에서는 그 커밋이 사라진다

## Step 5. 브라우저 탭 정리

**이 세션에서 브라우저를 연 경우에만 수행한다.** 안 열었으면 건너뛰고 보고에 적지 않는다 — 확인용 도구도 부르지 않는다.

대상은 이번 세션에서 연 탭뿐이다. 사용자가 직접 열어둔 탭·창은 건드리지 않고 언급하지도 않는다.

- 그 탭이 아직 열려 있는지 확인하고, 남아 있으면 사용자 지시를 기다리지 않고 닫는다. 처리 결과(닫음 / 이미 닫혀 있었음)를 한 줄로 보고한다
- [pre-compact 스냅샷 회수](step-1.md#pre-compact-스냅샷-회수)에서 스냅샷이 나온 세션은 압축에 기억이 씻겼을 수 있으므로, 이 세션 소유 탭이 남아 있는지 한 번 조회해 보강한다
