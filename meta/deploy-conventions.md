# 배포 시스템 수정 규약

AC의 배포 시스템(`scripts/` 하위 sync·unsync 스크립트, `deploy/hooks/`, settings.json hook, AC worktree)을 수정·추가할 때 따르는 규칙.

## 목적: 어느 에이전트가 와도 동일하게 동작

이 배포 시스템의 목적은 **Claude·Codex·Gemini 중 어느 에이전트로 작업해도 같은 규칙·스킬·hook이 동일하게 동작하게** 만드는 것이다. 아래의 모든 계약은 이 목적을 위한 수단이다.

- **원본은 한 벌만 둔다.** 전역 공통 자산은 `deploy/`에, 레포 로컬 자산은 그 레포의 `local/`에 둔다. 같은 로직(hook js·정책 목록·스킬)을 에이전트마다 따로 쓰지 않는다 — 한 벌이 SSOT다.
- **타겟별 형식은 어댑터가 투영한다.** `sync:*`가 원본 한 벌을 각 에이전트의 등록 형식으로 변환해 배포한다. Claude는 `~/.claude`(레포 로컬은 `.claude/`), Codex는 `~/.codex`·`.codex/`, Gemini는 `~/.gemini`. 등록 구조(matcher·이벤트)의 에이전트별 차이는 어댑터가 흡수하므로, 같은 hook 하나가 세 에이전트에서 동일하게 발동한다.
- **배포 산출물은 직접 손대지 않는다.** `~/.claude/*`·`.claude/*`·`.codex/*`·`.gemini/*`·`.agents/*`와 투영 파일(`AGENTS.md`·`GEMINI.md`)은 전부 원본에서 생성된 산출물이다. 직접 고치면 다음 sync에 덮여 사라지고, 한 에이전트에만 반영돼 동일 동작이 깨진다. 그래서 산출물을 두 장치로 보호한다 — 둘은 막는 대상이 달라 서로 대체하지 못한다:
  - **편집 차단(hook)** — 전역 `check-artifact-write-policy.mjs`가 AI의 Edit/Write를 가로채 산출물 직접 수정 시 `ask`를 띄운다. hook 하나가 모든 레포의 `~/.claude`·`.claude/*` 등을 커버한다. 단 AI의 편집만 막지 git 커밋은 못 막는다.
  - **커밋 차단(gitignore)** — 각 레포 `.gitignore`가 산출물을 git에서 제외한다. 산출물은 원본에서 다시 만들어지므로 커밋할 이유가 없다. 이건 레포마다 적어야 하고 hook이 대신할 수 없다.

수정은 항상 원본(`deploy/`·`local/`)에서 하고 `sync:*`로 배포한다 — 글로벌 원본은 `deploy/`, 레포 로컬 원본은 `local/`.

## settings는 base(공통) + 타겟 override로 생성한다

각 타겟 설정은 **공통 재료 `deploy/base-settings.json` + 타겟 override 파일(`deploy/claude-settings.json` 등)을 합쳐 생성**한다(`scripts/settings/settings-projection.mjs` + `deploy-lib.mjs`). override가 우선(키 충돌 시 base를 덮음).

- **base에는 진짜 공통인 것만 둔다.** 현재는 정책 hook의 논리 목록(`file/event/on`)뿐 — claude·codex가 같은 hook을 쓰므로 한 번만 적고 어댑터가 타겟별로 변환한다.
- **타겟 전용 설정은 그 타겟 override 파일에 둔다.** 예: model·env·permissions는 Claude 전용이라 `deploy/claude-settings.json`에. codex는 override 없이 hook만, gemini는 hook 없음(override 파일 없으면 `{}`).
- **`permissions.allow`의 도구 이름은 괄호형(`"Bash(*)"`)으로 적는다.** 괄호 없는 `"Bash"`를 넣으면 거기서 판정이 끝나 그 도구의 승인 창(`ask`)이 "이미 승인됨"으로 흡수된다 — 훅이 낸 `ask`든 `permissions.ask` 규칙이든 가리지 않는다. 허용 범위는 `"Bash(*)"`와 같은데 승인 창만 죽으므로, 얻는 것 없이 방어선만 잃는다.
  - 실측(2026-08-05, 같은 세션에서 설정만 바꿔가며): `"Bash"`일 때 `git push --dry-run`이 무승인 통과 → `"Bash"` 제거 시 승인 창 등장 → `"Bash(*)"`로 교체해도 승인 창 유지, 그러면서 `hostname`·`git log`는 조용. 2026-07-25 KA `main` 무승인 push 사고의 원인이 이것이다.
  - 범위를 준 allow는 원래 `ask`를 못 이긴다 — `Bash(git:*)`가 allow에 있어도 push `ask`는 정상으로 떴다. 문제는 "allow가 있다"가 아니라 "괄호가 없다"였다.
  - **무시되는 범위는 일정하지 않다.** 같은 괄호 없는 allow 아래서 삭제·산출물 수정 훅의 `ask`는 정상으로 떴고 무시된 것은 push뿐이었다(2026-08-05). 어느 것이 무시될지 예측하지 말고, `ask`로 방어선을 세울 때는 실제로 창이 뜨는지 한 번 확인한다.
