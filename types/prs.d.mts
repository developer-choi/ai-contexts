// workflow 스킬의 PR 진행 상태 파일(`<plan>/background/persistent/prs.json`)의 꼴.
// 이 파일은 deploy/ 밖이라 배포되지 않는다 — 타입만 두고 실행 코드는 두지 않는다(가져다 쓰는 쪽은 `import type`·JSDoc `import()`만 쓴다).

/** 진행 단계. 뒤로 가지 않는다. */
export type Stage = 'confirmed' | 'consumed' | 'realized';

export interface Pr {
  n: number;
  name: string;
  /** `conventions/pr-types/*.md` 파일 이름의 대문자. 미기록이면 null */
  type: string | null;
  /** 선행 PR 번호 */
  deps: number[];
  stage: Stage;
  /** realize-plan이 기록한다. branch와 base는 함께 있다 */
  branch?: string;
  base?: string;
}

export interface PrsFile {
  prs: Pr[];
}
