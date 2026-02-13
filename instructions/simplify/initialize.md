# 프로젝트 초기화

대상 라이브러리를 간소화하기 위한 프로젝트 초기 세팅 가이드입니다.

---

## 핵심 원칙

**⚠️ 이 프로젝트는 코드 읽기 전용입니다**:
- **테스트/빌드 실행 금지**: `yarn test`, `tsc`, `npm run build` 등 실행하지 마세요
- **의존성 설치 불필요**: `yarn install`, `npm install` 실행하지 마세요
- **목적**: 소스 코드만 읽고 이해하는 것

---

## 1. 사용자에게 초기 라이브러리 세팅 요청

1. 라이브러리 선정
2. shallow clone (`git clone --depth 1`)
3. 프로젝트명과 package.json의 name을 `simplified-[기존이름]`으로 변경 (예: `simplified-material-ui`)

---

## 2. 개인 레포 생성 및 Push

shallow clone된 레포는 git 히스토리가 불완전하여 push가 실패합니다.
git을 초기화한 뒤 개인 레포에 push합니다.

### 절차

```bash
# 1. 기존 git 히스토리 삭제
rm -rf .git

# 2. git 초기화 및 커밋
git init
git add -A
git commit -m "initial commit"
git branch -M main

# 3. 개인 레포 생성 (gh CLI)
gh repo create [사용자명]/simplified-[라이브러리명] --public

# 4. remote 연결 및 push
git remote add origin https://github.com/[사용자명]/simplified-[라이브러리명].git
git push -u origin main
```

### 주의사항

- `git fetch --unshallow`로 전체 히스토리를 복구하는 방법도 있지만, 학습용 프로젝트이므로 히스토리 초기화가 더 깔끔합니다.
- `gh` CLI가 설치되어 있지 않으면 `winget install GitHub.cli`로 설치 후 `gh auth login`으로 인증합니다.

---

## 3. README.md 및 package.json 정리

### README.md

원본 라이브러리의 `README.md`, `CHANGELOG.md`, `LICENSE` 등을 삭제합니다.

### package.json

**⚠️ 중요**: 이 프로젝트는 코드만 읽으므로 실행/빌드/테스트 관련 설정을 모두 제거합니다.

학습용 프로젝트이므로 실행에 필요한 설정을 제거합니다:

- `scripts` — 빌드/테스트/린트 등 모든 스크립트 제거 (실행하지 않으므로)
- `devDependencies` — 전부 제거
- `dependencies` — 전부 제거 (코드만 읽으므로 설치 불필요)
- 배포 관련 필드 — `publishConfig`, `repository`, `bugs`, `homepage`, `funding`, `engines` 등 제거
- 빌드 관련 필드 — `main`, `module`, `exports`, `types`, `files`, `sideEffects` 등 제거

남겨야 할 필드: `name`, `version`, `description`, `private: true`

**이유**: `yarn install`, `yarn test`, `tsc` 등을 실행할 일이 없으므로 관련 설정 제거

---

## 4. 불필요한 파일 정리

학습에 불필요한 내용을 모두 간소화하는 것이 목적이므로, 관련 없는 파일을 모두 삭제합니다.

이 프로젝트는 실행할 필요 없이 코드만 읽기 때문에 lock file이나 node_modules도 불필요합니다.

### 삭제할 파일 예시

