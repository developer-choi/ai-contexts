# General Coding Conventions

## eslint-disable 금지

`eslint-disable` 주석으로 린트 경고를 무시하지 않습니다. 린트 에러는 올바르게 해결하세요.

---

## 주석 작성 스타일

### JSDoc 활용
함수나 클래스의 동작, 특히 **예외 상황**을 명시할 때 JSDoc을 적극 활용합니다.

```typescript
/**
 * @throws {RangeError} Stack overflow if capacity is exceeded.
 */
abstract push(data: D): void;

/**
 * @throws {RangeError} Stack underflow if empty.
 */
abstract pop(): D;
```

### 기존 코드 수정 시 주석 보존
기존 코드 라인이 지워진게 아니라면, 해당 라인과 연관된 상단의 주석도 **절대 지우지 마세요**. 

코드가 유지된다면 설명도 유지되어야 합니다.

---

## API 함수 구현 패턴

### Response.data 반환 원칙
API 호출 함수 내부에서 응답 객체(Response)를 그대로 반환하지 않고, 반드시 **데이터(JSON 등)를 추출하여 반환**합니다.
- `React Query` 사용 시, `status`나 `headers` 같은 불필요한 메타 데이터가 상태에 저장되는 실수를 방지하기 위함입니다.

**❌ Bad (Response 객체 전체 반환)**
```typescript
export function getUserApi() {
  // fetch Response 객체가 그대로 반환됨 (실수 유발 가능)
  return fetch('/api/users/me');
}
```

**✅ Good (Data 추출 후 반환)**
```typescript
export async function getUserApi() {
  const response = await fetch('/api/users/me');
  const data: UserResponse = await response.json();
  return data;
}
```

---

## Import 경로 Alias

- **`@/*`**: src 디렉토리 절대 경로를 사용합니다.
- 상대 경로(`../../`)는 최대한 지양합니다. 특히 깊이가 2단계 이상(`../../`) 넘어가는 경우 Alias를 사용하세요.

```typescript
// ✅ Good
import {fetchFromClient} from '@/utils/extend/library/fetch/fromClient';
import {Button} from '@/components/element/Button';

// ❌ Bad
import {fetchFromClient} from '../../../utils/extend/library/fetch/fromClient';
```

---

## 도메인 종속 코드 배치

특정 도메인(product, user 등)에서만 사용하는 훅/유틸/컴포넌트는 `shared/`가 아닌 **해당 도메인 폴더**에 위치해야 합니다.

- **❌ Bad**: product에서만 쓰는 `useColumnCount`를 `shared/hooks/`에 생성
- **✅ Good**: `features/product/hooks/useColumnCount.ts`에 생성

`shared/`에는 2개 이상의 도메인에서 공통으로 사용하는 코드만 둡니다.

---

## 조건문 중괄호 강제

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