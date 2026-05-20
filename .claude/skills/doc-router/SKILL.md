---
name: doc-router
description: 구글 문서(PDF+MD)의 혼합 콘텐츠를 통합 MD로 합쳐 입력 폴더에 두고, 명백한 항목만 KA(knowledge-archive)와 MP(monorepo-playground)의 patterns로 라우팅한다. 잔여는 통합 MD에 라벨링하여 사용자에게 넘긴다. KA·MP 최종 양식 변환은 하지 않는다. 사용자가 PDF/MD 파일이나 입력 폴더를 주면서 분류, 라우팅, 분리, 정리, 변환을 요청하면 반드시 이 스킬을 사용한다. "KA/MP로 나눠줘", "구글 문서 정리해줘", "문서 변환해줘", "이거 어디로 가야해?", "분류해줘" 등의 요청뿐 아니라, 사용자가 구글 문서 export 파일(PDF, MD)을 언급하며 학습·구현 콘텐츠를 정리하려는 맥락이라면 이 스킬이 필요하다.
argument-hint: "[입력 폴더 또는 PDF/MD 파일 경로]"
---

# Doc Router

구글 문서의 혼합 콘텐츠를 입력 폴더에 통합 MD로 합치고, 명백한 항목만 KA / MP patterns로 라우팅한다. 사용자 판단 대기 잔여는 `.unrouted.md`에, AI가 폐기 의도로 분리한 항목은 `.discarded.md`에 원문 그대로 옮긴다 — **AI는 영구 삭제하지 않는다.** KA·MP 최종 양식 변환은 각 프로젝트에서 별도로 수행한다. **글의 행선지만 결정**한다 — 어떤 스킬이 어떻게 활용할지(`/exam` 대상 등)는 결정하지 않으며, 글에 활용 라벨을 박지 않는다.

## 입력

사용자가 입력 폴더에 PDF / MD를 둔다. 둘은 같은 구글 문서에서 나온 한 쌍이며, 서로 다른 정보를 담고 있어 합쳐야 본문이 빠짐없이 잡힌다.

- MD: 본문 텍스트, 하이퍼링크 URL의 권위 출처
- PDF: 이미지(코드 블록·다이어그램·UI 캡처)의 권위 출처
- 페어 매칭: 확장자 빼고 같은 파일명 (예: `State.pdf` ↔ `State.md`)

한쪽만 있어도 처리한다. export를 따로 요청하지 않는다.

### PDF Read가 실패하는 경우

`Read` tool로 PDF를 못 여는 환경(`pdftoppm not found` 등)에서는 MD-only로 진행한다. 이미지가 본문 핵심 정보(다이어그램, 도식, 의존성 그래프 등)를 담고 있다면 사용자에게 해당 페이지의 스크린샷을 별도로 요청한다.

### MD를 Read tool이 거부하는 경우

base64 이미지 임베드 등으로 MD가 token 한도를 초과해 Read가 거부하면, base64 라인을 제외하고 본문 텍스트 + URL을 추출한다.

- `Bash`로 `awk 'length($0) < 500'` 같은 라인 길이 필터로 본문만 출력. 출력 결과를 통합 MD에 직접 옮겨 적는다. PowerShell로 옮기지 않는다 — Claude Code의 PS 도구는 `-NoProfile`로 호출되어 `$PROFILE`의 UTF-8 셋팅(`sync:environment` 블록 포함)이 안 통하고, PS 5.1 기본 인코딩(CP949 읽기, UTF-16 LE BOM 쓰기)으로 mojibake·BOM 오염이 난다. 부득이 PS를 써야 하면 `Get-Content`·`Out-File` 등에 `-Encoding utf8`을 명시.
- 임시 산출물을 입력 폴더에 두지 않는다. Bash 파이프로 즉시 소비. 임시 파일이 필요하면 `mktemp`로 생성하고 작업 후 삭제한다.
- 헤딩 grep(`^#{1,6}\s`)은 본문 구조 미리보기 보조용이다. 본문 합치기를 그것만으로 끝내지 않는다.

## 통합 MD 작성

입력 폴더에 페어당 통합 MD를 작성한다.

- 파일명: `<원본명>.unrouted.md` (예: `State.pdf` + `State.md` → `State.unrouted.md`)
- AI가 폐기 의도로 분리한 항목은 같은 폴더의 `<원본명>.discarded.md`에 원문 그대로 옮긴다 (사유 한 줄 부착). 「잔여 라벨링」 참조.
- 한쪽만 있는 경우: 그것 기준으로 통합 MD 작성 (이름 동일)
- 원본 PDF/MD는 건드리지 않는다

**MD 본문을 베이스로 삼는다.** MD에는 URL이 있고, PDF에는 같은 위치에 표시 텍스트만 있다. PDF 텍스트를 베이스로 삼으면 URL이 빠진다.

PDF의 이미지를 텍스트로 옮겨 MD 본문의 해당 위치에 삽입한다.

