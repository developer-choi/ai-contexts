# 환경변수 부재 시 즉시 throw — env 읽기 함수화 + 커스텀 에러

## 동기·문제

환경변수를 읽었는데 값이 없을 때, 그 자리에서 "환경변수 없음"으로 throw하지 않고 빈 문자열로 흘려보낸다. 그래서 근본 원인(env 부재)이 읽는 시점에 드러나지 않고 한참 뒤 그 값을 쓰는 API 호출 단계에서 깨진다 — 디버깅이 원인에서 먼 곳에서 시작된다.

- 현재 코드: `apps/examples/src/shared/api/client.ts`
  ```ts
  export const api = new FetchApiClient(process.env.NEXT_PUBLIC_API_URL ?? '');
  ```
  `?? ''`가 부재를 삼켜 baseUrl이 빈 문자열이 된다.
- 결과 체인: baseUrl='' → SSR(Node)에서 `/api/board` 상대경로로 fetch → Node fetch는 절대 URL만 허용 → `TypeError: Failed to parse URL from /api/board` → 페이지 500.
- **근본 원인은 500이 아니라 환경변수 부재.** 500은 증상일 뿐.

## 증상이 페이지마다 달라 원인을 숨김 (주의)

같은 env 부재인데 페이지마다 다르게 보인다:

- `apps/examples/src/app/validation/integration/page.tsx` — 서버 컴포넌트에서 `await getBoardListApi()` **맨손 await** → reject 전파 → **500**.
- `apps/examples/src/app/rendering/infinite-scroll/page.tsx` — `queryClient.prefetchInfiniteQuery(...)`는 **에러를 삼켜**(throw 안 함, `Promise<void>`) 렌더는 **200**, 데이터는 브라우저 재요청(상대경로가 origin에 붙어 성공)으로 가려진다.
- 즉 무한스크롤은 SSR prefetch가 조용히 실패하고도 멀쩡해 보였다. env 검증을 읽기 시점에 강제했다면 두 페이지 모두 같은 지점에서 즉시 터졌을 것.

## 재현 방법

1. `apps/examples/.env.local`의 `NEXT_PUBLIC_API_URL`을 지우거나 빈 값으로 둔다. (새 git worktree는 `.env*`가 gitignore라 자동 복사 안 됨 → 이 상태가 기본으로 재현됨)
2. `npm run examples` 로 dev 서버 기동.
3. `http://localhost:3000/validation/integration` 접속 → **500**. 서버 로그: `TypeError: Failed to parse URL from /api/board` (cause `ERR_INVALID_URL`, input `/api/board`).
4. 대조: `http://localhost:3000/rendering/infinite-scroll` → 200 (prefetch가 에러를 삼킴).

## 조사 (해결 전 선행)

다른 레포·라이브러리가 환경변수 읽을 때 값 없으면 어떻게 오류를 내는지 조사 후 채택안 결정. 1차 소스(공식 문서·소스) 직접 확인:

- `@t3-oss/env-nextjs` + zod 스키마 (빌드/런타임 누락 검증·throw)
- zod로 `process.env` parse 후 실패 시 throw하는 수제 패턴
- `assert`/invariant 기반 `getEnv(key)` 류
- Next.js 권장 방식(빌드 타임 누락 검증) 실태

## 현재 생각중인 방법 (사용자 아이디어)

- `EnvironmentIsNotDefinedError` 커스텀 에러 클래스 — 필드로 누락된 `key` 보유.
- env 읽기를 함수로 추상화(`getEnv(key)` 류) — 함수 안에서 읽어보고 없으면 위 에러 throw. `?? ''` 같은 조용한 fallback 제거.
- 적용 지점: 최소 `shared/api/client.ts`의 `NEXT_PUBLIC_API_URL`. 다른 `process.env.*` 사용처도 전수 점검해 같은 함수로 통일.

## 첫 행동

`apps/examples`에서 `process.env.` 사용처를 grep으로 전수 파악 → 위 조사로 채택 패턴 결정 → `getEnv` + `EnvironmentIsNotDefinedError` 도입 → `?? ''` 제거.

## 종료 조건

- env 누락 시 읽기 시점에 `EnvironmentIsNotDefinedError`(key 포함)로 즉시 throw.
- `process.env.X ?? ''` 같은 조용한 fallback이 코드에서 사라짐(필요한 곳은 명시적 기본값 함수로 대체).
