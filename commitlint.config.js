module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'refactor', 'audit']],
    'scope-enum': [
      2,
      'always',
      [
        // deploy/skills/
        'audit',
        'backlog',
        'clone-code-markup',
        'code-review',
        'discussion',
        'doc-router',
        'pr-comment-respond',
        'pr-comment-write',
        'pre-exit',
        'skill-creator-wrapper',
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
  },
};
