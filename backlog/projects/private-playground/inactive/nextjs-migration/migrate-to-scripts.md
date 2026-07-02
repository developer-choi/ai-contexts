# Next.js 시절 로직 → 스크립트 이식

## 동기

PP에서 Next.js 앱을 전면 제거(PP master `741a3e2 chore: Next.js 전면 제거`)하면서 `src/` 전체가 삭제됐다. 그 안에 프레임워크와 무관한 순수 도메인 로직(가계부 파서·생일 음력 계산·가계부 타입)이 섞여 있었다. 나중에 이 기능들을 되살릴 때 재작성하지 말고 삭제 커밋 직전 상태에서 꺼내 스크립트 체계로 이식한다.

## 복구 원본 (삭제 커밋 = PP master `741a3e2`, 직전 = `741a3e2~1` = `4557c28`)

`git -C <PP> show 741a3e2~1:<경로>` 로 원문을 꺼낸다.

- **가계부 파서·로직**
  - `src/utils/service/account-book/account-book.ts`
  - `src/utils/service/account-book/account-parser.ts`
  - `src/utils/service/account-book/pay-to-record.ts`
  - `src/utils/service/api/account-book.ts`
- **가계부 타입**
  - `src/types/account-book.ts`
- **생일·음력 계산**
  - `src/utils/service/birthday/birthday.ts`
  - `src/utils/service/birthday/lunar.ts`
  - `src/utils/service/birthday/original-lunar-calculator.js`

## 착수 시 판단할 것

- 각 로직이 Next.js API route(`src/app/api/*`)나 브라우저 전역에 의존했는지 확인 — 순수 함수만 뽑고 프레임워크 결합부는 재작성.
- 이식 대상 위치: PP 폴더 구조 재정립(`active/architecture/folder-structure.md`) 결정에 맞춰 `scripts/` 도메인 하위로 배치.
- `original-lunar-calculator.js`는 `.js`라 tsconfig `allowJs` 하에서만 잡힌다 — TS 이식 여부 결정.

## 종료 조건

되살리기로 한 도메인 로직이 스크립트 체계로 이식·커밋되면 해당 항목을 이 파일에서 삭제한다. 전부 이식되면 파일 삭제. (되살릴 계획이 없으면 이 파일은 inactive 보관용으로 유지 — 표면화되지 않는다.)
