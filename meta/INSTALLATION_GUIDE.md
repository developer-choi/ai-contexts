# Installation Guide

> 이 가이드는 AI 에이전트가 읽고 따라 실행하는 것을 전제로 작성되었습니다.

## 프롬프트 가져가기

레포: https://github.com/langdy/ai-contexts

`deploy/` 폴더가 배포 소스입니다. 필요한 파일을 여기서 가져가세요.

> 현재 컴퓨터간 프롬프트 공유방법은 간단하게 마무리 해놓고, 공유 할 프롬프트 위주로 업데이트하고있는 단계여서 그렇습니다. 

## 배포 (현재: 복사 방식)

### 갱신

```bash
npm run update
```

접두사와 타겟 경로를 대화형으로 물어봅니다. 타겟 경로 기본값은 `~/.claude`입니다.

- `rules/`, `skills/`는 접두사가 붙고, `contexts/`는 접두사 없이 복사됩니다.
- skills 복사 시 `~/.config/opencode/commands/`에 OpenCode 슬래시 커맨드도 자동 생성됩니다.

인자를 직접 지정할 수도 있습니다: `npm run update -- <타겟>`

### 언인스톨

```bash
npm run uninstall
```

접두사와 타겟 경로를 대화형으로 물어봅니다. 해당 접두사로 시작하는 파일/폴더만 삭제하며, 개인 파일은 건드리지 않습니다. OpenCode commands도 함께 제거됩니다.
