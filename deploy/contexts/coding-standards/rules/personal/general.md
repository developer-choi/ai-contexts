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

- **네이밍·타입으로 전달 안 되는 why** — 의도적 선택의 이유가 코드에 보이지 않을 때

```typescript
/* 4xx/5xx에서도 throw하지 않는다 — 에러 판단은 편의 메소드가 담당 */
abstract request(url: string, options: Options): Promise<RawResponse>;
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

### 허용된 주석은 `/* */` 블록 주석 사용

여러 줄 주석이 허용된 경우, `//`를 줄마다 반복하지 않고 `/* */` 블록 주석을 사용합니다.

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

## 반환값·Props는 관심사별로 그룹핑

함수(훅, 유틸)의 반환값이나 컴포넌트 Props가 2개 이상의 관심사를 포함할 때, 플랫하게 나열하지 않고 관심사별 객체로 그룹핑한다.

```tsx
// ❌ Bad — 관심사가 섞여서 소비처에서 구분이 안 됨
function useProductFilter() {
  return { sortBy, gender, brandIds, isActive, handleSortChange, handleGenderToggle, handleReset };
}

// ✅ Good — 현재값(sortBy, filter)과 핸들러가 분리
function useProductFilter() {
  return {
    sortBy,
    filter: { gender, brandIds, isActive },
    handlers: { handleSortChange, handleGenderToggle, handleFilterReset },
  };
}
```

---

## 반환 타입은 재사용할 때만 명시

다른 모듈에서 같은 타입을 import하여 사용하지 않는 한, 함수의 반환 타입을 명시적으로 정의하지 않는다. TypeScript 자동 추론에 맡긴다.

```tsx
// ❌ Bad — 이 타입을 다른 곳에서 import하지 않는데 명시
interface UseProductFilterReturn { ... }
export default function useProductFilter(): UseProductFilterReturn { ... }

// ✅ Good — 반환 타입 자동 추론
export default function useProductFilter() {
  return { sortBy, filter, handlers };
}
```

