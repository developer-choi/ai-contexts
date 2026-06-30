// AC ESLint flat config.
//
// 현재 목적은 단 하나 — CJS 금지. AC는 전부 ESM(.mjs)이라 require()/module.exports/exports.X는
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
      "no-restricted-syntax": noCjs,
    },
  },
];
