# 채용과제 분석 step

채용 과제의 요구사항을 분석하여, 이후 PR 분할과 구현의 기반이 되는 분석 문서를 작성한다.

## 입력 자료

「자료 받기」가 `/plan/background/persistent/`에 저장한 원본 자료 전부. 보통 아래 셋이다:

- `공고.md` — 채용공고 원본
- `메일.md` — 채용 담당자가 보낸 메일 본문
- `과제요구사항.md` — 과제 요구사항 문서

## 입력 자료 저장 시 제외 항목

원본 자료를 `/plan/background/persistent/`에 저장할 때 시간 압박 정보(제출 기한·마감일·잔여 시간·"X일 이내" 류 표현·메일 수신 일자)는 모두 제외한다.

저장한 뒤 `node {{skill_dir}}/recruitment/scripts/check-submission.mjs time-pressure`로 잔존을 훑는다. 걸린 줄을 지울지 남길지는 사람이 정한다 — 날짜가 다 마감일은 아니다.

## 산출물

무엇을 적는지는 괄호 안 절이 정한다.

- `/plan/background/retained/cross-analysis.md` (1·2절)
- `/plan/background/retained/service-analysis.md` (1절, [작성법](service-analysis.md))
- `/plan/background/retained/domain-analysis.md` (1·5절)
- `/plan/background/retained/tech-constraints.md` (1·3절)
- `/plan/background/consumable/todo.md` (1·5절, 어느 절에 적을지는 [PR 몫 TODO 등록처](../../conventions/pr-split.md#pr-몫-todo-등록처))
- `/plan/background/consumable/design-system.md` (4절)

## 분석 과정

### 1. 자료 분석

사용자가 준 자료를 모두 아래와 같이 분석한다:
- 원본 간 교차 분석 (놓치기 쉬운 세부 스펙) — 여러 화면·기능에 걸치는 것은 domain-analysis.md에, 한 화면·기능 안에서 끝나는 것은 todo.md에 적는다
- [service-analysis.md](service-analysis.md)대로 서비스 분석
- **API/도메인 분석** — 엔티티·규칙·에러 케이스를 domain-analysis.md에 적는다
- **테스트 코드 분석** — 테스트 내용을 읽고 채점 기준을 역추론해 cross-analysis.md에 적는다
- **프로젝트 파일 분석** — 제공된 프로젝트의 Dockerfile, packageManager, 빌드 설정, .gitignore, 기존 디렉토리 구조 등을 확인한다. 과제가 강제하는 제약은 tech-constraints.md에 적는다
- **기존 소스 코드 탐색** — "퍼블리싱 완료" 등 기존 코드가 있다고 명시된 부분은 일회성 서브에이전트에 src 경로와 그 명시 문구를 넘겨, 이미 된 것·남은 작업 범위(근거 `파일:줄`)만 돌려받는다. 결과는 todo.md에 적는다

공고·과제요구사항이 중시하는 역량을 파악해, 그에 맞는 디테일 TODO를 사용자와 서로 제안하고 todo.md에 적는다. 최소한 아래 관점은 점검한다:
- 완성도 (404 페이지, 파비콘, page.title, OG 태그, 실제 이미지·텍스트, 로딩/에러 상태)
- UI/UX (뒤로가기, 취소 버튼, 푸터 링크, 빈 상태, 호버/포커스, 토스트 피드백)
- 공고에서 강조하는 역량에 연결되는 어필 포인트
- 페이지별 기술적·비기술적 강점 어필 포인트

공고가 중시하는 역량에 매칭되는 기존 베스트 프랙티스 찾기는 일회성 서브에이전트에 역량 목록과 MP/DC 경로를 넘겨, 역량마다 참조 링크와 한 줄 근거만 돌려받아 todo.md에 남긴다.

### 2. 평가 기준 추론

과제 성격과 채용공고에서 원본에 명시되지 않은 **암묵적 평가 기준**을 추론한다:

- 공고의 자격요건/우대사항과 과제 요구사항을 대조하여 숨겨진 기대치 도출
- 과제 구조(디자인 제공 범위 등)에서 역추론한 평가 포인트 — 테스트 코드에서 나온 것은 1절이 이미 적었다

추론한 평가 기준은 cross-analysis.md에 적는다.

### 3. 프로젝트 결정 사항

사용자와 논의하여 확정한다:
- 기술 스택 (프레임워크, 스타일링·데이터 페칭·상태관리 같은 기초 라이브러리)
- 디자인 시스템 라이브러리
- 사용자 직접 진행 항목 (프로젝트 생성기 실행, 에디터 설정 등). 생성기 뒤의 레포 세우기는 BG가 한다 — 아래 「레포 세우기」

기술 스택·디자인 시스템 라이브러리는 [패키지 선택 기준](../../../../contexts/code-map.md#패키지-선택-기준)으로 MP 기본 선택지를 제안하고 사용자 확인을 받아 확정한다.
확정한 기술 스택·디자인 시스템 라이브러리는 tech-constraints.md에 적는다.

**결정 근거는 둘뿐이다**: ① 과제요구사항의 강제 명시(오버라이드) → ② MP 기본 선택지.

#### 레포 세우기

스택을 확정한 직후 한다.

1. 확정한 스택의 생성기 명령을 안내하고 사용자 실행을 기다린다. 생성기가 비어 있지 않은 폴더라고 물으면 "Ignore files and continue"를 고르라고 함께 적는다
2. 사용자가 끝냈다고 하면 이어서 한다
   - git init
   - `.gitignore`에 node_modules·빌드 산출물·`.env`류가 있는지 점검해 빠진 것만 더한다
   - `master`에 초기 커밋
3. `developer-choi/{회사 slug}` 이름이 GitHub에 비었는지 본다. 이미 있으면(같은 회사 재지원) 멈추고 사용자에게 이름을 받는다
4. private으로 만들어 origin으로 등록하고 `master`를 첫 push한다
5. 레포 URL을 보고한다

### 4. 디자인 시스템 설계

전체 자료를 훑어 필요한 컴포넌트 종류와 각 컴포넌트의 구조 관찰(공유 골격·구성 요소)을 `/plan/background/consumable/design-system.md`에 적는다. props 같은 인터페이스는 COMPONENTS PR이 정한다.

### 5. 모호한 부분

과제 설명에서 불명확한 부분을 짚고, 어떻게 정할지 사용자와 논의한다. 정한 것은 1절 교차 분석과 같은 기준으로 domain-analysis.md나 todo.md에 적는다.
