---
name: write-init
description: 외부 공개용 텍스트(PR 본문, README, PR 코멘트, 블로그 포스트)의 내용을 풍부하게 작성한다. 작업 컨텍스트로 뼈대 초안 생성 → 사용자가 마크된 부분 채움 → 풍부하게 펼침. 톤 다듬기는 안 함 (write-refine 사용). 명시적으로 write-init을 호출할 때만 사용.
argument-hint: <type> [<subtype>]
---

# write-init — 작업 세션용 내용 작성

## 목적

외부 공개용 텍스트(PR 본문, README, PR 코멘트, 블로그 포스트)의 내용을 풍부하게 작성한다.

외부 공개용 텍스트의 **내용**을 풍부하게 채우는 단계. 톤·구조·분량 다듬기는 다음 단계 write-refine에서. 이 스킬은 작업 컨텍스트(git log, 코드, 대화 등)를 가진 작업 세션에서만 호출한다.

## 입력

`/write-init <type> [<subtype>]` 형태로 호출한다.

| type | subtype | 필수/선택 | 설명 |
|------|---------|----------|-----|
| `pr-body` | (없음) | 선택 | 일반 PR 본문 |
| `pr-body` | `recruitment` | 선택 | 채용용 PR 본문 — 어필 포인트 강조 |
| `readme` | — | — | README (subtype 미사용) |
| `pr-comment` | `reviewer` | **필수** | 검토자가 남의 PR에 코멘트 |
| `pr-comment` | `author` | **필수** | 작성자가 자기 PR에 답글 |
| `resume-intro` | — | — | 이력서 한줄소개 — 수치 중심 bullet 다단 |
| `resume-item` | — | — | 이력서 경력기술서 한 항목 — 제목/문제/해결/성과 4줄 블록. write-refine에서 시안 다양화 모드로 진입 |
| `decision` | — | — | 기술적 의사결정 문서 — 선택지 2개 이상 비교 + 장단점 + 선택 근거 |
| `blog-post` | — | — | 블로그 포스트 — KA 외 출처(MP/AC/DC 등) 문서·코드를 변환. 프로젝트 CLAUDE.md 운영방침·frontmatter 스키마 따름 |

subtype 누락·오타 시 메인이 한 번 묻고 진행한다.

## 작업 흐름

### 1. 템플릿 로드

`templates/<type>.md`를 읽는다. 템플릿엔 섹션 구조와 각 섹션에 들어갈 내용 안내가 포함된다.

**type별 가이드 자동 Read.** templates 처리 시 해당 `<type>-guide.md`(`../../contexts/writing-guide/` 하위)가 있으면 함께 자동 Read 한다. 현재 매핑: `resume-item`·`resume-intro` → `resume-guide.md`, `decision` → `decision-guide.md`, `readme` → `readme-guide.md`. 가이드는 type별 룰의 SSOT이고, templates는 골격만 둔다.

**HTML 코멘트(`<!-- -->`) 영역은 메타 가이드**다. 메인은 참조용으로 읽되, **본문 출력에는 포함하지 않는다.** `## 본문 시작 ↓` 아래 섹션만 본문으로 사용한다.

**예외 — pr-comment**: 템플릿 없음. PR 코멘트는 자유 형식이라 섹션 템플릿이 부적합. subtype(reviewer/author)에 따라 메인이 의도 중심 구조(질문/제안/해명/감사 등)를 동적으로 결정한다.

**예외 — readme**: `templates/readme.md` 없음. `../../contexts/writing-guide/readme-guide.md`의 구조·원칙(금지/필수 섹션)을 따라 메인이 섹션 구조를 동적으로 결정한다. README의 1차 소스는 작업 컨텍스트(git log·diff)가 아니라 대상의 SKILL.md(또는 핵심 문서)다. SKILL.md에 있는 내용은 사용자에게 되묻지 말고 번역하고, 사용자 확인이 필요한 빈칸을 최소화한다.

**예외 — blog-post**: 템플릿 없음. 출처 문서마다 양식이 천차만별이라 고정 템플릿 부적합. 프로젝트 CLAUDE.md의 블로그 운영방침과 frontmatter 스키마(title/description/category/date/picked)에 따라 메인이 섹션 구조를 동적으로 결정한다. 출처 원본의 구조를 골격으로 삼되, 채용담당자(비개발자) 독자에 맞게 풀어쓴다. 시리즈면 출처의 cross-link 구조를 보존하며 N개 skeleton 동시 생성한다.

