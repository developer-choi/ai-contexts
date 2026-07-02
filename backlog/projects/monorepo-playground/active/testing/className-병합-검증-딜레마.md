---
target:
  - monorepo-playground/docs/patterns/testing/TestsWeAvoid.md
  - monorepo-playground/docs/patterns/testing/TestWriting.md
---

# className→루트 병합 검증 — 결론 + 잔여

> MP = `~/WebstormProjects/main/monorepo-playground`
> 발생: PR2(2026-06-16). 결론: PR3 토론(2026-06-19).

## 결론 (PR3 토론에서 확정)

**소비자 className이 컴포넌트 루트 element에 병합되는지 컴포넌트(파트)마다 유닛으로 검증한다. role·clsx·쿼리방법과 무관한 보편 원칙.**

근거:
- 공개 계약(소비자 스타일 커스텀 통로), silent하게 깨짐, 잡는 다른 그물 0.
- **그물 0 검증**: design-system `*.stories.tsx`에 custom className 전달 시각 스토리 0건(grep) → Chromatic 미검출. 타입·typed-scss도 못 잡음.
- **라이브러리 조사**: 스타일드(MUI)는 `describeConformance.testClassName`으로 보편 검증, 헤드리스(radix: primitives 15테스트·themes 0)는 미검증. MP는 스타일드 → MUI 쪽.
  - MUI v4 코드: https://github.com/mui/material-ui/blob/e9eb2df4dc87707f47f5383976e9ec7ec6510678/packages/material-ui/src/test-utils/describeConformance.js
  - 현행: `@mui/internal-test-utils` (https://github.com/mui/material-ui/tree/master/packages-internal/test-utils)

**기각된 과거 방향**: "role 없으면 시각 계약이라 Chromatic이 잡으니 유닛 제외" — 전제("Chromatic이 잡는다")가 net-check로 거짓 확정 → 폐기. role 유무는 "테스트 가치"가 아니라 "루트 잡는 쿼리"의 문제일 뿐.

**PR3 구현**: 공유 헬퍼 `itMergesClassNameToRoot`(MUI `testClassName` 축소판). 단언 공유, 루트 잡기 주입(text→getByText / role→getByRole / role·텍스트 없는 루트→`container.firstChild`).

## 잔여 작업

1. **role·텍스트 둘 다 없는 루트의 쿼리 일반화**: PR3는 Table.Root만 `container.firstChild` escape-hatch로 처리. 많은 컴포넌트에 적용하려면 통일된 방법 필요 — 후보: (a) 컴포넌트가 ref를 루트로 forward → `ref`로 잡기(MUI식, 단 컴포넌트 소스 변경), (b) `data-testid` 주입(getByRole 우선 컨벤션과 상충). 결정 필요.
2. **PR2 InputBase·Checkbox 재방문**: className이 바깥 `<label>`(role·텍스트 없음)에 붙어 PR2에서 제외했음 — 위 결론대로면 검증 대상. 1번 결정 후 추가.
3. **컨벤션 문구 보강**(target): `TestsWeAvoid.md`의 "className 컴포넌트당 하나 테스트"에 "role 유무 무관, 루트 element 기준" 명확화 + role 없는 루트의 쿼리 가이드. (`className-병합-검증-딜레마`라는 "딜레마"는 해소됨 — 필요성은 확정, 쿼리만 남음.)

## 관련 1차 소스

- 컨벤션: `MP/docs/patterns/testing/{WhatToTest,TestsWeAvoid,TestWriting}.md`
- PR3 헬퍼: `MP/packages/design-system/src/test-utils/test-class-name.ts`
- 관련 결정: `MP/docs/decisions/inputbase-책임-범위.md`
- 관련 백로그: `design-system/typed-scss-modules.md`
