# General Coding Principles

## 도메인 종속 코드 배치

특정 도메인(product, user 등)에서만 사용하는 훅/유틸/컴포넌트는 `shared/`가 아닌 **해당 도메인 폴더**에 위치해야 합니다.

- **❌ Bad**: product에서만 쓰는 `useColumnCount`를 `shared/hooks/`에 생성
- **✅ Good**: `features/product/hooks/useColumnCount.ts`에 생성

`shared/`에는 2개 이상의 도메인에서 공통으로 사용하는 코드만 둡니다.

---

## 코드 suppression 사용 금지

`eslint-disable` 등 코드 suppression은 사용하지 않습니다. 사용이 필요하다고 판단되면 사용자에게 명시적으로 설득하여 승인을 받아야 합니다.
