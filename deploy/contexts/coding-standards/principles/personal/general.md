---
tags: [file-folder-structure]
---

# General Coding Principles

## 도메인 종속 코드 배치

특정 도메인(product, user 등)에서만 사용하는 훅/유틸/컴포넌트는 `shared/`가 아닌 **해당 도메인 폴더**에 위치해야 합니다.

- **❌ Bad**: product에서만 쓰는 `useColumnCount`를 `shared/hooks/`에 생성
- **✅ Good**: `features/product/hooks/useColumnCount.ts`에 생성

`shared/`에는 2개 이상의 도메인에서 공통으로 사용하는 코드만 둡니다.
