---
target:
  - knowledge-archive/explained/
  - knowledge-archive/knowledge/
priority: 1
---

# explained 문서 존재 가치 및 AI Annotation 정합성 재검토

## 동기

현재 한글 해설을 담당하는 `explained/` 문서들의 명확한 존재 가치(필요성)를 재검토하고, 기존 `knowledge/` 내에 작성된 `AI Annotation`들과의 중복/누락 등의 정합성을 전수조사하여 정비할 필요가 있습니다.

## [ideation] explained 존재 가치 및 정합성 전수조사

### 기대상황

- `explained/` 문서들의 유지 여부와 확실한 역할(존재 가치)을 정의합니다.
- 만약 계속 유지하기로 결정된다면, 기존 `knowledge/` 내 `AI Annotation`들과 1:1 매칭 상태를 전수조사하여 중복을 제거하고 정합성을 정돈합니다.
- 불필요하거나 중복되는 설명이 이중으로 관리되는 비효율을 해소합니다.

### 현재상태

- 지식 아카이브(`knowledge-archive`) 내에 영어 원문을 보존하는 `knowledge/`와 한글 해설을 적는 `explained/`로 이원화되어 있습니다.
- 그러나 `knowledge/` 내의 `> #### AI Annotation:` 지침(새 비유/매핑/통찰 제공)과 `explained/` 문서의 해설 경계가 모호하여 정합성 어긋남 및 이중 관리 문제가 우려됩니다.

### 첫 행동

- `knowledge-archive` 레포에서 `explained/` 하위 파일들과 `knowledge/` 내 `AI Annotation`이 포함된 파일들을 추출하여 상호 매핑 테이블을 작성하고 분석을 시작합니다.
