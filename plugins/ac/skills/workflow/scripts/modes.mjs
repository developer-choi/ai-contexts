// workflow 모드 표. steps.mjs·step-gates.mjs가 함께 쓴다.
//
// 코드가 비교하는 값은 영어 키이고, 사람에게 보일 말(채용·실무·개인)은 이 표에서만 나온다.
// 말을 다듬어도 판정이 안 깨지게 하려는 것이다. 사용자는 한국어로 넘겨도 되므로 입력은 키와 말 둘 다 받아 키로 바꾼다.
// 키는 사용자가 `/workflow`·`--mode`에 치는 입력 토큰이라 UPPER_SNAKE가 아니라 소문자로 둔다.

export const MODE_RECRUIT = 'recruit';
export const MODE_WORK = 'work';
export const MODE_PERSONAL = 'personal';

export const MODE_LABELS = { [MODE_RECRUIT]: '채용', [MODE_WORK]: '실무', [MODE_PERSONAL]: '개인' };

// 오류·안내에 보일 목록: `recruit(채용)·work(실무)·personal(개인)`
export const MODE_CHOICES = Object.entries(MODE_LABELS).map(([key, label]) => `${key}(${label})`).join('·');

// 키 또는 한국어 말 → 키. 모르는 값이면 undefined.
export function toModeKey(value) {
  if (value === undefined) return undefined;
  if (Object.hasOwn(MODE_LABELS, value)) return value;
  return Object.keys(MODE_LABELS).find((key) => MODE_LABELS[key] === value);
}
