// style-dictionary.config.js
import StyleDictionary from 'style-dictionary';

// 1. SCSS 전용 포맷 등록: 중첩된 맵($design-tokens) 생성
StyleDictionary.registerFormat({
  name: 'scss/map-deep',
  format: ({ dictionary }) => {
    const processTokens = (obj) => {
      return Object.entries(obj)
        .map(([key, token]) => {
          // value가 존재하면 실제 값 출력, 없으면 하위 트리 탐색
          const isToken = token && Object.prototype.hasOwnProperty.call(token, 'value');
          const value = isToken
            ? token.value
            : `(\n${processTokens(token)}\n)`;
          return `  "${key}": ${value}`;
        })
        .join(',\n');
    };

    return `@use "sass:map";\n\n$design-tokens: (\n${processTokens(dictionary.tokens)}\n);\n`;
  }
});

// 2. TypeScript 전용 포맷 등록: as const 객체와 타입 생성
StyleDictionary.registerFormat({
  name: 'typescript/const',
  format: ({ dictionary }) => {
    // 순수하게 값만 담긴 객체 생성을 위해 dictionary.tokens 활용
    const cleanTokens = JSON.stringify(dictionary.tokens, (key, value) => {
      // Style Dictionary의 내부 메타데이터(filePath, isSource 등) 제외 로직
      if (value && typeof value === 'object' && value.value !== undefined) {
        return value.value;
      }
      return value;
    }, 2);

    return `// Design Tokens\n\nexport const designTokens = ${cleanTokens} as const;\n\n` +
      `export type DesignTokens = typeof designTokens;\n`;
  }
});

// 3. 통합 설정 (두 플랫폼을 동시에 정의)
const sd = new StyleDictionary({
  source: ['./tokens-transformed.json'],
  log: {
    verbosity: 'verbose' // 상세 로그를 강제로 활성화합니다.
  },
  platforms: {
    // 첫 번째 출력: SCSS
    scss: {
      transformGroup: 'scss',
      buildPath: 'src/styles/',
      files: [{
        destination: 'design-tokens.scss',
        format: 'scss/map-deep'
      }]
    },
    // 두 번째 출력: TypeScript
    ts: {
      transformGroup: 'js',
      buildPath: 'src/styles/',
      files: [{
        destination: 'design-tokens.ts',
        format: 'typescript/const'
      }]
    }
  }
});

await sd.buildAllPlatforms();
console.log('SCSS 및 TS 토큰 파일 생성 완료');