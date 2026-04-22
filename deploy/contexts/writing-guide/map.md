# writing-guide

## 역할

문서 작성 인덱스. 세 종류로 구성된다:
- **규칙**: "~해라, ~금지" 형태의 톤 규칙. AI가 텍스트를 대조할 때 참조한다.
- **사례**: Bad/Good 쌍. 규칙의 구체적 적용 예시이자 테스트 케이스.
- **가이드**: 특정 문서 유형의 작성 절차와 구조.

### 사례를 쌓는 이유

1. **AI가 사례를 보면 규칙보다 정확하게 이해한다** — 규칙만으로는 해석 여지가 남지만, Bad/Good 쌍이 있으면 기준이 명확해진다.
2. **사례는 영원하고 규칙은 바뀐다** — 규칙이 리팩토링되어도 사례는 그대로 유효하다. 나중에 규칙 변경 시 기존 사례를 테스트 케이스로 활용할 수 있다.

## 로드 규칙

- `[always]` 태그 파일: 작업 내용과 무관하게 **무조건 전부 Read**한다. 선별하지 않는다.
- 그 외: 작업 맥락에 맞는 태그의 파일을 선별하여 로드

### [CRITICAL] 탐색 절차

1. 하단 파일 리스트에서 `[always]` 태그 파일을 전부 Read한다. 건너뛰지 않는다.
2. 현재 작업과 관련된 다른 태그 파일이 있으면 추가로 Read한다
3. 톤 규칙 + 사례를 하나씩 대조한다

## 태그

| 태그 | 의미 | 사용 시점 |
|------|------|-----------|
| `always` | 항상 로드 | 모든 문서 작업 |
| `pr` | PR 본문 관련 | PR 작성/리뷰 시 |
| `readme` | README 관련 | README 작성 시 |
| `resume` | 이력서·경력기술서 관련 | 이력서 작성/다듬기 시 (`write-init` type: `resume-item` 또는 `write-refine` frontmatter type: `resume-item`) |

## 파일 리스트

이 디렉토리(`deploy/contexts/writing-guide/`) 기준 상대 경로:

tone.md [always]
examples/tone.md [always]
examples/structure.md [always]
examples/accuracy.md [always]
examples/process.md [always]
readme-guide.md [readme]
resume-guide.md [resume]
examples/resume.md [resume]
requirements.md
templates/pr-body/recruitment-narrative.md [pr]
templates/pr-body/recruitment-evidence.md [pr]
