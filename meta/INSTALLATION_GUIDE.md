# Installation Guide

이 문서는 AC를 새 머신이나 새 작업 환경(Claude Code 런타임)에 맞출 때의 진입점입니다.

## 새 머신 초기화

```bash
npm ci
npm run sync:environment
npm run sync:system
npm run sync:local-system
```

`plugins/ac/`의 스킬은 sync가 아니라 Claude Code plugin으로 설치합니다. 아래 두 명령을 기기마다 한 번 실행합니다.

```bash
claude plugin marketplace add ~/WebstormProjects/main/ai-contexts
claude plugin install ac@ac
```

## 평소 갱신

전역 에이전트 규칙·hook을 갱신할 때는 시스템 자산만 다시 동기화합니다. 스킬(`plugins/ac/`)은 원본을 고치면 다음 세션에 바로 반영됩니다.

```bash
npm run sync:system
```

git 검사 훅 스크립트를 고쳤으면 `npm run sync:environment`로 갱신합니다(원본 위치는 [ai-config-locations.md](../deploy/contexts/ai-config-locations.md)).

프로젝트 로컬 산출물(로컬 스킬 + AC settings/hooks)까지 맞출 때는 로컬 시스템 동기화를 함께 실행합니다.

```bash
npm run sync:local-system
```

## 제거

각 동기화 명령에는 대응 제거 명령이 있습니다.

```bash
npm run unsync:environment
npm run unsync:system
npm run unsync:local-system
```

## 상세 가이드

[가이드 인덱스](guides/index.md)에서 대상별 가이드로 이어집니다.
