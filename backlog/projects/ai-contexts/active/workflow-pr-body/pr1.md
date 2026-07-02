# PR1 — 프로젝트 세팅 (정적 분석 / 커밋 검증 / 테스트 환경)

> 채용과제용 PR1 본문 합집합 템플릿.
> 매번 채용과제마다 이 파일을 복사해서 시작하고, 해당 과제에서 안 한 항목은 삭제 후 사용한다.
> 각 섹션 끝의 `출처:` 표시는 어느 과제에서 가져온 문구인지 추적용이다 — 제출 본문에서는 제거한다.

---

## 안내

작업 과정을 체계적으로 관리하기 위해 기능 단위로 PR을 분리하여 진행하고 있습니다.

최종 제출은 모든 기능을 합친 `feature → master` PR로 진행하며, 과제 요구사항에 맞는 제출 양식은 최종 PR에 작성하겠습니다.

출처: stunning #2 (https://github.com/developer-choi/recruitment-stunning-202603/pull/2)

---

## 이 PR의 범위

starter에 빠져있던 정적 검사·커밋 검증·단위테스트 환경을 보강합니다. 런타임 코드는 추가하지 않습니다.

출처: wisebirds #1 (https://github.com/developer-choi/recruitment-wisebirds-20260505/pull/1)

---

## 요약

- 정적 분석(ESLint + tsconfig)으로 코드 품질 안전망 구축
- husky 기반 2단계 검증 구조 (pre-commit / pre-push)
- commitlint로 커밋 메시지 컨벤션 자동 강제

출처: stunning #2 (https://github.com/developer-choi/recruitment-stunning-202603/pull/2)

---

## 셋업 PR 분리 의도 — 왜 런타임 코드 전에 가드레일부터 까는가

AI가 작성하는 코드가 늘면 사람이 리뷰할 양도 같이 늘어납니다. 저는 이 리뷰 비용을 줄이는 가장 부담 적은 방법이 **정적 분석과 테스트를 커밋 시점부터 강제하는 것**이라고 생각합니다. 린트가 실수를 자동으로 차단하고, 테스트가 기존 동작이 깨지지 않았는지 확인하고, 린트가 못 잡는 문제는 AI 코드리뷰가 받아냅니다.

이번 채용 과제도 AI 도구를 쓰는 작업이라, 런타임 코드를 쓰기 전에 가드레일을 먼저 까는 편이 시간 대비 효과가 크다고 판단해 PR1을 셋업 전용으로 분리했습니다. 이렇게 두면 후속 PR에서 lint·type 에러가 떠도 셋업 탓인지 코드 탓인지 리뷰어가 헷갈리지 않습니다.

출처: wisebirds #1 (https://github.com/developer-choi/recruitment-wisebirds-20260505/pull/1)

---

## 배경 — 두 가지 목표

두 가지 목표를 추구하고 있습니다:

1. **버그 없는 프로그램 만들기**
2. **AI로 개발 생산성 올리기**

### 버그 없는 프로그램을 위한 로드맵

버그를 줄이려면 에러를 잘 처리하는 것도 중요하지만, 애초에 에러가 발생하지 않도록 예방하는 것이 더 중요합니다. 예방 수단을 도입 비용이 저렴한 순서로 정리하면:

1. **정적 분석 (린트, 타입 체크)**
2. 테스트 코드
3. AI 코드 리뷰

이렇게 예방하더라도 발생하는 오류가 있을 수 있습니다. 그 경우에는

4. **에러 처리 (사용자 안내 / 에러 수집)**

를 통해 최대한 빠르게 대응하는 것까지가 목표입니다.

