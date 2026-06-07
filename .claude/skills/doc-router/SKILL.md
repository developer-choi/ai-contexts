---
name: doc-router
description: 구글 문서(PDF+MD)의 혼합 콘텐츠를 통합 MD로 합쳐 입력 폴더에 두고, 명백한 항목만 KA(knowledge-archive)와 MP(monorepo-playground)의 patterns로 라우팅한다. 잔여는 보류(`.unrouted.md`)·폐기(`.discarded.md`)로 분리하여 사용자에게 넘긴다. 라우팅과 동시에 destination 프로젝트의 양식 가이드를 따라 변환까지 수행한다 (별도 변환 단계 없음). 사용자가 PDF/MD 파일이나 입력 폴더를 주면서 분류, 라우팅, 분리, 정리, 변환을 요청하면 반드시 이 스킬을 사용한다. "KA/MP로 나눠줘", "구글 문서 정리해줘", "문서 변환해줘", "이거 어디로 가야해?", "분류해줘" 등의 요청뿐 아니라, 사용자가 구글 문서 export 파일(PDF, MD)을 언급하며 학습·구현 콘텐츠를 정리하려는 맥락이라면 이 스킬이 필요하다.
argument-hint: "[입력 폴더 또는 PDF/MD 파일 경로]"
---

# Doc Router

## 목적

구글 문서에 필기한 내용(inactive)을 AI가 활용할 수 있는 형태로 가공한다. 그러기 위해 레포(KA·MP·AC 등)마다 활용될 수 있는 형태(코드·설명문서·스킬·규칙문서 등)로 변환한다.

구글 문서의 혼합 콘텐츠를 입력 폴더에 통합 MD로 합치고, 명백한 항목만 KA / MP patterns로 라우팅한다. **라우팅과 동시에 destination 프로젝트의 양식 가이드를 따라 변환하여 작성한다** (별도 변환 단계나 사용자 확인 게이트 없음). 사용자 판단 대기 잔여는 `.unrouted.md`에, AI가 폐기 의도로 분리한 항목은 `.discarded.md`에 원문 그대로 옮긴다 — **AI는 영구 삭제하지 않는다.** **글의 행선지만 결정**한다 — 어떤 스킬이 어떻게 활용할지(`/exam` 대상 등)는 결정하지 않으며, 글에 활용 라벨을 박지 않는다.

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
| AC | `~/WebstormProjects/main/ai-contexts-backlog/backlog/history/` | 종결된 회의자료·옛 메모 등 참조 전용 아카이브 |

KA 4번째 역할 `explained/`는 `/explain` 스킬 런타임 캐시라 doc-router 라우팅 대상이 아니다.

`backlog/history/` 판단 기준: 본인이 더 발전시킬 의도 없이 종결한 자료. 옛 회의자료 PDF, 결정 끝난 고민 흔적 등. TODO·미해결 질문이 있으면 history가 아니라 `backlog/topics/`로 라우팅한다 (사고 흔적은 발전 가능). 판단 모호하면 `.unrouted.md` 잔여에 남기고 사용자가 결정한다.

## 분류 단위

문서마다 구조가 다르다. 고정된 단위(Q&A, 섹션 등)를 가정하지 않는다. 문서의 실제 구조를 파악한 뒤 내용의 성격이 바뀌는 경계를 찾아 분리한다.

## 라우팅 보수성

의심스러우면 옮기지 않는다. `.unrouted.md` 잔여에 남긴다. 최종 판단은 사용자가 한다.

"확실한 것"의 기준:

- `placement.md` 행선지에 100% 부합
- 본인 코드/맥락이 명확
- 출처(공식 문서·1차 자료)가 명시되어 있거나 본인 합성 흔적이 분명

한 조건이라도 약하면 `.unrouted.md` 잔여로 남긴다.

## 잔여 라벨링

