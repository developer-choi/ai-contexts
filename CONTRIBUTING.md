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
   ├─ AGENT.md                      # AI가 따라야 할 전역 규칙
   └─ instructions-README-guide.md  # instructions/ 하위 README.md 작성 표준
```

---

## 핵심 원칙

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

- [instructions/conventions/README.md](instructions/conventions/README.md)
- → AI가 상황에 맞게 파일 선택, README는 폴더 수준만 설명
