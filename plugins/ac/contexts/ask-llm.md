# ask-llm.mjs 사용법

`node <plugins/ac/contexts 폴더>/ask-llm.mjs --vendor <벤더> [--model <모델>] [--schema <스키마 경로>] [--timeout <초>] <보낼 내용 경로|->`

다른 회사 LLM에 프롬프트 하나를 보내고 답만 받아 온다. 호출마다 대화가 새로 시작된다.

받는 모델은 명령 실행·파일 읽기·쓰기·웹 검색이 모두 막혀 있어서, 판단에 필요한 자료는 보낼 내용 안에 다 넣는다.

## 인자

- `--vendor <벤더>`: 받을 회사. 지금은 `gemini`만 있다
- `--model <모델>`: 받을 모델. `Hydrogen`·`Argon`·`Neon` 중 하나이고, 안 주면 `Hydrogen`이다. 사용자나 호출하는 스킬이 모델을 정했을 때만 준다
- `<보낼 내용 경로>`: 보낼 프롬프트 전체가 든 파일. `-`이면 표준입력에서 읽는다
- `--schema <스키마 경로>`: 답을 JSON으로 받아야 할 때만 준다
- `--timeout <초>`: 답을 기다리는 한도. 안 주면 240초다. 주면 셸 도구(Bash·PowerShell)가 먼저 끊어 사유 없이 끝나지 않게 그 도구의 `timeout`을 (초 + 20) × 1000으로 준다

## 출력

- 성공하면 답 본문을 stdout에 출력하고 exit 0. stderr에는 성공해도 선택한 모델 이름이 한 줄 나온다
- `--schema`를 줬으면 JSON 한 줄을 출력한다. 스키마는 `type`·`enum`·`required`·`properties`·`additionalProperties: false`·`items`만 검사한다

## 실패

실패하면(시간 초과 포함) 사유와 대처를 stderr에 출력하고 exit 1로 끝난다.

## 스킬 문서에 이 경로를 적을 때

배포 규약의 [plugin 스킬](../../../meta/deploy-conventions.md#plugin-ac로-옮긴-스킬hookcontexts)·[레포 로컬 스킬](../../../meta/deploy-conventions.md#레포-로컬-스킬-claudeskills-커밋) 절을 따른다.
