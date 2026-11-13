# pr-body — type마다 더 도는 절차

## [RECEIVE_STEP] 재료 받기

이미 GitHub에 게시한 PR을 다시 다듬으면, 기본 절차의 재료 읽기보다 먼저 `gh pr view <번호> --json title,body`의 title을 H1로 붙인 본문을 재료로 쓴다.

- [package-format.md](~/.claude/contexts/writing-guide/package-format.md) 꼴로 `type`·`subtype`·`key_message`를 채워 저장한 뒤 진행한다. `type`·`subtype`은 이번 호출 값을 넣고, `key_message`는 게시본 H1·본문에서 한 문장을 뽑아 넣는다(다듬기·초안으로 이어 갈 때만 확인받는다). 저장 경로는 「패키지 저장」의 추천 경로를 보여 받는다.
- 골격·패키지 저장도 이 파일에 쓴다 — 표현만 다듬어 다듬기로 바로 가도 제자리에서 고칠 파일이 있어야 한다.

그 밖에는 `plan/` 아래 재료를 열기 전에 `node ${CLAUDE_SKILL_DIR}/scripts/plan-materials.mjs <대상 레포 안 아무 경로>`를 돌린다.

1. **위치 추론**: 사용자가 재료를 직접 건넸으면 건너뛴다. 이 PR의 재료가 어디 있는지 이름 목록만 보고 추론한다 — 후보마다 열면 쓰지 않을 재료까지 컨텍스트에 실린다. 이름은 틀리게 읽힐 수 있으니 추론 근거를 한 줄로 밝히고, 후보가 갈리면 이름을 보여 묻는다.
2. **todo**: 스크립트가 낸 todo md를 열어, 이 PR 본문에 들어갈 항목을 골라 근거와 함께 보인다.

## [KEY_MESSAGE_STEP] 핵심 문장 합의

PR 제목 한 줄([가이드의 「PR 제목」](~/.claude/contexts/writing-guide/types/pr-body/guide.md#pr-제목) 기준)과 「재료 받기」에서 고른 todo 항목도 함께 확인받는다.

## [SCAN_STEP] 파악

본문 H1(PR 제목)을 [가이드의 「PR 제목」](~/.claude/contexts/writing-guide/types/pr-body/guide.md#pr-제목) 기준으로 점검하고, 본문이 제목의 주장을 뒷받침하는지 본다.

- 걸린 것을 짚고, 같은 점검을 통과한 시안을 여럿 텍스트로 마련해 사용자가 고르게 한 뒤 고른 것을 H1에 반영한다.
- `key_message`나 본문과 주장이 어긋난 것은 시안을 `key_message`에 맞춰 내되, 본문 쪽이 틀렸을 수 있으니 그 어긋남을 사용자에게 함께 알린다.

## [PUBLISH_STEP] 발행

- 발행처가 이미 열린 GitHub PR이면 `node ${CLAUDE_SKILL_DIR}/scripts/publish-pr.mjs <패키지> --pr <번호> [--repo owner/name] --apply`로 게시한다.
- PR이 아직 없으면 패키지 경로를 보고한다. PR 본문 칸에 패키지를 그대로 붙이지 않게, PR을 연 뒤 위 명령으로 제목·본문을 덮어쓰고 패키지를 지우라고 함께 안내한다.
- `--apply`가 exit 0으로 끝난 패키지는 지운다. 게시한 뒤로는 GitHub PR 본문이 정본이라, 로컬에 사본이 남으면 둘 중 어느 쪽이 최신인지 헷갈린다. 마무리 단계 안에서 게시했으면 「frontmatter 정리」 때 지운다.

## [FRONTMATTER_STEP] frontmatter 정리

게시한 패키지는 기본 절차 대신 파일째 지운다 — 패키지 `rejected`의 「이번 글만」 항목도 함께 사라진다.