- **git hook이 스스로 내는 명령은 권한 계층 밖이다.** 레포의 `post-commit`이 자체적으로 `git push`를 하는 식이면 도구 호출이 아니므로 `permissions.*`도 정책 hook도 관여하지 않는다. 그런 자동 동작은 그 레포의 hook 자체를 고치는 것 말고 막을 방법이 없다.
- 타겟마다 hook 런타임이 다르므로(codex엔 SendMessage tool·UserPromptSubmit 없음, PreToolUse를 `*`로 통합) matcher·이벤트 변환은 `settings-projection.mjs`의 어댑터(`HOOK_ADAPTERS`)가 담당한다. 타겟 추가·변경은 어댑터와 호출부(`*SettingsObject`)만 고친다.
- override 파일은 `SOURCE_ONLY_ROOT_FILES`에 넣어 raw 복사 대상에서 제외한다(생성 재료이지 그대로 배포하는 파일이 아님).
- `sync:system`은 시작 시 verify 계약들로 fail-fast하고, 배포 시 생성 객체와 배포본을 대조한다(claude/gemini `verifySettings`, codex `verifyJsonExact`).
- 정책 hook은 **명령 문자열이 아니라 파싱된 git 호출**을 본다. 인접 정규식으로 검사하면 `git -C <path>`·chain 형태가 조용히 빠져나간다. 새 git 정책 hook은 `deploy/hooks/git-command-parser.mjs`의 `findGitInvocations`·`partitionArgs`를 쓰고, 대표 케이스를 `verify-hook-policies.mjs`에 등록한다. 짧은 옵션은 토큰 정확 일치로 보지 않는다 — 값을 붙이거나(`-F-`) 묶어 쓰면(`-sF-`) 모양이 달라져 검사를 빠져나가므로 `commitShortFlagChars`로 글자 단위로 본다.

## 로컬 settings projection (`local/` → repo-local)

settings/hooks는 위 전역 메커니즘을 **그대로 미러링한 로컬판**으로 배포한다. 소스는 각 레포의 `local/`(전역 `deploy/`의 로컬판), 타겟은 그 레포의 repo-local `.claude/settings.json`·`.codex/hooks.json`이며, `sync:local-system`이 (로컬 스킬과 함께) 배포한다. **`local/base-settings.json`을 가진 모든 레포**가 대상이다(AC + KA 등, per-repo — `projectRepoLocalSettings(repo)`가 `repo` 인자를 생략하면 AC로 흘러 기존 동작이 불변). 산출물은 gitignore한다.

