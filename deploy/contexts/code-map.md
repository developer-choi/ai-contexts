# code-map

## 역할

workflow·code-review·scw 등이 코드 작업(구현·리뷰) 중 "관련 컨벤션·구현 패턴이 있는가"를 확인할 때의 진입점. 코드 작업에 항상 같이 쓰이는 두 축(AC 텍스트 규칙, MP 구현 패턴)을 여기서 직접 다룬다 — 하위에 별도 map.md를 두지 않는다(탐색 절차가 파일마다 나뉘면 어떤 절차가 어디 있는지 경계가 흐려진다). 프롬프트·문서 작성처럼 별개 작업에서 쓰는 [writing-guide/map.md](writing-guide/map.md)는 여기서 다루지 않는다(코드 작업과 동시에 쓰이는 호출처가 없다) — 이 파일명이 `code-map.md`인 것도 그 경계를 이름에서부터 드러내기 위함이다(writing-guide의 글쓰기 도메인과 대등한 "코드" 도메인).

## AC 텍스트 규칙 ("~해라, ~금지")

`deploy/contexts/coding-standards/{rules,principles}/`에 있다. 폴더 경로가 곧 필터라 별도 목록이 필요 없다:

- 회사 프로젝트: `rules/universal/`·`principles/universal/`만
- 개인 프로젝트: 위 + `rules/personal/`·`principles/personal/`
- `rules/`: 중간 모델 이상 대조 가능 (e.g. sonnet), `principles/`: 최상위 모델 판단 필요 (e.g. opus)

폴더 경로로 표현되지 않는 축(여러 폴더에 걸친 주제)은 각 파일 자신의 frontmatter `tags`에 둔다(여기 목록을 두지 않는다 — 파일 내용을 고칠 때 같은 파일에서 태그도 같이 갱신하게 하기 위함).

| 태그 | 의미 | 사용 시점 |
|------|------|-----------|
| `file-folder-structure` | 파일·폴더 분리 기준 | Step 4에서 구현 구조 설계 시 |

## MP 구현 패턴

`docs/best-practices/*.md` (주제별 파일, 라우터 파일 없음). 각 파일 상단에 frontmatter `keywords`가 있다.

## [CRITICAL] 탐색 절차

1. `coding-standards/{rules,principles}/**/*.md`를 Glob해 후보를 얻고, 위 로드 규칙(회사/개인)으로 좁힌다. 특정 태그가 필요한 작업이면 후보들의 frontmatter `tags`를 확인해 추린다.
2. MP `docs/best-practices/` 디렉토리를 Glob(`*.md`)해 전체 파일 목록을 얻는다 — 유지보수가 필요한 라우터 파일 대신 기계적 목록 나열이라 빠뜨릴 여지가 없다. 각 파일의 상단 frontmatter(`keywords`)만 먼저 Read해(파일 앞부분만 읽어도 충분) 관련성을 거른다. 애매하면(관련 여부가 확실치 않으면) 전체 Read 쪽으로 기운다 — 넘기는 비용보다 놓치는 비용이 크다.
3. 1·2에서 선별한 파일을 모두 전체 Read한다. 파일명만 보고 판단하지 않는다.
4. 매칭된 AC 규칙 행·MP 패턴 항목과 1차 소스 경로(`docs/patterns/...` 등)를 `/plan/pr{N}/persistent/reference.md`에 인용한다 — 매칭 행 텍스트 + 파일 경로(라인 범위 가능 시 포함). 인용 없이 다음 step 진입 금지 게이트.
5. 매칭되는 패턴이 있으면 해당 문서의 코드 스타일을 엄격하게 따른다. 프로젝트 상황과 맞지 않아 판단이 어려운 부분은 임의로 변형하지 않고 사용자에게 명시적으로 확인한다.

**사고 사례**: 과거 이 절차가 "PR 단계별 예시 키워드로 MP 단일 인덱스 파일을 Grep"하는 방식이었을 때, 예시 키워드 밖의 행(「프로젝트 초기 세팅」, 「폴더 구조」)이 두 차례 매칭 실패로 통째로 누락됐다 — PR1 셋업 항목 12개 누락, 폴더구조 사용자 확인 절차 스킵. 이후 "MP 인덱스 파일 전체 Read"로 바꿨으나, MP 쪽에서 그 인덱스 파일 자체를 없애고 주제별 파일 + frontmatter로 재설계하면서 이 절차도 "Glob(완전한 목록) + frontmatter 사전 필터"로 맞춰 갱신했다. 이후 AC coding-standards 쪽도 같은 이유로 별도 map.md를 없애고 여기(code-map.md)에 직접 흡수했다.
