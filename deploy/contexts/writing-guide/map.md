# writing-guide

## 역할

문서 작성 인덱스. 세 종류로 구성된다:
- **규칙**: "~해라, ~금지" 형태의 톤 규칙. AI가 텍스트를 대조할 때 참조한다.
- **사례**: Bad/Good 쌍. 규칙의 구체적 적용 예시이자 테스트 케이스.
- **가이드**: 특정 문서 유형의 작성 절차와 구조.

### 사례를 쌓는 이유

1. **AI가 사례를 보면 규칙보다 정확하게 이해한다** — 규칙만으로는 해석 여지가 남지만, Bad/Good 쌍이 있으면 기준이 명확해진다.
2. **사례는 영원하고 규칙은 바뀐다** — 규칙이 리팩토링되어도 사례는 그대로 유효하다. 나중에 규칙 변경 시 기존 사례를 테스트 케이스로 활용할 수 있다.

## 태그

폴더 경로로 표현되지 않는 축(문서 종류·상황)은 각 파일 자신의 frontmatter `tags`에 둔다(map.md에 목록을 두지 않는다 — 파일 내용을 고칠 때 같은 파일에서 태그도 같이 갱신하게 하기 위함).

| 태그 | 의미 | 사용 시점 |
|------|------|-----------|
| `always` | 항상 로드 | 모든 문서 작업 (룰 SSOT + 말투 변별 사례) |
| `structure` | 문단·구조·순서 사례 | 구조·순서·중복 이슈가 보일 때 |
| `accuracy` | 요약·축소 정확성 사례 | 요약·범위 축소를 다룰 때 |
| `process` | 작업·절차 서술 사례 | 절차·과정 서술을 점검할 때 |
| `pr` | PR 본문 관련 | PR 작성/리뷰 시 |
| `readme` | README 관련 | README 작성 시 |
| `resume` | 이력서·경력기술서 관련 | 이력서 작성/다듬기 시 (`write-init` type: `resume-item` 또는 `write-refine` frontmatter type: `resume-item`) |
| `decision` | 기술적 의사결정 문서 관련 | 의사결정 문서 작성/다듬기 시 (`write-init` type: `decision` 또는 `write-refine` frontmatter type: `decision`) |
| `tradeoff` | 트레이드오프(단점·비용·적용 한계) 명시 | 해법·선택을 담는 글 작성/다듬기 시 (`decision`·`resume-*`·블로그) |

### [CRITICAL] 탐색 절차

1. `deploy/contexts/writing-guide/**/*.md`를 Glob해 전체 파일 목록을 얻는다(map.md 제외).
2. frontmatter에 `always` 태그가 있는 파일은 작업 내용과 무관하게 전부 Read한다. 건너뛰지 않는다.
3. 현재 작업과 관련된 다른 태그가 있는 파일을 frontmatter `tags`로 확인해 추가로 Read한다.
4. 톤 규칙 + 사례를 하나씩 대조한다.