- **재사용**: `mergeSettings`(부분키 머지+`.ac-keys`)·`splitSettings`·`verifySettings`·`verifyJsonExact`는 `targetPath` 제네릭이라 그대로 쓴다(`scripts/local-system/local-deploy-lib.mjs`). `settings.json`은 통째 덮어쓰지 않고 부분키만 관리해 사용자 동적 필드를 보존한다.
- **분기점은 어댑터뿐**: `settings-projection.mjs`의 `LOCAL_ADAPTERS`+`localHookCommand`. 전역과 달리 command가 repo 안 산출물을 가리키며(claude는 `node "${CLAUDE_PROJECT_DIR}/.claude/hooks/<file>"`, codex는 상대 경로 `node .codex/hooks/<file>`), codex 매처는 사용자가 codex로 검증한 `run_command`+`Bash`다(전역의 `*`는 프로젝트-로컬 발화 미검증). `buildHooks`는 `opts.adapters`/`opts.makeCommand`로 주입받고 매처 배열을 fan-out한다 — 전역 호출은 인자 없이 그대로 동작한다.
- **Stop 이벤트는 claude 전용**: codex엔 Stop hook 런타임이 없어 `LOCAL_ADAPTERS.codex.supports`에서 제외한다. codex로 투영되는 hook이 하나도 없는 레포(Stop-only base, 예: KA)는 `.codex/` 산출물을 만들지 않는다(`codexHasHooks`로 gate).
- **생성 계약**: `verify:local-system`이 `sync:local-system` 시작 시 fail-fast한다. base-settings를 가진 각 레포를 per-repo로 검증하며, 이벤트별 단언(PreToolUse 매처·Stop 매처없음 등)은 해당 이벤트가 있을 때만 적용한다. 배포 후 `verifySettings`(claude 부분키)+`verifyJsonExact`(codex whole-file)로 대조한다.
- **codex trust**: 프로젝트-로컬 훅은 trusted여야 발화한다. best-effort로 `trustCodexHooks`를 시도하고, 실패 시 `/hooks` 수동 신뢰를 안내한다.
- 새 로컬 hook은 `local/base-settings.json`에 논리 항목을 추가하고 `local/hooks/`에 `.mjs`를 둔다(인라인 금지, 전역과 동일). `unsync`·가이드(`meta/guides/local-system.md`)·같은 커밋 문서 정합은 전역과 같은 규칙을 따른다.

## 로컬 자산 배포 (`local/<X>` → `.claude/<X>`·`.agents/<X>`)

settings/hooks를 제외한 repo-local 자산(스킬 등)은 claude·codex가 같은 내용을 쓰므로 타겟별 투영 없이 **동일 복사**한다. `sync:local-system`이 `local/` 하위 디렉토리(`hooks` 제외 — settings projection이 따로 투영)를 `.claude/<X>`와 `.agents/<X>` 양쪽으로 배포한다(`scripts/local-system/sync-local-skills.mjs`).

- 동일 복사의 예외 — **SKILL.md 배포본 렌더링**: 배포된 md는 소스와 아래가 다르다(`deploy-lib.mjs`의 `renderSkillMd`). 전역 `deploySkills`(`~/.claude`·`~/.codex`·`~/.gemini`)와 로컬 `sync:local-system`(`.claude/skills`·`.agents/skills`) 모두 적용되며, 검증도 렌더 결과 기준으로 대조한다(`compareSkillPaths`).
  - **`name` 주입** — frontmatter에 `name`이 없으면 폴더명을 넣는다. Antigravity는 `name`이 있어야 스킬을 인식한다(Claude는 폴더명으로 잡는다). 소스는 `name`을 직접 들고 있어도 되며, 이 주입은 빠진 경우의 안전망이다.
  - **경로 앵커 주입** — 본문 맨 앞에 그 스킬이 배포된 절대 경로를 한 줄 심는다. 스킬 본문의 상대 경로 링크를 풀려면 스킬 파일 위치를 알아야 하는데, Claude Code는 스킬 로드 시 그 경로를 대화에 넣어주고 Antigravity는 넣지 않는다. 그래서 같은 링크가 한쪽에서만 풀리고, 못 푼 쪽은 **에러 없이 그 지시가 없던 것처럼 진행**해 산출물을 봐야 드러난다. 배포 시점에는 타겟 경로가 확정돼 있으므로 배포가 대신 적어둔다.
  - 앵커는 SKILL.md만이 아니라 스킬 폴더의 모든 md에 붙되, 각자 자기 디렉토리를 가리킨다. 바깥으로 나가는 참조는 오히려 하위 파일에 몰려 있고 단계도 더 깊다. 예외는 `ANCHOR_EXCLUDED_DIRS` — `templates/`처럼 **사용자 문서로 복사되는 재료**는 앵커가 그 문서로 새어 나가므로 제외한다.
  - 렌더링은 **멱등이어야 한다** — 배포본에 다시 적용해도 같아야 sync가 "변경 없음"으로 수렴한다. `verify:skill-render`가 두 sync 진입점에서 fail-fast로 이 계약을 고정한다. 앵커 교체는 **본문 맨 앞에 고정**한다. 위치를 안 잡으면 본문이 그 마커를 인용할 때 그 대목이 조용히 지워지고, 멱등은 유지되므로 검증이 못 잡는다.

