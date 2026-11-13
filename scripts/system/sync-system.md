# sync-system.mjs 사용법

`node scripts/system/sync-system.mjs [<타겟 폴더>]` 또는 `npm run sync:system` — ai-contexts 레포 루트 기준 경로다.

`deploy/`의 contexts·스킬·hook·루트 파일과 병합한 `settings.json`을 타겟에 배포하고, 원본과 같은지 검증한다. 내용이 바뀐 파일만 쓰고 원본에서 사라진 파일은 지운다. `deploy/CLAUDE.md`·`deploy/rules/`는 복사 대신 타겟 `CLAUDE.md`의 `@` import로 읽힌다([system.md](../../meta/guides/system.md)). 인자 없이 실행해도 배포가 일어난다.

## 인자

- `<타겟 폴더>` 배포할 곳. `~`로 시작하면 홈으로 푼다. 생략하면 `~/.claude`
  - 규칙 본문의 contexts 경로는 `~/.claude/contexts/`로 고정이라, 다른 타겟 폴더에 배포하면 규칙이 그 타겟의 contexts를 가리키지 않는다

## 실행 전 확인

배포 전에 `VERIFY_STEPS`에 적힌 `scripts/settings`·`scripts/verify` 아래 검증 스크립트를 돌리고 AC git 훅 준비 상태를 확인한다.
하나라도 실패하면 배포하지 않고 exit 1.

## 출력

- `소스:`·`타겟:` 다음에 배포한 파일 줄, `변경 없음` 또는 `바뀐 파일: N개`
- `검증 중...` 아래 항목마다 `PASS`·`FAIL`. 끝에 `검증 완료: 모두 정상` 또는 stderr `검증 실패: N개 항목 확인 필요`

## exit code

검증(배포 전·배포 후) 중 하나라도 실패하거나 배포 중 오류가 발생하면 1, 아니면 0.