- **CI/CD**: `.github/`, `.circleci/`, `.travis.yml` 등
- **배포 설정**: `.npmrc`, `.npmignore`, `publish.sh` 등
- **기여 가이드**: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md` 등
- **설정 파일 중 불필요한 것**: `.editorconfig`, `.prettierrc`, `renovate.json` 등
- **예제/데모**: `examples/`, `demo/` 등

**주의**: 다음은 삭제하지 마세요:
- 소스 코드 (`src/`, `packages/` 등)
- 테스트 코드 (원본 동작 이해에 참고용)

---

## 5. .gitignore 생성

```
.idea
.claude
```

---

## 6. 프로젝트 구조 세팅

간소화 프로젝트의 기본 폴더 구조를 만듭니다:

```
simplified-[라이브러리명]/
├── docs/                          # 분석 문서
│   ├── codebase-structure.md      # 코드베이스 구조 분석
│   ├── analysis-queue.md          # 분석 대상 목록
│   └── [카테고리]/                 # 대상별 카테고리 분류
│       ├── [대상명]-original.md    # 원본 분석 문서
│       └── [대상명]-simplified.md  # 단순화 분석 문서
├── instructions/
│   ├── keep-patterns.md           # 이 라이브러리 특화 유지 패턴
│   └── simplification-patterns.md # 이 라이브러리 특화 삭제 패턴
├── packages/ (기존 폴더명 유지)       # 간소화된 소스 코드 (원본 구조 유지)
│   └── ...
```

---

## 7. 코드베이스 구조 분석

대상 라이브러리의 전체 구조를 파악하고 문서화합니다.

### 분석 내용

- 모든 폴더와 파일의 맵
- 각 폴더/파일에 대한 간단한 설명

### 결과 문서 작성

1. **코드베이스 구조 문서**
   - **파일 경로**: `docs/codebase-structure.md`
   - **양식**: (이 저장소) `format/codebase-structure.md`

2. **분석 대상 목록 초기화**
   - **파일 경로**: `docs/analysis-queue.md`
   - **양식**: (이 저장소) `format/analysis-queue.md`
   - 코드베이스 구조 분석을 기반으로 전체 분석 대상을 나열

---

## 8. 프로젝트별 특화 파일 생성

각 프로젝트에 **해당 라이브러리에만 적용되는** 파일을 생성합니다.

### `instructions/keep-patterns.md`

해당 라이브러리 특화 유지 패턴입니다. 작업하면서 축적합니다.

- **스캐폴딩**: (이 저장소) `[타입]/format/keep-patterns.md` 양식을 기반으로 생성
- 초기에는 라이브러리 소스를 탐색하여 예상되는 유지 패턴을 초안으로 작성
- 라이브러리 종류와 무관한 공통 유지 패턴은 ai-contexts의 `common-keep-patterns.md`에 있으므로 중복 작성하지 않음

### `instructions/simplification-patterns.md`

해당 라이브러리 특화 삭제 패턴입니다. 작업하면서 축적합니다.

**⚠️ 중요 - 이 문서의 목적**:
- **여러 파일/컴포넌트에서 반복적으로 나타나는 패턴**을 기록
- **특정 파일 하나의 작업 기록이 아님**
- 예: "Slot 시스템 제거" → Dialog, Modal, Menu **모든 컴포넌트**에서 반복
- 예: ❌ "Dialog.tsx의 backdrop 제거" → 이건 특정 파일 작업 기록

**작성 가이드**:
- **스캐폴딩**: (이 저장소) `[타입]/format/simplification-patterns.md` 양식을 기반으로 생성
- 초기에는 라이브러리 소스를 탐색하여 **예상되는 반복 패턴**을 초안으로 작성
- 단순화 작업을 진행하면서 **패턴별로 실제 적용 예시**(커밋 해시 선택사항) 추가
- 라이브러리 종류와 무관한 공통 패턴은 ai-contexts의 `common-simplification-patterns.md`에 있으므로 중복 작성하지 않음

---

## 9. 첫 간소화로 방향 잡기

**가장 작고 단순한 대상 하나를 먼저 간소화하면서, 이 프로젝트의 간소화 방향을 잡으세요.**

### 작업 전

1. `docs/analysis-queue.md` 읽기
2. 라이브러리에서 **가장 작고 단순한 대상** 하나 선택
   - 의존성이 적고, 코드가 짧고, 독립적인 것
3. **해당 대상과 관련된 전체 그룹**을 "다음 분석 목록"에 추가
   - 예: `Box` 선택 → Box 관련 파일들 전부 그룹으로 추가
   - 이유: 관련된 것들을 연속으로 분석하면 효율적, 매번 찾지 않아도 됨

### 작업 진행

4. `main.md` 프로세스대로 처음부터 끝까지 수행
5. 이 과정에서 자연스럽게 파악되는 것들:
   - 이 라이브러리에서 반복적으로 제거할 패턴이 뭔지
   - 어떤 것들은 유지해야 하는지
   - 적절한 커밋 단위가 어느 정도인지

### 작업 후

6. 파악한 내용을 `instructions/keep-patterns.md`, `simplification-patterns.md`에 반영
   - `simplification-patterns.md`는 **다른 대상에도 적용될 반복 패턴**만 기록
   - 이 대상에만 특화된 내용은 기록하지 않음
7. **`docs/analysis-queue.md` 업데이트**:
   - 완료한 대상 체크 → "완료" 섹션으로 이동
   - 다음 그룹 추가 (필요시)
8. 이후 대상들은 이 방향을 기반으로 진행

