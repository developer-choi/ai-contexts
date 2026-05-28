# MARKUP

전 페이지 markup 생성. PR에 안 들어감 (PR_{N}_IMPL이 페이지 단위로 코드 가져감).

## [CRITICAL] 메인 작업

**메인 작업은 markup 워크트리에서 마크업 코드(`.tsx`, `.module.scss`) 작성**. figma 자료 누적은 그 입력 단계일 뿐 — 자료 누적이 끝났다고 세션이 끝난 게 아니다.

세션 종료 조건: **`background/consumable/project.md`의 모든 페이지·도메인 컴포넌트가 markup 워크트리에 마크업으로 존재**. 자가 검토 시 project.md의 PR별 컴포넌트 목록과 markup 워크트리의 실제 파일을 1:1 대조해 누락 0건일 때만 종료.

## 진입 조건

- (채용) FOUNDATION 단계 4 종료 후
- (실무) BG.step-1.1 후

## spawn 직후 첫 메시지

사용자에게 다음을 안내한다 — 페이지·섹션·위젯·컴포넌트 어느 단위든 피그마 자료 (URL·캡처 이미지)를 **최대한 많이** 따서 누적. 컴포넌트는 추상화 레벨 다양 (atoms·molecules·widget 등).

사용자가 전달할 때마다 LLM은 **"이 컴포넌트 이름이 뭐예요?"** 묻기 (매번 인터랙션).

자료 누적이 끝나면 markup 워크트리로 이동하여 마크업 코드 작성 단계로 진입한다.

## 산출물 형태

- **markup 워크트리의 `.tsx` / `.module.scss` 코드** (메인 산출물 — project.md의 모든 페이지·도메인 컴포넌트)
- `background/retained/figma-url.md` — `[이름] - [URL]` 쌍 누적 (마크업 작성의 입력)
- `background/retained/figma/[meaningful-name].[이미지확장자]` — 캡처 이미지 (마크업 작성의 입력)

## 포트 룰

마크업 세션 = **포트 3000 점유**. /workflow 시작 시 사용자에게 안내.