### 2. 뼈대 초안 생성

작업 컨텍스트와 템플릿(또는 pr-comment 동적 구조)을 결합해 뼈대를 작성한다. 메인이 컨텍스트에서 추출 가능한 것은 직접 채우고, 사용자 의도가 필요한 것만 마크로 남긴다.

**컨텍스트 소스:**
- git log, 변경 파일 (코드 diff)
- 현재 작업 세션의 대화 — 사용자가 명시적으로 강조한 포인트("이건 리뷰어한테 강조해야 해", "트레이드오프 있어" 등)는 본문 또는 frontmatter `key_message`에 보존
- 관련 이슈/PR 링크

**마크 표기:**
```
## 성능 최적화
[이번 PR에서 한 성능 개선 내용을 한두 문장으로 적어줘]
```

사용자는 마크 전체(대괄호 포함)를 자기 텍스트로 대체한다. 마크는 잘라내고 그 자리에 본문을 적는다.

### 3. 사용자 채움 요청

뼈대 초안 파일 경로를 사용자에게 안내하고 마크 부분 채워달라고 요청한다. 안내 문구는 해당 `templates/<type>.md`의 "안내 문구 매핑"을 따른다.

### 4. 풍부 펼침

사용자가 채움을 마치고 **명시적 신호**("OK", "채움 완료", "다 적었어" 등)를 보낼 때까지 대기한다. 부분 채움 중간에 추가 채움 요청 가능. 신호가 오면 사용자가 채운 텍스트를 컨텍스트와 결합해 풍부하게 펼친다. **사용자 텍스트는 그대로 보존**, 컨텍스트로 보강만 한다 — 사용자 의도 왜곡 금지.

**근거 범위 제한**: 원문·컨텍스트(git diff, 코드, 대화) 어디에도 없는 수치·지표·고유명사·도구명·라이브러리명은 추가하지 않는다. 예시 — 에이전트 추측으로 "이탈률 X%", "사용자 설문", `react-window`, `MockIntersectionObserver`, "센티넬", "경계 조건 테스트 목록" 같은 표현을 덧붙이지 않는다. "왜 그 선택을 했는가"는 풀되, "무엇을 더 했다"는 원문에 근거가 있을 때만 쓴다. 보강 문단의 각 문장이 "원문·컨텍스트 어디에 근거가 있나" 자체 점검을 통과해야 한다.

**분량 가이드**: frontmatter `length_target`이 있으면 그 값을 쓴다. 없으면 `templates/<type>.md`의 default를 쓰고, default도 없으면 사용자 텍스트의 2-3배를 상한으로 삼는다. 더 필요하면 5단계 리뷰에서 사용자가 추가 요청한다.

### 5. 사용자 리뷰

펼친 결과를 보여주고 빠진 내용/시각이 있는지 묻는다. 사용자가 지적하면 반영한다. **이 단계는 내용 보강만 — 톤 수정 요청이 들어오면 "그건 write-refine에서"라고 안내**한다. 사용자 OK까지 반복 (캡 없음).

### 6. 패키지 생성

확정된 본문을 frontmatter + 본문 단일 .md 파일로 저장한다. 파일 경로를 사용자에게 알려준다 — 새 세션에서 write-refine 입력으로 사용한다.

## 패키지 형식

이 섹션이 패키지(frontmatter + 본문 단일 .md) 형식의 SSOT다. write-refine 등 다른 스킬은 형식 정의를 본문으로 재인용하지 말고 이 섹션을 포인터로 가리킨다.

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

- `rendering_env`: `markdown` (default, 생략 시 가정) | `plain-text` | `rich-text`. 본문이 출력될 환경. `plain-text`(이력서 입력 필드, 텍스트 폼 등)면 백틱·코드펜스·헤딩 마크 등 마크다운 문법을 본문에 사용하지 않는다.
- `placeholder_policy`: `keep` (default, 생략 시 가정) | `drop` | `mark`. 사용자가 채울 자리(`n`, `[채울 내용]` 등) 처리 방식. `keep`은 그대로 두고, `drop`은 검증 불가 수치 등을 제거하며, `mark`는 `[...]` 표기만 사용한다.

frontmatter는 새 세션의 write-refine이 작업 히스토리 없이 출발할 수 있게 해주는 핵심 인터페이스다.

## write-refine과의 관계

write-init은 내용에만 집중. 톤·구조·분량 다듬기는 write-refine이 담당. 두 스킬을 한 작업의 두 단계로 사용한다.