이 중 정적 분석을 첫 PR부터 도입하였고, 에러 처리는 [에러 처리는 왜 필요한가?](https://github.com/developer-choi/developer-choi/blob/main/docs/error-handling/step1.md)를 통해 과거에 고민을 마친 상태이니 확인해주시면 감사하겠습니다.

### AI 생산성과의 연결

이 안전망은 두 번째 목표와도 직결됩니다. AI가 작성한 코드의 양이 늘수록 사람이 리뷰해야 할 양도 늘어납니다. 정적 분석이 자동으로 걸러주면, 사람은 더 중요한 것에 집중할 수 있습니다.

예를 들어, 아래와 같은 코드는 이제 커밋 자체가 불가능합니다:

```typescript
// ❌ await 없이 Promise 호출 → 에러가 조용히 삼켜짐 (no-floating-promises)
fetchData();

// ❌ any 타입이 조용히 퍼져나감 → 타입 안전성 구멍 (no-unsafe-assignment)
const data = JSON.parse(response);

// ❌ || 사용 시 0이나 ""가 falsy로 처리됨 (prefer-nullish-coalescing)
const count = input || 10;  // input이 0이면 10이 됨

// ❌ undefined가 템플릿 리터럴에 삽입됨 (restrict-template-expressions)
const msg = `user: ${user.name}`;  // user.name이 undefined면 "user: undefined"
```

이런 패턴들은 사람이 눈으로 리뷰하기 어렵지만, 린트가 자동으로 잡아줍니다.

AI가 이런 코드를 작성하더라도 커밋 시점에 자동으로 차단되므로, 리뷰어가 이런 항목까지 눈으로 확인할 필요가 없습니다. **코드 작성 속도와 리뷰 속도가 모두 올라갑니다.**

출처: stunning #2 (https://github.com/developer-choi/recruitment-stunning-202603/pull/2)

---

## 채택한 표준 — 검증된 룰셋 통째로

평소 개인 모노레포(여러 워크스페이스를 한 레포에서 운영하는 사이드 프로젝트)에서 운영해 온 룰셋을 그대로 가져왔습니다. 4시간 제약 안에서 룰을 하나씩 정당화하기보다 검증된 표준 셋을 통째로 채택하는 쪽이 합리적이라고 봤고, 이 starter 스택에서 쓸 일이 없는 것만 제외했습니다.

출처: wisebirds #1 (https://github.com/developer-choi/recruitment-wisebirds-20260505/pull/1)

---

## 2단계 검증 구조 — pre-commit vs pre-push

### 왜 2단계인가?

커밋할 때마다 전체 파일을 대상으로 린트와 타입 체크를 돌리면 작업 속도가 느려집니다.

따라서 커밋 시점에서는 변경된 파일 위주로 빠르게 검사하고, 푸시 전에는 전체를 돌리는 것으로 보완했습니다.

물론 husky hook은 IDE 설정에 따라 우회될 수 있으므로, 최후의 안전망으로 CI에서 한번 더 막는 방법도 고려하고 있습니다.

| 시나리오 | pre-commit (staged) | pre-push (전체) |
|---------|---------------------|-----------------|
| staged 파일 에러 | 잡힘 | 잡힘 |
| 크로스파일 이슈 | 못 잡음 | 잡힘 |

### 스크립트 구성

- `test-staged`: `lint-staged && tsc -b` — staged 파일 린트 + 전체 타입 체크
- `test-all`: `eslint . && tsc -b` — 전체 린트 + 전체 타입 체크

`test-staged`에도 `tsc -b`를 포함한 이유는, tsc에는 staged 파일만 검사하는 모드가 없기 때문입니다.

출처: stunning #2 (https://github.com/developer-choi/recruitment-stunning-202603/pull/2)

---

## commitlint — 커밋 메시지 컨벤션 강제

`@commitlint/config-conventional` 기반으로 type/scope/subject 형식을 강제합니다.

- **scope 필수**: 변경 영역을 명시적으로 드러내기 위해 scope를 반드시 기입
- **scope-enum**: 프로젝트 도메인에 맞춰 제한하여 일관성 유지 (예: `setting`, `plan`, `core`, `ui`, `test` 등)
- **한글 제목 강제 (커스텀 룰)**: AI에 맡기면 영어 메시지가 나오는데, 그동안 한글로 운영해 온 레포에 영어가 섞이면 알아보기 힘들어서 커밋 제목에 한글이 포함됐는지 검사하는 커스텀 룰을 추가했습니다.

이를 통해 AI가 커밋 메시지를 작성할 때도 컨벤션이 자동으로 강제됩니다. 프롬프트에 커밋 메시지 규칙을 일일이 지시하는 것보다 훨씬 저렴한 비용으로 동일한 결과를 얻을 수 있었습니다.

출처: stunning #2 (https://github.com/developer-choi/recruitment-stunning-202603/pull/2) + wisebirds #1 (https://github.com/developer-choi/recruitment-wisebirds-20260505/pull/1)

---

## 도입한 규칙 전체 목록

### ESLint — 수동 추가 (`eslint.config.js`)

#### 1. `@typescript-eslint/switch-exhaustiveness-check`

union 타입의 switch 문에서 케이스 누락을 방지합니다. 타입이 추가될 때 switch를 빠뜨리면 런타임 버그로 이어집니다.

```typescript
// ❌
type Status = "success" | "error" | "loading";
function getMessage(status: Status): string {
  switch (status) {
    case "success": return "완료";
    case "error": return "실패";
    // "loading" 케이스 누락 → 컴파일은 되지만 undefined 반환
  }
}
```

#### 2. `@typescript-eslint/prefer-nullish-coalescing`

`||` 대신 `??`를 사용하도록 강제합니다. `||`는 `0`, `""`, `false`도 falsy로 처리하여 의도하지 않은 기본값이 적용될 수 있습니다.

```typescript
// ❌
const count = input || 10;  // input이 0이면 10이 됨

// ✅
const count = input ?? 10;  // input이 null/undefined일 때만 10
```

#### 3. `@typescript-eslint/no-unnecessary-condition`

타입상 항상 true이거나 항상 false인 조건을 감지합니다. 죽은 코드나 잘못된 타입 단언을 발견할 수 있습니다.

```typescript
// ❌
const file = formData.get("image") as File;
if (!file) { ... }  // as File로 단언했으므로 항상 truthy → 죽은 코드
```

#### 4. `eqeqeq` (always)

`==` / `!=` 사용을 금지하고 `===` / `!==`를 강제합니다. 타입 강제 변환으로 인한 예측 불가능한 동작을 방지합니다.

```typescript
// ❌
if (value == null) { ... }   // undefined도 매칭됨
```

#### 5. `no-console` (allow: warn, error)

`console.log`가 프로덕션에 유출되는 것을 방지합니다. `console.warn`과 `console.error`는 허용합니다.

```typescript
// ❌
console.log("debug:", data);
```

#### 6. `@typescript-eslint/restrict-template-expressions` (allowNullish: false)

템플릿 리터럴에 `undefined`, `null`, 객체 등이 삽입되는 것을 방지합니다.

```typescript
// ❌
const msg = `user: ${user.name}`;  // user.name이 undefined면 "user: undefined"
```

#### 7. `max-params` (2)

함수 파라미터를 최대 2개로 제한합니다. 파라미터가 많으면 객체로 묶어 가독성을 높입니다.

```typescript
// ❌
function createUser(name: string, email: string, age: number) { ... }

// ✅
function createUser(params: { name: string; email: string; age: number }) { ... }
```

### ESLint — `recommendedTypeChecked` 프리셋 (`eslint.config.js`)

아래 규칙들은 `recommended` → `recommendedTypeChecked`로 프리셋을 업그레이드하면서 자동으로 활성화되었습니다. TypeScript 컴파일러의 타입 정보를 활용하는 규칙들입니다.

#### 8. `@typescript-eslint/no-floating-promises`

await 없이 Promise를 호출하면 에러가 조용히 삼켜집니다.

```typescript
// ❌
fetchData();  // 에러 발생해도 아무도 모름

// ✅
await fetchData();
// 또는
void fetchData();  // 의도적으로 무시할 때
```

#### 9. `@typescript-eslint/no-misused-promises`

void를 기대하는 자리에 async 함수를 전달하는 것을 방지합니다.

```typescript
// ❌
<button onClick={async () => { await submitForm(); }} />

// ✅
<button onClick={() => { void submitForm(); }} />
```

#### 10. `@typescript-eslint/no-unsafe-assignment`

`any` 타입 값이 변수에 할당되는 것을 방지합니다. `JSON.parse()` 등이 반환하는 `any`가 한 번 변수에 들어가면, 그 변수에서 프로퍼티를 꺼내거나, 함수로 호출하거나, 다른 함수에 전달하는 모든 곳에서 타입 체크가 무력화됩니다. 아래 11~14번 규칙이 이 전파를 각 단계에서 차단합니다.

```typescript
// ❌
const data = JSON.parse(response);  // data는 any → 타입 체크 무력화

// ✅
const raw: unknown = JSON.parse(response);
const data = schema.parse(raw);  // 검증 후 사용
```

#### 11. `@typescript-eslint/no-unsafe-call`

`any` 타입 값을 함수처럼 호출하는 것을 방지합니다.

```typescript
// ❌
const fn = JSON.parse(str);
fn();  // any를 함수로 호출 → 런타임 에러

// ✅
const fn: (() => void) = validateAndParse(str);
fn();
```

#### 12. `@typescript-eslint/no-unsafe-member-access`

`any` 타입 값에서 프로퍼티에 접근하는 것을 방지합니다.

```typescript
// ❌
const data = JSON.parse(str);
const name = data.user.name;  // any에서 체이닝 → 타입 체크 없음

// ✅
const data: UserResponse = schema.parse(JSON.parse(str));
const name = data.user.name;  // 타입 보장
```

#### 13. `@typescript-eslint/no-unsafe-return`

타입이 있는 함수에서 `any` 값을 반환하는 것을 방지합니다.

```typescript
// ❌
function getConfig(): AppConfig {
  return JSON.parse(str);  // any를 AppConfig로 반환
}

// ✅
function getConfig(): AppConfig {
  return configSchema.parse(JSON.parse(str));
}
```

#### 14. `@typescript-eslint/no-unsafe-argument`

타입이 있는 파라미터에 `any` 값을 전달하는 것을 방지합니다.

```typescript
// ❌
function greet(name: string) { ... }
const data = JSON.parse(str);
greet(data.name);  // any를 string 파라미터에 전달

// ✅
const data: { name: string } = schema.parse(JSON.parse(str));
greet(data.name);
```

이 외에도 `await-thenable` (Promise가 아닌 값에 await 사용 방지) 등이 프리셋에 포함되어 자동으로 활성화되어 있습니다.

### tsconfig (`tsconfig.app.json`)

#### 15. `noUncheckedIndexedAccess`

배열이나 객체의 인덱스 접근 시 반환 타입에 `| undefined`를 자동으로 추가합니다.

```typescript
// ❌ (옵션 OFF 시)
const users = ["Alice", "Bob"];
const first: string = users[5];  // undefined인데 string으로 통과

// ✅ (옵션 ON 시)
const first = users[5];  // string | undefined → undefined 체크 강제
if (first) {
  console.error(first.toUpperCase());
}
```

출처: stunning #2 (https://github.com/developer-choi/recruitment-stunning-202603/pull/2)
