> 이관: KA main `knowledge/frontend/package-manager/overview.md` (2026-06-09). OA·Reference 없는 무출처 학습노트. 1차 소스로 검증해 OA를 채우면 KA 본문으로 복귀하고 이 파일은 삭제한다.

---
tags: [javascript, concept]
source: unverified
priority:
---

# Questions
- [UNVERIFIED] 패키지 매니저는 무엇이며 어떤 역할을 하는가?
- [UNVERIFIED] 패키지 매니저가 없으면 어떤 문제가 생기는가?
- [UNVERIFIED] 패키지 매니저가 주는 효과는 무엇인가?

---

# Answers

## [UNVERIFIED] 패키지 매니저는 무엇이며 어떤 역할을 하는가?

### User Answer
패키지 매니저는 다른 개발자가 만든 모듈을 다운로드·공유할 수 있게 해주는 도구다.
단순히 다운로드만 하는 게 아니라, 버전 관리와 호환성 체크까지 포함한다.

---

## [UNVERIFIED] 패키지 매니저가 없으면 어떤 문제가 생기는가?

### User Answer
패키지 매니저가 없으면 다음 문제가 발생한다.
- 모듈을 zip 파일로 직접 받아 수동 공유.
- 어떤 버전이 어떤 환경에서 동작하는지 직접 추적해야 함 → 버전 충돌.
- "내 컴퓨터에선 됐는데" 같은 환경 의존성 문제가 빈번.

---

## [UNVERIFIED] 패키지 매니저가 주는 효과는 무엇인가?

### User Answer
- 명령 한 줄로 모든 의존성을 설치 (`yarn install`, `npm install` 등).
- peer dependencies 같은 호환성을 자동으로 검증.
- lockfile로 모든 사용자가 동일한 버전을 받도록 보장.

### Reference
- https://d2.naver.com/helloworld/0923884
- https://toss.tech/article/lightning-talks-package-manager
- https://nodejs.org/en/learn/getting-started/an-introduction-to-the-npm-package-manager
