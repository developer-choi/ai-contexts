# design-token (브랜치 작업 보관)

MP의 `test/design-token` 브랜치에서 작업한 디자인 토큰 파싱 실험 파일을 보관한 것이다. 브랜치는 2026-06-20 삭제 예정이므로, 작업 파일을 잃지 않도록 여기에 옮겼다.

## 출처

- 레포: MP (`monorepo-playground`)
- 브랜치: `test/design-token` (merge-base `f9ec95f`에서 분기)
- 원본 경로: `packages/script-runner/design-token/`
- 커밋 (오래된 것 → 최신):
  - `394e61b8` 디자인 토큰 파싱 최초
  - `548b19e7` 오류 자세히 남기기
  - `acc859f6` 순환참조 테스트

## 파일

| 파일 | 내용 |
|------|------|
| `DesignToken.tokens.json` | 입력 토큰 정의 (DTCG 형식) |
| `tokens-transformed.json` | 변환 중간 산출물 |
| `transform.js` | 토큰 변환 스크립트 |
| `style-dictionary.config.js` | Style Dictionary 설정 |
| `src/styles/design-tokens.scss` | 변환 결과 SCSS |
| `src/styles/design-tokens.ts` | 변환 결과 TS |

## 재개 시 첫 행동

`packages/script-runner/` 하위에 다시 배치하려면 `transform.js`가 의존하던 `style-dictionary` 패키지 설치가 필요하다. 원본 브랜치의 `packages/script-runner/package.json`·`index.js`는 브랜치 고유 작업이 아니라 분기 시점 코드라 여기 포함하지 않았다.
