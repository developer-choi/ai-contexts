---
step: markup
session: MARKUP
scope: project
entry: >-
  BG의 requirement 「자료 받기」 종료 + 코드 스타일 기준이 섬 — FOUNDATION PR이 있으면 그 PR의 verify 종료,
  없으면 BG의 「레포 확보」
model: Sonnet (figma URL 기준) / Opus (캡처-only·개인)
next:
  - to: plan
    notice: gate
    on: 공통 컴포넌트 확정
    when: COMPONENTS PR이 있을 때 (확정 0건이면 COMPONENTS PR에 기대는 PR까지)
---

# markup: 전 페이지 마크업 생성·검증

전 페이지 markup 생성·검증. PR에 안 들어감 (PR_{N}_IMPL이 페이지 단위로 검증된 코드를 그대로 가져감). MARKUP은 페이지·요소를 새로 만들거나 고치는 임시 작업만 한다 — 폰트·폴더·설정 같은 본 코드는 PR 몫이다.

모드 무관 공통 절차는 본 파일에 둔다. **디자인 진실 원천·재료·검사 방법은 모드 파일에 둔다** — figma 쓰는 모드(채용·실무)는 [figma.md](figma.md), figma 대신 사용자가 미리 만든 마크업 시안을 쓰는 모드(개인)는 [personal.md](personal.md).
## 입력·산출물·작업 위치

- **입력**: requirement 「자료 받기」에서 수집한 자료 — (채용·실무) figma·시안: `background/retained/figma-url.md`·`figma/` / (개인) 마크업 시안: `background/retained/mockup/`(+선택 `retained/spec.md`). 진입 문서 `background/retained/design-root.md`, (개인·실무) `background/retained/conventions-index.md`
- **산출물**: markup 워크트리의 디자인 진실 원천 0건 완성 마크업 코드(`.tsx`·`.module.scss`) + 공통 컴포넌트 확정·독립 산출 (COMPONENTS 종류 PR이 소비하는 단방향 입력)
- **작업 위치**: markup 워크트리(프로젝트 루트의 형제 디렉토리 `{메인 디렉토리}-markup`). 포트 3000 점유
  - 진입 시 MARKUP이 만든다. base는 FOUNDATION PR 브랜치의 verify 종료 시점 tip이고, 그 PR이 이미 머지됐거나 FOUNDATION PR이 없으면 기본 브랜치다
  - 마크업을 띄울 최소 셋팅(빌드·스타일링 중 base에 없는 것만)은 stub·TODO로 넘기지 않고 진입 직후 끝낸다. PR에 안 간다

## 세션 종료 조건

세션 종료 조건: **디자인 진실 원천의 모든 페이지·컴포넌트가 markup 워크트리에 마크업으로 존재하고, 컴포넌트별로 디자인 진실 원천 대조 0건 수렴**. 커버리지 원천(전 페이지·전 컴포넌트)은 모드 파일이 정의하는 디자인 진실 원천을 직독해 얻는다 — todo.md를 되읽지 않는다. 검증은 아래 「마크업 구현·검사」의 엔진이 담당한다.

## 공통 컴포넌트 확정

공통 컴포넌트를 확정해 독립 마크업(단일 재사용 단위)으로 산출한다 — PR이 인라인하지 못하도록 반드시 추출한다. 이 산출은 COMPONENTS 종류 PR이 소비하는 단방향 입력이다.

- **판정 기준 = 2군데 이상 쓰이면 공통** (다른 페이지 2곳이든 한 페이지 내 2회든). 1군데인데 확실히 판단 안 서면 사용자에게 에스컬레이션.
- **도메인 묻음/안 묻음은 별개 축** — 공통성 판정과 무관하게 배치(어느 PR·폴더)를 가른다. 범용(도메인 안 묻음)은 공통 자리, 도메인 결합은 그 도메인 자리.
- **seam**: 컴포넌트 경계·정체(무엇이 한 컴포넌트인가)는 MARKUP이 정한다. 파일 배치·경로·이름·조직은 PR_{N}이 정한다. 신뢰(그대로 가져오는) 대상은 **시각(CSS 수치 + HTML 구조)만**이고, 이름·배치 권한은 PR에 있다.

## 자료 참조 (수집은 requirement 「자료 받기」)

각 컴포넌트의 디자인 디테일 원천(재료)과 그 참조 방식은 모드 파일이 정의한다. 이 프로젝트의 구체 원본 위치와 대조 절차문서는 진입 문서 `background/retained/design-root.md`가 가리킨다 ([../../conventions/artifact/design-root.md](../../conventions/artifact/design-root.md) 양식).

개인·실무 모드면 `background/retained/conventions-index.md`에 등재된 표준 참고처(simplified 레포)도 마크업 참고에 포함한다 — 등재 절차·목록은 [requirement 「컨벤션 소스 수집」](../requirement.md#컨벤션-소스-수집--이름-스캔-선제안--conventions-indexmd)이 단일 출처.

참조 자료가 갖춰지면 markup 워크트리로 이동하여 「마크업 구현·검사」로 진입한다.

## 마크업 구현·검사

마크업 코드 작성·검사는 [impl-review-loop](../../impl-review-loop/SKILL.md)를 호출해 컴포넌트별 디자인 진실 원천 0건까지 수렴시킨다. 마크업 인자를 주입한다:

| 인자 | 주입값 |
|---|---|
| 구현자 | Markup Implementer (sonnet) — 마크업 전용 (CSS·최소 props). 로직·테스트 작성 안 함 |
| 재료 | 컴포넌트 목록, 디자인시스템 소스(MP `packages/design-system` 복사·차감), 기존 mixin/레이아웃 패턴 + 모드별 자료 (모드 파일 참조). **채용은 [스타터 코드·MP 재사용·스타일링 라이브러리](figma.md#채용-전용-스타터-코드mp-재사용스타일링-라이브러리)를 따름** |
| 진실검사 A | 모드 파일이 정의 — figma 대조([figma.md](figma.md)) / 시안 대조 + 사용자 시각 확인([personal.md](personal.md)). 종료 커버리지 = 디자인 진실 원천 전 페이지·전 컴포넌트 |
| 규칙검사 B | 마크업 coding-standards (AC [code-map.md](../../../../contexts/code-map.md) 탐색 절차로 찾은 마크업 관련 rules). 계속 돌린다(집행 유지 — 가져올 때 변환 최소화용 best-effort). 단 신뢰·의존 대상은 아니다 — 이름·배치 권한은 PR |
| 증분 단위 | 컴포넌트 |

구현자에게 주입하는 모드별 필수 지침은 해당 모드 파일을 따른다.

## 포트 룰

마크업 세션 = **포트 3000 점유**. /workflow 시작 시 사용자에게 안내.