- **원본은 `local/<X>`**, `.claude/<X>`·`.agents/<X>`는 gitignore 산출물.
- 새 자산 종류를 추가하려면 `local/`에 디렉토리만 두면 된다 — sync가 일반 순회하므로 스크립트 수정 불필요. settings/hooks처럼 타겟별로 갈리는 자산만 projection 어댑터가 필요하다.
- `unsync`는 `.claude/<X>`·`.agents/<X>`를 카테고리 단위로 **통째 제거**한다 (동일성 비교 없이). 경로 자체가 AC가 만든 gitignore 산출물이므로, 원본에서 사라진 스킬(orphan)도 함께 청소되고 원본은 `local/`에 남아 re-sync로 복구된다 — 사용자 데이터 손실 위험이 없다. `AGENTS.md`·`GEMINI.md`는 `CLAUDE.md`(투영 원본)가 있는 레포에서만 제거한다(비-AC 레포의 사용자 `AGENTS.md` 보호).

## 스킬이 자기 폴더의 스크립트를 부를 때는 자리표시자를 쓴다

스킬 본문이 번들 스크립트를 실행하라고 할 때는 `{{skill_dir}}/<경로>`로 적는다. 배포가 그 스킬의 타겟 절대 경로로 채운다(`deploy-lib.mjs`의 `withSkillDirPath`, 검증은 `verify:skill-render`).

전역 스킬은 어느 레포에서 작업하다 불릴지 모른다. `node scripts/foo.mjs`처럼 적으면 그때의 작업 디렉토리가 기준이 돼, 같은 이름의 폴더를 가진 레포에서는 엉뚱한 곳을 뒤지다 실패한다(2026-08-09 `/backlog`가 이 모양으로 실패했고, 실행한 쪽은 "스킬이 없는 스크립트를 참조한다"고 오진했다). 맨 앞 앵커가 폴더 경로를 알려주긴 하지만 그건 모델이 읽고 이어붙여 주기를 기대하는 것이라, 배포가 직접 채워 기대할 일을 없앤다.

하위 md에 적어도 스킬 루트로 채워진다 — 앵커(자기 디렉토리)와 기준이 다르다. 실행 위치에 기대는 호출이 남아 있으면 `verify:skill-script-paths`가 배포 전에 끊는다. 로컬 스킬(`local/skills/`)은 그 레포 안에서만 돌아 자기 레포 상대경로가 맞으므로 이 검사 대상이 아니다.

스크립트가 다른 레포 소유면(그 레포 데이터만 다루는 도구면) 자리표시자가 아니라 그 레포에 두고 레포 경로로 부른다.

### 여러 스킬이 함께 쓰는 스크립트는 `{{contexts}}`로 부른다

한 스킬의 번들이 아니라 **여러 스킬이 공유하는** 스크립트는 `deploy/contexts/` 바로 아래 한 벌만 두고, 스킬 본문에서 `{{contexts}}/<파일>`로 부른다. 배포가 그 타겟의 contexts 절대 경로로 채운다(`deploy-lib.mjs`의 `withSkillContextsPath`, 검증은 `verify:skill-render`).

`{{skill_dir}}`은 자기 폴더 안만 가리킬 수 있어 이 경우를 못 덮는다. 그렇다고 소유자를 한 스킬로 정해 나머지가 그 폴더를 가리키면, 그 스킬을 옮기거나 지울 때 나머지가 조용히 깨진다.

- **전역 스킬**은 `<타겟>/skills/<이름>`에 깔리므로 contexts가 두 단계 위 형제다 — 배포가 스킬 경로에서 유도한다.
- **로컬 스킬**(`local/skills/`)은 레포 안 `.claude/skills/`·`.agents/skills/`에 깔리는데 contexts는 레포에 없다. 그래서 `sync-local-skills.mjs`가 그 에이전트의 전역 contexts(`.claude/`→`~/.claude/contexts`, `.agents/`→`~/.codex/contexts`)를 명시로 넘긴다. 유도에 맡기면 없는 경로(`<레포>/.claude/contexts`)가 채워진다.

특정 에이전트의 홈 경로를 본문에 직접 적지 않는다. 지금 이 기기에서는 `~/.claude`가 항상 깔려 있어 동작하지만, 그건 배포 구성에 기댄 우연이고 다른 에이전트를 가리키는 문서에 남으면 「어느 에이전트가 와도 동일하게 동작」이 깨진다.

## 규칙이 contexts를 가리킬 때는 자리표시자를 쓴다

