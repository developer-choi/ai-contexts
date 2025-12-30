# Component 상세 명세 템플릿

컴포넌트 개발 스펙 작성 시 아래 항목들을 빠짐없이 작성하세요.

## 1. Props Interface
컴포넌트의 Props 타입을 정의합니다.

### 예시
```typescript
interface ComponentNameProps {
  title: string;
  isVisible: boolean;
  onClose: () => void;
}
```

## 2. 상태 (States)
각 상태별 UI가 어떻게 달라지는지 정의하세요.

### 예시
- **Normal**: 기본 상태
- **Loading**: 데이터 로딩 중 (Skeleton, Spinner 등)
- **Error**: 에러 발생 시 (Toast, Fallback UI 등)
- **Empty**: 데이터가 없을 때 (EmptyContent 컴포넌트 사용 등)

## 3. 스타일링 & 엣지 케이스
해당 컴포넌트의 디자인 디테일 및 예외 상황에 대한 처리를 정의하세요.

### 예시
- **텍스트 오버플로우**: 텍스트가 길어질 경우 (줄바꿈 vs 말줄임표 `...`)
- **이미지 에러**: 이미지가 로드되지 않았을 때 (Fallback 이미지 등)
- **반응형 동작**: 모바일/데스크탑에서의 레이아웃 변화

## 4. 테스트 케이스
UI 및 인터랙션 검증을 위한 체크리스트를 작성합니다.

### 예시
- [ ] Props 데이터가 화면에 정상적으로 렌더링되는지 확인
- [ ] 버튼 클릭 등 사용자 이벤트 핸들러가 정상 호출되는지 확인
- [ ] Loading, Error, Empty 상태일 때 적절한 UI가 노출되는지 확인
- [ ] (필요 시) 키보드 접근성 및 스크린리더 인식 확인
