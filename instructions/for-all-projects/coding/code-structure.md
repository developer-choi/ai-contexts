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

### 단일 문장 중괄호 사용
`if` 문에 실행 코드가 한 줄만 있더라도, 가독성과 잠재적 버그 방지를 위해 항상 **중괄호(`{ }`)**를 사용합니다.

**❌ Bad (중괄호 생략)**
```typescript
if (!cookie) return null;
```

**✅ Good (중괄호 포함)**
```typescript
if (!cookie) {
  return null;
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

## 3. 불필요한 중간 변수 제거 (Inline Variable)
단 한 번만 사용되는 값은 변수에 할당하지 않고 즉시 사용(Inline)합니다.
변수명을 짓는 비용을 줄이고, 코드의 호흡을 간결하게 유지하기 위함입니다.

**❌ Bad (불필요한 변수 할당)**
```typescript
export function setAuthInfo(authInfo: AuthInfo): void {
  // cookieStore 변수는 바로 아래에서 한 번 쓰고 끝납니다. 굳이 만들 필요가 없습니다.
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, authInfo.accessToken, { ... });
}
```

**✅ Good (즉시 사용)**
```typescript
export function setAuthInfo(authInfo: AuthInfo): void {
  // 변수 없이 체이닝으로 바로 처리
  cookies().set(COOKIE_NAME, authInfo.accessToken, { ... });
}
```
