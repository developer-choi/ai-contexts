# 프로젝트 초기화

대상 라이브러리를 간소화하기 위한 프로젝트 초기 세팅 가이드입니다.

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

학습용 프로젝트이므로 실행에 필요한 설정을 제거합니다:

- `scripts` — 빌드/테스트/린트 등 모든 스크립트 제거
- `devDependencies` — 전부 제거
- `dependencies` — 전부 제거 (코드만 읽으므로 설치 불필요)
- 배포 관련 필드 — `publishConfig`, `repository`, `bugs`, `homepage`, `funding`, `engines` 등 제거
- 빌드 관련 필드 — `main`, `module`, `exports`, `types`, `files`, `sideEffects` 등 제거

남겨야 할 필드: `name`, `version`, `description`, `private: true`

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

## 5. 프로젝트 구조 세팅

간소화 프로젝트의 기본 폴더 구조를 만듭니다:

```
simplified-[라이브러리명]/
├── docs/                          # 분석 문서
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

## 6. 프로젝트별 특화 파일 생성

각 프로젝트에 **해당 라이브러리에만 적용되는** 파일을 생성합니다.

### `instructions/keep-patterns.md`

해당 라이브러리 특화 유지 패턴입니다. 작업하면서 축적합니다.

- 해당 라이브러리에서 간소화 시 반드시 유지해야 할 기능/패턴
- 라이브러리 종류와 무관한 공통 유지 패턴은 ai-contexts의 `common-keep-patterns.md`에 있으므로 중복 작성하지 않음

### `instructions/simplification-patterns.md`

해당 라이브러리 특화 삭제 패턴입니다. 작업하면서 축적합니다.

- 초기에는 라이브러리 소스를 탐색하여 예상되는 삭제 패턴을 초안으로 작성
- 단순화 작업을 진행하면서 실제 커밋 해시와 구체적인 예시를 추가
- 라이브러리 종류와 무관한 공통 패턴은 ai-contexts의 `common-simplification-patterns.md`에 있으므로 중복 작성하지 않음

