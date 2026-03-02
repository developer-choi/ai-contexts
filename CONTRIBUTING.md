# 프로젝트 기여 가이드

이 문서는 ai-contexts 프로젝트에 문서를 추가하거나 수정할 때 따라야 할 규칙을 정의합니다.

동시에, meta/ 폴더 안에 들어있는 모든 문서의 최상위 문서입니다.

---

## 프로젝트 구조 상세

```
ai-contexts/
├─ instructions/                    # AI 작업 지침, 가장 많은 명령문이 포함되어있음
├─ instruction-map.md               # 문서 라우팅 맵 (사용자 요청 → 찾아야 할 문서 매핑)
│
│
├─ CONTRIBUTING.md                  # 프로젝트 관리 가이드 최상위 문서
└─ meta/                            # 프로젝트 관리 가이드
   └─ AGENT.md                      # AI가 따라야 할 전역 규칙
```

---

## 핵심 원칙

### 사용자 당신의 기억력을 믿지 말고 AI가 역제안 하게 하세요

명령문(`*.md`)이 고도화될수록, 사용자는 모든 디테일을 기억할 수 없습니다. 언젠가는 반드시 잘못된 명령을 내리게 됩니다.

따라서 미래의 당신이 AI가 **제지하고 역제안**할 수 있게 하세요.

(참고: `6bffa451`)

#### 프롬프트 수정 시 audit 규칙 역제안

사용자가 `instructions/` 하위 프롬프트의 **스타일·구조 안티패턴**을 수정 요청하면:

1. 요청된 수정을 수행
2. 이 수정이 패턴성인지 판단 (내용 변경이 아닌 반복 가능한 문제 — 전환 문장, 이모지, 중복 병기 등)
3. 패턴성이면, `audit/checklist/` 하위 적절한 파일에 어떤 규칙을 추가하면 같은 수정 요청이 재발하지 않을지 검토
4. 구체적인 규칙 문안과 함께 역제안

### 커맨드는 instruction-map.md 에만

**핵심 철학:**
- **instructions/ 하위 문서**: "이 명령어가 무엇인지" 설명 (What)
- **instruction-map.md**: "이 명령어를 언제, 어떻게 사용하는지" 설명 (When, How)

각 instruction 문서는 **순수하게 그 명령어 자체의 내용**만 담아야 합니다.
사용자가 "언제 이걸 써야 하는지", "어떤 키워드로 찾는지"는 `instruction-map.md`에서 관리합니다.

이렇게 분리하면:
- instruction 문서는 내용에만 집중 (변경 빈도 낮음)
- instruction-map.md만 보면 모든 사용법 파악 (사용자 진입점 단일화)
- 새 문서 추가 시 instruction-map.md만 업데이트

**❌ 잘못된 예:**
```markdown
## instructions/workflow/README.md
이 워크플로우는 "ai-contexts workflow"로 시작하세요.
또는 "기획 리뷰 시작"이라고 하면 됩니다.
```
→ 사용법이 여러 문서에 흩어져 있음

**✅ 올바른 예:** 
- [instructions/workflow/README.md](instructions/workflow/README.md)
- [instruction-map.md](instruction-map.md)
- → 파일 추가/삭제 시마다 README 수정 필요

- [instructions/coding-standards/README.md](instructions/coding-standards/README.md)
- → AI가 상황에 맞게 파일 선택, README는 폴더 수준만 설명

### 미정리 메모는 가장 가까운 TODO.md에

가이드 문서 본문에 "미정리", "TBD", "TODO" 같은 미해결 메모를 남기지 마세요. AI가 해당 규칙을 적용할 때 판단할 수 없습니다.

미해결 사항은 해당 문서와 가장 가까운 경로의 `TODO.md`에 적으세요.

```
coding-standards/
├── TODO.md          ← coding-standards 하위 문서의 미결 사항은 여기에
├── coding/
│   └── zod.md
└── testing/
    └── convention.md
```

### 가이드와 템플릿은 통합

가이드와 템플릿을 분리하면 내용이 중복되고 동기화 문제가 발생합니다.
**템플릿 안에 설명을 대괄호 `[ ]`로 통합하세요.**

**❌ 나쁜 예 (분리):**
```markdown
## 포함시켜야 할 내용
1. 폴더 개요
   - 이 폴더가 뭔지
   - 언제 쓰는지

## 템플릿
# 개요
[설명]
```
→ 같은 내용을 두 곳에 작성, 동기화 필요, 유지보수 어려움

**✅ 좋은 예 (통합):**
- 템플릿 안에 설명 통합, 한 곳만 관리

**핵심:** "무엇을 써야 하는가"는 템플릿 대괄호 `[ ]` 안에 주석으로 작성

---

## 문서 작성 규칙

md 파일을 작성하거나 수정할 때, 아래 문서를 참고합니다.

- [writing/tone.md](instructions/coding-standards/writing/tone.md) — 문서 톤 (습니다체, 문장 역할)
- [audit/checklist/style.md](instructions/audit/checklist/style.md) — 서식 (이모지 규칙, 헤더 텍스트 규칙)

---

## 스킬 배포

이 프로젝트에서 만든 스킬을 실제로 사용하려면 `~/.claude/skills/`로 배포해야 합니다.

```bash
bash scripts/deploy-skills.sh
```

- `ai-contexts/.claude/skills/` → `~/.claude/skills/`로 덮어쓰기 복사
- 새 컴퓨터에서는 git pull 후 이 스크립트를 실행하면 됩니다