- 코드 이미지: 코드 블록으로 옮겨 적는다. LLM이 직접 옮기므로 오타·줄 빠짐 가능 — 사용자 검수 전제
- 다이어그램·UI 캡처: 텍스트 설명으로 옮기되 100% 정확하지 않음. 정확도 부족하면 placeholder만 두고 PDF 페이지 참조 (`<!-- 다이어그램, PDF p.2 참조 -->`)
- 옮긴 위치에 출처 표시: `<!-- from PDF p.2 -->`

`.unrouted.md`는 분류·라우팅 작업의 작업 공간이자 사용자 판단 대기 잔여 보관소, `.discarded.md`는 AI가 폐기 의도로 분리한 항목의 원문 보관소다 (산출물 섹션 참조).

## 분류 진입 조건

`.unrouted.md`에 본문 텍스트 + URL + 이미지 텍스트화가 모두 들어있어야 분류로 진입한다. 헤딩만 잡힌 상태, MD 본문이 누락된 상태, PDF 이미지가 옮겨지지 않은 상태에서는 분류 단위 판단·비중 가드 보고·라우팅으로 넘어가지 않는다.

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
| AC | `~/WebstormProjects/main/ai-contexts/backlog/topics/<topic>/` | TODO·References 메타 (`/backlog` 위임) |

KA 4번째 역할 `explained/`는 `/explain` 스킬 런타임 캐시라 doc-router 라우팅 대상이 아니다.

## 분류 단위

문서마다 구조가 다르다. 고정된 단위(Q&A, 섹션 등)를 가정하지 않는다. 문서의 실제 구조를 파악한 뒤 내용의 성격이 바뀌는 경계를 찾아 분리한다.

## 라우팅 보수성

의심스러우면 옮기지 않는다. `.unrouted.md`에 `[BORDERLINE]` 라벨을 달고 잔여에 남긴다. 최종 판단은 사용자가 한다.

"확실한 것"의 기준:

- `placement.md` 행선지에 100% 부합
- 본인 코드/맥락이 명확
- 출처(공식 문서·1차 자료)가 명시되어 있거나 본인 합성 흔적이 분명

한 조건이라도 약하면 `[BORDERLINE]`.

## 잔여 라벨링

AI는 영구 삭제하지 않는다 — `.discarded.md`로 원문을 옮길 뿐이며, 사용자가 검토 후 살릴지 결정한다. 옮긴 항목(KA/MP/AC 라우팅)은 `.unrouted.md`에서 본문을 삭제한다 (이동 표시도 남기지 않음 — 원본 PDF/MD가 보존되므로 복구 가능).

| 라벨 | 위치 | 의미 |
|------|------|------|
| `[BORDERLINE]` | `.unrouted.md` | 행선지 애매하거나 본인 통합 흔적 약함 — 사용자 판단 대기 |
| `[NOISE_CANDIDATE]` | `.discarded.md` | gotchas 해당 — 디버깅 감정·낙서·개인 메모·고유명사 등 폐기 의도 |

라벨 없는 잔여(`.unrouted.md`에 남은 항목) = 일반 잔여 (사용자 판단 필요).

라벨은 섹션 헤딩 옆에 단다. 사유 한 줄을 함께 적는다. 원문은 라벨 아래에 그대로 옮겨 적는다.

`.unrouted.md` 예시:

```markdown
## Automatic Batching  [BORDERLINE]
사유: 본인 통합 약함 (1줄 + 공식 캡처). 출처 인덱스만 살릴지 결정 필요.
[원본 내용]
```

`.discarded.md` 예시:

```markdown
## "여기서 막혀씀"  [NOISE_CANDIDATE]
사유: 디버깅 감정·낙서 (gotchas)
[원본 내용]
```

사용자가 판단한 결과를 알려주면 즉시 gotchas 섹션에 기록한다. 사용자가 "이건 살려야 한다"고 한 경우 `.discarded.md` → `.unrouted.md`로 이동시키거나 KA/MP/AC로 라우팅한다.

**자가 개선 트리거 확인 시점**: 사용자 처리 결과를 받은 직후. 같은 카테고리 결정이 N회 반복되면 메타 규칙([skill-self-improvement.md](../../../deploy/contexts/skill-self-improvement.md))의 "사용자 행동 패턴 트리거" 절차로 역제안.

## TODO·References 처리

문서 내 `TODO` / `References` 섹션은 본문(학습 정리)과 분리하여 자동 처리한다. 분류 흐름이 끊기면 안 된다.

- **TODO 섹션**: 미완·잔여 학습 항목 (예: "Next Auth Security — 필기하다 말았음")
- **References 섹션**: 학습 과정에서 모은 메타 — 상위/하위/관련 문서, Original 공식 출처 URL, 보충 자료 링크 등

- **TODO·References 항목** → AC `backlog/topics/`로 모은다. 양식·절차는 [`/backlog` 스킬](../../../deploy/skills/backlog/SKILL.md)에 위임한다.
- **명백히 무가치해 보이는 항목** (의미 없는 낙서, 중복 등) → `.discarded.md`로 원문 이동 + `[NOISE_CANDIDATE]` 라벨링. 최종 판단은 사용자.

