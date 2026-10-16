# 이름 정리

https://github.com/developer-choi/plan-for-myself/pull/53 · 2026-10-13 승인

`````markdown
# 기록 API와 공용 타입의 필드 이름을 camelCase로 변경

제 개인 프로젝트들은 모두 같은 네이밍 컨벤션을 따릅니다. 객체의 필드 이름은 camelCase로 쓰고, ESLint `naming-convention` 규칙이 이를 검사합니다([컨벤션 문서](https://github.com/developer-choi/monorepo-playground/blob/master/docs/static-checking/eslint/code-style.md#typescript-eslintnaming-convention)).

어느 프로젝트의 어느 코드를 열어도 이름 형식이 같아서, 필드 이름이 snake_case인지 camelCase인지 매번 확인하지 않아도 됩니다.

그런데 기록 API와 공용 `StudyRecord` 타입만 DB 컬럼을 따라 snake_case였습니다. 이 PR에서 세 필드의 이름을 camelCase로 바꿨습니다.

| 전 | 후 |
|---|---|
| `date_type` | `dateType` |
| `studied_minutes` | `studiedMinutes` |
| `fail_tags` | `failTags` |

필드 이름만 바뀌고 동작은 그대로입니다. 검증 오류 코드(`INVALID_DATE_TYPE` 등)는 기존 값을 그대로 씁니다.
`````
