# MARKUP — 개인 모드

figma가 없고 사용자가 디자인을 직접 정의하는 모드. 화면 코드(`.tsx`) 자체가 디자인 원천이다. 공통 절차는 [index.md](index.md), 본 파일은 개인 모드 고유 부분만 담는다.

## 재료

- 사용자와 함께 정의한 기획 md(`page.md`/`global.md`) + 디자인시스템 소스. figma 없음

## 진실검사 A — 사용자 시각 확인

Lead가 렌더 결과를 사용자에게 보여주고 승인받는다(사람 오라클). 자동 Reviewer↔구현자 루프는 규칙검사 B(코딩 스탠다드)만 수렴시키고, **디자인 충실도는 사용자 승인이 종료 조건**이다. (사용자 발화 = 진실 원천, SKILL.md 「검증 기준 = 진실 원천」.)

엄격한 픽셀 대조가 아니다 — 사용자가 스펙을 작성·승인한 주체이고 진행 중 바꿀 수 있으므로, 디자인 충실도는 사용자 시각 승인으로 수렴한다.

## Markup Implementer 지침

figma 대조 지침([figma.md](figma.md)) 미적용. 공동 정의 기획 md의 의도대로 화면을 짜고, 토큰은 디자인시스템 소스에서 가져온다. 완성 후 Lead가 사용자 시각 확인을 받는다(진실검사 A).

### 디자인시스템 스타일 수치 — simplified radix 직접 대조

MP `packages/design-system` 컴포넌트를 신설하거나 스타일 수치를 정할 때, 로컬 simplified 레포 `~/WebstormProjects/simplify/simplified-radix-ui-themes/packages/radix-ui-themes/src/components/*.css`에서 해당 컴포넌트의 패딩·높이·radius·font-weight·gap을 직접 읽고 매핑한다. GitHub 원본이 아니라 simplified 레포가 기준이다.

- 토큰 스케일 밖 중간값이 필요한 자리에서 가장 가까운 토큰 조합으로 근사하지 않는다 — `calc()`나 로컬 커스텀 프로퍼티로 radix 수치를 그대로 재현한다. (근사 출하 사고 사례: Badge 세로 패딩 0)
- 산출물에는 대조한 radix css의 수치 인용 흔적을 남긴다.

## 산출물 입력

공동 정의 기획 md (figma 없음)
