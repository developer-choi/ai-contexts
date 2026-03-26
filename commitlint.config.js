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
        'code-review',
        'discussion',
        'doc-router',
        'pr-comment-respond',
        'pr-comment-write',
        'pre-exit',
        'scw',
        'simplify',
        'tech-trends',
        'workflow',
        'bug-investigation',
        'codebase-audit',
        'recruitment-review',
        'spec-review',
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
