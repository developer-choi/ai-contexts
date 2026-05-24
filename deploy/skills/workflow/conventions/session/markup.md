# MARKUP

전 페이지 markup 생성. PR에 안 들어감 (PR_{N}_IMPL이 페이지 단위로 코드 가져감).

## 진입 조건

- (채용) FOUNDATION 단계 4 종료 후
- (실무) BG.step-1.1 후

## spawn 직후 첫 메시지

사용자에게 다음을 안내한다 — 페이지·섹션·위젯·컴포넌트 어느 단위든 피그마 자료 (URL·캡처 이미지)를 **최대한 많이** 따서 누적. 컴포넌트는 추상화 레벨 다양 (atoms·molecules·widget 등).

사용자가 전달할 때마다 LLM은 **"이 컴포넌트 이름이 뭐예요?"** 묻기 (매번 인터랙션).

## 산출물 형태

- `background/retained/figma-url.md` — `[이름] - [URL]` 쌍 누적
- `background/retained/figma/[meaningful-name].[이미지확장자]` — 캡처 이미지

## 포트 룰

마크업 세션 = **포트 3000 점유**. /workflow 시작 시 사용자에게 안내.
