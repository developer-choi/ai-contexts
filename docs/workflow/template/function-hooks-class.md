# Function / Hooks / Class 상세 명세 템플릿

AI는 로직(함수, 훅, 클래스) 개발 스펙 작성 시 아래 항목들을 빠짐없이 검토하여 작성해야 합니다.

## 1. Input / Output
시그니처를 명확하게 정의하세요.

### 예시
```typescript
/**
 * @param {string} dateString - 변환할 날짜 문자열 (ISO 8601)
 * @returns {string} - 포맷팅된 날짜 ("YYYY.MM.DD")
 */
function functionName(input: InputType): OutputType;
```

## 2. 핵심 로직 (Logic)
내부에서 수행해야 할 비즈니스 로직을 단계별로 기술하세요.

### 예시
1. 입력값 유효성 검사
2. 데이터 가공 또는 API 호출
3. 결과 반환 또는 상태 업데이트

## 3. 예외 처리 (Exception Handling)
발생 가능한 모든 에러 상황과 대응 방식을 정의하세요.

### 예시
- **Invalid Input**: `null`, `undefined`, 잘못된 포맷이 들어왔을 때 (Default 값 반환 vs Error Throw)
- **API Error**: 네트워크 실패, 500/400 에러 시 처리 (에러 메시지 노출 등)

## 4. 테스트 케이스 (Test Scenarios)
해당 Functions, Classes, Hooks를 구현 후 검증해야 할 케이스 목록을 작성해주세요.

### 예시
- [ ] 정상 입력 -> 정상 출력 확인
- [ ] 엣지 케이스 입력 (빈 값, 최대 길이 등) -> 예외 처리 확인
- [ ] (Hooks) 비동기 상태 변화 (Loading -> Success/Error) 확인