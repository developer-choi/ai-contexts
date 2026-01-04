# AI Agent 전역 규칙

이 문서는 Claude Code, Gemini CLI 등 모든 AI 에이전트가 이 프로젝트에서 작업할 때 따라야 하는 전역 규칙입니다.

---

## instructions 폴더 사용법

사용자가 **"ai-contexts"** 키워드와 함께 요청하면:

1. [instruction-map.md](../instruction-map.md) 파일을 읽으세요
2. 해당 파일의 검색 규칙에 따라 적절한 문서를 찾으세요
3. 찾은 문서를 로드하고 작업을 진행하세요

**instruction-map.md가 모든 검색 로직과 경로 매핑을 담당합니다.**

---

## 선택적 로딩 원칙 (Critical)

### ⚠️ README.md는 목차일 뿐입니다

**README.md를 읽었다고 해서 모든 하위 파일을 자동으로 읽지 마세요.**

현재 작업에 필요한 파일만 선택적으로 로드하세요

### ❌ 잘못된 예시

```
User: "로그인 기능 만들어줘"
AI:
1. instructions/conventions/README.md 읽음
2. common/ 전체 읽음
3. coding/ 전체 읽음
4. testing/ 전체 읽음
5. review/ 전체 읽음
→ 불필요한 파일까지 모두 로드 (토큰 낭비)
```

### ❌ 또 다른 예시: workflow

```
User: "workflow를 시작하자"
AI:
1. instructions/workflow/README.md 읽음
2. "Step 1부터 시작"이라고 되어 있음
3. step-1.md만 읽음
4. step-2.md, step-3.md 등은 아직 읽지 않음
5. Step 1 완료 후 사용자 승인 받으면 step-2.md 읽음
→ 순차적 로드
```

---

## 핵심 원칙

1. **README 먼저**: 항상 폴더의 README.md를 먼저 읽고 구조 파악
2. **가이드 따르기**: README의 "AI 행동 가이드"에 따라 필요한 것만 로드
3. **점진적 로드**: 필요할 때마다 읽기 (미리 다 읽지 말기)
4. **토큰 절약**: 불필요한 문서 로드는 토큰 낭비