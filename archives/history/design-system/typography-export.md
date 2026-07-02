# typography export를 dist 배포로 전환 결정

## 동기

`typography.module.scss`는 **믹스인/클래스 라이브러리**라 JS import 그래프에 없다. 그래서 Vite lib 빌드가
자동으로 dist에 옮기지 않는다. 소비자(examples)가 가져다 쓰려면 별도 배포 경로가 필요했고, exports를
src 경로가 아니라 **빌드 산출물 dist 경로**로 가리키도록 전환했다.

## 결정

빌드 시 원본 scss와 그 타입선언(`typography.d.ts`)을 **`dist/styles/`로 복사**하고, `package.json` exports의
`./styles/typography`가 이 산출물을 가리킨다.

- 복사: `vite-plugin-static-copy`(표준 플러그인). `vite.config.ts`에서
  `targets: [{src: 'src/styles/typography.{module.scss,d.ts}', dest: 'styles', rename: {stripBase: true}}]`.
  (`stripBase`로 `dist/styles/` 바로 밑에 평탄 복사 — 안 하면 `dist/styles/src/styles/...`로 들어감.)
- exports: `"./styles/typography"` → default=`./dist/styles/typography.module.scss`, types=`./dist/styles/typography.d.ts`.

관련 커밋(master): `build(design-system): typography scss를 static-copy로 dist 배포 + exports를 dist 경로로 전환`,
`feat(design-system): typography를 CSS Module로 JS import 가능하게 타입 노출`.

## 근거

- **두 소비 경로 지원**: (a) sass `@use '.../styles/typography'` → dist에 scss 필요. (b) JS
  `import typography from '.../styles/typography'`(CSS Module) → `typography.d.ts`로 타입 필요.
- **src가 아니라 dist 경로 export**: 패키지의 공개 표면을 빌드 산출물로 고정(소비자가 내부 src 구조에 의존하지 않게).
- 손수 짠 `closeBundle`+`fs.copyFileSync` 인라인 플러그인 → 표준 `vite-plugin-static-copy`로 교체(유지보수성).

## 미검증 (project-build.md와 연결)

design-token CSS가 `style.css`와 별도 export scss에 중복 포함되는지(`project-build.md`)는 별개 미검증 항목.
typography 복사는 그것과 무관하게 동작 확인됨(빌드 시 `Copied 2 items` + `dist/styles/`에 2파일 생성).

## 종료 조건

이 export 전략이 DS convention.md / `docs/`에 정식 문서화되면 이 노트 삭제 가능.
