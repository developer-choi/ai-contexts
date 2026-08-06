---
tags: [package]
---

# package-format

글쓰기 패키지(frontmatter + 본문 단일 .md)의 형식 SSOT입니다. 패키지를 만드는 쪽도 다듬는 쪽도 형식 정의를 본문으로 재인용하지 않고 이 파일을 포인터로 가리킵니다.

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
rejected:
  - '"심혈을 기울인" (자기과장어)'
  - '"다각도 검토" (추상압축어)'
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

**필수 필드** (누락 X): `type`, `audience`, `purpose`, `key_message`. `subtype`은 그 type에서 subtype이 필수일 때만 함께 필수다.
**선택 필드** (불확실 시 비우거나 `미상` 표기 허용): `audience_knowledge`, `length_target`, `refs`, `rendering_env`, `placeholder_policy`, `rejected`

- `type`·`subtype`: 이 글의 종류. 허용 어휘와 subtype 필수 여부는 패키지를 만드는 스킬의 입력 규격이 단일 출처라, 여기서 다시 나열하지 않습니다.
- `key_message`: 이 글에서 독자가 가져갈 한 문장. 저장 시점에 새로 짓지 않고 합의된 문장을 그대로 옮깁니다.
- `rendering_env`: `markdown` (default, 생략 시 가정) | `plain-text` | `rich-text`. 본문이 출력될 환경입니다. `plain-text`(이력서 입력 필드, 텍스트 폼 등)면 백틱·코드펜스·헤딩 마크 등 마크다운 문법을 본문에 사용하지 않습니다.
- `placeholder_policy`: `keep` (default, 생략 시 가정) | `drop` | `mark`. 사용자가 채울 자리(`n`, `[채울 내용]` 등) 처리 방식입니다. `keep`은 그대로 두고, `drop`은 검증 불가 수치 등을 제거하며, `mark`는 `[...]` 표기만 사용합니다.

- `rejected`: 사용자가 이 문서에서 거부한 표현을 `"표현 원문" (결 이름)` 한 줄씩 담습니다. 결 이름은 tone.md의 금지어 분류 어휘(자기과장어·추상압축어·외래어음차·극적수식어 등)를 재사용합니다. 표현 원문만 피하고 같은 결의 다른 표현을 새로 짓는 것을 막기 위해 결까지 적습니다.
    - **범위는 이 문서 하나** — 다른 글에도 반복될 선호로 보이면 pre-exit 절차대로 tone.md·examples에 규칙과 사례로 심는 것이 정규 경로입니다. `rejected`는 일회성·문서 로컬 거부만 담습니다. 이 경계가 없으면 모든 거부가 `rejected`에만 쌓이고 tone.md는 자라지 않습니다.
    - **한계** — 사용자가 말로 거부하지 않고 본문을 직접 고쳐버리는 암묵 거부는 이 필드가 잡지 못합니다.

frontmatter는 write-refine이 대화 히스토리 없이도 출발할 수 있게 해주는 핵심 인터페이스입니다. 히스토리와 어긋나면 frontmatter가 정본입니다.
