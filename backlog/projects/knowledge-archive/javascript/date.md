> 이관: KA main `knowledge/frontend/javascript/data-type-ds/date.md` (2026-06-09). OA·Reference 없는 무출처 학습노트. 1차 소스로 검증해 OA를 채우면 KA 본문으로 복귀하고 이 파일은 삭제한다.

---
tags: [javascript, concept]
source: google-doc
publishable: false
priority:
---
# Questions

- Date 객체 두 개의 대소를 비교할 때 어떻게 해야 하는가?
- 커스텀 Date 형식(`{year, month, date}`)에 +N일 산술을 직접 적용하면 어떤 문제가 생기고 어떻게 해결하는가?
- `new Date(year, month, date)` (숫자 인자)와 `new Date('YYYY-MM-DD')` (문자열 인자)는 어떻게 다른가?
- UTC 기준 시각 데이터를 다른 시간대에서 접근하면 어떻게 동작하는가?

---

# Answers

## Date 객체 두 개의 대소를 비교할 때 어떻게 해야 하는가?

### User Answer

올해 10월 12일까지만 신청을 받기 위한 로직을 구현할 때,

```ts
function some(value: Date): boolean {
  const endDate: Date = new Date('2024-10-12');
  return value.getDate() < endDate.getDate();
}
```

이렇게 로직을 구현하면 큰일난다.

현재 날짜가 2024년 10월이면 유효한데, 현재 날짜가 2024년 9월이라거나 2025년 10월이라거나 연도와 월이 다르면 저 로직은 의도대로 동작을 안 한다.

즉, timestamp 기준으로 비교를 해야 한다.

`yyyy년 mm월 dd일`이랑 `yyyy년 mm월 dd일`이랑 어느 게 더 큰지 비교할 때도, 둘 다 timestamp로 변환해서 비교하는 게 제일 낫다. 힘들게 year·month·date 따로 추출해서 비교할 필요가 없다.

---

## 커스텀 Date 형식(`{year, month, date}`)에 +N일 산술을 직접 적용하면 어떤 문제가 생기고 어떻게 해결하는가?

### User Answer

10월 2일부터 +2일 사이에만 신청을 허가하기 위해, 10월 2일부터 +2일인 커스텀 Date 객체를 구할 때도,

```ts
interface DateProperty {
  year: number;
  month: number;
  date: number;
}

function some(value: Date): void {
  const startDate: DateProperty = {
    year: 2024,
    month: 10,
    date: 2
  };

  const endDate: DateProperty = {
    year: startDate.year,
    month: startDate.month,
    date: startDate.date + 2
  };
}
```

이러면 안 된다. 2024년 10월 33일이 되는 수가 있다.

```ts
const endDate: Date = new Date(startDate.year, startDate.month, startDate.date + 2);
const endDateProperty: DateProperty = {
  year: endDate.getFullYear()
  // ...
};
```

이렇게 해야 버그가 없다.

---

## `new Date(year, month, date)` (숫자 인자)와 `new Date('YYYY-MM-DD')` (문자열 인자)는 어떻게 다른가?

### User Answer

Date Constructor로 Date 객체 만들 때, 숫자로 만드는 것과 문자열로 만드는 것이 다르다.

1. 숫자로 만든 Month와 문자열로 만든 Month는 1 차이 난다.
2. Hour도 GMT와 호출된 지역의 시간대만큼 차이 난다.

```js
const numberDate = new Date(2021, 0, 1)
// undefined
const stringDate = new Date('2021-01-01')
// undefined
numberDate.getHours()
// 0
stringDate.getHours()
// 9
```

Month와 Hour 둘 다 이렇게 다르다.

---

## UTC 기준 시각 데이터를 다른 시간대에서 접근하면 어떻게 동작하는가?

### User Answer

```ts
// UTC : 2024-11-11 00:15
const data: "2024-11-11T00:15:55.000Z" = '2024-11-11T00:15:55.000Z';
```

이런 데이터가 있다고 했을 때,

```ts
const dateObject: Date = new Date(data);
```

`new Date`로 만드는 날짜나 dayjs로 만드는 날짜나 동작 자체는 동일하다.

UTC 기준 00시면 둘 다 한국 시간대 기준으로 접근하면 +9시간으로 **변환**된다.

```ts
const formatInDayjsFromSeoul: string =
  dayjs(data).tz('Asia/Seoul').format('DD일 HH시mm분');
```

이제 이걸 이런 식으로 응용이 가능하다. 동시에 2개 도시 시간을 표기하는 기능을 구현하는 경우라거나, 다른 타임존에 있는 사용자가 접속해도 원래 거주 지역 기준으로 기록 시각을 표시하고 싶을 때 쓴다.
