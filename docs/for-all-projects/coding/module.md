# Export 방식

**Named Export (선호)**
- 유틸리티 함수
- 타입/인터페이스
- 여러 개의 함수/클래스

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
- Next.js 페이지
- 주요 함수/클래스

```typescript
// ✅ Good
export default function Button(props: ButtonProps) { }
export default function Page() { }
export default bubbleSort;
```

# 경로 Alias 사용
- **@/\***: src 디렉토리 절대 경로
- 상대 경로 최소화

```typescript
// ✅ Good
import {fetchFromClient} from '@/utils/extend/library/fetch/fromClient';
import {Button} from '@/components/element/Button';

// ❌ Bad
import {fetchFromClient} from '../../../utils/extend/library/fetch/fromClient';
```

# Type Import
- `type` 키워드 명시

```typescript
// ✅ Good
import {type MouseEvent, type ComponentPropsWithRef} from 'react';
import type {NextRequest} from 'next/server';
```
