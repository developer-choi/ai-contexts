# Installation Guide

이 문서는 AC를 새 머신이나 새 작업 환경(Claude Code 런타임)에 맞출 때의 진입점입니다.

## 새 머신 초기화

`plugins/ac/`의 스킬·hook·contexts는 sync가 아니라 Claude Code plugin으로 설치합니다. `sync:system`이 이 plugin이 없으면 실패하므로, 기기마다 먼저 한 번 실행합니다.

```bash
claude plugin marketplace add ~/WebstormProjects/main/ai-contexts
claude plugin install ac@ac
```

```bash
npm ci
npm run sync:environment
npm run sync:system
npm run sync:local-system
```

## 평소 갱신

무엇을 고쳤을 때 다시 동기화하는지는 [ai-config-locations.md](../plugins/ac/contexts/ai-config-locations.md)의 반영 명령 칸을 따릅니다.

프로젝트 로컬 산출물(로컬 스킬 + AC settings/hooks)을 맞출 때는 로컬 시스템 동기화를 실행합니다.

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
