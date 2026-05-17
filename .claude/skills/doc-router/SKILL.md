---
name: doc-router
description: 구글 문서(PDF+MD)의 혼합 콘텐츠를 KA(knowledge-archive)와 MP(monorepo-playground)의 patterns로 분류·분리한다. 변환은 하지 않는다. 사용자가 PDF/MD 파일을 주면서 분류, 라우팅, 분리, 정리, 변환을 요청하면 반드시 이 스킬을 사용한다. "KA/MP로 나눠줘", "구글 문서 정리해줘", "문서 변환해줘", "이거 어디로 가야해?", "분류해줘" 등의 요청뿐 아니라, 사용자가 구글 문서 export 파일(PDF, MD)을 언급하며 학습·구현 콘텐츠를 정리하려는 맥락이라면 이 스킬이 필요하다.
argument-hint: "[PDF 파일 경로] [MD 파일 경로]"
---

# Doc Router

구글 문서의 혼합 콘텐츠를 KA / MP patterns로 분류하여 분리한다. 분리 후 변환은 각 프로젝트에서 별도로 수행한다. **글의 행선지만 결정**한다 — 어떤 스킬이 어떻게 활용할지(`/exam` 대상 등)는 결정하지 않으며, 글에 활용 라벨을 박지 않는다.

## 입력

사용자에게 구글 문서를 **PDF와 MD 두 형식으로 export**하도록 요청한다. 이미 제공된 경우 건너뛴다.

- PDF: 이미지, 레이아웃, 서식 확인용
- MD: 텍스트 추출, 하이퍼링크 URL 확보용

### PDF Read가 실패하는 경우

`Read` tool로 PDF를 못 여는 환경(`pdftoppm not found` 등)에서는 MD-only로 진행한다. 이미지가 본문 핵심 정보(다이어그램, 도식, 의존성 그래프 등)를 담고 있다면 사용자에게 해당 페이지의 스크린샷을 별도로 요청한다.

### MD 파일이 256KB를 초과하는 경우

base64 이미지 임베드 등으로 MD가 Read tool 한도(256KB)를 초과하면, 텍스트 라인만 추출하여 처리한다.

- `Grep`을 헤딩·텍스트 패턴(`^#{1,6}\s|^[A-Za-z가-힣]`)으로 호출하여 본문 구조 파악
- 또는 `Bash`로 `awk 'length($0) < 500'` 같은 라인 길이 필터로 텍스트 라인만 추출
- 이미지 정보가 필요하면 PDF 또는 사용자 요청 스크린샷에서 보충

## 분류 기준

KA / MP patterns 행선지 판단 기준은 [`deploy/contexts/placement.md`](../../../deploy/contexts/placement.md)에 정의돼 있다. 분류를 시작하기 전에 그 파일을 Read하여 분업 표를 확인한다. doc-router에는 별도 분류 기준을 두지 않는다.

## 행선지 인덱스

분류 결과는 아래 경로 중 하나로 매핑된다. 도메인 트리·파일명은 각 레포의 폴더 규칙에 위임(KA: `folder-blueprint.md`·`file-placement.md`, MP: `CLAUDE.md`).

| 대주제 | 절대경로 | 자료 성격 |
|---|---|---|
| KA | `~/WebstormProjects/main/knowledge-archive/knowledge/<도메인>/<파일>.md` | 외워서 설명하는 이론·원리 (Q&A) |
| KA | `~/WebstormProjects/main/knowledge-archive/techniques/<도메인>/<파일>.md` | 검색·참조하는 도구·기법 (Q&A) |
| KA | `~/WebstormProjects/main/knowledge-archive/tips/<도메인>/<파일>.md` | 한 포인트 짤막한 단편 (자유 양식) |
| MP | `~/WebstormProjects/main/monorepo-playground/docs/patterns/<주제>.md` | 코드 직결 가이드 (예시 코드 동반) |
| MP | `~/WebstormProjects/main/monorepo-playground/docs/best-practices-map.md` | patterns 인덱스 갱신 |
| AC | `~/WebstormProjects/main/ai-contexts/plan/topics/<topic>/` | TODO·References 메타 (`/backlog` 위임) |

