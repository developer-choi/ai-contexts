module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'refactor']],
    'scope-enum': [
      2,
      'always',
      [
        // deploy/skills/
        'backlog',
        'clone-code-markup',
        'discussion',
        'doc-router',
        'pr-comment-write',
        'pre-exit',
        'scw',
        'simplify',
        'tech-trends',
        'workflow',
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
