# blocked-expressions.mjs 사용법

사용자가 반려한 말을 금지 표현 목록(`scripts/hooks/blocked-expressions.json`)에 올리고, 고치고, 검사한다. 목록은 이 스크립트로만 고친다. `--add`의 대조가 현재 폴더의 레포를 보므로 AC로 옮겨 가지 않고 작업 중인 레포 폴더에서 실행한다. 행의 꼴(키 일곱 개)은 스크립트 머리 주석에 있다.

## 명령

### 목록에 올리기

`node ~/WebstormProjects/main/ai-contexts/scripts/hooks/blocked-expressions.mjs --add --match <PREFIX|SUBSTRING> --scope <PROMPT|BOTH|DOC> --lane <ALWAYS_BANNED|NEEDS_REVIEW> --words <말·활용형> --why <왜 막는가> --instead <대신 쓸 말> [--exclusions <꼴·꼴>] [--allow-zero]`

- `--match`
  - `PREFIX` 낱말 앞에 다른 글자가 붙지 않은 자리만 잡는다(뒤의 조사는 함께 잡힌다)
  - `SUBSTRING` 앞에 붙어 쓴 꼴까지, 문자열이 들어 있으면 잡는다
- `--scope` `PROMPT` = 프롬프트 md, `DOC` = write-doc 글·커밋 메시지, `BOTH` = 둘 다. 출신이 아니라 막는 까닭이 어느 글에서 성립하는지로 정한다
- `--lane` `ALWAYS_BANNED` = 어떤 쓰임이든 틀린 말, `NEEDS_REVIEW` = 쓰임에 따라 맞기도 한 말
- `--match`·`--scope`·`--lane` 값은 소문자로 줘도 대문자로 저장한다
- `--words` 잡을 꼴을 `·`로 이어 적는다(예: `굽지·굽는`). 이미 목록에 있는 꼴과 겹치면 거부한다
- `--why`·`--instead` 비면 거부한다
- `--exclusions` 잡지 않을 꼴을 `·`로 이어 적는다. 꼴마다 `--words`의 낱말 하나를 품어야 한다
- `--allow-zero` 아래 대조에서 한 줄도 안 걸려도 올린다. 아직 안 쓰인 말을 미리 막을 때만 쓴다

scope가 `PROMPT`·`BOTH`이면 올리기 전에 그 행을 AC와, 현재 폴더가 속한 git 레포에서 커밋된 스킬·규칙 md에 대조한다. 한 줄도 안 걸리면 꼴이나 match를 잘못 적은 것으로 보고 거부한다. `DOC` 행은 대조하지 않는다.

성공하면 `등재했다: <행> → <목록 경로>`를 내고, `DOC`이 아니면 `지금 걸리는 줄 N개`와 걸린 줄(10줄까지)을 낸다. 새로 막은 말을 다른 행이 대신 쓸 말로 권하고 있으면 `알림:` 줄로 그 행을 낸다.

### 겹침 찾기

`node ~/WebstormProjects/main/ai-contexts/scripts/hooks/blocked-expressions.mjs --find <표현>... [--scope <PROMPT|BOTH|DOC>] [--lane <ALWAYS_BANNED|NEEDS_REVIEW>]`

새 표현이 기존 행의 낱말과 한쪽이 다른 쪽 속에 든 꼴로 겹치거나 대신 쓸 말 하나와 같으면 그 행과, 표현마다 그 행이 이미 잡는지를 낸다. 이번에 정한 scope·lane을 주면 기존 행이 그만큼 막을 때만 이미 잡음으로 본다. 겹치는 행이 없으면 `겹치는 행 없음`.

### 예외 꼴 추가

`node ~/WebstormProjects/main/ai-contexts/scripts/hooks/blocked-expressions.mjs --exclude --word <목록에 있는 낱말> --exclusions <꼴·꼴>`

`--word`가 든 행을 찾아 예외 꼴을 합친다(중복은 하나로).

### 행 지우기

`node ~/WebstormProjects/main/ai-contexts/scripts/hooks/blocked-expressions.mjs --remove --word <목록에 있는 낱말>`

그 낱말을 가진 행을 통째로 지우고, 지운 행 JSON을 낸다. 행을 고칠 때는 꺼내 고쳐 `--add`로 다시 넣는다.

### 검사

`node ~/WebstormProjects/main/ai-contexts/scripts/hooks/blocked-expressions.mjs --check [<목록 json>]`

꼴이 어긋난 행을 stderr에 내고 exit 1. 없으면 exit 0. 경로를 안 주면 AC 목록을 본다.

## 저장과 그 뒤

- AC의 목록 파일을 고치고, `~/.ai-contexts/blocked-expressions.json` 사본이 있으면 함께 고친다. 다음 sync 전에도 훅이 바로 잡는다
- 올리거나 고친 뒤 AC에서 이 JSON 파일만 지정해 커밋하고(`--add`가 아닌 명령은 이 안내 줄을 내지 않지만 같은 파일이 바뀌므로 똑같이 한다), 커밋 메시지 본문에 반려한 사용자 발화를 적는다. 목록의 낱말은 커밋 메시지 훅이 막으므로 뜻풀이로 바꿔 적는다

## 실패

아래면 저장하지 않는다. stderr에 `[금지 표현 목록] <사유>`와 이 문서 경로를 내고 exit 1.

- `--add`·`--exclude`·`--find`·`--remove`·`--check` 중 어느 것도 없다
- 옵션 값이 없다(`--x` 다음이 비었거나 `--`로 시작)
- 위 검사에 걸렸다
