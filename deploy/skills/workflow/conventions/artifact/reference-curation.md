# reference.md 컨벤션

`/plan/pr{N}/persistent/reference.md`의 책임·포함 항목·작성·소비 단일 출처.

## 책임·위치

PR이 참조하는 외부 자료·컨벤션·베스트프랙티스 경로 인덱스. `persistent/` 하위라 영구 보존.

persistent에 두는 사유: 회사·프로젝트 컨벤션 경로는 코드 리뷰어가 자체적으로 갖지 못한다. AC 코딩 스탠다드·MP 베스트프랙티스 맵은 리뷰어가 직접 찾을 수 있지만 회사 컨벤션은 reference.md에서만 알 수 있다. 후속 PR·미래 다른 프로젝트에서 같은 컨벤션 환경이면 재참조 가치.

## 포함 항목

- 외부 자료 링크 (기획서, 디자인 시안 URL 등 — `background/retained/figma-url.md`에 누적되는 figma URL은 중복 회피)
- 회사·프로젝트 컨벤션 경로 + 라인 범위 (본 PR 작업 관련 규칙)
- AC 코딩 스탠다드 + MP 베스트프랙티스 맵 중 본 PR 매칭 패턴 경로

## 누적 원칙

결정 가능한 컨벤션은 stub 코드와 reference.md에 녹인다:

- 파일 경로·네이밍 → stub 자체로
- 토큰 사용 규칙·에러처리 전략 같은 명시 규칙 → reference.md로

이를 통해 구현 단계에서 컨벤션 원본을 가급적 덜 보게 한다. 각 stub 파일·잔존 md에는 적지 않고 reference.md에 통합 명시.

## 소비처

- step-4: 파생 산출물 작성 시 참조
- step-5: Lead가 팀에게 컨텍스트 주입할 때 함께 전달 (Markup·Feature Implementer, Coding-Standards Reviewer, Advanced Reviewer)
- step-6: code-review 입력에 포함 (회사 컨벤션은 리뷰어가 자체적으로 못 가지므로)
- 후속 PR / 미래 다른 프로젝트: 같은 컨벤션 환경이면 재참조
