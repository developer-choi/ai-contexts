---
target: deploy/skills/write-init/
---

# write-init

## write-init이 writing-guide의 PR 본문 구조 가이드를 참조하지 않는 설계 결함 `draft`

### 발견 맥락

2026-04-21 write-init·write-refine 스킬 벤치 세션에서 발견. 브랜치 `feature/write-skills-benchmark`의 커밋 체인을 만들며 스캔 중 스코프 외 이슈로 분류, 별도 세션에서 처리하기로 보류한 항목.

벤치 세션 자체는 커밋 `471187a`, `b76f483`, `2d85827`, `ff4221a`, `17ca960`, `f972e67` 6건으로 마무리됨 — 이 항목은 그 범위를 벗어나 여기로 넘겨둠.

### 현재 구조

write-init과 write-refine은 외부 공개용 텍스트(PR 본문, README, PR 코멘트)를 2단계로 처리한다. 세 디렉토리가 얽혀 있다.

| 디렉토리 | 역할 | 로드 타이밍 |
|---|---|---|
| `deploy/skills/write-init/` | 내용 풍부 채우기 (뼈대→사용자 채움→펼침) | 작업 세션 |
| `deploy/skills/write-refine/` | 톤·구조·분량 다듬기 | 새 세션, frontmatter만 컨텍스트 |
| `deploy/contexts/writing-guide/` | 작성 규칙·사례·구조 템플릿 집합 | `write-refine`이 map.md 태그 기반으로 선별 로드 |

writing-guide 탐색 규칙(`deploy/contexts/writing-guide/map.md:17-33`):
- `[always]` 태그는 모든 작업에서 무조건 로드
- `[pr]` 태그는 PR 작성/리뷰 시 로드
- `[readme]` 태그는 README 작성 시 로드

현재 **이 탐색은 `write-refine/SKILL.md:20`에서만 트리거**된다. write-init은 writing-guide를 참조하지 않는다.

### 문제 상세

`deploy/contexts/writing-guide/templates/pr-body/` 아래에 두 파일이 있고 map.md에서 `[pr]` 태그가 붙어 있다.

- `recruitment-narrative.md` — 서사형 PR 본문 작성 구조
- `recruitment-evidence.md` — (내용 미확인, 증거형 PR 본문 구조로 추정)

`recruitment-narrative.md`는 단순 톤 규칙이 아니라 **PR 본문 내용을 어떻게 구성할지**를 담는다. 핵심 항목:

1. 서사 구조: 목표 → 로드맵 → 이미 완료된 것 → 이번 PR → 다른 목표와의 연결
2. 설정 디테일은 불필요 — 왜 이 구조를 선택했는지에 집중
3. 예시로 임팩트를 보여주기 — 추상적 설명 대신 "이걸 막았다"를 코드로
4. 목적은 기술 이유가 아니라 도입 동기 — 팀에 어떤 가치를 주는가
5. 목적/의도 먼저, 수단/방법은 나중에
6. 사용자가 삭제한 섹션은 부활 금지
7. 결론은 bold 강조

이 원칙들은 "톤"이 아니라 "내용 구조·설득 방식"이다. **내용을 쌓는 단계(write-init)가 몰라서는 안 되는 정보**다.

현재는 write-init이 이 원칙을 모르고 뼈대를 펼치고, write-refine이 받아서 구조 재편을 해야 한다. 2단계가 겹친다.

### 왜 문제인가

**겹침으로 인한 실질 비용:**

1. write-refine은 "톤·구조·분량 다듬기"만 한다고 SKILL.md가 정의한다. 사실상 구조 재편까지 강요되면 역할 정의가 모순된다.
2. write-init 결과물을 사용자가 먼저 검토·승인(5단계)하는데, 구조가 틀어져 있으면 사용자 피드백이 구조에 집중되어 내용 보강 피드백이 제대로 안 나온다.
3. write-refine에서 구조 재편이 일어나면 사용자가 write-init 산출물로 확인했던 내용 배치가 바뀌어 혼란.
4. 토큰 낭비 — 같은 문서를 두 번 크게 손보게 됨.

**역할 분리 관점:**

writing-guide는 "규칙·사례·가이드" 3종으로 구성된다(`map.md:5-8`). 사례는 테스트 케이스지만 가이드(`readme-guide.md`, `templates/pr-body/*.md`)는 작성 절차. 작성 절차를 작성 단계(write-init)가 못 보고 다듬기 단계(write-refine)만 보는 구조는 부정합.

### 재현 시나리오

