# Phase 4-kq: 파생 산출물 배포 (KQ)

KA 기반 변환이므로 Phase 3의 KA Maintain 완료 후 실행한다.

1. **KA HEAD 잠금**: 현재 KA HEAD를 캡처. 이 SHA를 `KA_DEPLOY_SHA`로 기억하고 Phase 4-kq 전체에서 동일 값을 사용.

2. **후보 리스트업**: KA의 `list-candidates`를 `KA_DEPLOY_SHA` 시점 기준으로 돌려 후보를 산출하고, 결과 JSON을 dispatch 디렉토리에 저장한다.

3. **dry-run 보고**: 후보 리스트를 사용자에게 그룹화하여 제출.
   - **NEW** (KQ에 없음 — 첫 변환 대상)
   - **CHANGED** (`lastCommitDate`가 직전 회차 `state.json.KQ.refreshedAt` 이후)
   - **UNCHANGED** (변경 없음, 재변환 불필요)
   - **SKIPPED** (선정 기준 미달 — `skipped.reason`별로 분리)
   - 출처별 추가 분리: `official` / `google-doc` / `unverified` / 미상

4. **사용자 confirm**: 사용자에게 dry-run 그룹을 보고하고 회차 진행 승인을 받는다. **변환은 항상 전체 candidates JSON으로 실행한다 — 일부만 필터링해 넘기지 않는다.** `parse-knowledge.mts`가 passing 전체를 재생성하고 `topics.json`을 전면 재작성하며 candidates 슬러그에 없는 `generated/*.json`을 orphan으로 자동 삭제하므로, 필터링하면 confirm에서 빠진 기존 퀴즈가 삭제된다.

5. **dispatch 발행**: `refresh-projects/dispatch/kq-update-quiz.md`에 다음을 박는다.
   - 잠금 SHA (`KA_DEPLOY_SHA`)
   - 전체 candidates JSON 경로 (절대 경로)
   - 결과 md 작성 경로 (`<dispatch>-result.md`)

6. **결과 수신**: 사용자가 dispatch md를 새 세션에서 실행하고 `-result.md`를 도착시킨다. 누락 시 보고 + 대기.

## 규칙 변경 감지

Deploy 스킬·스크립트(`scripts/list-candidates.mts`, `scripts/parse-knowledge.mts`) 자체가 변경된 회차에서는, dry-run 단계에서 사용자에게 보고하여 scope를 "전체 재생성"으로 확장할지 결정한다.
