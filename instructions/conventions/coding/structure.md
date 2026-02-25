# 코드 구조화 및 가독성

## 1. 도메인 종속 코드 배치

특정 도메인(product, user 등)에서만 사용하는 훅/유틸/컴포넌트는 `shared/`가 아닌 **해당 도메인 폴더**에 위치해야 합니다.

- **❌ Bad**: product에서만 쓰는 `useColumnCount`를 `shared/hooks/`에 생성
- **✅ Good**: `features/product/hooks/useColumnCount.ts`에 생성

`shared/`에는 2개 이상의 도메인에서 공통으로 사용하는 코드만 둡니다.

## 2. 조건문 작성 순서
### 단일 문장 중괄호 사용
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
