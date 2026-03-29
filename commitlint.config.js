module.exports = {
  extends: ['@commitlint/config-conventional'],
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
  },
};
