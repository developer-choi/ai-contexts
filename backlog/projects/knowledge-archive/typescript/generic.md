# TypeScript Generic — 본인 학습·실험

본인 학습 자료 + 본인 test-playground·react-playground 실험.

## LocalStorageArrayManager — Generic 설계

`LocalStorageArrayManager` 만들 때 Generic 설계하느라 힘들었음. (구체 코드는 본인 프로젝트 참고, PDF 이미지 1/2)

## 유니온 쓸 때 Generic 타입 추론이 안 되는 경우

본인 [타입에러 안나는 예제 추가 (test-playground)](https://github.com/developer-choi/test-playground/commit/4db6b971948911583aeb94a0e5639d2e47976ae1).

유니온 타입을 제네릭 자리에 넣으면 원래 잘 됨.

본인 [타입에러 예제 추가 (test-playground)](https://github.com/developer-choi/test-playground/commit/d89682857b1b5def6a3ed9631a9f78d25be4cdea).

하지만, 제네릭을 사용하려고 했던 그 깊은 곳을 타입으로 잡으려고 하면 타입 에러가 났음.

본인 [타입에러 안나는 예제 추가2 (test-playground)](https://github.com/developer-choi/test-playground/commit/fa5da1720f83d28601d7e75ea88003c558b4b6f5).

그 증거로, 제네릭을 이렇게 다시 잡으면 또 에러가 안 남.

(이미 typescript/index.md의 "Utility Type이 Union에 분배되지 않는 문제"와 같은 영역. 통합 검토 필요.)

## Optionally 하게 Generic 사용하기

이렇게 하면, converter 전달 안 할 경우 기본 타입인 `CalendarDate`로 추론됨. (PDF 이미지 6/7)

## 부분적으로 Generic 사용하기

이런 식으로 부분적으로 따로 제네릭을 사용할 수 있던데 이게 어떤 경우에 유용한지까지는 모르겠음. (PDF 이미지 8/9)

## Conditional Generic

본인 [최초 커밋 (react-playground)](https://github.com/developer-choi/react-playground/commit/707eccd9#diff-87df619892a91122f4f80c78cffe586d55d96dbe831558f697d43fbdffb54ca0).

Return할 때도 매번 Conditional Generic Type을 Assertion 해야 정확하게 Conditional Generic Type으로 타입 추론이 되더라.

리턴 타입하고 똑같은 거 그냥 그대로 반환하면 됨.

그래서 리턴 타입을 별도로 타입으로 선언해서 함수 리턴 타입 명시할 때 쓰고 함수 안에서 리턴할 때에도 쓰면 됨.

## Conditional Generic "and" "or" operator

본인 [커밋 (react-playground)](https://github.com/developer-choi/react-playground/commit/c3524cf73b98087a538120848b689b36eb366f4d#diff-87df619892a91122f4f80c78cffe586d55d96dbe831558f697d43fbdffb54ca0).

`required false`이면 `throwable`이 `true`여도 `V | undefined`로 타입 추론이 되어야 하는데 `V`로 추론되는 버그가 있었음.

그래서 R 타입 T 타입 둘 다 `|` 연산자로 연결해보니 저게 and 연산자로 작동하더라. (이유는 모름) 공식문서 보는데도 and 연산자 없었음.

반대로 저기에 `&` 쓰면 or 연산자로 작동함. (이유는 모름)

## TODO

- 위 "and·or 반전" 동작이 TS Handbook의 Distributive Conditional Types와 어떤 관계인지 1차 소스 확인.
- typescript/index.md의 "Utility Type이 Union에 분배되지 않는 문제"와 통합 가능성 검토.
- PDF 이미지 12개 → 본인 코드 검수 시 옮겨야 함 (이 backlog는 텍스트만 잡았고 코드는 본인 commit 링크로 대체).
