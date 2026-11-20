# build-review-request.mjs 사용법

`node <이 폴더>/build-review-request.mjs --reviewer <리뷰어> --out <쓸 파일> [--findings <지적 파일>] [--ask <요청 파일>] <리뷰 대상 경로>`

prompt-review 리뷰어 하나에게 다른 회사 모델(`ask-llm`)로 보낼 내용을 파일 하나로 묶는다. 받는 모델은 파일을 못 읽으므로 필요한 전문을 모두 넣는다.

## 인자

- `--reviewer <리뷰어>`: `BODY`·`STRUCTURE`·`AGENT`·`WORKFLOW`·`CODE` 중 하나. 이 리뷰어가 붙은 SKILL.md "기준" 표 행의 문서를 기준으로 넣는다
- `--out <쓸 파일>`: 묶은 내용을 쓸 경로. 없는 폴더는 만든다
- `--findings <지적 파일>`: 다시 맡길 때 준다. 넣지 않았거나 사용자에게 가져갈 지적과 그 근거를 적은 md
- `--ask <요청 파일>`: 리뷰 대신 따로 물을 것이 있을 때 준다. 리뷰 답 꼴 대신 그 요청에만 답하게 한다
- `<리뷰 대상 경로>`: md 파일 하나나 폴더(안의 md 전부)

`--out`·`--findings`·`--ask` 파일은 세션 scratchpad처럼 대상 레포 밖에 둔다. 레포 안이면 실패한다.

## 넣는 것

- 모든 리뷰어: 리뷰어 역할과 답 꼴, 기준 문서 전문, 대상 전문, 대상이 링크하는 파일 전문(개인 파일도 거르지 않는다), `--findings`·`--ask` 내용
- BODY: how 최소화 판정 표를 답에 넣으라는 요청
- STRUCTURE: `check-md-size.mjs --report` 출력, 대상이 든 최상위 폴더와 레포의 모든 CLAUDE.md의 파일 목록·절 제목
- CODE: 대상 md가 이름으로 호출하는 스크립트·json 중 작업 브랜치(origin 기본 브랜치 대비, 커밋 전 변경 포함)에서 바뀐 것의 전문

대상이 ai-contexts 체크아웃 안이면 기준 문서와 `check-md-size.mjs`를 그 체크아웃에서 읽는다.

## 출력

- 성공하면 stdout에 쓴 파일 경로, 크기, 넣은 기준·대상·링크 파일 수를 한 줄 출력하고 exit 0
- 실패하면(인자 오류, CODE가 볼 파일 없음 등) 사유와 이 문서 경로를 stderr에 출력하고 exit 1
