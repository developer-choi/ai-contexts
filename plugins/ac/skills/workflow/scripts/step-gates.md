# step-gates.mjs 사용법

`node <workflow 스킬 폴더>/scripts/step-gates.mjs <명령> …`

걸린 것이 있으면 출력 끝에 사유 목록을 stderr로 내고 exit 1, 없으면 exit 0.

## artifacts

`artifacts --plan <plan 루트> --mode <recruit|work|personal>`

`--mode`는 `recruit`(채용)·`work`(실무)·`personal`(개인)이고, 한국어 이름도 받는다.

requirement "자료 받기" 산출물이 다 있는지 센다. 항목마다 `✓`·`✗`와 경로를 출력한다.

- 늘 보는 것: `background/retained/conventions-index.md`
- 채용 모드: `background/persistent/`(비어 있지 않은 폴더)
- `background/retained/code-target.md`가 있으면 그 파일만 디자인 원본 대신 본다
- 그 밖에 개인 모드는 `background/retained/mockup/`, 채용·실무 모드는 `background/retained/figma/`(비어 있지 않은 폴더). 이때 `figma-url.md` 유무를 `figma: 있음 (figma 원본 대조)`·`없음 (캡처 대조)`로 함께 출력한다

컨벤션 인덱스만 `✗`이고 레포가 아직 없어 인덱스를 미뤘으면 넘어간다는 안내 줄이 붙는다. 넘어갈지는 호출한 세션이 가린다.

## todo-coverage

`todo-coverage plan --impl <implementation.md> --plan <plan 루트> [--repo <PR 워크트리>]` (PLAN 종료)
`todo-coverage impl --impl <implementation.md> [--stub <stub 커밋>] [--repo <PR 워크트리>]` (IMPL 종료)

- `--repo` 빼면 현재 폴더의 레포
- 두 시점 모두 본다: implementation.md 첫 내용 줄이 [양식](../conventions/artifact/implementation-spec.md#양식)의 안내문인가, "행동 결정 커버리지" 절의 표에 행이 있고 커버·면제가 모두 빈 행이 없는가
- `plan`
  - `--stub`을 받지 않는다
  - 걸린 것이 없으면 implementation.md 내용과 stub 커밋을 워크트리 git 디렉토리(`workflow-impl-plan.json`)에 기록한다
  - stub 커밋은 이 브랜치 PR의 base(`<plan 루트>/background/persistent/prs.json`에 기록한 것) 뒤 커밋 중 stub 흔적(`not implemented`·`TODO [AI_IMPL]`·`it.todo(`)을 추가한 커밋이다
  - prs.json에 이 브랜치의 base가 없거나, 그 base가 레포에 없거나, stub 커밋 뒤에 다른 커밋이 있으면 실패한다
- `impl`
  - PLAN 종료 기록이 없거나 다른 브랜치 것이면 실패한다. 기록 뒤 implementation.md가 바뀌었어도 실패한다
  - `--stub` 빼면 PLAN 종료 때 기록한 stub 커밋을 사용한다. stub 커밋이 넣은 테스트 파일마다 남은 `it.todo`와, `it(...)`로 채우지 않고 지운 `it.todo`가 있으면 실패한다

## name-check

`name-check verify [--base <기준 ref>] [--repo <레포>]`
`name-check record --base <기준 ref> --table <대조 표 파일> [--repo <레포>]`

테스트 이름 대조 뒤 `describe`·`it`·`test` 이름이 바뀌었는지 본다. 이름은 HEAD 커밋 내용에서 뽑는다. `--repo` 빼면 현재 폴더의 레포. 기록은 워크트리 git 디렉토리(`workflow-name-check.json`·`workflow-name-check-seen.json`)에 브랜치와 함께 둔다.

- 커밋 안 된 테스트 파일 변경이 있으면 두 명령 모두 그 목록을 내고 실패한다
- `verify`: 지금 HEAD를 기록한다
  - 이 브랜치 기록이 있으면 기록 뒤 새로 생기거나 바뀐 이름을 내고 실패한다. 그런 이름이 없으면 `대조 뒤 바뀐 이름 없음`과 기록한 대조 표를 출력한다
  - 이 브랜치 기록이 없으면 실패한다. `--base`를 넘기면 그 기준 뒤의 이름을 대조할 이름으로 출력한다. 그 이름이 0건이면 `대조할 테스트 이름이 없다`로 통과한다
- `record`: 테스트 이름 대조를 마친 뒤 이름과 대조 표를 기록한다
  - 지금 HEAD에서 `verify`를 돌린 기록이 없으면 실패한다
  - 같은 브랜치 기록이 있으면 대조 표를 덮어쓰지 않고 기존 표 뒤에 붙인다
  - 대조 표 파일이 없으면 exit 1

## 인자 오류

모르는 명령·하위 명령, 빠진 필수 옵션, `--mode` 값 오류, `todo-coverage`의 implementation.md 없음·`plan`에 `--stub`·레포가 아닌 `--repo`는 사유와 이 문서 경로를 stderr에 내고 exit 1. git 명령이 실패해도 exit 1.
