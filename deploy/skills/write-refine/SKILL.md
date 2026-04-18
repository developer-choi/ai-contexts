---
description: write-init이 만든 패키지(frontmatter + 본문 단일 .md)의 톤·구조·분량을 다듬는다. 작업 히스토리 없는 새 세션에서 호출. 사실 검증은 안 함 — 표현·구조·분량만 다룬다.
argument-hint: <package-file-path>
---

# write-refine — 다듬기 세션용 (가칭)

write-init이 만든 패키지를 받아 톤·구조·분량을 다듬는다. 작업 히스토리는 없고, 패키지의 frontmatter가 유일한 컨텍스트 소스다.

## 입력

`/write-refine <파일 경로>` 형태로 호출한다. 파일은 write-init이 만든 패키지(frontmatter + 본문 단일 .md).

frontmatter 필드:
- **필수**: `type`, `subtype`, `audience`, `purpose`, `key_message`
- **선택**: `audience_knowledge`, `tone_hint`, `length_target`, `refs`

## writing-guide 로드

[CRITICAL] `../../contexts/writing-guide/map.md`를 읽고 탐색 절차를 따른다.

## 에이전트 구조

[CRITICAL] [team-agent](../../contexts/team-agent.md) 규칙을 따른다.

- 메인 = 리뷰어 (검토)
- refine-writer = 수정자 (Edit 권한, 파일 직접 다듬기)
- refine-writer가 팀에 없으면 스폰, 있으면 SendMessage

## 작업 흐름

### 0. 입력 검증

파일 존재 확인. frontmatter 파싱.

- frontmatter 자체가 없거나 형식이 깨져 파싱 실패 → "frontmatter가 없거나 형식이 깨졌습니다. write-init 패키지가 맞는지 확인하세요"로 종료
- **필수 필드 5개**(`type`, `subtype`, `audience`, `purpose`, `key_message`) 누락 → "이 파일은 write-init 패키지 형식이 아닙니다. write-init부터 다시 호출하세요"로 종료
- 선택 필드 누락은 통과

### 1. 패키지 파악

frontmatter에서 컨텍스트(독자·목적·톤 힌트·분량 목표·참조 컨텍스트 등) 추출. 본문 분량과 구조 파악.

### 2. refine-writer 위임

writer에게 SendMessage로 위임:
- 파일 경로 (writer가 직접 Read·Edit)
- 다듬기 지시: "writing-guide 규칙·사례 적용해서 본문 다듬기. **frontmatter는 절대 건드리지 마.** 사실 검증·수정은 안 함."

**핑퐁 카운터**: 매 위임 시 메인이 `+1` 카운트. 카운트는 메인이 보유.

### 3. 메인이 검토

writer 작업 완료 통보 받으면 파일 다시 Read해서 검토:
- writing-guide 규칙·사례와 대조
- **frontmatter 변경 여부 확인** — 변경됐으면 즉시 writer에게 복원 지시 (메인 카운트 소비 X)
- **복원 시도 캡: 2회**. 2회 후에도 frontmatter 변경되면 작업 중단하고 사용자에게 "writer가 frontmatter를 반복 변경하여 작업 중단됨"으로 보고

### 4. 응답 처리

- **이슈 없음** → 결과 파일 경로를 사용자에게 보고하고 종료
- **이슈 있음** → 가공된 피드백을 SendMessage로 writer에게 전달 → 2번부터 반복 (카운트 +1)
- **카운트 5 도달 → 6번째 위임 시도 시 강제 종료**, 현재 결과 + 미해결 이슈 + 카운트 함께 보고

### 5. 사용자 피드백 처리

사용자가 결과 보고 자연어 피드백 줄 때, 메인이 **1차 가공**한다. 매번 writing-guide map.md를 다시 탐색해서 가장 가까운 규칙·사례에 매핑.

| 사용자 자연어 (예시) | 가공된 지시 |
|--------------|-----------|
| "더 친근하게" | "writing-guide tone.md의 친근한 격식체 사례 참조해서 어미·표현 조정" |
| "단정 표현 줄여" | "tone.md '단정 표현 회피' 규칙 적용 — `~이다`를 `~로 보인다` 등으로" |
| "이 부분 더 짧게" | "X 섹션을 N문단으로 축소. 핵심 메시지 보존" |
| "구조 어색해" | "structure.md 사례 대조 — 전제→결론 순서 점검" |

위 표는 **예시**이며 폐쇄 목록 아니다. 표에 없는 자연어가 들어오면 메인이 writing-guide 탐색 후 매핑하고, 매핑 결과를 사용자에게 한 번 확인받고 위임한다.

가공된 지시를 writer에게 SendMessage. **메인은 직접 파일 수정하지 않는다.**

**5단계 진입 시 핑퐁 카운터 리셋.** 사용자 자연어 피드백 1건당 새 핑퐁 라운드(최대 5회) 시작.

### 사실 오류 발견 시

writer가 명백한 사실 오류(예: 함수명 오타, 날짜·숫자 오류, 누락된 주요 정보) 발견 시 **수정하지 말고 메인에게 보고** → 메인이 사용자에게 알림. write-refine은 톤·구조·분량만 다룸. 사실은 사용자/write-init 책임.

## 출력

writer가 Edit으로 입력 파일을 **직접 다듬는다**. 별도 파일 생성 X. 사용자에게 같은 파일 경로 안내.

## 교정 사례 축적

다듬기 시 메인이 (원본, 수정, 사유)를 세션 메모리에 누적한다. 사유는 메인의 5단계 매핑 결과(writing-guide의 어떤 규칙·사례에 매핑됐는지)에서 가져온다. 같은 규칙·사례에 해당하는 수정은 묶어서 1건으로 누적한다 (대표 예 1개 + 나머지 횟수).

### 사례 반영 (/pre-exit 연동)

사용자가 /pre-exit를 실행하거나 반영을 요청하면:
1. 메인이 누적 사례 목록을 사용자에게 보여줌
2. 각 사례에 대해 사용자가 판단: 규칙화·사례 보존은 AC 원본(`~/WebstormProjects/main/ai-contexts/deploy/contexts/writing-guide/`) 아래의 `tone.md` / `examples/*.md`에 추가, 또는 폐기
3. 사용자 승인한 사례만 해당 파일에 반영 (AC 원본 수정)

## write-init과의 관계

write-init이 내용 채움, write-refine이 톤·구조·분량 다듬기. 두 스킬을 한 작업의 두 단계로 사용한다. write-refine은 작업 히스토리 없이 frontmatter만으로 출발.
