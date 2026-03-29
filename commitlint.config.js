module.exports = {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'subject-korean': ({ subject }) => {
          const hasKorean = /[\uAC00-\uD7AF]/.test(subject);
          return [hasKorean, '커밋 메시지(subject)에 한글이 포함되어야 합니다'];
        },
      },
    },
  ],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        // deploy/skills/
        'backlog',
        'discussion',
        'doc-router',
        'pr-comment-write',
        'pre-exit',
        'scw',
        'simplify',
        'tech-trends',
        'workflow',
        // deploy/contexts/
        'coding-standards',
        // deploy/rules/
        'global',
        // deploy/
        'settings',
      ],
    ],
    'scope-empty': [2, 'never'],
    'subject-case': [0],
    'subject-korean': [2, 'always'],
  },
};
