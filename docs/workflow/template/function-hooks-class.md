# Function / Hooks / Class 상세 명세 템플릿

로직(함수, 훅, 클래스) 개발 작업의 **특화 항목**을 작성하는 템플릿입니다.

> **주의**: 이 템플릿은 함수/훅/클래스 특화 항목만 다룹니다.
> 공통 항목(**참고 자료**, 개요, 예상 영향 범위, 핵심 로직 설계 등)은 [`step-5.md`](../step-5.md)를 참고하여 반드시 포함하세요.

---

## 모듈/함수 시그니처 (구현 단위)
해당 파일에서 구현해야 할 모든 모듈 단위를 명시하세요. 파라미터와 반환값의 타입을 명확히 작성합니다.

### 예시 (calculator.ts)
```typescript
function add(a: number, b: number): number;
function subtract(a: number, b: number): number;
```

### 예시 (useAuth.ts)
```typescript
function useAuth(): {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
};
```

---

## 핵심 로직 (Logic)
내부에서 수행해야 할 비즈니스 로직을 단계별로 기술하세요.

### 예시
1. 입력값 유효성 검사
2. 데이터 가공 또는 API 호출
3. 결과 반환 또는 상태 업데이트

---

## 예외 처리 (Exception Handling)
발생 가능한 모든 에러 상황과 대응 방식을 정의하세요.

### 예시
- **Invalid Input**: `null`, `undefined`, 잘못된 포맷이 들어왔을 때 (Default 값 반환 vs Error Throw)
- **API Error**: 네트워크 실패, 500/400 에러 시 처리 (에러 메시지 노출, throw 등)
- **Edge Cases**: 빈 배열, 0으로 나누기 등 경계 조건 처리
