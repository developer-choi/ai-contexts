---
target: deploy/skills/write-refine/SKILL.md
---

# write-refine 내용 오류 반송(bounce) 처리

## [ideation] refine이 내용 오류를 만났을 때 init으로 반송

### 동기

write-refine은 톤·표현만 다루는데, 다듬다 내용(사실) 오류를 발견하면 현재 처리 경로가 없다.

### 핵심 아이디어

팀이 설계한 반송(bounce → write-init) 메커니즘 + "결함 교정률" 지표. 단 사용자가 실제 발생 사례를 떠올리지 못해 보류 — 가상 케이스에 무게를 짊어지지 않기로 했다. 현 규칙은 "내용 오류는 refine 전 init에서 확정"으로 단순화돼 있다.

### 부활 조건

write 강화회고(pre-exit write-refine 보강)가 상시 운영되는 가운데, 실전에서 진짜 내용-오류 사례가 나오면 부활시킨다. (출처: 폐기된 `write-skills-redesign/roadmap.md`의 연계·미해결 파킹 노트.)
