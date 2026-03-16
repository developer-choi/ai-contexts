# Spec Review

피그마 기획서/디자인 시안을 **개발자 관점에서 리뷰**하는 도구입니다.

- **목표**: 구현 전에 기획 & 디자인을 이해하고, 엣지케이스를 찾아내기
- **접근**: 체크리스트 기반 점검 + AI 자유 검토
- **사용법**: `/spec-review [피그마 캡처 또는 기획서 경로]`

## 체크리스트 구조

점검 항목은 **2개의 축**으로 구성됩니다.

### 점검 항목 (checklist/)

| 파일 | 점검 내용 |
|---|---|
| [overview.md](./checklist/overview.md) | 점검 항목 총괄 (목적, 플로우, 상태, 엣지케이스, 데이터, 비기능, 라우팅) |
| [flow.md](./checklist/flow.md) | 사용자 플로우, 상태 전이 |
| [edge-cases.md](./checklist/edge-cases.md) | 에러, 권한, 극단값, 타이밍 |
| [data.md](./checklist/data.md) | API, 데이터 갱신/의존성 |
| [routing.md](./checklist/routing.md) | URL 설계, 렌더링 전략, 레이아웃 |
| [features.md](./checklist/features.md) | 기능별 점검 (결제, 파일 업로드, 예약, 실시간 데이터) |
| [cross-page.md](./checklist/cross-page.md) | 페이지 간 점검 (데이터 흐름, 이탈/복귀, 공통 엣지케이스) |
| [design/](./checklist/design/) | 디자인 점검 (크기 정책, 토큰, 인터랙션, 반응형) |

### 페이지 특성별 (해당 유형일 때만 추가 적용)

| 파일 | 점검 내용 |
|---|---|
| [form.md](./page-type/form.md) | 포커스, 입력 유효성 검증, 이탈 보호, 제출 |
| [list.md](./page-type/list.md) | 빈 상태, 대량 데이터, 검색/필터 |
| [sequential-flow.md](./page-type/sequential-flow.md) | push vs replace, 중간 URL 접근 차단, 이탈/복귀 |
| [detail.md](./page-type/detail.md) | 메타데이터/SEO, 존재하지 않는 리소스 |

페이지의 구조적 특성에 따라 추가 점검 항목을 적용합니다. 한 페이지가 여러 특성을 가질 수 있습니다 (예: 폼 + 순차 플로우).

> 자세한 내용은 [SKILL.md](SKILL.md)를 참고하세요.
