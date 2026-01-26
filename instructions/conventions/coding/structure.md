# 코드 구조화 및 가독성

## 1. 조건문 작성 순서
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
