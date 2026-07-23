# 모드 매트릭스 — 시각 원본·진실검사 SSOT

워크플로우 모드별로 갈리는 **시각 진실 원천·`markup.md` 생성·MARKUP 진실검사**의 단일 출처. 이 축을 산문으로 재서술하는 대신 여기를 참조한다.

모드의 정의·세션 진입 조건·도미노 배선은 `SKILL.md` 「세션」 표가 소유한다 — 본 문서는 그 위에서 **시각/진실검사 축만** 다룬다(진입 조건을 여기에 복제하지 않는다).

| 모드 | 시각 진실 원천 | step-1.1 저장 위치 | `markup.md` (Figma 원본 링크 인덱스) | MARKUP 진실검사 |
|---|---|---|---|---|
| 채용 | figma | `retained/figma-url.md`·`retained/figma/` | ○ 생성 (UI 컴포넌트 PR) | figma 원본 직접 fetch·대조 |
| 실무 | figma | `retained/figma-url.md`·`retained/figma/` | ○ 생성 (UI 컴포넌트 PR) | figma 원본 직접 fetch·대조 |
| 개인 | 마크업 시안 (형태 무관 — HTML/CSS·`.tsx`+`.scss` 등) | `retained/mockup/` (+선택 `retained/spec.md`) | ✗ 미생성 (figma 없어 「Figma 원본 링크 인덱스」 불성립) | 시안 대조 + 사용자 시각 확인 |

## 축의 파생 관계

- **`markup.md` 생성 여부는 시각 원본에서 파생**한다 — figma를 쓰는 모드만 「Figma 원본 링크 인덱스」가 성립해 생성하고, figma가 없는 모드는 생성하지 않는다. 그래서 표는 "figma 쓰는 모드 / figma 없는 모드"의 2분면으로 읽어도 된다(현재 채용·실무 = 전자, 개인 = 후자).
- **진실검사도 시각 원본에서 파생**한다 — figma가 있으면 원본을 직접 fetch해 대조하고, 없으면 시안 대조 + 사용자 시각 확인으로 대체한다.

## 세션 절차 (모드별 상세)

- **figma 쓰는 모드**: [session/markup/figma.md](session/markup/figma.md)
- **figma 없는 모드**: [session/markup/personal.md](session/markup/personal.md)
- **시각 원본 진입 문서 (모드 무관 단일 진입점)**: [artifact/design-root.md](artifact/design-root.md)
