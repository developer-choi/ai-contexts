# verify-skill-purpose.mjs 사용법

`node scripts/verify/verify-skill-purpose.mjs [--local]` 또는 `npm run verify:skill-purpose` — ai-contexts 레포 루트 기준 경로다.

## 인자

- 없음 — AC 자신의 `plugins/ac/skills`·`local/skills` 아래 `SKILL.md`를 본다
- `--local` 배포가 닿는 모든 레포(`~/WebstormProjects/main`·`~/WebstormProjects/my-else`의 직속 git 레포)의 `local/skills`를 본다. AC 자신의 `plugins/ac/skills`는 안 본다

그 밖의 인자는 읽지 않는다.

## 출력

- 모두 「## 목적」 헤딩이 있으면 stdout에 `SKILL.md N개 모두 「## 목적」 보유`, exit 0
- 없는 것이 있으면 stderr에 `「## 목적」이 없는 SKILL.md:` 아래 파일마다 경로(레포 부모 폴더 기준), 끝에 목적을 적고 다시 실행하라는 안내, exit 1
