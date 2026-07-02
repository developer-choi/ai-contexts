---
target: knowledge-archive/knowledge/ (전 노트 frontmatter publishable)
---

# KA publishable frontmatter 전수 재조사

## [draft] google-doc/unverified 출처 노트의 publishable 점검·설정

### 기대상황

KA는 "`publishable: false`를 명시하지 않으면 암묵적 발행 대상"(blocklist)이고, 공식문서 기반 학습 저장소라 이 기본값이 맞다. 그러나 최근 과거 구글문서 필기를 KA로 다수 옮기면서 1차 소스 검증이 약한(본인 해석 기반) 노트가 늘었다. 이들은 `publishable: false`가 필요한데 일괄 표시가 안 돼 있을 수 있고, list-candidates의 blocklist 기본 발행에 따라 **KQ로 자동 노출**될 위험이 있다. (Blog은 explained 모델로 전환되어 knowledge/ QnA를 발행하지 않음 → publishable은 이제 KQ + KA 위생에만 영향.)

### 현재상태

- `publishable: false` = 44개 (전부 false, `true` 0개)
- `source` 필드 보유 = 149개 노트
- list-candidates는 `publishable === false`만 제외하고 `source`는 출력 표시용일 뿐 발행을 막지 않음 (`knowledge-archive/scripts/list-candidates.mts`)
- 따라서 `source: google-doc`/`unverified`인데 `publishable` 미표시인 노트는 KQ 발행 후보로 들어감

### 종료조건

- `source: google-doc`/`unverified` 노트는 모두 (a) 1차 소스 검증 후 `official` 승격, 또는 (b) `publishable: false` 중 하나로 정리됨
- 검증되지 않은 노트가 KQ에 자동 노출되지 않음

### 첫 행동

`source: google-doc`/`unverified`이면서 `publishable` 미표시인 노트 교집합을 grep으로 색출 → 목록화. 거기서부터 1차 소스 검증해 publishable 설정. 카테고리별 점진 처리. 대상 확정되면 ready 승격.
