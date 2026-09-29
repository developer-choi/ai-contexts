# markup.md 컨벤션

`/plan/pr{N}/retained/markup.md`의 책임·필수 절 양식·검증 기준 단일 출처.

## 책임·위치

UI 컴포넌트가 있는 PR이면 `pr{N}/retained/` 하위에 필수 생성한다. 그 외 PR은 생성하지 않는다.

**모드별 생성 여부·시각 원본·진실검사는 [modes.md](../modes.md) 매트릭스가 단일 출처다.**

담는 내용: 「Figma 원본 링크 인덱스」 절(사용자 입력) + 토큰 매핑표·매칭표. 코드 블록 없음 (링크·도표만). "IMPL이 채울 figma 항목" 류 체크리스트를 두지 않는다.

## 기록 시점 — Background 단계 보류

Background 단계(requirement-review 등) 산출물에는 CSS·레이아웃 수준 값을 기록하지 않는다. 구현 방침이 정해진 뒤 markup.md에 일괄 정리.

## 「Figma 원본 링크 인덱스」 절

markup.md 상단에 필수. **컴포넌트 종류별 × 상태별로 figma 원본 URL을 사용자가 직접 입력**한다. AI가 추론으로 URL을 짐작해 박지 않는다.

## 검증 기준 — figma 원본 직접 fetch

Figma Reviewer는 `background/retained/figma-url.md`의 URL로, PR 시각 대조를 하는 사용자는 「Figma 원본 링크 인덱스」 절의 URL로 figma 원본을 직접 fetch해 코드와 대조한다. 매칭표는 검증 기준 아님 (SKILL.md 「진행 중」).

figma 부모 노드를 코드와 대조할 때, 코드 쪽에서 별도 파일로 분리된 자식 컴포넌트(`import`)는 그 파일을 직접 열어 figma의 인라인 마크업과 끝까지 대조한다.
