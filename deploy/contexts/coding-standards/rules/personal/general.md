# General Coding Conventions

## 주석 전면 금지

주석은 아래 허용 목록을 제외하고 **전부 금지**입니다. 사용자의 명시적 허락 없이는 절대 작성하지 않습니다.

### 허용되는 주석

- **JSDoc `@throws`** — 함수의 예외 상황 명시

```typescript
/**
 * @throws {RangeError} Stack overflow if capacity is exceeded.
 */
abstract push(data: D): void;
```

- **eslint-disable** — personal이 아닌 universal/general.md의 예외 조건에 한함

### 금지 예시

```typescript
// ❌ 섹션 구분
// --- Types ---
// === Styles ===

// ❌ 코드 설명
// 사용자 정보를 가져온다
const user = await getUser();

// ❌ TODO
// TODO: 나중에 리팩토링
```

코드가 주석 없이 이해되지 않는다면, 변수명/함수명을 개선하거나 파일을 분리하는 것이 올바른 해결책입니다.

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
