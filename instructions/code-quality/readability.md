# 읽기 쉬운 코드를 달성하는 방법
변수명은 How 대신 What

일관성 (= 컨벤션)

## UI와 1대1로 매칭되는 코드
```typescript jsx
// 권장되지 않는 패턴: 데이터 중심의 구조  
function TransferPage() {  
  const { step, data } = useTransfer();  
  return (  
    <Container>  
      {step === 'INPUT' && <InputForm data={data} />}  
      {step === 'CONFIRM' && <ConfirmView data={data} />}  
    </Container>  
  );  
}

// 권장되는 패턴 (토스 스타일): UI 구조가 드러나는 선언적 구조  
function TransferPage() {  
  return (  
    <PageLayout>  
      <PageHeader title="송금하기" />  
      <TransferContent>  
        <Suspense fallback={<AccountSkeleton />}>  
           <SenderAccountSection />  
        </Suspense>  
        <ReceiverInputSection />  
      </TransferContent>  
      <BottomButtonArea />  
    </PageLayout>  
  );  
}
```

후자의 경우, PageLayout 안에 Header, Content, ButtonArea가 존재한다는 시각적 계층 구조가 코드에 그대로 반영되어 있다.

이는 유지보수 시 "버튼 위치를 바꾸라"는 요구사항이 왔을 때 어디를 수정해야 할지 직관적으로 알 수 있게 해준다.

## 인지부하 낮추기

조건문 내 비교부분이 길거나 직관적이지않으면 의미있는 변수이름을 짓고 거기에 넣기

### 추출이 아닌 추상화를 하기
[예제 링크](./examples/product-list.md)

### 짧은 조건 코드 우선 작성
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

삼항 연산자에서도 결과값이 짧은 쪽을 왼쪽에 배치하는 것을 선호합니다.

```typescript
// ✅ Good
const value = isError ? null : (veryLongExpression + complexCalculation);
```

### 상수 그룹화
**❌ Bad (개별 나열)**
```typescript
const LINE_1_START = 10;
const LINE_1_END = 20;
const LINE_1_TOP = 5;

const LINE_2_START = 30;
const LINE_2_END = 40;
const LINE_2_TOP = 15;
```

머릿속으로 비슷한거끼리 그룹을 지으려다 인지부하가 늘어난다.

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

그렇다고 4뎁스 5뎁스 이상 그룹을 지으려고하면 알아보기 힘들다.

### 특별한 이유가 없다면 짧은 코드로 작성합니다.
단 한 번만 사용되는 값은 변수에 할당하지 않고 즉시 사용(Inline)합니다.

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
