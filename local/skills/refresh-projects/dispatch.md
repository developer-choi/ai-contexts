# 대규모 작업 위임

대량 파일 변환·생성 작업은 현재 세션의 하위 작업자에게 몰아넣지 말고, 아래 dispatch 플로우로 새 메인 세션에 넘긴다. 소규모 작업(단일 파일 수정, Maintain 일부)은 팀 에이전트로 한다.

## dispatch 워크트리 분리

dispatch 위임 작업은 메인 워크트리에서 직접 수행하지 않는다. dispatch md에 다음을 박아 새 세션이 별도 워크트리에서 작업하도록 강제한다.

- 워크트리 경로: `<repo>/.claude/worktrees/<task>`
- base: `origin/<base-branch>` (메인 repo의 로컬 미반영 커밋 회피 — fetch 선행)
- AC 워크트리를 만들 때는 [AC worktree hook 준비](../../../meta/deploy-conventions.md#ac-worktree-hook-준비)를 따른다
- 작업·커밋·푸시는 새 워크트리에서 수행. `-result.md`는 원본 위치(`<backlog>/refresh-projects/dispatch/`, `<backlog>`=`~/WebstormProjects/main/backlog`)에 작성

## 위임 플로우

1. **지시 프롬프트 작성**: 메인 에이전트(현재 세션)가 `refresh-projects/dispatch/<project>.md`에 작업 지시를 작성한다. 포함 항목: 워크트리 분리 절차([dispatch 워크트리 분리](#dispatch-워크트리-분리)), 대상 프로젝트, 해시 범위, 해당 프로젝트 스킬 경로, 대상 파일 목록, 반영 규칙, 커밋 정책.
2. **사용자 안내**: md 경로를 주고 새 세션에서 실행해 달라고 안내한다. 그 세션은 메인 에이전트이므로 병렬 위임이 가능하면 쓰고, 막히면 순차 실행 후 제한 사항을 결과에 적는다는 것도 함께 알린다.
3. **새 세션 실행**: 사용자가 연 세션의 메인 에이전트가 지시대로 실행하고, 결과를 `refresh-projects/dispatch/<project>-result.md`에 기록한다.
4. **결과 통합**: 현재 세션에서 결과 md를 읽고 state.json 갱신 등 마무리를 수행한다.
5. **dispatch 산출물 정리**: 마무리 후 `refresh-projects/dispatch/` 하위(지시 md·결과 md·중간 산출 JSON)를 모두 삭제한다 — 다음 회차로 누적 금지.
