## 2. Loader란? (간단한 설명)

<!-- from PDF p.1 -->

- Decorator: 부모 장치(레이어)를 설치합니다. (렌더 제공)
- Play 함수: 부모 위에서 테스트 켠(인터렉션)을 합니다. (렌더된 후 실행)

컴포넌트가 렌더되기 직전 전체 필요한 데이터를 미리 로딩(fetch)하고 준비하는 비동기(async) 함수입니다.

## 3. Loader를 쓸 수 있는 상황 것

<!-- from PDF p.1 -->

`loader`는 스토리가 렌더되기 전에 비동기 데이터를 준비하는 모든 작업에 사용할 수 있습니다.

### 가. 실제 API를 통한 비동기 데이터 로딩 (Asynchronous Data Fetching)

가장 기본적인 사례입니다. 실제 API에서 실제 데이터를 가져와 컴포넌트에 전달할 수 있습니다. 이를 통해 실제 데이터를 컴포넌트가 어떻게 렌더하는지를 직접 확인할 수 있습니다.

<!-- from PDF p.1 -->

```tsx
export const Default = {
  // 'Loader' 함수 정의
  loaders: [
    async () => {
      // API에서 사용자 이미지를 가져옵니다.
      const response = await fetch('https://jsonplaceholder.typicode.com/users/1')
      const user = await response.json()
      return { user }
    },
  ],
  // Loader에서 반환된 'loaded' 프로퍼티를 통해 각 스토리에 데이터를 주입합니다.
  render: (args, { loaded }) => <UserProfile {...args} user={loaded.user} />,
};
```

## 나. Mock API 데이터의 시뮬레이션

<!-- from PDF p.2 -->

실제 API를 바로 호출하는 것이 불필요한 경우 `loader`를 사용하면 mock 데이터를 반환하여 실제 API와 동일한 비동기 상태를 시뮬레이션할 수 있습니다. 실제 API나의 의존도를 제거하고, 같은 API에도 다양한 데이터 상태를 손쉽게 테스트할 수 있습니다.

- 성공(Success) 상태: 정상적인 데이터가 반환된 상태를 렌더하는 스토리
- 로딩(Loading) 상태: `render` 함수가 느린 조건을 모사하는 스토리
- 에러(Error) 상태: API 키며 없거나 외부 데이터 상태가 반환된 경우를 테스트하는 스토리

## 다. 복잡한 데이터 구조 준비

<!-- from PDF p.2 -->

API 호출뿐 아니라, 스토리에서 부여해야 하는 복잡한 데이터 구조도 준비할 수 있습니다.

`loader`는 원하는 단계에서 렌더하기 전에 준비하는 방식 중 가장 좋고 효율적인 방법입니다.

이것을 사용하면 좋은 것:

- 데이터의 각에서 분리하기: 복잡하거나 상호 의존적인 데이터를 조합하고 준비하기 위해 사용합니다. 데이터 구조가 복잡한 스토리에서 특히 스토리 자체에서 직접 스토리의 트리처럼 작업할 수 있습니다.
- 데이터에 의존하는 것들을 분리(Wrapping): `args`에 의존하여 한 번 이상 렌더되는 스토리에서 반환이 아니라 스토리 전에 데이터를 미리 할 수 있습니다.

## 비교표: Decorator vs Loader

<!-- from PDF p.2 -->

| 구분 | Decorator | Loader |
|------|-----------|--------|
| 핵심 목표 | 환경(environment) 제공 | 데이터(data) 준비 |
| 주요 용도 | "이 컴포넌트(Context) 안에서 어떻게 보이는가?" | "이 데이터를 어디(groups)에 가지고 있나 찾습니까?" |
| 실행 시 | 컴포넌트를 어떻게 감싸는가 (Wrapping) | 컴포넌트 렌더 전에 데이터 준비 (Before) |
