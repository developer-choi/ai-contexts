# 선호 패키지

사용자가 선호하는 카테고리별 라이브러리. 채용과제에서 패키지 선택 시 기본 선택지로 제안하되, 프로젝트 제약에 따라 오버라이드 가능.

## 기본 포함

| 패키지 | 용도 |
|--------|------|
| react-error-boundary | 에러 처리 |

## 카테고리별 선호

| 관심사 | 패키지 | 비고 |
|--------|--------|------|
| UI | radix-ui (primitives), @radix-ui/react-icons | |
| 데이터 페칭 | @tanstack/react-query | devDep: @tanstack/eslint-plugin-query |
| 오버레이 | overlay-kit | |
| 폼 | react-hook-form | |
| 날짜 | dayjs | |
| 토스트 | sonner | |
| 스타일 | sass | |
| 커밋 컨벤션 | @commitlint/cli, @commitlint/config-conventional | husky commit-msg hook과 함께 |
| 훅 관리 | husky, lint-staged | commit-msg(commitlint) + pre-commit(lint-staged) 둘 다 표준 |

셋팅 방법은 MP `docs/best-practices/setup.md`를 참조한다.
