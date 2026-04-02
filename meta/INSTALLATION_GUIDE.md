# Installation Guide

> 이 가이드는 AI 에이전트가 읽고 따라 실행하는 것을 전제로 작성되었습니다.

## 프롬프트 가져가기

레포: https://github.com/developer-choi/ai-contexts

`deploy/` 폴더가 배포 소스입니다. 필요한 파일을 여기서 가져가세요.

> 현재 컴퓨터간 프롬프트 공유방법은 간단하게 마무리 해놓고, 공유 할 프롬프트 위주로 업데이트하고있는 단계여서 그렇습니다. 

## 배포 (현재: 복사 방식)

### 갱신

```bash
npm run update
```

타겟 경로를 대화형으로 물어봅니다. 기본값은 `~/.claude`입니다.

1. 기존 배포 파일을 삭제 (`uninstall` 자동 실행)
2. `deploy/`의 `rules/`, `skills/`, `contexts/`를 타겟에 복사
3. `deploy/settings.json`이 있으면 타겟의 `settings.json`에 병합
4. skills 기반으로 `~/.config/opencode/commands/`에 OpenCode 슬래시 커맨드 자동 생성
5. 복사 결과 검증

인자를 직접 지정할 수도 있습니다: `npm run update -- <타겟>`

### 언인스톨

```bash
npm run uninstall
```

타겟 경로를 대화형으로 물어봅니다. `deploy/`에 존재하는 파일과 이름이 일치하는 항목만 삭제합니다. 개인 파일은 건드리지 않습니다. OpenCode commands도 함께 제거됩니다.
