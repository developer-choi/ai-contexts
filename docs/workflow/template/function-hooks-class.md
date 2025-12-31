# Function / Hooks / Class 상세 명세 템플릿

로직(함수, 훅, 클래스) 개발 작업의 **특화 항목**을 작성하는 템플릿입니다.

> **주의**: 이 템플릿은 함수/훅/클래스 특화 항목만 다룹니다.
> 공통 항목(개요, 예상 영향 범위, 핵심 코드 스니펫, 기본 테스트 케이스)은 [`step-5.md`](../step-5.md)를 참고하세요.

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

---

## 함수/훅 특화 테스트 케이스
함수, 클래스, 훅의 로직과 부수 효과를 검증하기 위한 상세 테스트 항목을 작성합니다.

### 검증 항목 예시
- **정상 동작**: 기본적인 입력에 대한 정상 출력 검증
- **경계 조건**: 빈 배열, 빈 문자열, 0, null, undefined 등 엣지 케이스
- **에러 케이스**: 잘못된 타입, API 실패, 네트워크 에러 등 예외 상황
- **부수 효과**: localStorage 저장, API 호출 횟수, revalidation 호출 등 Side Effect 검증
- **(Hooks)** 상태 변화: 초기 상태, 로딩 상태, 성공/실패 상태 전환 확인

### 체크리스트 예시
- [ ] 정상 입력 -> 정상 출력 확인 (예: formatDate('2025-01-01')이 '2025.01.01'을 반환)
- [ ] 엣지 케이스 입력 -> 예외 처리 확인 (빈 값, null, undefined, 최대/최소 길이 등)
- [ ] (Hooks) 비동기 상태 변화 확인 (예: useFetch 호출 시 초기 상태가 { data: null, isLoading: true, error: null })
- [ ] 에러 처리: 잘못된 입력에 대해 명확한 에러 메시지를 throw하는가?
