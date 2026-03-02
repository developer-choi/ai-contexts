# 자유 검토 및 AUDIT_SOURCE 회고

정해진 AUDIT_SOURCE(체크리스트, 워크플로우 등)를 실행하는 것만으로는 모든 문제를 잡을 수 없다. AUDIT_SOURCE는 "최소한 이건 해라"일 뿐이다. AUDIT_SOURCE 실행이 끝난 뒤 반드시 아래 절차를 수행한다.

> **용어 정의**
> - **AUDIT_TARGET**: 리뷰 대상 파일 (예: SKILL.md)
> - **AUDIT_SOURCE**: 검증 규칙 파일 (예: checklist/consistency.md)
> - **AUDIT_RESULT.md**: 검증 산출물

## Step 1. 자유 검토

AUDIT_SOURCE와 무관하게 AUDIT_TARGET을 처음부터 다시 보고, AUDIT_SOURCE가 잡지 못한 문제를 찾는다.

- AUDIT_SOURCE 항목에 해당하지 않지만 문제가 있는 부분이 있는지
- AUDIT_SOURCE가 다루지 않는 관점(구조, 분량, 존재 의의 등)에서 문제가 없는지

## Step 2. AUDIT_SOURCE 회고

AUDIT_SOURCE 실행 결과를 되돌아본다.

- AUDIT_SOURCE의 각 단계를 다시 열어, 실제 실행과 1대1로 대조한다
- 지적/발견이 없었던 단계: AUDIT_SOURCE가 충분해서인지, 아니면 해당 유형의 문제를 아예 잡지 못하는 건지 판별
- 자유 검토에서 발견한 문제: AUDIT_SOURCE의 어디에 어떤 항목을 추가하면 잡을 수 있었는지 특정
- 누락한 절차가 있다면: 무엇을 누락했고, 왜 누락했는지(지시가 모호/단순 실수/불필요) 원인 분석

## Step 3. AUDIT_SOURCE 개선 기회 제안

착안점 예시:

- **반복 패턴의 규칙화**: 사용자가 매번 같은 지시를 하거나, AI가 같은 유형의 실수를 반복했다면, AUDIT_SOURCE 또는 `instructions/` 하위 가이드에 규칙으로 추가
- **암묵적 판단의 명문화**: 판단 기준 없이 감으로 결정한 것이 있다면, 해당 기준을 AUDIT_SOURCE에 문서화
- **자가검진 강화**: 반려된 지적이 있었다면, AUDIT_SOURCE에 사전 자문 단계를 추가 (예: "이 지적은 문서의 의도를 고려했을 때도 유효한가?", "반려 패턴을 학습하는 루프가 있는가?")
- **누락된 AUDIT_SOURCE 단계**: 기존 step 사이에 빠진 단계가 있다면 추가 제안
- **도구/자동화 기회**: 수작업으로 한 것 중 스크립트나 도구로 대체할 수 있는 것

## Step 4. 기록

자유 검토, AUDIT_SOURCE 회고, 개선 기회 제안 결과를 AUDIT_RESULT.md에 기록한다. 각 지적/제안에는 **AUDIT_SOURCE 개선 제안**(어떤 AUDIT_SOURCE 파일의 어디에 어떤 항목을 추가/수정해야 하는지)을 함께 적는다. AUDIT_TARGET 수정과 AUDIT_SOURCE 수정을 명확히 구분하여 기록한다.
