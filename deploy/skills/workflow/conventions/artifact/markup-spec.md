# markup.md 컨벤션

`/plan/pr{N}/retained/markup.md`의 책임·필수 절 양식·검증 기준 단일 출처.

## 책임·위치

UI 컴포넌트가 있는 PR이면 `pr{N}/retained/` 하위에 필수 생성. 그 외 PR은 생성하지 않는다.

담는 내용: 「Figma 원본 링크 인덱스」 절(사용자 입력) + 토큰 매핑표·매칭표 + 「IMPL 시점 Figma 확인 체크리스트」 절. 코드 블록 없음 (링크·도표·체크리스트만).

## 기록 시점 — Background 단계 보류

Background 단계(requirement-review 등) 산출물에는 CSS·레이아웃 수준 값(높이, 색상 토큰, 타이포그래피, 정렬)을 기록하지 않는다. Step 4 구현 방침 단계까지 보류한 뒤 markup.md에 일괄 정리.

## 「Figma 원본 링크 인덱스」 절

markup.md 상단에 필수. **컴포넌트 종류별 × 상태별로 figma 원본 URL을 사용자가 직접 입력**한다. AI가 추론으로 URL을 짐작해 박지 않는다 — 누락·오류 위험.

```markdown
## Figma 원본 링크 인덱스

### Button
- default: https://...
- hover: https://...
- disabled: https://...

### Card
- default: https://...
- selected: https://...
```

작성 절차:

1. AI가 본 PR이 만들 컴포넌트 종류와 각 컴포넌트의 가능 상태를 목록으로 추출해 사용자에게 제시
2. 사용자가 각 항목에 figma URL을 입력 (또는 N/A — 해당 상태가 figma에 없으면)
3. 누락된 항목이 있으면 사용자에게 보강 요청. 추측 입력 금지

## 「IMPL 시점 Figma 확인 체크리스트」 절

markup.md에 필수. 각 `.module.scss` 파일별 sub-heading + 체크박스로 IMPL이 채울 항목 명시.

```markdown
## IMPL 시점 Figma 확인 체크리스트

IMPL 세션이 scss를 채울 때 Figma에서 직접 추출해야 할 항목. stub은 layout 구조 + placeholder 주석만 두고 IMPL이 1:1로 채운다.

### `X.module.scss`

- [ ] 컨테이너: padding, border, border-radius, background, shadow
- [ ] 자식 요소 간 gap·여백
- [ ] 폰트 크기·weight·color (label vs value 시각적 위계)
- [ ] 상태별 분기 (예: status='error' 시 색상)
```

체크리스트가 약하면 IMPL이 추측하므로 PLAN 단계에서 컴포넌트별로 모든 채울 항목을 명시.

## 검증 기준 — figma 원본 직접 fetch

Implementer·Reviewer는 「Figma 원본 링크 인덱스」 절의 URL로 figma 원본을 직접 fetch해 코드와 대조한다. 매칭표는 컨텍스트 보조이며 검증 기준 아님 (SKILL.md 「검증 기준 = 진실 원천」).

figma 부모 노드를 코드와 대조할 때, 코드 쪽에서 별도 파일로 분리된 자식 컴포넌트(`import`)는 그 파일을 직접 열어 figma의 인라인 마크업과 끝까지 대조한다. "별도 파일이라 따로 대조한다"며 미루지 않는다 — figma 부모 노드 1건의 대조 단위 = 코드 부모 파일 + 그 부모가 import하는 모든 자식 컴포넌트 파일의 합이다.