KA 4번째 역할 `explained/`는 `/explain` 스킬 런타임 캐시라 doc-router 라우팅 대상이 아니다.

## 분류 단위

문서마다 구조가 다르다. 고정된 단위(Q&A, 섹션 등)를 가정하지 않는다. 문서의 실제 구조를 파악한 뒤 내용의 성격이 바뀌는 경계를 찾아 분리한다.

## 옮기지 않는 내용

KA / MP patterns 어디에도 속하지 않는 내용은 산출물에서 제외한다. 제외한 내용 목록은 사용자에게 알려준다. 구체적인 제외 기준은 gotchas 참고.

## 애매한 내용

행선지 경계가 불분명한 내용은 가장 적합한 행선지를 제안하고 사용자 확인을 받는다. 사용자가 판단한 결과는 즉시 아래 gotchas 섹션에 기록한다.

## TODO·References 처리

문서 내 `TODO` / `References` 섹션은 본문(학습 정리)과 분리하여 자동 처리한다. 분류 흐름이 끊기면 안 된다.

- **TODO 섹션**: 미완·잔여 학습 항목 (예: "Next Auth Security — 필기하다 말았음")
- **References 섹션**: 학습 과정에서 모은 메타 — 상위/하위/관련 문서, Original 공식 출처 URL, 보충 자료 링크 등

- **명백히 무가치한 항목** (의미 없는 낙서, 중복, 이미 해결된 잔재 등) → 산출물에서 제외하고 "옮기지 않은 내용" 목록에 포함해 사용자에게 알린다. 판단은 doc-router 자체 권한으로 내린다.
- **그 외 TODO·References 항목** → AC `plan/topics/`로 모은다. 양식·절차는 [`/backlog` 스킬](../../../deploy/skills/backlog/SKILL.md)에 위임한다.

**비중 가드**: 한 문서에서 TODO/References/개인 계획이 본문의 절반 이상을 차지하면 자동 처리하지 않는다. 비중을 보고하고 처리 방향(전체 적재 vs 일부 추출)을 사용자에게 확인받는다.

## 산출물

분류 결과를 KA / MP patterns로 명확히 분리하여 출력한다. 사용자가 각 프로젝트에서 변환 작업을 할 때 바로 입력으로 사용할 수 있어야 한다.

## 후속 변환 수행

분류 결과를 사용자에게 확인받은 후, 각 프로젝트에서 변환을 수행한다. 입력이 크면 서브에이전트에 위임, 작으면 doc-router에서 직접 처리. 어느 쪽이든 동일 절차.

- KA 내용 → KA 프로젝트(`~/WebstormProjects/main/knowledge-archive/`)의 convert 스킬과 양식 가이드(`.claude/contexts/document-structure.md` 등)를 읽고, 그 절차대로 변환 수행
- MP 내용 → MP 프로젝트(`~/WebstormProjects/main/monorepo-playground/`)의 `CLAUDE.md`와 관련 메타 파일을 참고하여 다음 중 적합한 곳에 추가:
  - `docs/patterns/<주제>.md` — 판단 기준·구현 패턴 (예시 코드 동반)
  - `docs/best-practices-map.md` — 인덱스

스킬 간 하드코딩 의존 없이, 대상 프로젝트의 스킬·메타 파일을 런타임에 읽어서 수행한다.

## gotchas

- 버전 추적 로그 (`(0.0.x)` 식 본인 패키지 버전별 작업 단계) → 옮기지 않는다. 일반화 가능한 결론만 추출
- 디버깅 감정·소회 ("당황", "ㅋㅋ", "ㅠ", "해맸음", "구라쳐서") → 옮기지 않는다
- 자기 프로젝트 고유명사 (개인 패키지명·repo명·계정명) → 일반화·익명화. 산출물에 그대로 두지 않는다

## 자가 개선

본 스킬은 [skill-self-improvement.md](../../../deploy/contexts/skill-self-improvement.md) 메타 규칙을 따른다.
