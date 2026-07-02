# `window.property` 와 `var` Scope 관계

본인 학습 자료. global vs non-global에서 `var`의 window 프로퍼티 등록 동작.

## 기본 동작

1. `window.property`는 `property`로도 접근이 가능하다. (앞에 `window` 안 붙이고)
2. global에서는 `var` 변수가 곧 `window`의 프로퍼티로 들어간다.
3. global이 아니면, `var` 변수는 `window`의 프로퍼티로 들어가지 않는다.

(PDF 이미지 1~3: 예시 코드)

## 무선언 할당이 window 프로퍼티로 갈지 var로 갈지 결정 조건

이 행위(무선언 할당, 예: `x = 1;`)가 `window`의 property로 들어갈지 `var` 변수로 들어갈지는 동일한 scope에서 밑에 `var`가 있냐 없냐이다.

### 1) 동일 scope에 var가 없는 경우

(PDF 이미지 5)

### 2) 동일 scope에서 var가 있는 경우

(PDF 이미지 6)

## 참고

(PDF 이미지 7/8)

둘 다 `window`의 property로 들어간다.

## TODO

- 위 동작이 strict mode에서 달라지는지 확인 (strict mode에서는 무선언 할당이 ReferenceError).
- PDF 이미지 8개 → 코드 예시 옮기기 (검수 시).
- MDN/ECMA-262로 GlobalEnvironmentRecord와 ObjectEnvironmentRecord 동작 검증.