`deploy/rules/`의 md가 contexts 파일을 가리킬 때는 `{{contexts}}/<파일>` 자리표시자로 적는다. 배포가 타겟 절대 경로로 채운다(`deploy-lib.mjs`의 `withContextsPath`, 검증은 `compareRulePaths`).

규칙은 타겟마다 사는 곳이 다르다 — claude·codex는 `rules/` 아래 파일이고, gemini는 rules 디렉토리 없이 `GEMINI.md`에 통째로 합쳐진다. 그래서 어떤 상대 경로를 적어도 세 타겟을 동시에 맞출 수 없다. 소스 기준 경로(`deploy/contexts/...`)를 적으면 **cwd가 AC일 때만 우연히 맞고 다른 레포에서는 Claude에서도 어긋난다.**

"AC의 어디를 고치는가"를 설명하는 표·산문은 자리표시자 대상이 아니다 — 그건 따라갈 경로가 아니라 AC 레포의 구조 설명이다.

## 배포 스크립트 변경 원칙

- `sync:*` 명령이 새 경로·파일·설정을 동기화하도록 바뀌면, 같은 대상의 `unsync:*` 명령도 함께 수정한다.
- 동기화와 제거는 같은 기준으로 검증한다. sync만 성공하고 unsync 후 잔여 파일이 남는 구조를 만들지 않는다.
- `sync:*` 명령은 반복 실행해도 중복·오염 없이 같은 상태로 수렴해야 한다.
- `sync:system`과 `sync:local-system`은 시작 시 `npm run verify:hooks`와 같은 기준으로 AC git hook 준비 상태를 확인한다. 새 AC worktree는 `git worktree add`·`EnterWorktree` 어느 쪽으로 만들어도 self-heal hook이 의존성을 설치한다. 훅 발동은 설정 등록이 보장하므로 self-heal은 편의일 뿐이고, 하네스 밖에서 만든 워크트리는 커밋 전에 `npm ci`를 실행한다.
- 새 설치·동기화 대상을 추가하면 같은 커밋에서 `sync:<target>`, `unsync:<target>`, `package.json`, `meta/guides/<target>.md`, `meta/guides/index.md`, `meta/INSTALLATION_GUIDE.md`의 안내를 함께 맞춘다.
- `unsync:*`는 AC가 만든 산출물만 제거해야 한다. 사용자 파일을 지울 가능성이 있으면 marker block, 상태 파일, 동일성 비교, 또는 경로가 AC 전유 산출물 위치임이 보장되는 경우(gitignore된 투영 대상 디렉토리) 중 하나로 AC 관리 여부를 확인한 뒤 제거한다.
- 새 `sync:*` 구현은 같은 명령을 2회 이상 실행하는 검증과, 대응 `unsync:*` 후 잔여 AC 산출물이 없는지 확인하는 검증을 포함한다.

### 메커니즘 계약 회귀 검증

멱등성·안전제거 메커니즘(`scripts/environment/environment-lib.mjs`)의 계약은 `npm run verify:environment`로 검증한다. 임시 디렉토리 + 버리는 테스트 레지스트리 키 샌드박스에서 sync/unsync가 쓰는 바로 그 함수를 돌려 로직 drift를 막는다.

| 구분 | 항목 |
|---|---|
| 검증함 | whole-file 멱등, 동일성 기반 제거(수정된 파일 보존), managed-block 멱등·선택 제거(주변 사용자 내용 보존), 레지스트리 set/query/delete 왕복 |
| 검증 못 함 (수동 영역) | 실제 `sync:environment` e2e(winget PS7 설치, 실프로필 탐지, "이미 다른 값이면 skip" 분기, 실레지스트리 채택), `unsync` 동반 수정 같은 사람 규율, 같은-커밋 문서 정합 |

새 메커니즘 함수를 추가하면 `verify-environment.mjs`에 그 계약 케이스를 추가한다.

## 배포 스크립트 관리

sync·unsync 스크립트의 동작이 바뀌면 `meta/guides/` 하위의 관련 가이드도 같이 최신화한다. 가이드는 AI 에이전트가 코드를 안 읽고 가이드만 보고 실행하는 것을 전제로 작성되어, 어긋나면 잘못된 결과로 이어진다.

## AC worktree hook 준비

