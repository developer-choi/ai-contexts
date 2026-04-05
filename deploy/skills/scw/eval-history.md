# Eval 기록: workflow 서브에이전트 위임 구조

## 1단계: 위임 트리거 (skill-creator 표준 방식 병행)

서브에이전트에서 스킬을 읽고 "어떻게 하겠다"고 설명하게 하여, 위임 패턴을 인식하는지 테스트. 실제 위임은 불가하지만 인식 여부는 확인 가능.

- 6개 시나리오 × with/without skill = 12 runs
- 결과: 위임 인식 6/6 (100%)
- 발견: 스킬 문서 모호성 3건 (병렬/순차, 코드 접근 경계, assertion 설계 오류)

**주의**: without_skill baseline 에이전트가 working directory의 스킬 파일을 자체 발견하여 오염됨 (5/6). worktree 격리 필요.

## 2단계: E2E (메인 직접 실행)

메인 에이전트가 가상 프로젝트(sum/multiply)에서 step-5 오케스트레이션을 직접 수행.

- 메인 에이전트 → 코드 작성
- review 서브에이전트 → diff 리뷰
- 2 phase 사이클 완료, 커밋 순서 확인

**한계**: toy 프로젝트라 복잡도 부족. 컨벤션별 N개 리뷰 병렬은 미검증.

## 3단계: 세션 분리 인식

"Step 4 끝났습니다" → IMPLEMENTATION_SESSION 전환 안내 여부. skill-creator 표준으로 검증 가능. PASS.

## 성과

eval 과정에서 스킬 문서 개선 4건 반영:
1. N개 서브에이전트 인스턴스 병렬 실행 규칙
2. step-5 리뷰 서브에이전트 병렬 명시
3. step-6 병렬 + Gap Analysis 코드 접근 경계
4. 세션 전환 안내 구체적 문구
