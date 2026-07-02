import fs from 'fs';

function transformTokens(obj) {
  const result = {};

  for (const key in obj) {
    if (key === '$value') {
      // 컬러 객체인 경우 hex 값을 추출, 아니면 일반 값 사용
      const val = obj[key];
      result.value = (typeof val === 'object' && val.hex) ? val.hex : val;
    } else if (key.startsWith('$')) {
      // $type, $description 등을 type, description으로 매핑
      result[key.slice(1)] = obj[key];
    } else if (typeof obj[key] === 'object') {
      // 중첩된 구조 재귀 탐색
      result[key] = transformTokens(obj[key]);
    } else {
      result[key] = obj[key];
    }
  }
  return result;
}

const rawData = JSON.parse(fs.readFileSync('./DesignToken.tokens.json', 'utf8'));
const transformed = transformTokens(rawData);

fs.writeFileSync('./tokens-transformed.json', JSON.stringify(transformed, null, 2));
console.log('전처리 완료: tokens-transformed.json 생성됨');