**비중 가드**: 한 문서에서 TODO/References/개인 계획이 본문의 절반 이상을 차지하면 자동 처리하지 않는다. 비중을 보고하고 처리 방향(전체 적재 vs 일부 추출)을 사용자에게 확인받는다.

## 산출물

네 형태:

- **KA 라우팅된 항목** — KA 프로젝트의 `knowledge/`·`techniques/`·`tips/` 경로에 직접 작성 (후속 변환 절차 참조)
- **MP 라우팅된 항목** — MP 프로젝트의 `docs/patterns/`·`best-practices-map.md`에 직접 작성
- **`<원본명>.unrouted.md`** — 입력 폴더. 옮긴 섹션은 본문 삭제, 사용자 판단 대기 잔여(`[BORDERLINE]` 등)만 라벨링과 함께 남김
- **`<원본명>.discarded.md`** — 입력 폴더. AI가 폐기 의도로 분리한 항목의 원문(`[NOISE_CANDIDATE]`) + 사유 한 줄

옮긴 것 / 남은 것(`.unrouted.md`) / 버린 것(`.discarded.md`) 합치면 원본 PDF/MD의 모든 항목과 동일하다.

사용자에게는 "<입력 폴더 경로>의 `.unrouted.md`·`.discarded.md` 파일들 확인" 한 줄로 보고한다. 잔여·폐기를 추가로 정리하지 않는다 — 사용자가 직접 본문 삭제·이동·복구 지시한다.

**자가 개선 트리거 확인 시점**: 라우팅 완료 직후. 라우팅 결정 자체에 패턴이 보이면 (예: 특정 도메인은 매번 같은 행선지) "자기 발견 트리거" 절차로 역제안.

## 라우팅 자가 검증

산출물 작성이 끝난 직후, 사용자에게 보고하기 전에 리뷰어 서브에이전트(opus)를 spawn하여 라우팅·잔여·폐기 판단이 합리적이었는지 점검받는다.

리뷰어 입력:

- 원본 PDF/MD 페어 경로
- 라우팅된 산출물: KA/MP/AC `backlog/`에 작성한 파일 경로와 본문
- `<원본명>.unrouted.md`: 사용자 판단 대기 잔여 (`[BORDERLINE]` 등)
- `<원본명>.discarded.md`: AI 폐기 의도 분리 (`[NOISE_CANDIDATE]`)

리뷰어 점검 차원:

- 행선지 적절성: `placement.md` 분업 표 대비 KA/MP/AC 매핑이 맞는가
- 라벨 합리성: `[BORDERLINE]` vs `[NOISE_CANDIDATE]` vs 라우팅 분기가 자료 성격에 맞는가 (잘못 버린 것·잘못 살린 것 없는가)
- 일반화·익명화: 본인 프로젝트 고유명사가 라우팅된 항목에 그대로 남았는가
- 누락 점검: 원본 PDF/MD의 항목이 어느 산출물에도 들어가지 않았는가

리뷰어 출력: 의심 항목별로 (a) 위치 (b) 현재 판단 (c) 대안 판단 (d) 사유.

처리:

- 의심 0건이면 사용자에게 산출물 정상 보고
- 의심 1건 이상이면 사용자에게 의심 사항을 먼저 보고하고 처리 방향 확인 후 정정. 메인이 리뷰어 의견에 무조건 따르지 않는다 — 메인이 재판단 후 사용자가 결정.

## 후속 변환 수행

분류 결과를 사용자에게 확인받은 후, 각 프로젝트에서 변환을 수행한다. 입력이 크면 서브에이전트에 위임, 작으면 doc-router에서 직접 처리. 어느 쪽이든 동일 절차.

- KA 내용 → KA 프로젝트(`~/WebstormProjects/main/knowledge-archive/`)의 convert 스킬과 양식 가이드(`.claude/contexts/document-structure.md` 등)를 읽고, 그 절차대로 변환 수행
- MP 내용 → MP 프로젝트(`~/WebstormProjects/main/monorepo-playground/`)의 `CLAUDE.md`와 관련 메타 파일을 참고하여 다음 중 적합한 곳에 추가:
  - `docs/patterns/<주제>.md` — 판단 기준·구현 패턴 (예시 코드 동반)
  - `docs/best-practices-map.md` — 인덱스

스킬 간 하드코딩 의존 없이, 대상 프로젝트의 스킬·메타 파일을 런타임에 읽어서 수행한다.

## gotchas

다음 항목은 `.discarded.md`로 원문 이동 + `[NOISE_CANDIDATE]` 라벨링. AI는 영구 삭제하지 않으며 사용자가 검토 후 살릴 수 있다.

- 버전 추적 로그 (`(0.0.x)` 식 본인 패키지 버전별 작업 단계)
- 디버깅 감정·소회 ("당황", "ㅋㅋ", "ㅠ", "해맸음", "구라쳐서")
- 자기 프로젝트 고유명사 (개인 패키지명·repo명·계정명)

라우팅된 항목 안에 고유명사가 섞여 있으면 라우팅 단계에서 일반화·익명화한다.

## 자가 개선

본 스킬은 [skill-self-improvement.md](../../../deploy/contexts/skill-self-improvement.md) 메타 규칙을 따른다.
