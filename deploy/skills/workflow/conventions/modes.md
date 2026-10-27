# 모드 매트릭스 — 디자인 원본·대조 방법 SSOT

워크플로우 모드별로 갈리는 **디자인 원본·대조 방법**(MARKUP·verify 시각 대조)의 단일 출처.

세션 진입 조건·후속은 각 step frontmatter가 소유한다 — 본 문서는 **디자인 원본·대조 방법 축만** 다룬다.

| 모드 | 디자인 원본 | [requirement 「자료 받기」](../steps/requirement.md#자료-받기) 저장 위치 | MARKUP 대조 방법 |
|---|---|---|---|
| 채용·실무 | figma (`retained/figma-url.md`가 없으면 캡처) | `retained/figma-url.md`(figma 있을 때)·`retained/figma/` | figma 원본 직접 fetch·대조 (figma 없으면 캡처 대조) |
| 개인 | 마크업 시안 (형태 무관 — HTML/CSS·`.tsx`+`.scss` 등) | `retained/mockup/` (+선택 `retained/spec.md`) | 시안 대조 + 사용자 시각 확인 |
| 코드 대용 (모드 무관) | 기존 구현 코드 | `retained/code-target.md` | MARKUP 없음 — 기존 코드가 이미 화면이다 |

## 검증 기준 — figma 원본(없으면 캡처) 대조

Figma Reviewer와 PR 시각 대조를 하는 사용자는 `background/retained/figma-url.md`의 URL로 figma 원본을 직접 fetch해 코드와 대조한다.
figma가 없으면 둘 다 `background/retained/figma/`의 캡처를 렌더 결과와 대조한다.
매칭표는 검증 기준 아님 (SKILL.md 「진행 중」).

figma 부모 노드를 코드와 대조할 때, 코드 쪽에서 별도 파일로 분리된 자식 컴포넌트(`import`)는 그 파일을 직접 열어 figma의 인라인 마크업과 끝까지 대조한다.

## 세션 절차 (모드별 상세)

- **figma 쓰는 모드**: [../steps/markup/figma.md](../steps/markup/figma.md)
- **개인 모드**: [../steps/markup/personal.md](../steps/markup/personal.md)
