# Phase 4-readme: 대표 창구 갱신

**부모 사전작업** — `<저장된 해시>..HEAD` 범위의 모든 변경 파일(Phase 3 수정 + 사용자 직접 커밋 포함)을 기반으로, 각 파일의 상위 경로에 README.md가 있는지 탐색해 **갱신 후보 README 목록**을 만든다. 변경은 "이 README가 낡았을 수 있다"는 신호로만 쓴다. 여기에 Phase 1 링크·고아 전수 검출이 README에서 잡은 깨진 링크와, Phase 2 계획에서 정한 README 규칙 변경 대상도 후보로 합친다 — 상위 경로가 안 바뀐 README라도 깨진 링크가 있으면 갱신 대상이다.

**dispatch 발행** — 후보 목록과 갱신 규칙을 dispatch MD(`refresh-projects/dispatch/<repo>-readme.md`)에 박아 [위임 플로우](../dispatch.md#위임-플로우)로 새 세션에 넘긴다. dispatch MD에 박을 내용:

- 갱신 대상 README 목록과 각 README의 기준 문서(그 디렉토리의 SKILL.md 또는 핵심 문서)
- 각 README의 깨진 링크 목록(링크 체커 검출분) — dispatch가 이 링크를 우선 교정한다
- 갱신 방식: 각 README가 기준 문서와 정합한지 확인하고, 어긋난 곳만 고친 뒤 `/write-refine`(톤·구조·분량 다듬기)으로 다듬는다. 문서를 통째로 다시 쓰지 않는다
- 대조 문항: 각 문장이 기준 문서와 맞는지에 더해, **README가 첫머리에서 선언한 것과 본문 절들이 같은 방향인지**를 함께 본다
- 결과 md 경로: `refresh-projects/dispatch/<repo>-readme-result.md`

## 루트 README 전면 점검 (opt-in)

루트 README(모노레포면 등록 하위 레포 README 포함)는 회차마다 diff와 무관하게 한 번 묻는다.

- 부모가 사용자에게 묻는다: "루트 README 전면 점검할까요?"
- **yes** → 전체 구조 파악 전용 에이전트를 dispatch해 "지금 프로젝트 전체가 이렇게 생겼다"를 정리시킨 뒤, 그 위에서 골격 초안을 제안한다. 승인 게이트를 거쳐 승인되면 채우고 `/write-refine`으로 다듬는다.
- **no** → 건너뛴다.
- 판단 기준은 그 기간 diff가 아니라 **"지금 전체 구조를 루트가 잘 대표하나"**다. 비-루트 README는 위 diff 흐름 그대로(이 트랙은 손대지 않는다).
