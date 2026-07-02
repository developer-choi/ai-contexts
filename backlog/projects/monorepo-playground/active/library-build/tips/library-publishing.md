# 라이브러리 Publishing

## 함정

- `Cannot read properties of undefined (reading 'recentlyCreatedOwnerStacks')` 에러 → 라이브러리와 import하는 프로젝트의 React 버전 불일치. `peerDependencies`로 해결
- import 시 `Unexpected token` 에러 → node_modules에 원본 `.tsx`가 들어간 경우. 빌드 결과물만 배포되도록 점검
- 라이브러리 import 경로는 `from 'package-name'` 또는 `from 'package-name/path'` 형태

## 디자인 시스템

- Tree-shaking이 되는지 빌드 결과물에서 직접 확인
- 공통 디자인 토큰 SCSS를 패키지 내부에서 사용 + export 동시에 하면 빌드 `style.css`와 export된 `design-tokens.scss` 양쪽에 토큰 CSS가 중복될 수 있다 → 검증 필요
- Next.js Client Component 지원하려면 `'use client'` 지시문 보존을 위한 별도 셋업 필요
