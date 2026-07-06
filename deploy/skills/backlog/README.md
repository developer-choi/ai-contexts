# Backlog

이 저장소의 작업 아이디어와 외부 저장소(knowledge-archive·monorepo-playground 등) 작업·지식·참고를 수집·분류·정리하는 스킬입니다. `/backlog` 슬래시로 명시 호출할 때만 동작합니다.

## 동기

개발하다 보면 "이건 스킬로 만들면 좋겠다", "이 스킬에 이 기능을 추가하고 싶다" 같은 아이디어가 떠오릅니다.

메모를 쌓는 건 쉽지만, 관리하는 데 시간이 많이 들었습니다. 새 메모가 기존에 적어둔 것과 겹치는지 확인하고, 겹치면 병합하고, 스킬 단위로 분류하고, 우선순위를 매기는 과정이 반복됐습니다.

이 정리 작업 자체를 AI에게 맡기기로 했습니다.

`/backlog`로 메모를 넘기면 AI가 영역 단위로 분류하고, 기존 백로그와 병합하고, 기존 스킬·프로젝트와의 관계를 식별합니다. 충분히 구체화된 항목은 실제 스킬로 만드는 단계로 넘깁니다.

## 영역 분리

백로그는 두 영역으로 나뉩니다.

- `backlog/projects/{project}/`: 저장소별(knowledge-archive·monorepo-playground 등) 작업·지식·참고. 기본 무상태(tier 없음, Ready 게이트 미적용)입니다. 단 `ai-contexts`(자기수정)·`private-playground`의 `active/`에 캡처하는 fix·룰 트래커 항목(`## 기대상황`을 갖는 양식)은 tier·Ready 게이트가 적용되고, 다른 projects도 frontmatter `status: ready`를 opt-in하면 게이트가 적용됩니다(영역 무관). 같은 폴더라도 개인 메모·완성형 노트는 트래커가 아니라 해당 없습니다.
- `backlog/articles/{slug}/`: 기술블로그에 발행할 포스트 재료. tier 없음, Ready 게이트 미적용.

`ai-contexts`·`private-playground`의 `active`에 캡처하는 fix·룰 트래커 항목이 할 일 트래커이고, 그 외 `projects`·`articles`는 비-트래커입니다. `projects`는 저장소별 작업·지식, `articles`는 외부 발행용 재료입니다.

## Ready 게이트와 critic

`ai-contexts`·`private-playground`의 `active` 트래커 항목(또는 `status`를 opt-in한 projects 항목)은 다른 세션·다른 머신의 자신이 추가 질문 없이 작업을 시작할 수 있는 수준이 되면 frontmatter `status: ready`가 붙습니다. critic 서브에이전트가 게이트 문항(외부 인용 임베드, 시점 표현 0개, 동기 1줄, 종료 조건, 첫 행동, 트래커 항목이면 현재상태·현재 생각중인 방법)을 사용자 대신 검증해 상태를 갱신합니다.

## 항목 양식

백로그 1건은 파일 1개입니다. 트래커 항목은 frontmatter에 `title`(필수)과 `status`(`ready`/`draft`/`ideation`)를 표기하고, 본문은 다음 헤딩(H2)으로 구성합니다.

- **기대상황** (필수): 도달하고자 하는 최종 상태
- **현재상태** (트래커 항목 필수): 지금 어떻게 박혀 있어 어긋나는지 — 왜 이 작업이 필요한지의 근거
- **현재 생각중인 방법** (트래커 항목 필수): 후보 방안 — 작성 세션의 의견 (미확정 가능, 실행자는 맹목 적용하지 말 것)

## 자동 트리거 없음

자연어로 들어온 메모·기록 의도("백로그에 넣어둬" 등)는 메인 LLM이 직접 답변·TaskCreate·`/backlog` 중에서 판단합니다. `/backlog` 자동 트리거 매핑은 두지 않습니다. 슬래시로 명시 호출할 때만 동작합니다.

> 자세한 내용은 [SKILL.md](SKILL.md)를 참고하세요.
