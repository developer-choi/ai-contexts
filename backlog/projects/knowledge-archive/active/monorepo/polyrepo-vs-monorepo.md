# Polyrepo vs Monorepo

- **[검증 필요]** "publish & install로 어드민만 선반영 가능 / 모노레포에서도 가능 (테스트 안 함)" — 결론·검증 미완

---

> 이관: KA main `knowledge/frontend/monorepo/polyrepo-vs-monorepo.md` (2026-06-09). OA·Reference 없는 무출처 학습노트. 1차 소스로 검증해 OA를 채우면 KA 본문으로 복귀하고 이 파일은 삭제한다.

---
tags: [history, comparison, architecture]
source: unverified
priority:
---

# Questions
- [UNVERIFIED] 프로젝트 관리 방식의 역사는 어떻게 흘러왔는가?
- [UNVERIFIED] 모노레포가 유리한 경우와 폴리레포가 유리한 경우는?
- [UNVERIFIED] 코드 공유와 수정 측면에서 모노레포와 폴리레포는 어떻게 다른가?

---

# Answers

## [UNVERIFIED] 프로젝트 관리 방식의 역사는 어떻게 흘러왔는가?

### User Answer
크게 세 단계로 정리된다.
- 모놀리식: 모든 코드가 한 덩어리. 모듈화 부재로 변경 영향 범위가 넓어진다.
- Polyrepo (멀티 레포): 도메인이나 서비스마다 별도 repo. 모듈화·소유권은 명확해지지만, 공통 코드를 공유하기 어렵다.
- Monorepo: 여러 패키지를 하나의 repo에 모음. 코드 공유는 쉽지만, 빌드/배포 도구 체인이 복잡해진다.

각 단계는 직전 단계의 한계를 해소하려고 등장했다.

---

## [UNVERIFIED] 모노레포가 유리한 경우와 폴리레포가 유리한 경우는?

### User Answer
공통 코드 비중에 따라 손익이 갈린다.

**모노레포가 유리한 경우 (공통 코드 비중 높음)**
- 예: 여러 앱이 디자인 시스템·공통 유틸·도메인 모델을 공유하며, 공통 코드 비중이 70~100%.
- 공통 코드 변경 시 모든 앱에 즉시 반영해야 하면 모노레포가 압도적으로 편하다.

**폴리레포가 유리한 경우 (공통 코드 비중 낮음)**
- 예: 각 서비스가 독립적이고 공통 코드 비중이 10~30%.
- 빌드/배포 단순함, 팀별 권한·릴리스 사이클 분리가 더 큰 가치.

"왜 모노레포인가"를 결정할 때 이 비중을 먼저 보는 게 출발점이다.

### Review Note
- "publish & install로 어드민만 선반영 가능 / 모노레포에서도 가능"은 검증 미완 → inbox.

---

## [UNVERIFIED] 코드 공유와 수정 측면에서 모노레포와 폴리레포는 어떻게 다른가?

### User Answer
- Monorepo: 같은 repo 안의 패키지를 install 없이 import 한다 (workspaces가 link 처리).
- Polyrepo: 패키지를 publish → 사용처 프로젝트에서 install → PR/머지를 패키지마다 반복.

작은 변경이 여러 패키지에 걸치는 경우, polyrepo는 각 단계마다 publish/install/PR 사이클이 누적되어 비용이 크다.
모노레포는 한 PR로 여러 패키지를 동시에 수정·검증할 수 있다.