1. PR 본문 작성 작업 세션에서 `/write-init pr-body recruitment` 호출
2. 메인이 뼈대 생성 후 사용자가 어필 포인트 채움
3. 4단계 "풍부 펼침" — recruitment-narrative.md를 로드하지 않으므로 "설정 디테일 불필요", "왜 먼저, 어떻게 나중" 같은 원칙 무시 가능
4. 5단계 사용자 리뷰에서 내용 OK → 6단계 패키지 생성
5. 새 세션에서 `/write-refine <path>` 호출
6. write-refine이 writing-guide/templates/pr-body/recruitment-narrative.md 로드 → 섹션 순서·강조 방식이 규칙과 다름을 감지
7. refine-writer가 구조 재편 수행 → 사용자가 승인한 내용 배치가 바뀜

이 시나리오를 실제로 돌려 구조 재편 빈도를 측정하면 영향 크기가 잡힌다.

### 해결 방향 후보

**후보 1: write-init도 writing-guide를 로드한다**

- 수정: `write-init/SKILL.md` 4단계 "풍부 펼침" 앞에 `[CRITICAL] ../../contexts/writing-guide/map.md 읽고 탐색 절차 따른다` 추가
- 장점: 최소 변경, write-refine과 같은 메커니즘 재활용
- 단점: write-init이 더 무거워짐. 뼈대 생성 단계가 느려질 수 있음. 지금도 이미 strict inference guard 추가로 지시가 늘어난 상태

**후보 2: 구조 가이드를 write-init 전용으로 이관**

- 수정: `writing-guide/templates/pr-body/` → `write-init/templates/pr-body/`로 이관 + write-init 1단계에서 로드
- 장점: 역할 분리 명확 (write-init = 구조·내용, write-refine = 톤)
- 단점: write-refine이 구조 규칙을 모르게 됨 → 다듬기 중 구조 위반을 감지 못함. 현재 write-refine이 map.md를 탐색하는 설계와 충돌

**후보 3: 구조 가이드를 양쪽에서 로드하되 태그로 분리**

- 수정: map.md에 `[pr-structure]` 태그 신설, `[pr-tone]`와 분리. write-init은 `[pr-structure]` 로드, write-refine은 둘 다 로드
- 장점: 각 단계가 필요한 만큼만 봄
- 단점: 복잡도 증가, 기존 `[pr]` 태그 사용처를 재분류해야 함

**후보 4: write-init·write-refine 통합**

- 수정: 2단계 구조 폐기, 단일 스킬로 합침
- 장점: 겹침 문제 원천 제거
- 단점: "새 세션에서 다듬기" 유즈케이스(작업 컨텍스트 없이 frontmatter만으로 다듬기) 포기. 기존 설계 의도를 바꿈

### 검증 방법

- 재현 시나리오를 실제로 돌려 현재 구조의 실패 빈도·크기 측정 (시뮬레이션 벤치)
- 각 후보 반영 후 같은 시나리오로 재측정
- 측정 지표: write-refine 단계에서 섹션 순서 변경 횟수, 사용자 채움 텍스트 배치가 write-init 결과 대비 바뀐 비율, 토큰 소비

### 주의사항

- **스코프**: 후보 2·3·4는 writing-guide 전체 재설계급. 후보 1이 가장 작은 변경이지만 이것도 write-init 호출 컨텍스트를 키우는 효과가 있어 성능 영향 확인 필요
- **기존 벤치 재활용 가능**: `ai-contexts-write-refine` 워크트리(현재 삭제 예정)에 있던 `workspace/bench-scenario/`, `workspace/bench-round2/` 구조가 참고 자료. 해당 워크트리 삭제 전에 필요한 자료는 미리 옮겨두거나, 이 이슈 착수 시 워크트리 재생성
- **설계 의도 확인 필요**: 2단계 분리(write-init·write-refine)의 본래 의도는 "작업 세션 컨텍스트 유무에 따른 책임 분리". 이 의도를 깨지 않는 선에서 해결책을 찾아야 함

### 관련 파일

- `deploy/skills/write-init/SKILL.md`
- `deploy/skills/write-init/templates/pr-body.md`
- `deploy/skills/write-refine/SKILL.md`
- `deploy/contexts/writing-guide/map.md`
- `deploy/contexts/writing-guide/templates/pr-body/recruitment-narrative.md`
- `deploy/contexts/writing-guide/templates/pr-body/recruitment-evidence.md`
- `deploy/contexts/writing-guide/readme-guide.md` (readme type도 같은 패턴일 가능성 — readme 이슈는 커밋 `ff4221a`에서 "가이드 참조" 예외 처리로 우회 처리했으므로 참고)
- `deploy/agents/refine-writer.md`

### 관련 커밋 (feature/write-skills-benchmark)

- `2d85827` write-init에 추측 확장 금지 지시 추가 — 이 이슈 해결 시 해당 지시와 충돌 없는지 확인 필요
- `ff4221a` readme 타입 예외 처리 — writing-guide/readme-guide.md를 `write-init`이 참조하도록 이미 한 예외. 같은 패턴을 pr-body에 확장하는 것이 후보 1의 실체

이 브랜치는 현 시점(2026-04-21) 머지 전. 머지 여부에 따라 출발점이 달라짐.
