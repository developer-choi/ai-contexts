# 모달과 페이지의 역할 분리 best practice

## 컨셉 (1줄)

환불하기 모달을 예로, 실행·로딩·성공·실패 책임을 페이지와 모달 사이에 어떻게 나누느냐에 따라 응집도·결합도·재사용성이 어떻게 달라지는지 방식별로 비교한다.

## 재료

### 예시: 환불하기 모달

#### onConfirm + 로딩props

```tsx
interface RefundModalProps {
  onConfirm: () => Promise<void>;
  isConfirmLoading: boolean;
}

function RefundModal({onConfirm}: RefundModalProps): Element {
  return (
    <div>
      <button onClick={onConfirm}/>
    </div>
  );
}
```
<!-- from PDF p.1 -->

##### 역할분배

- 페이지 = 환불하기 기능 (실행, 로딩, 성공, 실패) 담당
- 모달 = 환불 안내 담당

##### 장점

확인버튼 기능 하나만 보면 응집도가 높음.

- 실행, 로딩, 성공, 실패 로직이 한 함수에 다 모여있음.

모달 측면에서는 결합도가 낮음.

- 모달 안에가 어떻게 바뀌든 말든 상관이 없음. onConfirm만 전달함. API 스펙 바뀌면 onConfirm 콜백 안에만 수정하면 됨.

##### 단점

페이지 관점에서 보면 응집도가 낮음.

- 페이지에 환불의 로직들이 다 자세하게 들어있음.
- 관심사 분리가 안됨. 페이지가 환불하기의 실행, 로딩, 성공, 실패 모든 걸 담당함.
- 페이지 안에 다른 모달도 추가되는 경우 페이지 역할이 너무 많아짐.
- [Logical cohesion](https://en.wikipedia.org/wiki/Cohesion_(computer_science))

페이지 측면에서는 결합도가 높음. isConfirmLoading 때문에.

- [Control Coupling](https://en.wikipedia.org/wiki/Coupling_(computer_programming))

#### 실행, 로딩, 실패, 성공 모든 걸 모달에서 하겠다

```tsx
function RefundModal(): Element {
  const [isLoading, setIsLoading] = useState(false);

  const onConfirm: () => Promise<void> = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    await postRefundApi();
    // 이후 성공처리

    setIsLoading(false);
  }, []);
}
```
<!-- from PDF p.2 -->

##### 장점

페이지는 페이지역할 (조립, 페이지 접근제어 등)만 함, 결합도가 낮고 응집도가 높음. API 스펙 바뀌면 모달 하나만 바꾸면 됨.

##### 단점

다른 페이지에서 이 환불하기 모달을 못 씀. 성공처리가 달라지기 때문.

#### onSuccess

```tsx
interface RefundModalProps {
  onSuccess: (response: any) => void;
}

function RefundModal({onSuccess}: RefundModalProps): Element {
  const [isLoading, setIsLoading] = useState(false);

  const onConfirm: () => Promise<void> = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    const response = await postRefundApi();

    setIsLoading(false);

    onSuccess(response);
  }, [onSuccess]);

  return (
    <div>
      <button onClick={onConfirm}>{isLoading}</button>
    </div>
  );
}
```
<!-- from PDF p.3 -->

##### 아이디어

[https://velog.io/@alice0751/%ED%86%A0%EC%8A%A4-Frontend-Fundamentals-%EB%AA%A8%EC%9D%98%EA%B3%A0%EC%82%AC-%EB%A6%AC%EB%B7%B0-%ED%9B%84%EA%B8%B0-%EC%A0%95%EB%A6%AC](https://velog.io/@alice0751/%ED%86%A0%EC%8A%A4-Frontend-Fundamentals-%EB%AA%A8%EC%9D%98%EA%B3%A0%EC%82%AC-%EB%A6%AC%EB%B7%B0-%ED%9B%84%EA%B8%B0-%EC%A0%95%EB%A6%AC)

토스에서 Suspense는 성공케이스에 집중하는 구조적 장치라고 언급했고, 이걸 이번 문제에서 적용해봄.

##### 장점

직전 방식 대비 재사용성이 올라감. 환불모달을 다른 페이지에서 띄우는데 다른 성공처리를 하고 싶다면 대응 가능.

##### 단점

결합도가 올라감.

- 환불 API 스펙 바뀌면 성공로직은 페이지 컴포넌트에서 바꾸고, 실패로직은 모달에서 바꿔야 함.

응집도는 낮아짐.

- 성공코드는 페이지에 있고 실패코드는 모달에 있음.

##### 고민

Suspense가 유효했던 이유는 성공코드 실패코드가 한 곳에 있기 때문인가…? 이 코드는 성공코드가 페이지에 있고 실패코드가 모달에 있어서 그런가…

#### 기존 방법들 약간 변형

##### onConfirm 방식에서 모달의 onConfirm props를 Promise가 반환하는 걸로 바꿔서 loading props 없애기

단점은, 결합도가 올라감. 페이지가 모달에 있는 버튼에 있는 onClick에 Promise가 전달되면 그 버튼이 로딩이 돌아간다는 사실을 알아야 함.

버튼 스펙이 바뀌면 …

##### onConfirm 방식에서 페이지 내 로직을 Custom Hook으로 분리하기

기능 측면에서는 응집도가 올라감. 환불 관련 기능들이 하나의 Custom Hook에 모여있게 됨.

하지만 코드의 물리적인 위치 측면에서는 응집도가 내려감. 하나 바꾸려면 페이지, 훅, 모달 3곳을 봐야 함.

## 구상 (선택)

- 흐름: 동일한 환불 모달을 두고 책임 분배 방식을 4가지(onConfirm+로딩props → 모달이 전부 담당 → onSuccess → 기존 방식 변형)로 늘어놓고 각 방식의 응집도·결합도·재사용성 trade-off를 비교하는 카탈로그형 글.
- 발행 전 처리:
  - 결론 부재 — 각 방식의 trade-off만 나열되어 있고 "그래서 어떤 상황에 어떤 방식을 택하라"는 종합/권장이 없음. 마지막 "고민" 섹션도 미해소 질문으로 끝남.
  - 개인 링크 보존: velog 후기 글 URL(`@alice0751`). 외부 공개용이면 그대로 둬도 무방하나 출처 표기 형태 점검 필요.
  - "기존 방법들 약간 변형"의 두 하위 방식은 코드 예시 없이 서술만 있음 — 코드블록 보강 여부 결정.
