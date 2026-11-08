// AC ESLint flat config.
//
// 목적: CJS 금지, 버전이 박힌 Claude 모델 ID 금지. AC는 전부 ESM(.mjs)이라 require()/module.exports/exports.X는
// 회귀다. AST 기반이라 settings-projection이 node -e 명령을 만드느라 문자열 안에 담는 require(
// 같은 정당한 사례는 오탐하지 않는다(문자열은 CallExpression이 아님).
//
// recommended 프리셋은 일부러 켜지 않는다 — unused-vars 등 무관한 규칙까지 켜면 기존 코드가
// 무더기로 걸려 커밋이 막힌다. 룰은 필요할 때 아래 rules에 점진적으로 더한다.

const noCjs = [
  "error",
  {
    selector: "CallExpression[callee.name='require']",
    message: "ESM에서 require() 금지. import 문을 쓰고 파일을 .mjs로 두세요.",
  },
  {
    selector: "MemberExpression[object.name='module'][property.name='exports']",
    message: "ESM에서 module.exports 금지. export로 바꾸고 파일을 .mjs로 두세요.",
  },
  {
    selector: "AssignmentExpression[left.object.name='exports']",
    message: "ESM에서 exports.X 금지. named export로 바꾸세요.",
  },
];

// 버전이 박힌 모델 ID(`claude-sonnet-4-6` 등)는 새 모델이 나와도 아무것도 안 알려주고 옛 모델로 돈다.
// 2026-10-09 prompt-review 벤치 하네스 기본값이 `claude-sonnet-4-6`이라 Sonnet 5.5가 나온 뒤에도 옛 모델로 재
// 항목을 판정했다. 별칭(`sonnet`·`opus`·`haiku`)을 쓰고, 실제 ID가 필요하면 실행 시점에 물어 얻는다.
const noPinnedModelId = [
  {
    selector: "Literal[value=/claude-(opus|sonnet|haiku|fable)-\\d/]",
    message: "버전이 박힌 Claude 모델 ID 금지. 별칭(sonnet·opus·haiku)을 쓰세요 — 박힌 ID는 새 모델이 나와도 조용히 옛 모델로 돕니다.",
  },
  {
    selector: "TemplateElement[value.raw=/claude-(opus|sonnet|haiku|fable)-\\d/]",
    message: "버전이 박힌 Claude 모델 ID 금지. 별칭(sonnet·opus·haiku)을 쓰세요 — 박힌 ID는 새 모델이 나와도 조용히 옛 모델로 돕니다.",
  },
];

// 비교하는 상수 값을 한국어로 지으면 화면에 보일 말과 코드가 찾는 값이 한 문자열에 묶인다. 2026-11-09 write-doc
// 반려 목록의 레인 값이 한국어로 들어가 `h.lane === "경고"` 꼴로 비교됐다. 비교·case 자리만 본다 —
// includes·object key는 문장 속 낱말 찾기·낱말 사전 같은 정당한 데이터가 대부분이라 걸지 않는다. 한글만 보는 것은
// `ch === "—"` 같은 문자 비교를 거르지 않기 위해서다.
const HANGUL = "/[가-힣ㄱ-ㆎ]/";
const ENUM_MESSAGE =
  "비교하는 상수 값을 한국어로 짓지 마세요. 영어 UPPER_SNAKE 상수로 두고, 사람에게 보일 말은 따로 매핑하세요.";
const noHangulEnum = [
  { selector: `BinaryExpression[operator=/^[!=]==?$/] > Literal[value=${HANGUL}]`, message: ENUM_MESSAGE },
  { selector: `SwitchCase > Literal.test[value=${HANGUL}]`, message: ENUM_MESSAGE },
];

export default [
  {
    ignores: ["node_modules/**", ".claude/**", ".agents/**", ".codex/**", ".gemini/**"],
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "no-restricted-syntax": [...noCjs, ...noPinnedModelId, ...noHangulEnum],
    },
  },
];