AI는 영구 삭제하지 않는다 — 폐기 의도 항목은 `.discarded.md`로 원문을 옮길 뿐이며, 사용자가 검토 후 살릴지 결정한다. 옮긴 항목(KA/MP/AC 라우팅)은 `.unrouted.md`에서 본문을 삭제한다 (이동 표시도 남기지 않음 — 원본 PDF/MD가 보존되므로 복구 가능).

### 두 파일의 분기

- `.unrouted.md` = 행선지가 애매하거나 본인 통합 흔적이 약해 **사용자 판단을 기다리는** 항목 (보류)
- `.discarded.md` = gotchas 해당(디버깅 감정·낙서·개인 메모·고유명사 등) **AI가 폐기 의도로 분리한** 항목 (폐기)

보류/폐기 구분은 **파일명(unrouted vs discarded)으로 표현한다.** 본문에 `[BORDERLINE]`·`[NOISE_CANDIDATE]` 같은 attribute·헤딩 라벨을 달지 않는다.

### 파일 생성 트리거

- `.unrouted.md` = 보류 항목 N건(N ≥ 1)으로 구성된다
- `.discarded.md` = 폐기 항목 N건(N ≥ 1)으로 구성된다
- N = 0이면 그 파일을 **만들지 않는다.** 빈 파일·메타 헤더만 있는 파일·"잔여 없음" 메모만 있는 파일은 양식 불일치라 작성 결과물이 될 수 없다

### 본문 양식

한 파일의 전체 본문 = `<section>` 시퀀스. section 1개 = 원본 필기 1단위.

```markdown
<section>
<original>
필기 원본 (### 등 헤딩 포함 가능)
</original>
<reason>
이 항목을 여기(보류/폐기)에 남긴 사유
</reason>
</section>
```

- 본문은 위 `<section>` 시퀀스만으로 구성한다 — frontmatter·top-level 헤딩·평문 메모·인덱스 라인 등 어떤 부가 내용도 두지 않는다
- 한 원본 필기 항목은 정확히 한 곳에만 존재한다: 라우팅된 산출물(KA/MP/AC) **또는** `.unrouted.md` **또는** `.discarded.md` (배타). 라우팅한 항목을 unrouted/discarded에 다시 끼워넣지 않는다 — 양식이 "원본 + 사유" 1쌍만 담으므로 "옮긴 항목의 메모"가 들어갈 자리가 없다

사용자가 판단한 결과를 알려주면 즉시 gotchas 섹션에 기록한다. 사용자가 "이건 살려야 한다"고 한 경우 `.discarded.md` → `.unrouted.md`로 이동시키거나 KA/MP/AC로 라우팅한다.

**자가 개선 트리거 확인 시점**: 사용자 처리 결과를 받은 직후. 같은 카테고리 결정이 N회 반복되면 메타 규칙([skill-self-improvement.md](../../../deploy/contexts/skill-self-improvement.md))의 "사용자 행동 패턴 트리거" 절차로 역제안.

## TODO·References 처리

문서 내 `TODO` / `References` 섹션은 본문(학습 정리)과 분리하여 자동 처리한다. 분류 흐름이 끊기면 안 된다.

- **TODO 섹션**: 미완·잔여 학습 항목 (예: "Next Auth Security — 필기하다 말았음")
- **References 섹션**: 학습 과정에서 모은 메타 — 상위/하위/관련 문서, Original 공식 출처 URL, 보충 자료 링크 등

- **TODO·References 항목** → AC `backlog/topics/`로 모은다. 양식·절차는 [`/backlog` 스킬](../../../deploy/skills/backlog/SKILL.md)에 위임한다.
- **명백히 무가치해 보이는 항목** (의미 없는 낙서, 중복 등) → `.discarded.md`로 원문 이동. 최종 판단은 사용자.

**비중 가드**: 한 문서에서 TODO/References/개인 계획이 본문의 절반 이상을 차지하면 자동 처리하지 않는다. 비중을 보고하고 처리 방향(전체 적재 vs 일부 추출)을 사용자에게 확인받는다.

## 산출물

네 형태:

