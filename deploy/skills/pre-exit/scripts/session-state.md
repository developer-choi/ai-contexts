# session-state.mjs 사용법

`node <pre-exit 스킬 폴더>/scripts/session-state.mjs <명령> [옵션]`

세션 마감 전에 훑을 상태를 stdout에 출력한다. 판단은 `menu`의 해당 여부까지만 하고, 무엇을 회수할지는 실행한 쪽이 정한다.

공통 전제와 실패:

- `--session <session_id>`는 `~/.claude/projects/*/<session_id>.jsonl`(Claude Code 라이브 transcript)을 찾는 키다. 못 찾으면 사유를 stderr에 출력하고 exit 1. 이때 세어보는 것으로 대신하지 않고, 못 뽑았다는 사실과 사유를 회고에 적는다
- 필요한 옵션이 빠졌거나 모르는 명령이면 사유 한 줄과 이 문서 경로를 stderr에 출력하고 exit 1
- `--repo`를 받는 명령은 생략하면 현재 폴더를 레포로 본다

## 발화·task

- `user-turns --session <id>`: 사용자 발화 전수. 표에 다 옮겼는지는 `retro-table`이 본다
  - 첫 줄 `[사용자 발화 전수] N건 …`, 발화마다 `### <번호>. <시각>`과 본문(1500자를 넘으면 앞 1200자·뒤 300자만)
  - 같은 발화를 고쳐 다시 보낸 것은 한 번호로 합치고 `(같은 발화 ×n 합침 …)`을 붙인다
  - 응답을 끊은 횟수는 끝의 `[중단]` 줄에 번호 없이 적힌다
- `commands --session <id>`: 사용자가 슬래시로 실행한 명령과 횟수. 자동 발동된 스킬은 안 남으므로 "사용하지 않았다"의 증거가 아니다
- `tasks --session <id>`: 이 세션의 task를 상태 무관하게 subject·description까지 출력한다
  - transcript 기준이고, 디스크(`~/.claude/tasks/`) 값이 다르면 `[디스크: <상태>]`, 디스크에만 있으면 `[디스크에만 있음]`을 붙인다
  - transcript가 없으면 디스크만 본다. 빠진 번호가 있으면 `[전부가 아니다]` 줄이 나온다. 그 건은 회고가 대화에서 찾아 채운다
- `retro-table --session <id> --table <표를 적은 md>`: 발화 표가 `user-turns` 번호를 다 받았는지 본다
  - 표의 행은 `| <번호> | <지적> | <어디로 갔나> |`이고 첫 칸이 `#`인 행은 헤더로 건너뛴다
  - 빠진 번호·빈칸·전수를 넘는 번호·번호 아닌 첫 칸이 있으면 그 목록과 `산출물 실패다…`를 출력하고 exit 1
  - 없으면 `빠진 번호·빈칸 없음.`과 exit 0

## 회고 항목 선택

- `menu --session <id> --repo <레포 경로> [--cwd <세션 cwd>]`: `[이번 세션에 해당하는 회고 항목]` 아래 항목마다 `<key>  해당|해당없음|항상|미확인  <근거>`. exit 0
  - `--cwd` 기본값은 현재 폴더
  - `--session`이 없거나 transcript를 못 찾아도 멈추지 않고, 대화로 판정하는 항목을 `미확인`(transcript 없음)으로 출력한다
  - `[등록 어긋남]` 줄이 나오면 SKILL.md "회고 항목" 표와 스크립트 등록이 다른 것이니 회고 전에 사용자에게 알린다
- `changed --repo <레포 경로> [--base <ref>]`: 변경 파일 수와 파일 경로로 걸리는 보강 항목
  - `--base`가 있으면 `<ref>...HEAD`, 없으면 작업 트리의 미커밋 변경을 본다
  - git이 실패하면 exit 1

## 커밋 정리