- AC 훅은 **두 짝**으로 발동한다 — 추적되는 `.githooks` 파일(체크아웃에 항상 딸려옴) + 그것을 가리키는 git 설정 훅 등록(`.git/config` 공용이라 워크트리끼리 공유). 둘 다 워크트리를 어떻게 만들든 따라오므로 첫 커밋부터 훅이 돈다. "생성 순간 heal"에 의존하지 않는다.
- 등록은 `sync:environment`(전 레포 스윕)와 AC `prepare`(자기 레포)가 한다. **git 2.54 미만은 설정 훅을 조용히 무시하므로** 등록 전에 버전을 확인해 시끄럽게 끊는다(`scripts/lib/git-hooks.mjs`).
- 직후 PostToolUse self-heal hook(`post-worktree-install` / `post-enterworktree-install`)은 새 워크트리에 **의존성만** 설치한다(husky 셋업 복구는 더 이상 없다). 훅 발동은 `.githooks`가 구조적으로 보장하고, deps는 편의(DX)일 뿐이다 — deps가 없어도 훅은 fail-loud로 커밋을 막는다. self-heal은 하네스를 거친 생성에만 발동하므로, 맨 터미널에서 만든 워크트리는 그 안에서 `npm ci`를 직접 실행한다.
- 커밋 전 hook 상태가 의심되면 `npm run verify:hooks`를 실행한다. git 버전·`.githooks` 파일·설정 훅 등록·`commitlint` 실행 파일을 확인하고, 등록이 어긋나면 재등록으로 복구한다. `core.hooksPath`가 남아 있으면 파일 훅과 설정 훅이 둘 다 돌아 같은 검사가 두 번 실행되므로 이것도 어긋남으로 잡는다.

## deploy/hooks 검증 원칙

`deploy/hooks/`(또는 배포된 `~/.claude/hooks/`)의 정책 hook을 수정·검증할 때:

- **실제 명령으로 검증한다.** `echo '...' | node ~/.claude/hooks/<hook>.js`로 hook을 직접 호출하면 hook 내부 코드 경로만 확인되고 PreToolUse/PostToolUse 발동 여부와는 무관하다. Claude Code의 Bash·Write·SendMessage 도구로 실제 명령을 실행해 hook이 차단·통과하는지 확인한다.
- **위험 케이스도 안전한 시나리오를 설계해서 실제 명령으로 검증한다.**
  - force push deny: 임시 커밋 만들고 실제 `git push --force-with-lease` 시도 → hook deny 확인 → `git reset --soft HEAD~1` + unstage + 파일 삭제로 정리
  - chained 우회(`reset && push --force`) deny: 한 명령에 history rewrite(reset --soft/--mixed/--hard·rebase·cherry-pick·commit --amend)와 force push가 함께 들어오면 deny — 이 룰은 git 상태와 무관한 정적 패턴 매칭이라 hook 직접 호출(child_process로 payload 주입)로 결정 로직을 완전히 검증할 수 있다 (force push diff 가드와 달리 PreToolUse 타이밍 갭이 없음)
  - SendMessage `shutdown_request` deny: 이름 지정 Agent spawn 후 실제 `SendMessage` 호출 → hook deny 확인
- **"검증 안 됨", "안전한 시뮬 어려움" 같은 회피 결론을 보고에 쓰지 않는다.** 회피 보고를 내기 전에 안전한 실제 명령 시나리오를 한 번 더 고민한다.
- **검증용 임시 산출물(파일·커밋·팀·디버그 로그·임시 브랜치)은 같은 세션에서 즉시 정리한다.** 사용자에게 보고하기 전에 cleanup 완료.
- **메인 워크트리에서 검증 작업을 수행하지 않는다.** fix 워크트리 또는 별도 임시 디렉토리에서 진행한다. 부득이한 경우(예: PostToolUse Write의 워크트리별 cwd 분기 검증) 즉시 삭제하고 사용자에게 사전 고지한다.

## settings.json hook 작성 위치

`~/.claude/settings.json`(또는 프로젝트 settings.json)의 PreToolUse / PostToolUse hook은 인라인 명령으로 작성하지 않는다. 항상 별도 `.js` 파일로 분리하고 settings.json에는 `node -e "require('...')"` 형태로 require만 등록한다.

- 인라인은 디버그 로깅·점진 수정·라인 번호 추적이 어렵고, 패치 시 편집 단위가 settings.json 전체가 되어 hook 코드만 독립 검증할 수 없다.
- 분리된 `.js`는 Read / Edit / 검증을 hook 단위로 처리할 수 있다.
- AC `deploy/hooks/`에 원본을 두고 `npm run sync:system`으로 `~/.claude/hooks/`에 배포하는 패턴을 따른다.