- **KA 라우팅된 항목** — KA 프로젝트의 `knowledge/`·`techniques/`·`tips/` 경로에 destination 양식대로 작성 (아래 「양식 변환」 동시 적용)
- **MP 라우팅된 항목** — MP 프로젝트의 `docs/patterns/`·`best-practices-map.md`에 destination 양식대로 작성 (아래 「양식 변환」 동시 적용)
- **`<원본명>.unrouted.md`** — 입력 폴더. 옮긴 섹션은 본문 삭제, 사용자 판단 대기 보류 항목을 `<section>` 양식으로 남김 (「잔여 라벨링」)
- **`<원본명>.discarded.md`** — 입력 폴더. AI가 폐기 의도로 분리한 항목을 `<section>` 양식으로 (「잔여 라벨링」)

옮긴 것 / 남은 것(`.unrouted.md`) / 버린 것(`.discarded.md`) 합치면 원본 PDF/MD의 모든 항목과 동일하다.

라우팅 결과(어디로 옮겼는지·잔여·폐기 건수)는 채팅 응답으로만 보고한다. 입력 폴더에 보고용 파일(통합 완료 메모·"옮긴 곳" 인덱스 등)을 만들지 않는다. 사용자에게는 "<입력 폴더 경로>의 `.unrouted.md`·`.discarded.md` 파일들 확인" 한 줄로 안내한다. 잔여·폐기를 추가로 정리하지 않는다 — 사용자가 직접 본문 삭제·이동·복구 지시한다.

**자가 개선 트리거 확인 시점**: 라우팅 완료 직후. 라우팅 결정 자체에 패턴이 보이면 (예: 특정 도메인은 매번 같은 행선지) "자기 발견 트리거" 절차로 역제안.

## destination 워크트리

KA·MP destination 레포에 산출물을 쓰기 전에, master/main 워크트리에 직접 쓰지 않는다. 사용자의 진행 중 작업(rebase·병합 충돌 등) 위에 끼어드는 사고를 막기 위함이다.

단위: **doc-router 1회 실행 × destination 레포 1개 = 워크트리 1개**. 같은 레포로 가는 모든 항목을 하나의 워크트리·브랜치에 모은다 (파일마다 새 워크트리를 만들지 않는다).

절차 (KA·MP 각 레포, 라우팅 직전 1회):

- `git -C <destination 레포 루트> worktree list`로 재사용할 doc-router 워크트리가 있는지 확인
- 없으면 `git -C <destination 레포 루트> worktree add ../<레포명>-doc-router-<배치슬러그> -b doc-router/<배치슬러그>`로 생성 (`<배치슬러그>`는 입력 원본명 기반)
- 산출물 쓰기는 이 워크트리 경로에서만 수행한다. 「행선지 인덱스」 경로는 레포 루트 기준이므로 실제 쓰기 경로의 루트를 워크트리 루트로 치환한다
- 워크트리·브랜치는 작업 후에도 그대로 둔다. 커밋·push·merge 판단은 사용자가 한다

AC `backlog/topics`·`history` 행선지는 `/backlog`가 자체 워크트리(`ai-contexts-backlog`)로 처리하므로 여기서 따로 만들지 않는다.

## 양식 변환

라우팅 결정 시점에 destination project의 양식 가이드를 읽고 그 절차대로 양식을 적용한 결과를 destination 워크트리(「destination 워크트리」 절) 경로에 쓴다. 별도의 "후속 변환" 단계나 사용자 확인 게이트를 두지 않는다 — 사용자 확인은 라우팅+양식이 함께 적용된 최종 산출물에 대해 한 번만 받는다.

