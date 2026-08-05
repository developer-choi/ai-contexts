---
tags: [package]
---

# package-format

글쓰기 패키지(frontmatter + 본문 단일 .md)의 형식 SSOT입니다. `write-init`이 합의 내용을 담아 만들고, `write-refine`이 이 형식만으로 출발합니다. 두 스킬 모두 형식 정의를 본문으로 재인용하지 않고 이 파일을 포인터로 가리킵니다.

"언제·어떻게 채우는가"는 각 스킬이 소유합니다. 여기서는 필드와 그 의미만 정합니다.

```markdown
---
type: pr-body
subtype: recruitment
audience: 채용담당자
audience_knowledge: 무한스크롤 도메인 모름, 코드베이스 처음
purpose: 성능 최적화 어필
key_message: 무한스크롤 도입으로 초기 렌더 시간 60% 단축
length_target: 주요 섹션 3-4개, 섹션당 3-4문단
rendering_env: markdown
placeholder_policy: keep
refs:
  git_log: a1b2c3..d4e5f6
  related_files:
    - src/components/InfiniteScroll/
    - docs/perf.md
---

# PR 본문

## 변경 사항
...
```

**필수 필드** (누락 X): `type`, `subtype`, `audience`, `purpose`, `key_message`
**선택 필드** (불확실 시 비우거나 `미상` 표기 허용): `audience_knowledge`, `length_target`, `refs`, `rendering_env`, `placeholder_policy`

- `type`: `pr-body` | `readme` | `pr-comment` | `resume-intro` | `resume-item` | `decision`. 각 type이 요구하는 subtype·템플릿은 write-init 「입력」 표를 따릅니다.
- `key_message`: 이 글에서 독자가 가져갈 한 문장. 저장 시점에 새로 짓지 않고 합의된 문장을 그대로 옮깁니다.
- `rendering_env`: `markdown` (default, 생략 시 가정) | `plain-text` | `rich-text`. 본문이 출력될 환경입니다. `plain-text`(이력서 입력 필드, 텍스트 폼 등)면 백틱·코드펜스·헤딩 마크 등 마크다운 문법을 본문에 사용하지 않습니다.
- `placeholder_policy`: `keep` (default, 생략 시 가정) | `drop` | `mark`. 사용자가 채울 자리(`n`, `[채울 내용]` 등) 처리 방식입니다. `keep`은 그대로 두고, `drop`은 검증 불가 수치 등을 제거하며, `mark`는 `[...]` 표기만 사용합니다.

frontmatter는 새 세션의 write-refine이 작업 히스토리 없이 출발할 수 있게 해주는 핵심 인터페이스입니다.
