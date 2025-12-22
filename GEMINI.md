# 프로젝트 유지보수 가이드

## 이모지 사용 규칙
임의의 md 파일 작성 시 불필요한 장식용 이모지 사용을 금지합니다.
단, 다음 기호는 **Before & After** 또는 **Bad & Good** 비교 시에만 제한적으로 허용합니다:
- ✅ (Check Mark): Good Case
- ❌ (Cross Mark): Bad Case

### 사용 예시

**❌ Bad (개별 나열)**
```typescript
const LINE_1_START = 10;
const LINE_1_END = 20;
const LINE_1_TOP = 5;
```

**✅ Good (객체 그룹화)**
```typescript
const LINE_1 = {
  START: 10,
  END: 20,
  TOP: 5,
};
```

## 제목(Header) 작성 규칙

### 동의어 중복 표기 금지
'한글 (English)' 형태의 **의미 중복** 표기를 금지합니다. 같은 뜻을 언어만 달리하여 괄호 안에 넣지 마세요.

**❌ Bad (같은 뜻 반복)**
- `## 계획 (Plan)`
- `## 요약 (Summary)`
- `## 참조해야 할 문서 (Context Load)`

**✅ Good (간결하게)**
- `## 계획` 또는 `## Plan`
- `## 참조 문서`
- `## Context Load`

### 예외: 의미 결합 허용
단, 서로 다른 의미를 결합하거나 고유 명사를 함께 쓰는 경우는 허용합니다.

**✅ Allowed (의미 확장/고유 명사)**
- `## Track 2. 문제 해결 논리 검증` (Track 2라는 식별자와 한글 제목의 결합)
- `## AI의 역할 (Quiz Runner)` (역할의 구체적인 모드 명시)
