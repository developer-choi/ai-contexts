# 프로젝트 초기화

대상 라이브러리를 간소화하기 위한 프로젝트 초기 세팅 가이드입니다.

---

이 프로젝트는 **코드 읽기 전용**이다 (SKILL.md `작업 공통 규칙`). 아래 셋업은 그 전제에서 실행/빌드/배포 관련 설정을 걷어내는 작업이다.

---

## Step 1. 대상 라이브러리 shallow clone

사용자와 대상 라이브러리를 정한 뒤, 작업 폴더(예: `~/WebstormProjects/simplify/`) 하위에 `simplified-<라이브러리명>`으로 shallow clone한다.

```bash
git clone --depth 1 <repo-url> simplified-<라이브러리명>
```

- package.json의 `name`도 `simplified-<라이브러리명>`으로 변경한다 (예: `simplified-material-ui`).

---

## Step 2. git 재초기화 + 개인 계정 로컬 config

shallow clone은 히스토리가 불완전하므로 git을 재초기화한다. **로컬 git 정체성은 첫 커밋 전에 설정한다** — 그래야 initial commit부터 개인 계정으로 author된다.

글로벌 `git config --global user.email`이 **개인 계정(`forworkchoe@gmail.com`)이 아니면**(회사 계정 등), 이 레포의 **로컬** config를 개인 계정으로 설정한다. 학습용 레포가 회사 계정으로 커밋되는 것을 막기 위함이다. (글로벌이 이미 개인 계정이면 config 단계 생략.)

```bash
rm -rf .git
git init

# 개인 계정 로컬 config — 반드시 첫 커밋 전에 설정
git config user.name "Yu Jin Choe"
git config user.email "forworkchoe@gmail.com"

git add -A
git commit -m "initial commit"
git branch -M main
```

### (선택) 개인 GitHub 계정으로 push

푸시가 필요하면 `gh auth status`로 인증이 **개인 계정**인지 먼저 확인한 뒤 진행한다.

```bash
gh repo create <개인 GitHub 핸들>/simplified-<라이브러리명> --public
git remote add origin https://github.com/<개인 GitHub 핸들>/simplified-<라이브러리명>.git
git push -u origin main
```

- 토큰을 remote URL에 박지 않는다 — credential helper(`git config --global credential.helper manager`)를 사용한다.
- `gh` CLI 미설치 시 `winget install GitHub.cli` 후 `gh auth login`으로 인증.

---

## Step 3. README.md 및 package.json 정리

### README.md

원본 라이브러리의 `README.md`, `CHANGELOG.md`, `LICENSE` 등을 삭제합니다.

### package.json

실행/빌드/테스트 관련 설정을 모두 제거한다:

- `scripts` — 빌드/테스트/린트 등 모든 스크립트
- `devDependencies` — 전부
- `dependencies` — 전부
- 배포 관련 필드 — `publishConfig`, `repository`, `bugs`, `homepage`, `funding`, `engines` 등
- 빌드 관련 필드 — `main`, `module`, `exports`, `types`, `files`, `sideEffects` 등

남길 필드: `name`, `version`, `description`, `private: true`

---

## Step 4. 불필요한 파일 정리

학습에 무관한 파일을 삭제한다. lock file·node_modules도 불필요하다.

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

## Step 5. .gitignore 작성

원본에 `.gitignore`가 있어도 아래 내용으로 **교체**한다 (실행 안 하므로 빌드 산출물 무시 규칙 불필요).

```
.idea
.claude
```

---

## Step 6. 프로젝트 구조 세팅

SIMPLIFY_TARGET의 기본 폴더 구조를 만듭니다:

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

## Step 7. 코드베이스 구조 분석

대상 라이브러리의 전체 구조를 파악하고 문서화합니다.

### 분석 내용

- 모든 폴더와 파일의 맵
- 각 폴더/파일에 대한 간단한 설명

### 결과 문서 작성

1. **코드베이스 구조 문서**
   - **파일 경로**: SIMPLIFY_TARGET `docs/codebase-structure.md`
   - **양식**: SIMPLIFY_SOURCE `format/codebase-structure.md`

2. **분석 대상 목록 초기화**
   - **파일 경로**: SIMPLIFY_TARGET `docs/analysis-queue.md`
   - **양식**: SIMPLIFY_SOURCE `format/analysis-queue.md`
   - 코드베이스 구조 분석을 기반으로 전체 분석 대상을 나열
   - "제외 대상" 섹션에 간소화하지 않을 파일 목록 작성 (이유 포함)

---

## Step 8. 프로젝트별 특화 파일 생성

각 프로젝트에 **해당 라이브러리에만 적용되는** 파일을 생성합니다.

### `instructions/keep-patterns.md`

해당 라이브러리 특화 유지 패턴입니다. 작업하면서 축적합니다.

- **스캐폴딩**: SIMPLIFY_SOURCE `[타입]/format/keep-patterns.md` 양식을 기반으로 생성
- 초기에는 라이브러리 소스를 탐색하여 예상되는 유지 패턴을 초안으로 작성
- 라이브러리 종류와 무관한 공통 유지 패턴은 SIMPLIFY_SOURCE `common-keep-patterns.md`에 있으므로 중복 작성하지 않음

### `instructions/simplification-patterns.md`

해당 라이브러리 특화 삭제 패턴입니다. 작업하면서 축적합니다.

**이 문서의 목적**:
- **여러 파일/컴포넌트에서 반복적으로 나타나는 패턴**을 기록
- **특정 파일 하나의 작업 기록이 아님**
- 예(O): "Slot 시스템 제거" → Dialog, Modal, Menu **모든 컴포넌트**에서 반복
- 예(X): "Dialog.tsx의 backdrop 제거" → 이건 특정 파일 작업 기록

**작성 가이드**:
- **스캐폴딩**: SIMPLIFY_SOURCE `[타입]/format/simplification-patterns.md` 양식을 기반으로 생성
- 초기에는 라이브러리 소스를 탐색하여 **예상되는 반복 패턴**을 초안으로 작성
- 단순화 작업을 진행하면서 **패턴별로 실제 적용 예시**(커밋 해시 선택사항) 추가
- 라이브러리 종류와 무관한 공통 패턴은 SIMPLIFY_SOURCE `common-simplification-patterns.md`에 있으므로 중복 작성하지 않음

---

## Step 9. 첫 간소화로 방향 잡기

**가장 작고 단순한 대상**(의존성 적고, 코드 짧고, 독립적인 것) 하나를 골라 `main.md` 프로세스대로 처음부터 끝까지 수행한다. 큐 읽기·그룹 추가·문서/목록 갱신 절차는 `main.md`를 따른다.

이 첫 작업은 **방향 잡기**가 목적이다 — 이 라이브러리에서 반복 제거할 패턴, 유지할 대상, 적절한 커밋 단위를 파악한다. 파악한 내용은 `main.md` Step 6 절차대로 패턴 문서에 반영하고, 이후 대상은 그 방향을 기반으로 진행한다.

