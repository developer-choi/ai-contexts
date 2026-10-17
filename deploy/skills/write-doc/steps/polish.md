# 다듬기

글의 **표현**을 다듬는다. **사실·내용은 손대지 않는다.**

## 입력

초안 단계에서 저장한 패키지, 또는 초안 단계에서 건넨 이미 완성된 글. 형식은 [package-format.md](../../../contexts/writing-guide/package-format.md) 참조. 입력 패키지를 제자리에서 Edit한다.

### 입구 정규화 — 건넨 글에 frontmatter가 없거나 필수 필드가 빠졌을 때

본문과 주변 맥락에서 frontmatter를 추론해 대상 파일에 **임시로** 붙인다. `type`·`subtype`은 호출 인자를 적는다. 형제 문서에서는 가져오지 않는다 — 아직 안 다듬은 초안일 수 있다. 추론 못 한 것만 사용자에게 한 번에 묻는다. 독자 리뷰어가 쓰는 `audience_knowledge`도 채운다.

### 시작 전 — 고치고 싶은 표현을 먼저 받는다

다듬기에 들어가기 전에, 원고에 고치고 싶은 표현을 주석으로 적어달라고 **한 번** 요청한다. 사용자 머릿속에 이미 있는 지적을 안 받고 시작하면 고쳐 보고 반려당하는 왕복이 그 지적 수만큼 늘어난다. 초안 단계를 거쳐 들어왔으면 묻지 않는다.

- 주석 꼴은 `[//]: # (...)`.
- 반영한 주석은 그 자리에서 지운다.

## 룰·사례 로드

- **룰**: `node {{skill_dir}}/scripts/guide-files.mjs --from <패키지> --for polish`가 낸 파일을 메인이 Read한다.
- **승인본**: 완성된 글로 바로 들어왔으면 `node {{skill_dir}}/scripts/approved.mjs --from <패키지>`로 승인본을 읽는다.

## 구조 — 다듬기와 판정 분리

메인이 **직접** 다듬고, 표현 판정은 **독립 리뷰어 팀원**이 한다. 쓴 쪽이 자기 글을 보면 놓친다. 단위는 승인 왕복이 고칠 거리보다 많아지지 않게 잡고, 첫 단위를 내밀 때 크기를 확인받는다.

- **한 단위를 승인받기 전에 다음 단위에 손대지 않는다.** 이미 승인받은 단위를 다시 고치게 되면 먼저 알린다.
- **리뷰어 판정은 전 단위가 끝난 뒤 본문 전체에 한 번 돈다.** 단위마다 돌리면 비용이 단위 수만큼 곱해진다.

### [SCAN_STEP] 1. 파악

- `rendering_env`가 `markdown`이 아니면 [package-format.md](../../../contexts/writing-guide/package-format.md)의 그 값 규칙대로 본문 문법을 제한한다.
- 해법·선택을 제시하는 절이 있으면 [tradeoff-guide.md](../../../contexts/writing-guide/tradeoff-guide.md)를 Read한다. 그 선택과 맞바꾼 것이 빠졌으면 채우지 않고 사용자에게 보고하고([저자만 아는 것은 일반론으로 메우지 않는다](../../../contexts/writing-guide/tradeoff-guide.md#저자만-아는-것은-일반론으로-메우지-않는다)), [서술 규칙](../../../contexts/writing-guide/tradeoff-guide.md#서술-규칙) 위반은 다듬기에서 직접 고친다.

### [EDIT_STEP] 2. 직접 다듬기

이번 단위를 tone.md 룰에 맞게 직접 Edit한다.

- 명백한 사실 오류는 사용자에게 보고한다.
- bullet·섹션·헤딩 개수는 기본 보존 — 통합·삭제·분할이 필요하면 사용자에게 한 번 확인.
- 리뷰어가 물지 않을 구절은 frontmatter `user_phrases`에 적는다([package-format.md](../../../contexts/writing-guide/package-format.md)).

### [CHECK_STEP] 3. 검수

단위는 그 단위에 걸린 채점 적발을 0으로 닫아 내밀고, 전 단위가 끝나면 본문 전체를 채점하고 리뷰어 판정을 받는다. 채점이 줄지 않거나 리뷰어 상한에 닿으면 남은 것을 보이고 남길지 사용자에게 묻는다.

- 리뷰어 프롬프트는 `node {{skill_dir}}/scripts/reviewer-input.mjs --from <패키지> --for <expression | reader>`의 출력을 덧붙이는 말 없이 그대로 쓴다. 본문을 고치면 다시 돌린 출력을 두 리뷰어 모두에게 보낸다 — 표현 리뷰어는 같은 팀원에게, 독자 리뷰어는 매번 새로 띄운다. 앞 라운드를 기억하는 독자는 처음 읽는 독자가 아니다.
- **표현 리뷰어 (`block` 0까지, 최대 3회)**: [이름 있는 팀원](../../../contexts/team-agent.md) `write-doc-expression`으로 띄운다([reviewers/expression.md](../reviewers/expression.md)).
  - `note`는 한 번만 반영한다 — 0이 될 기준이 없다.
- **독자 리뷰어 (메인이 고칠 반응이 없을 때까지, 최대 3회)**: `model: sonnet`으로 띄운다([reviewers/reader.md](../reviewers/reader.md)) — 추론해야 이해되는 글이면 그 글이 잘못된 것이다.
- 빈 응답을 `clean`으로 읽지 않는다.

### [REPORT_STEP] 4. 보고·사용자 피드백

다듬은 파일 경로를 보고한다. 오탈자·띄어쓰기는 사용자가 직접 고치는 게 빠르고, 그 밖의 수정 지시는 본문에 주석으로 모아 달면 반영한다고 한 번 안내한다.

- 문장 반려 시 단일안 말고 여러 시안을 제시해 고르게 한다.
