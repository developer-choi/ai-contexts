# steps.mjs 사용법

`node <workflow 스킬 폴더>/scripts/steps.mjs <명령> …` — 스크립트 소스를 읽지 않아도 이 문서로 부를 수 있다.

실패는 모두 exit 1이고 사유를 stderr에 낸다. 명령·옵션을 잘못 주면 사유 뒤에 이 문서의 경로가 붙는다.

## 세션 인자 (`next`·`start` 공통)

- `--mode <모드>` 필수. `recruit`(채용)·`work`(실무)·`personal`(개인). 한국어 이름도 받는다
- `--prefix <접두어>` 개인 모드 필수. 실무·채용은 있으면 세션 이름에 붙인다
- `--plan <plan 폴더>` 없으면 개인 `plan/<접두어>`, 실무·채용 `plan`. 상대경로는 메인 레포 루트 기준
- `--pr <N>` 명령마다 뜻이 다르다(아래 각 절)

## next

`next <step> --mode <모드> [--prefix <접두어>] [--plan <plan 폴더>] [--pr <N>]`

그 step 뒤의 후속(같은 세션 이어서 / spawn / 출발 알림)을 낸다. spawn마다 `claude --model … --name …` 실행 명령을 낸다. 인자는 `start`가 찍은 next 줄의 값을 준다.

- plan 폴더가 이미 있어야 한다
- `--pr`이 있으면 그 PR의 진행 단계를 먼저 기록한다. step이 `plan`이면 그 전에 `<plan>/pr<N>/persistent/`의 `overview.md`·`reference.md`가 있어야 한다

## start

`start <세션> --mode <모드> [--prefix <접두어>] [--plan <plan 폴더>] [--pr <N>]`

메인 레포 루트·plan(절대경로)·세션의 첫 step 파일·step 순서·진입 조건·권장 모델·값을 채운 next 줄을 낸다. PR에 종류가 있으면 읽을 종류 문서도 낸다.

- BG가 아니면 plan 폴더가 이미 있어야 한다
- `--pr`은 PR 하나를 맡는 세션(`PR_{N}_…`)에만 준다. `{N}` 자리에 번호를 넣은 세션 이름도 받고, 그때는 이름의 번호를 PR로 쓴다(`--pr`을 함께 주면 같은 번호여야 한다). 단계는 기록하지 않는다

## chain

`chain <세션>` — 세션의 step 순서만 낸다. 다른 인자는 받지 않는다.

## pr

PR 진행 상태는 `<plan>/background/persistent/prs.json`에 있고 이 명령만 쓴다. 모든 `pr` 하위명령에 `--plan <plan 폴더>`가 필요하고, 그 폴더는 이미 있어야 한다. `prs.json`과 그 위 폴더는 첫 `pr add`가 만든다.

- `pr add --plan <plan 폴더> --name <이름> [--type <종류>] [--deps 1,2]` — PR을 확정하고 `PR <N>. <이름> 확정 (번호 <N>)`을 출력한다
  - `<종류>`는 workflow 스킬 `conventions/pr-types/`의 파일 이름이다(대소문자 무관, 대문자로 기록). 모르는 값이면 받는 값 목록을 낸다
  - `--deps`는 이미 등록된 선행 PR 번호를 쉼표로 이어 준다
  - 출력 끝의 안내 줄은 호출한 세션이 할 일이다. 종류·의존을 빠뜨렸다는 줄은 `pr set`으로 채우라는 것이다. todo.md에 절을 붙이라는 줄은 세션이 plan의 todo.md에 직접 쓰라는 것이다(스크립트는 todo.md를 쓰지 않는다. 절 양식은 [pr-split](../conventions/pr-split.md))
- `pr set --plan <plan 폴더> --n <N> [--name <이름>] [--type <종류>] [--deps 1,2] [--branch <브랜치> --base <ref> [--repo <레포>]]` — 바꿀 값을 하나 이상 준다
  - `--type`·`--deps`는 그 PR이 아직 `confirmed` 단계일 때만 바꾼다
  - `--branch`·`--base`는 함께 주고, 서로 달라야 하며, 다른 PR이 쓰는 브랜치는 못 쓴다. `--repo`를 빼면 현재 폴더를 레포로 본다
  - 이름·의존을 바꾸면 todo.md 쪽도 세션이 고치라는 안내 줄이 나온다
- `pr list --plan <plan 폴더>`
- `pr branches --plan <plan 폴더> --repo <레포>` — PR마다 형태(스택·독립)·범위 커밋을 낸다. 스택인데 아래 브랜치 tip이 안 들어 있으면 어긋남으로 exit 1
- `pr links --plan <plan 폴더> --repo <레포> --n <N> --body <PR 본문 md>` — 본문의 커밋 링크마다 그 SHA가 이 PR의 base..branch 범위에 있는지 본다. 어긋난 링크가 있으면 exit 1

## graph

`graph` — mermaid 흐름도 초안을 stdout에 낸다. README 흐름도는 이걸 바탕으로 사람이 다듬는다.

## check

`check`: step frontmatter의 `on` 값과 헤딩의 대응, `when`의 표기를 검사한다. 어긋나면 건수와 함께 exit 1.

## step frontmatter의 `when`

`next`가 판정하는 영어 키:

- `NOT_CODE_TARGET`(코드 대용 아님): `background/retained/code-target.md`가 없다
- `MARKUP_NOT_SKIPPED`(마크업 생략 아님): `background/retained/no-markup.md`가 없다

쉼표로 나열한 조건은 모두 맞아야 한다. 키·`종류 <TYPE>`·`<TYPE> PR 없음` 밖의 `when`은 판정하지 않고 그대로 찍는다.