- KA 내용 → KA 프로젝트(`~/WebstormProjects/main/knowledge-archive/`)의 convert 스킬과 양식 가이드(`.claude/contexts/document-structure.md` 등)를 읽고, 그 절차대로 양식 적용. **convert 적용 직후 같은 산출물에 KA validate 스킬을 이어서 실행**하여 양식 위반(특히 OA가 빈 Q에 `[UNVERIFIED]` 마커 누락 등)을 자동 수정한다. validate가 잡은 위반은 사용자에게 보고할 산출물에 반영된 상태여야 한다.
- MP 내용 → MP 프로젝트(`~/WebstormProjects/main/monorepo-playground/`)의 `CLAUDE.md`와 관련 메타 파일을 참고하여 다음 중 적합한 곳에 추가:
  - `docs/patterns/<주제>.md` — 판단 기준·구현 패턴 (예시 코드 동반)
  - `docs/best-practices-map.md` — 인덱스

스킬 간 하드코딩 의존 없이, 대상 프로젝트의 스킬·메타 파일을 런타임에 읽어서 수행한다. doc-router에는 destination의 양식 규칙(Q&A 구조, frontmatter, drop 정책 등)을 하드코딩하지 않는다 — 단일 출처는 destination convert 스킬 (/scw 「책임 분리」 절 준수).

입력이 크면 destination 양식 적용을 서브에이전트에 위임, 작으면 doc-router에서 직접 처리.

## 라우팅 자가 검증

산출물 작성이 끝난 직후, 사용자에게 보고하기 전에 리뷰어 서브에이전트(opus)를 spawn하여 라우팅·잔여·폐기 판단이 합리적이었는지 점검받는다.

리뷰어 입력:

- 원본 PDF/MD 페어 경로
- 라우팅된 산출물: KA/MP/AC `backlog/`에 작성한 파일 경로와 본문
- `<원본명>.unrouted.md`: 사용자 판단 대기 보류 항목
- `<원본명>.discarded.md`: AI 폐기 의도 분리 항목

리뷰어 점검 차원:

- 행선지 적절성: `placement.md` 분업 표 대비 KA/MP/AC 매핑이 맞는가
- 양식 준수: KA 파일이 Q&A 구조·frontmatter·convert 규칙(원문만 변환, OA 신규 생성 금지, 빈 섹션 금지 등)을 따랐는가. MP 파일이 patterns 양식·코드 동반 요건을 따랐는가
- 분기 합리성: 보류(`.unrouted.md`) vs 폐기(`.discarded.md`) vs 라우팅 분기가 자료 성격에 맞는가 (잘못 버린 것·잘못 살린 것 없는가)
- 일반화·익명화: 본인 프로젝트 고유명사가 라우팅된 항목에 그대로 남았는가
- 누락 점검: 원본 PDF/MD의 항목이 어느 산출물에도 들어가지 않았는가
- 원문 첨가 점검: doc-router가 사용자 원문에 없는 설명·근거·해설을 라우팅된 항목에 임의로 추가하지 않았는가 (convert 「원문만 변환」 원칙)

리뷰어 출력: 의심 항목별로 (a) 위치 (b) 현재 판단 (c) 대안 판단 (d) 사유.

처리:

- 의심 0건이면 사용자에게 산출물 정상 보고
- 의심 1건 이상이면 사용자에게 의심 사항을 먼저 보고하고 처리 방향 확인 후 정정. 메인이 리뷰어 의견에 무조건 따르지 않는다 — 메인이 재판단 후 사용자가 결정.

## gotchas

다음 항목은 `.discarded.md`로 원문 이동. AI는 영구 삭제하지 않으며 사용자가 검토 후 살릴 수 있다.

- 버전 추적 로그 (`(0.0.x)` 식 본인 패키지 버전별 작업 단계)
- 디버깅 감정·소회 ("당황", "ㅋㅋ", "ㅠ", "해맸음", "구라쳐서")
- 자기 프로젝트 고유명사 (개인 패키지명·repo명·계정명)

라우팅된 항목 안에 고유명사가 섞여 있으면 라우팅 단계에서 일반화·익명화한다.

## 자가 개선

본 스킬은 [skill-self-improvement.md](../../../deploy/contexts/skill-self-improvement.md) 메타 규칙을 따른다.
