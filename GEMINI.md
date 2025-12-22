# 프로젝트 유지보수 가이드

## 이모지 사용 규칙
임의의 md 파일 작성 시 불필요한 장식용 이모지 사용을 금지합니다.
단, 다음 기호는 **Before & After** 또는 **Bad & Good** 비교 시에만 제한적으로 허용합니다:
- ✅ (Check Mark): Good Case
- ❌ (Cross Mark): Bad Case

### 사용 예시

**❌ Bad (개별 나열)**
```typescript
const LINE_1_START = 10;
const LINE_1_END = 20;
const LINE_1_TOP = 5;
```

**✅ Good (객체 그룹화)**
```typescript
const LINE_1 = {
  START: 10,
  END: 20,
  TOP: 5,
};
```
