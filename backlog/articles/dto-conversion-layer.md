# DTO를 변환하는 레이어를 만들어야 하는 이유

## 컨셉 (1줄)

서버 데이터 구조에 직접 의존하지 말고 변환 레이어로 영향 범위를 한 곳에 가두자 — "규모와 무관하게, 필요해지는 순간 기존 코드 수정 없이 그제서야 만든다"는 점진적 도입 주장.

## 재료

### References

- [React 클라이언트와 서버 DTO 사이의 경계 설정하기 (velog)](https://velog.io/@yunsungyang-omc/React-%ED%81%B4%EB%9D%BC%EC%9D%B4%EC%96%B8%ED%8A%B8%EC%99%80-%EC%84%9C%EB%B2%84-DTO-%EC%82%AC%EC%9D%B4%EC%9D%98-%EA%B2%BD%EA%B3%84-%EC%84%A4%EC%A0%95%ED%95%98%EA%B8%B0)
- (개인 Gemini 대화) https://gemini.google.com/app/2c940baf4852b45b

### Reasons

#### 영향 범위를 줄이기 위해서

```tsx
interface UserFromApi {
  name: string;
}

function Header({user}: {user: UserFromApi}): Element {
  return (
    <div>{user.name}</div>
  );
}

function UserPage({user}: {user: UserFromApi}): Element {
  return (
    <div>{user.name}</div>
  );
}
```
<!-- from PDF p.1 -->

API에서 주는 데이터에 의존하는 컴포넌트가 Header / UserPage 포함 **10개**가 있다고 가정했을 때, API에서 응답하는 데이터 타입이 firstName / lastName 총 2개로 변경되는 경우 여기에 영향받는 컴포넌트도 **10개**가 됨.

⇒ 중간에 변환하는 레이어를 만들면, **영향받는 범위는 그 변환하는 레이어 1곳이 됨.**

#### 데이터 구조가 다른 경우

```tsx
interface UserFromApi {
  firstName: string;
  lastName: string;
}

function Header({user}: {user: UserFromApi}): Element {
  return (
    <div>{user.firstName + user.lastName}</div>
  );
}
```
<!-- from PDF p.2 -->

클라이언트의 관심사는 name을 보여주는 것이지, 저 2개를 더하는 것이 아님. 데이터 구조가 많이 다른 케이스(어드민 제작 등)일수록 더 유효함.

#### 데이터 구조가 다양한 종류로 존재하는 경우

```tsx
// 프로필 API는 user.name
const { data: profile } = useQuery(['profile'], fetchProfile);

// 주문 API는 user.userName
const { data: order } = useQuery(['order'], fetchOrder);

// 결제 API는 user.fullName
const { data: payment } = useQuery(['payment'], fetchPayment);
```
<!-- from PDF p.2 -->

같은 "사용자 이름"인데 **API마다 필드명이 다른 경우**… 정말 흔하죠. 이럴 때 컴포넌트에서 일일이 맞춰 쓰면 코드가 난잡해집니다.

```tsx
// 이런 코드를 여러 곳에서...
<div>
  {profile?.name || order?.userName || payment?.fullName}
</div>
```
<!-- from PDF p.2 -->

### 좀 더 근본적인 원인 ⇒ 의존

#### 서버의 데이터 구조

언제든지 바뀔 수 있고 + 내가 통제할 수 없음.

서버의 데이터 구조를 그대로 사용한다는 것은,

- 언제든지 바뀔 수 있는 범위가 늘어나고
- 내가 통제할 수 없는 범위가 늘어난다는 뜻임.

> 남의 것을 의존하지 않을수록 자기 것이 견고해집니다
<!-- from PDF p.3, 구글독스 댓글 인용. 발행 전 출처·인명 처리 필요 -->

- User를 사용하는 10개의 컴포넌트는 외부에 대해 모르고,
- 서버의 유저 데이터의 영향 범위를 User 변환 레이어 딱 한 곳으로 줄인다
- 즉 견고해진다는 뜻.

#### 그럼 반대로 모든 것을 남의 것을 의존하지 않으면?

의존하는 것을 **0개**로 만들면? React를 시작으로 온갖 프레임워크, 라이브러리 전부 의존 안 하고 직접 만들면? Node.js나 브라우저처럼 javascript의 실행 환경도 직접 만들면?

**그 어떠한 것도 내 것을 망가뜨릴 수 없으니** 이론상 가장 안전할지도 모름. 하지만 실제로는 그러지 못함. 내가 신이 아니니까.

#### 그럼 무엇을 의존하라는 것인가?

- 불완전한 것에 의존하지 말고
- 안전한 것에 의존하자는 뜻임.

서버의 데이터 구조가 평생 안 바뀐다면, User는 만들 이유가 없었음. **언제든지 바뀔 수 있는 특징이 있으니까**, 그 영향 범위를 줄이자는 뜻임.

핵심은 **바뀔 확률이 얼마나 높은가?**로 귀결됨. = 아무거나 막 의존하지 말고, 의존할 대상을 신중히 고르라는 뜻임.

- 자바스크립트 실행 환경 (Node.js / Browser API)
- 프레임워크 / 라이브러리
- third party API (네이버 API, 카카오 API)

이것들은 쉽게 바뀌지 못함. Breaking Changes가 많아질수록 정말 많은 기업과 프로젝트들이 영향을 받기 때문.

### 단점

보일러플레이트 코드가 발생함.

```tsx
interface UserFromApi {
  name: string;
}

interface User {
  name: string;
}

async function getUserApi(): Promise<User> {
  const response: Response = await fetch('https://backend.domain.com/user');
  const {name} = await response.json() as UserFromApi;

  return {
    name
  };
}

function Header({user}: {user: User}): Element {
  return (
    <div>{user.name}</div>
  );
}
```
<!-- from PDF p.4 -->

여기서 UserFromApi라는 타입의 가치는 없음. 100% 중복 코드임.

### 해결방법 > 내 방식

- 백엔드와 프론트의 데이터 타입이 달라지기 전까지는 하나로 동일하게 쓴다 **(타입 이름은 마치 클라이언트의 데이터 타입인 것처럼)**
- 달라지는 경우, 클라이언트에서 따로 사용할 DTO를 만들고 변환하는 작업을 API 호출 함수 안에서 한다.
- 결과적으로 바뀌어야 하는 곳은 API 함수 딱 한 곳이 되도록 한다.

이렇게 잘만 쓰고 있다가,

```tsx
interface User {
  name: string;
}

async function getUserApi(): Promise<User> {
  const response: Response = await fetch('https://backend.domain.com/user');
  const {name} = await response.json() as User;

  return {
    name
  };
}

function Header({user}: {user: User}): Element {
  return (
    <div>{user.name}</div>
  );
}
```
<!-- from PDF p.5 -->

firstName / lastName으로 분리되면, 백엔드용 타입을 그제서야 하나 만들면

```tsx
interface UserFromApi {
  firstName: string;
  lastName: string;
}

async function getUserApi(): Promise<User> {
  const response: Response = await fetch('https://backend.domain.com/user');
  const {firstName, lastName} = await response.json() as UserFromApi;

  return {
    name: firstName + lastName
  };
}
```
<!-- from PDF p.5 -->

기존 코드 하나도 안 바꿔도 됨. 변환 역할은 API 호출 함수가 맡음. ⇒ 나는 필요할 때가 되어서야 만드는 걸 선호함.

### 비교

#### 블로그(참고 글)의 기준

- **3개 이하 API + 백엔드와 긴밀한 소통** → DTO 직접 사용해도 괜찮음
- **API가 안정적이고 자주 안 바뀌는 환경** → 필요한 것만 부분적으로 변환
- **중규모 프로젝트 + 활발한 개발 단계** → 전체 변환 레이어 추천
- **10개 이상 API + 여러 팀 의존** → 변환 레이어 강력 추천 (거의 필수)

#### 내 주장

- 필요하면 그제서야 만든다.
  - 규모와 상관없음.
  - 위에 적힌 Reasons 섹션에 해당하는 필요성이 생기면 그때 만들어도 늦지 않음.
- 단, 필요할 때 만들더라도 기존 코드에 수정이 발생하지 않게 작업한다.

### 예시 (미완성)

성공 데이터 응답 / **에러 데이터 응답** — 본문 미작성.

## 구상 (선택)

- 흐름은 거의 완성형: 문제(영향 범위·필드명 불일치) → 근본 원인(의존) → 단점(보일러플레이트) → 내 해결방식(지연 생성 + 기존 코드 무수정) → 블로그 기준과 내 주장 대비.
- 발행 전 처리: 구글독스 댓글 인용의 인명·출처, "예시" 섹션(성공/에러 응답)의 미작성 본문 채우기.
