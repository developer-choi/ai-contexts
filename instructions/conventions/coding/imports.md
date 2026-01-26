# Import & Export 패턴

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