- `squash-check --repo <레포 경로> --before <정리 전 ref>`: 정리 전 ref와 HEAD의 파일 내용을 맞대 본다. `--before`는 정리를 시작하기 전에 잡아 둔 SHA다
  - 같으면 `파일 내용 차이 없음 …`과 exit 0
  - 다르면 `✗ 파일 내용이 달라졌다 …`와 `git diff --stat`을 출력하고 exit 1

## 시간·순서

- `timeline --session <id> [--notes <요약 json>] [--clip <글자수>] [--html]`: 발화마다 시각·걸린 시간·시간을 먹은 자리를 출력한다
  - `--clip` 기본값 35. 이보다 긴 발화는 잘린다
  - 발화가 5건 미만이고 총 10분 미만이면 `[시간·순서] 볼 것 없음 …`과 exit 0
  - `--notes` json은 `title`, `rows`(`{"<번호>": "<요약>"}`), `time`·`order`(문자열 배열)를 받는다
  - `--html`이면 표 대신 HTML 문서 한 장을 stdout에 출력한다

## 읽은 문서 누계

- `read-files --session <id>`: 세션이 Read나 셸 읽기 명령으로 연 프롬프트 문서(`skills`·`contexts`·`rules` 아래 md, `CLAUDE.md` 등)를 원본 레포 상대 경로로 출력한다
  - 줄 끝 괄호에 `×n`(연 횟수)·`서브에이전트`·`이번에 고침` 표시가 함께 나온다
  - 진입점과 사용 여부는 세션이 채운다
- `read-usage --session <id> --from <판정 json>`: 판정을 누계 파일에 반영한다
  - 판정 json: `{ "<진입점>\t<read-files가 낸 경로>": "used" | "unused" | "excluded" }`. 진입점은 스킬 폴더 이름이나 `전역규칙`만 받는다. `excluded`가 아닌 줄의 경로는 이 세션이 연 것이어야 한다
  - 누계 파일은 `READ_USAGE_FILE` 환경변수, 없으면 `~/WebstormProjects/main/backlog/pre-exit/read-usage.json`. 파일이 없으면 건너뛰었다고 출력하고 exit 0
  - 판정에 문제가 있으면 전부 stderr에 출력하고(모르는 진입점이면 받는 진입점 목록도) 아무것도 반영하지 않은 채 exit 1
  - 같은 세션을 다시 넣으면 `excluded`만 반영한다. `[배치 의심]` 줄이 나오면 그 목록을 회고 문제 목록에 올린다
- `review-material --session <id>`: requirement-review 보강 재료. 적용한 체크리스트, page·global 이력, 자유 검토 보고, 그 사이의 사용자 발화를 절로 나눠 출력한다

## 4단 출처 종류 누계

- `source-usage --kinds`: 받는 종류 목록과 `해당 없음` 라벨 안내를 출력한다
- `source-usage --from <라벨 json> --sections <site-usage --sections 출력 json> [--exclude <종류,…>]`: 이 회차의 4단 종류를 누계에 반영한다
  - 라벨 json: `{ "<--sections가 낸 절 제목>": "<종류>" }`. 자료가 아닌 절에는 `해당 없음`을 붙인다
  - 라벨이 빠진 4단 절, 모르는 종류, 덤프에 없는 제목, 같은 제목 중복은 전부 stderr에 출력하고 exit 1
  - `--sections` 출력에 `slug`·`date`가 있어야 한다
  - 같은 회차(날짜/슬러그)를 다시 넣으면 이미 센 종류는 다시 세지 않고, 앞에서 안 쓰였다고 센 종류가 이번에 쓰였으면 그것만 고친다
- `source-usage --exclude <종류,…>`: 그 종류를 누계에서 빼고 다시 안 띄운다. `--from` 없이도 된다
- 누계 파일은 `SOURCE_USAGE_FILE` 환경변수, 없으면 `~/WebstormProjects/main/backlog/pre-exit/source-usage.json`. 폴더가 없으면 건너뛰고 exit 0, 폴더만 있으면 파일을 새로 만든다
- `[4단 낭비 의심]` 줄이 나오면 그 목록을 회고 문제 목록에 올린다
