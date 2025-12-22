# Import & Export 패턴

## Export 방식

**Named Export (선호)**
- 유틸리티 함수
- 타입/인터페이스
- 여러 개의 함수/클래스
- 파일 내에서 여러 요소를 내보낼 때 사용합니다.

```typescript
// ✅ Good
export interface SortParam { }
export interface SortResult { }

export function bruteForceTwoSum() { }
export function twoPointersTwoSum() { }

export class ValidationError extends BaseError { }
```

**Default Export**
- React 컴포넌트
- Next.js 페이지 (`page.tsx`, `layout.tsx`)
- 파일의 주된 기능이 하나인 주요 함수/클래스

```typescript
// ✅ Good
export default function Button(props: ButtonProps) { }
export default function Page() { }
export default bubbleSort;
```

## 경로 Alias 사용
- **`@/*`**: src 디렉토리 절대 경로를 사용합니다.
- 상대 경로(`../../`)는 최대한 지양합니다. 특히 깊이가 2단계 이상(`../../`) 넘어가는 경우 Alias를 사용하세요.

```typescript
// ✅ Good
import {fetchFromClient} from '@/utils/extend/library/fetch/fromClient';
import {Button} from '@/components/element/Button';

// ❌ Bad
import {fetchFromClient} from '../../../utils/extend/library/fetch/fromClient';
```

## Type Import
- `type` 키워드를 명시하여 컴파일 단계에서 제거될 수 있음을 알립니다.

```typescript
// ✅ Good
import {type MouseEvent, type ComponentPropsWithRef} from 'react';
import type {NextRequest} from 'next/server';
```