---
name: bug-investigation
description: 버그·성능 문제의 증상과 근본 원인(Root Cause)을 구분해 분석한다. 버그 원인 분석, 근본 원인 추적, 성능 저하·응답 지연의 원인 파악, '왜 이게 안 되지'·'왜 느리지'·'이 버그 원인 찾아줘' 같은 원인 규명 요청, 원인 규명 없이 곧장 수정에 들어가려는 맥락, 수정 루프(같은 파일·함수를 3회 이상 수정해도 해결 안 됨) 시 반드시 이 스킬을 사용한다.
---

# Bug Investigation

## 목적

버그·성능 문제의 증상과 근본 원인(Root Cause)을 구분해 분석하고 정리한다.

---

## 작성 원칙

### 1. 증상 vs 근본 원인 구분

### 2. 문제 정의 필수 항목
- **증상**: 무엇이 잘못되고 있는가
- **발견 경로**: 어떻게 발견했는가
- **비즈니스 임팩트**: 사업적 영향은 무엇인가
- **Root Cause**: 왜 발생하는가

### 3. 간결함 유지
- "왜"에 집중 ("무엇"과 "어떻게"는 다음 단계에서)

---

## 수정 루프 감지 — 막히면 멈추고 보고

같은 영역(파일·함수)을 3회 이상 수정해도 버그가 해결되지 않으면 멈춘다. 추가 시도 금지.

- 증상·시도한 접근·의심 근본 원인을 사용자에게 보고한다.
- 사용자가 개입 방식을 택한다: 직접 코드 리딩 / 로그 기반 협업 / 구현자·리뷰어 분리.

---

## 수정 전 — 재현 테스트 먼저

근본 원인을 찾았으면 곧장 코드 수정으로 가지 않는다. **버그를 재현하는 실패 테스트를 먼저 쓰고**, 실패를 확인한 뒤 코드를 고쳐 초록(통과)으로 바꾼다.

- **이점**: 버그가 오해가 아니라 진짜임을 증명 / 무엇이 망가졌는지 문서화 / 재발 방지(회귀 테스트 — 누가 같은 문제를 되살리면 이 테스트가 잡는다).
- **AI가 수정할 때 특히**: 코드가 아니라 테스트를 고쳐서 통과시키는 꼼수를 막는다. 반드시 "실패 테스트로 재현 → 코드 수정" 순서를 지킨다.
- **예외**: 단위 테스트로 재현하기 어려운 유형(인프라·환경 의존, 성능 저하, 시각 회귀 등)은 사유를 밝히고 다른 재현 수단(로그·프로파일·스크린샷)으로 대체한다.

> 출처: https://vitest.dev/guide/learn/testing-in-practice.html
> "A better approach is to write a failing test first that reproduces the bug, then fix the code and watch the test turn green."
> "If you use AI agents to fix bugs, configure them to follow the same principle: reproduce the issue with a failing test first, then fix the code. This prevents the agent from 'fixing' a bug by changing the test instead of the code, and gives you confidence that the fix actually works."

---

## 산출물

증상·근본 원인 분석을 정리한 bug-analysis 문서. 출력 위치는 사용자가 지정하며, 지정이 없으면 분석 결과를 직접 보고한다.

### 예시

```markdown
## 1. 문제 정의

- **증상**: 마케팅 수신거부 유저 비율 78%
- **발견 경로**: 마케팅팀 월간 리포트
- **비즈니스 임팩트**: Push 도달률 22%로 프로모션 효과 급감
- **Root Cause**:
  - 온보딩 첫 화면에서 너무 이른 시점에 Push 권한 팝업 노출
  - 거부 후 재동의 유도 UI/UX 부재

## 2. 목표 및 대상
- **목표**: 인앱에서 수신 동의 독려, 도달률 40% 개선
- **대상**: 마케팅 수신 OFF 유저 (78만명)

## 3. 참고 자료
- [피그마 - 마케팅 독려](https://figma.com/...)
```
