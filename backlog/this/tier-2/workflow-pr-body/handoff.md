# 인수인계 — 채용과제 PR 본문 합본 템플릿

> 다른 컴퓨터에서 이어 작업할 때 이 파일부터 읽는다. 정리 끝나면 삭제.

## 어디서 작업했나

- 레포: AC (`ai-contexts`)
- 브랜치: `feature/pr-body-templates`
- 워크트리(원래 머신): `C:/Users/forwo/WebstormProjects/main/ai-contexts-pr-body-templates` (다른 머신에서는 자유롭게 위치 잡으면 됨)
- 작업 디렉토리(레포 기준): `deploy/skills/workflow/recruitment/pr-body/`

## 무슨 작업을 하고 있었나

채용과제 `/workflow` step-2의 PR1·PR2·PR3 고정 구조에 맞춰 **매번 재사용할 PR 본문 합집합 템플릿**을 만든다. 매 채용과제마다 이 템플릿을 복사해서 시작하고, 그 과제에서 안 한 항목만 빼서 사용한다.

소스: 과거 진행한 채용과제 3개의 GitHub PR 본문
- stunning: https://github.com/developer-choi/recruitment-stunning-202603 (PR #2, #3)
- wisebirds: https://github.com/developer-choi/recruitment-wisebirds-20260505 (PR #1, #2, #3)
- rapportlabs: https://github.com/developer-choi/recruitment-rapportlabs-202604 — **PR 0개** (Initial Commit만 있음, 합본 소스 없음)

합치는 방식(사용자 확정): 통합본 1벌, 각 섹션 끝에 `출처: <repo> #N (URL)` 표시. 두 PR이 같은 섹션을 다루면 합집합 + 출처 둘 다 표기. 출처 줄은 추적용이므로 실제 채용과제 제출 본문에서는 제거하라는 안내를 파일 상단에 넣어둠.

## 완료된 것

- `pr-body/pr1.md` (프로젝트 세팅) — stunning #2 + wisebirds #1 합본
- `pr-body/pr2.md` (공통 인프라) — stunning #3 + wisebirds #2 합본

## 남은 것

**PR3 (공통 컴포넌트) 본문**

소스가 wisebirds #3 하나뿐인데 그게 mixed PR이다 — "공통 GNB·페이지네이션"(=PR3 성격) + "유저페이지 리스팅 미완성"(=페이지 PR 성격)이 한 PR 본문에 섞여 있음. 그래서 그대로 갖다 쓰면 PR3 템플릿으로 어색하다.

URL: https://github.com/developer-choi/recruitment-wisebirds-20260505/pull/3

이 세션에서 사용자 결정: "이건 따로 다시 생각해보자". 처리 방향 미정 상태로 보류.

가능한 옵션 (다음 세션에서 정할 것):
- 공통 컴포넌트 부분(GNB, 페이지네이션, 데이터테이블 등)만 추출해서 PR3 템플릿으로
- stunning은 PR3가 페이지 PR에 통합되어 있어서 별도 본문 없음 → stunning 페이지 PR(#4 메인 / #5 콘테스트상세 / #6 콘테스트신청)에서 공통 컴포넌트 관련 서술이 있으면 거기서도 발췌
- 또는 PR3는 케이스마다 너무 다르다고 판단하고 "최소 골격"만 템플릿으로 두기

## 환경 메모

- AC `master`는 푸시 완료 상태(어제 다른 머신에서 push). 이 머신 로컬 master에는 untracked로 `_roadmap-step4-pseudocode.md` 파일이 남아있음 — 사용자 작업이라 안 건드림.
- 이 브랜치는 `origin/master` 기준으로 분기.
