# 네이밍 컨벤션
## 변수명, 함수명, 클래스명 공통
- callback의 매개변수명을 한글자로 적지않고 원래 단어를 다 그대로 써야합니다.
- 예시: `array.map(t => t.some)`이 아니라 `array.map(topic => topic.some)` 이런식이 되야합니다.

## 변수명
- **camelCase** 사용
- boolean 변수는 `is`, `has`, `should` 접두사 사용

 ```typescript
// ✅ Good
const userName = 'John';
const isLoading = false;
const hasError = true;
const shouldRender = true;

// ❌ Bad
const user_name = 'John';
const loading = false;
const error = true;
```

## 함수명
- **camelCase** 사용
- 동사로 시작하는 이름
- 이벤트 핸들러는 `on` 또는 `handle` 접두사

```typescript
// ✅ Good
function getUserData() { }
function calculateTotal() { }
function handleClick() { }
function onClick() { }

// API 함수는 접미사 'Api' 사용
function getBoardListApi() { }
function postBoardApi() { }
```

## 클래스/컴포넌트명
- **PascalCase** 사용

```typescript
// ✅ Good
class StorageObjectManager<V extends object> { }
class ValidationError extends BaseError { }

function Button(props: ButtonProps) { }
function StarScore({ score }: StarScoreProps) { }
```

### 타입/인터페이스명
- **PascalCase** 사용
- 접미사 패턴 활용

```typescript
// Props 타입
interface ButtonProps { }
interface InputProps { }

// API 타입
interface SignUpApiRequest { }
interface SignUpApiResponse { }

// Union 타입
type ButtonSize = 'small' | 'medium' | 'large';
type ButtonVariant = 'contained' | 'outlined';
```

### 파일명
- **컴포넌트**: PascalCase 또는 index.tsx
- `Button/index.tsx`
- `StarScore.tsx`
- **유틸리티/서비스**: camelCase 또는 kebab-case
- `storage-object.ts`
- `validation.ts`
- **페이지**: Next.js 규칙 준수
- `page.tsx`
- `layout.tsx`
- `not-found.tsx`
- **테스트**: `*.test.ts` 접미사
- **스타일**:
- `index.module.scss` (CSS Modules)
- `global.css`

### 파일명과 기능의 관계
파일명이 PascalCase 또는 camelCase인 경우, 해당 파일의 핵심 export는 같은 이름의 컴포넌트/클래스이다.
- Button.tsx → export default function Button() { ... }

파일명이 kebab-case / camelCase인 경우, 파일이 다루는 기능/도메인 단위를 의미하며 관련된 멤버들을 named export로 함께 내보낼 수 있다.
- array.ts → export function sortArray() {}, export function findMax() {}
- date-utils.ts → export function formatDate() {}, export function parseDate() {}

특정 함수의 코드가 길어져서 별도 파일이 필요할 때는, 해당 함수 이름으로 파일을 분리하고 default export를 사용한다.

- array.ts 안의 heavyCalculation()이 커질 경우, heavyCalculation.ts로 분리하고 export default function heavyCalculation() { ... } 형태로 관리한다.

  폴더명도 동일한 개념을 따른다. 폴더명은 해당 폴더가 다루는 기능/도메인을 나타내며, 내부에 관련된 여러 파일이 위치한다.

### 상수명
- **UPPER_SNAKE_CASE** 사용

```typescript
const CAPACITY = 4;
const LINE_HEIGHT_BY_SIZE = { small: 1.2, medium: 1.5, large: 1.8 };
const LOGIN_URL = '/login';
```