# 코드 구조화 및 가독성 (Code Structure & Readability)

## 1. 조건문 작성 순서 (Early Return)
사람은 코드를 **위에서 아래로**, **왼쪽에서 오른쪽으로** 읽습니다. 이 인지 흐름을 방해하지 않도록 코드를 배치해야 합니다.

### 짧은 조건 우선 처리
`if - else if - else` 구문이나 삼항 연산자를 사용할 때, **코드가 짧은 블록을 먼저 작성**하고 빠르게 `return` 하세요.

중요한 로직(긴 코드)이 들여쓰기 깊은 곳에 숨지 않게 합니다.

**❌ Bad (긴 코드가 먼저 나옴)**
```typescript
function someFunction() {
  if (condition1) {
    // ... very long code ...
    // ...
    // ...
  } else {
    return; // 정작 예외 처리는 맨 끝에
  }
}
```

**✅ Good (짧은 코드 먼저, Early Return)**
```typescript
function someFunction() {
  if (!condition1) {
    return; // 예외 상황 빠르게 종료
  }

  // 핵심 로직은 들여쓰기 없이 깔끔하게
  // ... very long code ...
}
```

### 삼항 연산자 배치
삼항 연산자에서도 결과값이 짧은 쪽을 왼쪽에 배치하는 것을 선호합니다.

```typescript
// ✅ Good
const value = isError ? null : (veryLongExpression + complexCalculation);
```

## 2. 상수 그룹화 (Classify Constants)
관련된 상수가 여러 개 있을 때는 개별 변수로 나열(`const A_1 = ...`)하지 말고, **객체로 묶어서(`const A = { ... }`)** 관리하세요.

**❌ Bad (개별 나열)**
```typescript
const LINE_1_START = 10;
const LINE_1_END = 20;
const LINE_1_TOP = 5;

const LINE_2_START = 30;
const LINE_2_END = 40;
const LINE_2_TOP = 15;
```

**✅ Good (객체 그룹화)**
```typescript
const LINE_1 = {
  START: 10,
  END: 20,
  TOP: 5,
};

const LINE_2 = {
  START: 30,
  END: 40,
  TOP: 15,
};
```
