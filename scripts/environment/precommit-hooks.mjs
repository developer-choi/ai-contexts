import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

// AC가 기기 전역에 얹는 pre-commit 검사 훅 목록. 원본은 AC `scripts/hooks/`에 두고
// `~/.ai-contexts/`에 그대로 복사한다 — 도구 중립적인 폴더라 Claude Code 설치 여부와 무관하게
// 살아 있어야 하는 git 훅에 맞다.
//
// 목록을 sync·unsync 어느 쪽도 아닌 제3의 파일에 두는 이유: 훅을 하나 더 얹을 때 양쪽에 같은
// 상수와 같은 모양의 함수를 각각 더하게 되고, 한쪽만 더하면 `unsync:environment`가 그 훅을
// 안 걷어 등록이 남는다. 표 하나를 양쪽이 함께 읽으면 그 어긋남이 원리적으로 안 생긴다.
//
// `alias`·`stateKey`는 이미 배포된 기기의 등록·상태 파일과 맞물려 있으므로 바꾸지 않는다 —
// 바꾸면 옛 이름으로 등록된 훅이 unsync 대상에서 빠져 영영 남는다.
export const PRECOMMIT_HOOKS = [
  {
    alias: 'count-hardcode',
    file: 'check-count-hardcoding.mjs',
    label: '개수 하드코딩 검사 훅',
    stateKey: 'countHardcodingHookSetByAiContexts',
  },
  {
    alias: 'coupling-patterns',
    file: 'check-coupling-patterns.mjs',
    label: '짝꿍 등록부 검사 훅',
    stateKey: 'couplingPatternsHookSetByAiContexts',
  },
  {
    alias: 'md-size',
    file: 'check-md-size.mjs',
    label: '문서 크기 검사 훅',
    stateKey: 'mdSizeHookSetByAiContexts',
  },
];

const hooksDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'hooks');
const stateDir = path.join(os.homedir(), '.ai-contexts');

export function precommitHookSrc(hook) {
  return path.join(hooksDir, hook.file);
}

export function precommitHookDest(hook) {
  return path.join(stateDir, hook.file);
}
