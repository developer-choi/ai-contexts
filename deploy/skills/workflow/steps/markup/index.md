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
    notice: go
    on: 공통 컴포넌트 확정
    when: COMPONENTS PR이 있을 때 (확정 0건이면 COMPONENTS PR에 의존하는 PR까지)
---

# markup: 전 페이지 마크업 생성·검증

PR에 안 들어감 (PR 구현 세션이 페이지 단위로 검증된 코드를 그대로 가져감). MARKUP은 페이지·요소를 새로 만들거나 고치는 임시 작업과, 마크업을 띄울 최소 셋팅(아래 「작업 위치」)만 한다 — 폰트·폴더·설정 같은 본 코드는 PR 몫이다.

모드 무관 공통 절차는 본 파일에 둔다. **디자인 원본·재료·검사 방법은 모드 파일에 둔다** — figma 쓰는 모드(채용·실무)는 [figma.md](figma.md), figma 대신 사용자가 미리 만든 마크업 시안을 쓰는 모드(개인)는 [personal.md](personal.md).

## 입력·산출물·작업 위치

- **입력**: requirement 「자료 받기」에서 수집한 자료. 모드별 자료는 모드 파일의 「재료」를 따른다
- **산출물**: markup 워크트리의 디자인 원본 대조 지적 0건으로 완성한 마크업 코드(`.tsx`·`.module.scss`) + 공통 컴포넌트 확정 결과(아래 「공통 컴포넌트 확정」)
- **작업 위치**: markup 워크트리(`<레포>/.claude/worktrees/markup`). 포트 3000을 점유한다 — 세션 시작 시 사용자에게 알려 다른 세션의 dev 서버가 3000을 쓰지 않게 한다
  - 세션 진입 시 `git worktree add -b markup <레포>/.claude/worktrees/markup <base>`로 만든다. base는 FOUNDATION PR 브랜치의 verify 종료 시점 tip이고, 그 PR이 이미 머지됐거나 FOUNDATION PR이 없으면 기본 브랜치다
  - 마크업을 띄울 최소 셋팅(빌드·스타일링 중 base에 없는 것만)은 워크트리에 들어간 직후 끝낸다

## 세션 종료 조건

**디자인 원본의 모든 페이지·컴포넌트가 markup 워크트리에 마크업으로 존재하고, 컴포넌트별로 디자인 원본 대조 지적 0건 수렴 + 모드 파일이 정한 종료 조건 충족**. 커버리지 출처(전 페이지·전 컴포넌트)는 모드 파일이 정의하는 디자인 원본을 직독해 얻는다.

## 공통 컴포넌트 확정

구현에 들어가기 전에 확정한다.

1. Lead가 모드 파일이 정한 직독 대상(전 페이지)의 경로·URL을 서브에이전트에게 넘겨 훑게 하고, 전 컴포넌트 목록(공통 여부·범용/도메인 표시)과 판단이 서지 않은 후보만 받는다. 페이지 원문이 Lead 맥락에 쌓이지 않게 하려는 것이다.
2. 판단이 서지 않은 후보는 Lead가 사용자에게 물어 확정하고, 확정한 목록을 `background/retained/component-list.md`에 쓴다. 이 목록이 「마크업 구현·검사」 재료의 컴포넌트 목록이 된다.

공통 컴포넌트는 독립 마크업(단일 재사용 단위)으로 산출한다 — PR이 인라인하지 못하도록 추출한다.

- **판정 기준 = 2군데 이상 쓰이면 공통** (다른 페이지 2곳이든 한 페이지 내 2회든). 모양이 비슷한 요소가 같은 컴포넌트(변형)인지 애매하면 「판단이 서지 않은 후보」로 둔다.
- **도메인 묻음/안 묻음은 별개 축** — 공통성 판정과 무관하게 그 컴포넌트를 어느 PR이 가져갈지를 가른다. 범용(도메인 안 묻음)은 [COMPONENTS PR](../../conventions/pr-types/components.md), 도메인에 묶인 것은 그 도메인 페이지를 맡은 PR이 가져간다.
- **책임 경계**: 컴포넌트 경계·정체(무엇이 한 컴포넌트인가)는 MARKUP이 정한다. 파일 배치·경로·이름·조직은 PR_{N}이 정한다. 신뢰(그대로 가져오는) 대상은 **시각(CSS 수치 + HTML 구조)만**이다.

## 자료 참조 (수집은 requirement 「자료 받기」)

개인·실무 모드면 `background/retained/conventions-index.md`에 올라 있는 표준 참고처(simplified 레포)도 마크업 참고에 포함한다 — 올리는 기준은 [conventions-index.md](../../conventions/artifact/conventions-index.md)가 정한다.

참조 자료가 갖춰지면 `EnterWorktree`에 markup 워크트리 경로를 줘 들어가 「마크업 구현·검사」로 진입한다.

## 마크업 구현·검사

마크업 코드 작성·검사는 [impl-review-loop](../../impl-review-loop/SKILL.md)를 호출해 컴포넌트별 디자인 원본 대조 지적 0건까지 수렴시킨다. 마크업 인자를 주입한다:

| 인자 | 주입값 |
|---|---|
| 구현자 | Markup Implementer (sonnet) — 마크업 전용 (CSS·최소 props) |
| 재료 | 컴포넌트 목록, 디자인시스템 소스, 기존 mixin·레이아웃 패턴 파일 경로 + 모드별 자료·구현자 지침 (모드 파일 참조). **채용은 [스타터 코드·MP 재사용·스타일링 라이브러리](figma.md#채용-전용-스타터-코드mp-재사용스타일링-라이브러리)를 따름** |
| 정답 대조 A | 모드 파일이 정의 — figma 대조([figma.md](figma.md)) / 시안 대조 + 사용자 시각 승인([personal.md](personal.md)). 종료 커버리지 = 디자인 원본 전 페이지·전 컴포넌트 |
| 규칙검사 B | 없음 |
| 커밋 단위 | 컴포넌트 |
