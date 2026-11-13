# sync-system.mjs 사용법

`node scripts/system/sync-system.mjs [<타겟 폴더>]` 또는 `npm run sync:system` — ai-contexts 레포 루트 기준 경로다.

무엇을 만들고 검증하는지는 [system 가이드의 수행 작업](../../meta/guides/system.md#수행-작업)이 정본이다.

## 인자

- `<타겟 폴더>` 배포할 곳. `~`로 시작하면 홈으로 푼다. 생략하면 `~/.claude`

## 실행 전 확인

배포 전에 `VERIFY_STEPS`의 검증 스크립트를 돌리고 AC git 훅 준비 상태를 확인한다.
하나라도 실패하면 배포하지 않고 exit 1.

## 출력

- `소스:`·`타겟:` 다음에 배포한 파일 줄, `변경 없음` 또는 `바뀐 파일: N개`
- `검증 중...` 아래 항목마다 `PASS`·`FAIL`. 끝에 `검증 완료: 모두 정상` 또는 stderr `검증 실패: N개 항목 확인 필요`

## exit code

검증(배포 전·배포 후) 중 하나라도 실패하거나 배포 중 오류가 발생하면 1, 아니면 0.
