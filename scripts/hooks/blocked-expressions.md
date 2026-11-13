# blocked-expressions.mjs 사용법

금지 표현 목록(`scripts/hooks/blocked-expressions.json`)은 json을 직접 고친다. 이 스크립트는 고치기 전에 기존 행과의 겹침을 찾고, 고친 뒤의 꼴은 커밋 때 pre-commit이 `--check`로 검사한다. 행의 꼴과 match·scope·lane 값의 뜻은 스크립트 머리 주석의 "행의 꼴"에 있다.

## 목록을 고치는 순서

1. 올릴 표현과 그 활용형을 모두, 이번에 정한 scope·lane과 함께 `--find`에 넘기고, 출력의 판정을 따른다.
2. json을 고친다. 목록이 길어 통째로 읽지 않는다.
3. 고친 행이 의도한 꼴을 잡는지 `--find <꼴>`로 대 본다. 꼴을 잘못 적은 행은 아무 데서도 안 걸리고 조용히 남는다.
4. 커밋 본문에 반려한 사용자 발화를 적는다. 행을 넣은 이유의 기록이다.
5. master에 합친 뒤 AC에서 `npm run sync:environment`를 돌려야 새 행이 적용된다(복사되는 사본은 [환경 안내](../../meta/guides/environment.md)).

## 명령

두 명령은 스크립트와 같은 폴더의 목록을 읽는다. 워크트리에서 고친 목록은 아래 명령의 `~/WebstormProjects/main/ai-contexts`를 그 워크트리 경로로 바꿔 돌린다.

- `node ~/WebstormProjects/main/ai-contexts/scripts/hooks/blocked-expressions.mjs --find <표현>... [--scope <PROMPT|BOTH|DOC>] [--lane <ALWAYS_BANNED|NEEDS_REVIEW>]`
  - 표현과 겹치는 행과, 표현마다 그 행이 실제로 잡는지를 출력한다
  - 이번에 정한 scope·lane을 넘기면 기존 행이 그만큼 막을 때만 잡는다고 본다
- `node ~/WebstormProjects/main/ai-contexts/scripts/hooks/blocked-expressions.mjs --check [<목록 json>]`
  - 다른 경로의 목록을 검사하려면 그 json 경로를 넘긴다
