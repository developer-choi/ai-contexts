# Local Skills Sync

각 프로젝트의 로컬 Claude 스킬 원본을 Codex 로컬 스킬 산출물로 동기화합니다.

```bash
npm run sync:local-skills
```

기본 순회 범위는 `~/WebstormProjects/main/`과 `~/WebstormProjects/my-else/` 하위 1뎁스 git 레포입니다. 특정 루트만 지정할 수 있습니다.

```bash
npm run sync:local-skills -- ~/WebstormProjects/main
```

## 수행 작업

- AC git hook 준비 상태를 먼저 확인합니다. 이 검증은 AC worktree의 commitlint 누락을 조기에 잡기 위한 것이며, 동기화 대상 프로젝트의 hook을 수정하지 않습니다.
- `.claude/skills`가 있으면 `.agents/skills`로 복사합니다.
- 레포 루트 `CLAUDE.md`가 있으면 `AGENTS.md`로 복사합니다.
- 로컬 스킬 원본은 `.claude/`이며, `.agents/`는 배포 산출물로 봅니다.

## 제거

```bash
npm run unsync:local-skills
```

제거 명령은 `.agents/skills`가 `.claude/skills`와 동일할 때만 삭제합니다. `AGENTS.md`도 `CLAUDE.md`와 동일할 때만 삭제합니다. 내용이 다르면 사용자 수정 가능성이 있으므로 건드리지 않고 `skipped`로 보고합니다.
