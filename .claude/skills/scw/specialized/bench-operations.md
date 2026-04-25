# Bench Operations

ablation·기능 벤치를 주기적으로 운용할 때의 인프라·절차 가이드. 방법론은 [`rule-ablation-bench.md`](./rule-ablation-bench.md) 참조.

## 환경 격리 — 워크트리 분리

- 메인 cwd의 `CLAUDE.md`가 모든 subagent에 auto-discovery된다. ZERO 격리는 메인 cwd ≠ 측정 워크트리일 때만 유효
- 패턴: 메인은 `master` clean 상태, 별도 워크트리(예: `~/WebstormProjects/main/<project>-bench/`)에서 측정
- 워크트리 cwd 안 자체가 측정 대상 규칙(예: `CLAUDE.md`, `deploy/contexts/coding-standards/`)이라면 워크트리 분리만으로 회피 불가 — 외부 환경 필요

## 외부 환경 — 진짜 ZERO 격리

워크트리 분리만으로 회피 안 되는 보류 항목은 다음 환경에서 재측정:

- `ANTHROPIC_API_KEY` 직접 호출 (Anthropic SDK 또는 `claude --bare`)
- 다른 계정·다른 프로젝트 cwd
- 결과는 원래 결과 md에 "외부 환경 재측정" 섹션으로 추가

## 모델 업데이트 시 baseline 재측정

벤치 판정은 측정 시점 모델 기준. 모델 메이저 업데이트(예: Sonnet 4.6 → 4.7) 시 baseline 변경 가능 — D 판정 항목 자동 재검증 트리거 필요.

- 결과 md에 측정 모델 명시 권장 (예: `sonnet-4-6`)
- 모델 변경 시 D·E·B 판정 항목부터 spot check (유지 항목은 후순위)

## 워커 권한 분리

Agent Teams로 워커 spawn 시 권한 분리 명시:

| 역할 | 권한 |
|------|------|
| 메인 | 모든 git commit, roadmap 갱신, 적용 결정, 사용자 보고 |
| 워커 | 결과 md 작성만. git commit/push/checkout, roadmap 갱신, 다른 영역 파일 수정 금지 |

worker brief 첫줄에 명시 — 위반 사고(워커가 master에 직접 commit, deploy/* 자율 수정 등) 방지.

## 측정 vs 권고 분리 (자율 적용 게이트)

워커 결과 md는 측정 데이터와 추정/권고를 항상 분리한다. 메인이 자율 적용할 때 두 영역의 신뢰도가 다르기 때문이다.

### 결과 md 형식 강제

워커는 결과 md를 다음 섹션으로 분리:

- `## 측정 데이터` — with/without 직접 측정 결과만 (응답 인용 + 정량 매칭)
- `## 권고` — 측정 결과를 사람이 해석한 변경 제안 (slim 형태·텍스트 추가 등)
- `## 추정` — 직접 측정 안 된 판단 (사용성 분석·정합성 검토·baseline 내재화 추정 등)

### 자율 적용 게이트

메인 자율 적용은 **측정 데이터 섹션의 D/E/B 판정만**. 그 외는 사용자 1차 승인 필수.

| 변경 유형 | 자율 적용 | 사용자 승인 |
|----------|---------|-----------|
| 측정 D — 규칙 본문 제거 | O (단, 파일 삭제는 X) | — |
| 측정 E/B — 규칙 본문 압축 | O | — |
| 권고 — slim 형태·새 텍스트 추가 | X | 필수 |
| 추정 기반 변경 (baseline 내재화 추정) | X | 필수 |
| 파일·섹션 통째 삭제 | X | 필수 |
| 텍스트 정합성 정정 (자명한 표기 오류) | O | — |

### 벤치 외 작업 라벨 분리

다음 작업은 벤치가 아니다. 결과 md에 별도 라벨로 명시하고 "벤치"라고 부르지 않는다 — 사용자가 측정한 것으로 오해하지 않도록.

- 사용성 분석 (참조처 grep + 미수정 기간) — `## 사용성 분석`
- 정합성 검토 (텍스트 중복·충돌) — `## 정합성 검토`
- 텍스트 보강 (description·fallback 추가) — `## 텍스트 보강 권고`

## 결과 md / commit 단위

- 결과 md 위치: `bench/results/<target>/<rule-id>.md`
- 결과 md / 규칙 파일 수정 / roadmap 갱신은 **각 별도 commit**. 한 commit에 섞지 않음
- 영역(global.md / coding-standards / writing-guide 등) 다르면 영역별 분리 commit

## 보류 항목 운영

환경 상속·시나리오 부족·모델 업데이트 등으로 판정 보류된 항목은 `pending-revalidation.md`에 누적:

- 항목별 사유 + 재측정 트리거 조건 명시
- 외부 환경 셋업 또는 모델 업데이트 시 일괄 재측정
- 적용 후 운영에서 오발동 관찰 시 보류 항목으로 추가 (압축본 트리거 확장 사례)

## 인수인계 주의사항

- 커밋 훅 우회 표현: 메시지 본문에 `git add -A` 같은 문자열 포함 시 false positive 차단 — 표현 우회
- Agent Teams는 AI가 shutdown 못 보내므로 사용자 `/exit` 시 정리
- 워크트리·backup 브랜치는 작업 종료 후 정리 (보류 재측정 시 새로 셋업)
