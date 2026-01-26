# React 컴포넌트 작성 패턴

> **설계 원칙 참고:** [Component Design Patterns](design.md) - 기본값 설정, 전역 상태 관리, 이벤트 리스너 등 설계 철학

## 모달 / 오버레이 구현 규칙

모달이나 다이얼로그를 띄울 때는 컴포넌트 내부 상태(`useState`)가 아닌 **`overlay-kit`** 라이브러리를 사용해야 합니다.

### 원칙
- **❌ Bad**: `useState` boolean 값으로 모달의 표시 여부를 제어하는 방식. (부모 컴포넌트 로직 오염)
- **✅ Good**: `overlay-kit`을 사용하여 핸들러 내부에서 명령형으로 모달을 호출.
