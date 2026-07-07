# STATUS — refresh-prompts (draft)

이번 how→what 4.8 스윕에서 시행착오로 도출한 절차를 캡처한 draft. 실사용(다음 모델 업그레이드)으로 안정되면 이 파일 삭제.

## 남은 작업

- `sync:local-system`으로 배포 (`.claude/skills/`·`.agents/skills/`)
- 다음 모델 업그레이드 시 실사용 → gotchas 축적
- (옵션) 모델 ID 변경 감지 hook으로 발동 리마인드 — rules-as-code 검토

## 출처 학습 (이번 세션)

- 격리는 대상 로드 방식으로 갈림 (scw bench-operations 「대상 로드 방식별 격리」에 반영)
- 병렬 세션은 고유 워크트리 이름 필요 (scw bench-operations 「병렬 측정」에 반영)
- 실제 스윕 산출물: `projects/ai-contexts/active/how-minimization*.md`
