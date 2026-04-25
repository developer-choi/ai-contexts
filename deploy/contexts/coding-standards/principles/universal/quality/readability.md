# 읽기 쉬운 코드

## 원칙: 이해에 필요한 background가 적은 코드

기획, 피그마, 결과물의 동작을 알아야 하는 것은 괜찮다. 하지만 이것들과 코드가 1대1로 매칭되지 않아서 **내부 구현의 사전지식을 많이 요구할수록** 읽기 어려운 코드다.

이에 영향을 주는 세 가지: **모듈 이름**, **parameter**, **return**. 이 셋만으로 동작을 유추할 수 있으면 읽기 쉬운 코드다.

### 탑다운 스캔 테스트

컴포넌트를 위에서 아래로 이름만 훑으며 내려갈 때, 이해가 안 되는 구간이 생기면 안 된다. 내부 구현을 열어보지 않아도 흐름이 유추되어야 한다.

```typescript jsx
function OrderPage() {
  const { items, total } = useCartItems(cartId)
  const { submit, isLoading } = useOrderSubmit()

  return (
    <PageLayout>
      <CartSummary items={items} total={total} />
      <OrderButton onSubmit={submit} isLoading={isLoading} />
    </PageLayout>
  )
}
```

위에서 아래로 이름만 읽으면: 장바구니 항목을 가져오고 → 주문 제출 기능을 준비하고 → 요약과 버튼을 보여준다. 내부 구현을 몰라도 역할이 드러난다.

---

## 인지부하 낮추기

조건문 내 비교부분이 길거나 직관적이지않으면 의미있는 변수이름을 짓고 거기에 넣기

**❌ Bad (조건문 안에 긴 표현식)**
```typescript
if (createdAt !== null && createdAt.isBefore(lessonStartAt.subtract(TEACHER_NOT_JOINED_STEPS.validBeforeMinutes, 'minutes'))) {
  return false;
}
```

**✅ Good (의미있는 변수명으로 분리)**
```typescript
const attendanceLessonStart = lessonStartAt.subtract(TEACHER_NOT_JOINED_STEPS.validBeforeMinutes, 'minutes');
const isBeforeAttendanceLessonStart = createdAt !== null && createdAt.isBefore(attendanceLessonStart);

if (isBeforeAttendanceLessonStart) {
  return false;
}
```

### 추출이 아닌 추상화를 하기
[예제 링크](examples/product-list.md)

