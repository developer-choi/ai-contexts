# package-format

글쓰기 패키지(frontmatter + 본문 단일 .md)의 형식을 정합니다.

```markdown
---
type: pr-body
subtype: recruitment
audience_knowledge: 무한스크롤 도메인 모름, 코드베이스 처음
purpose: 성능 최적화 어필
key_message: 무한스크롤 도입으로 초기 렌더 시간 60% 단축
length_target: 주요 섹션 3-4개, 섹션당 3-4문단
rendering_env: markdown
rejected:
  - '"심혈을 기울인" (자기 산출물 과장)'
  - '"측정 환경 상세" 절 (지나친 세부라 사용자가 뺌)'
user_phrases:
  - '"스크롤 끝에서 다음 페이지를 미리 부른다" (사용자 발화: "스크롤 끝에서 다음 페이지를 미리 부른다고 써줘")'
refs:
  git_log: a1b2c3..d4e5f6
  related_files:
    - src/components/InfiniteScroll/
    - docs/perf.md
---
```

- `type`·`subtype`: 이 글의 종류.
- `audience_knowledge`: 독자가 이 글의 소재에 대해 아는 것과 모르는 것을 한 줄로 적습니다. 독자는 [common.md](common.md#독자는-채용담당자)가 고정하므로 독자를 적는 필드는 없습니다.
- `purpose`: 이 글로 이루려는 것.
- `key_message`: 이 글에서 독자가 가져갈 한 문장.
- `length_target`: 본문 분량 목표를 자유 서술로 적습니다.
- `rendering_env`: `markdown` (default, 생략 시 가정) | `plain-text`. 본문이 출력될 환경입니다.
- `rejected`: 사용자가 이 문서에서 거부한 것을 `"원문" (거부 사유)` 한 줄씩 담습니다.
    - 낱말·문구뿐 아니라 사용자가 뺀 절·다루지 않기로 한 내용도 담고, 그때는 원문 자리에 절이면 `"절 제목" 절`로, 내용이면 그 내용을 짧게 적습니다.
    - 원문만 피하고 같은 사유로 거부될 다른 표현을 새로 짓는 것을 막기 위해 사유까지 적습니다. 「같은 결」은 이 사유가 같다는 뜻입니다.
    - 사유는 자유 서술입니다.
- `user_phrases`: 리뷰어가 표현을 물지 않을 구절을 `"구절 원문" (출처)` 한 줄씩 담습니다. 구절 원문은 본문에 들어간 글자 그대로입니다.
    - 담는 것: 사용자가 직접 쓰거나 불러넣은 구절, 확정된 글(게시본·승인받은 단위)이 이미 쓰는 용어.
    - 출처: 그 발화 원문, 사용자가 편집한 자리, 확정된 글의 인용.
- `refs`: 이 글의 근거 자료(커밋 범위·관련 파일·PR·조사 문서, 시리즈로 쓰는 글이면 앞서 확정한 글)가 있는 자리를 담습니다.

frontmatter는 이 패키지를 다른 세션에서 다시 다듬을 때 대화 히스토리 없이도 출발할 수 있게 해주는 핵심 인터페이스입니다.
