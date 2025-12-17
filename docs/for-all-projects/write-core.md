## 코드 작성 시 주의사항
### Typescript
any, as는 가급적 안쓰는 방향으로 작업해주세요.

ts-ignore, eslint-disable-next-line 같은 경고 막는 코드를 절대 작성하지 마세요.

### 기존 코드 수정 시
기존 코드 라인이 지워진게 아니라면, 그 기존 코드 라인 위에있는 주석도 제발 지우지 말아주세요

### 임의의 코드작성 완료 후
- 반드시 unused imports 가 있는지 확인해주세요.
- unused variables도 있는지 확인해주세요.
- test-all 스크립트를 실행하여 Static analysis를 진행해주세요.
    - 타입체크
    - 린트체크
    - 테스트코드 실행
    - 빌드
