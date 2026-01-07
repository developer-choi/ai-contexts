# AI Contexts

AI 에이전트와 체계적으로 협업하기 위한 프롬프트 (markdown)를 모아둔 저장소입니다.

---

## 목표와 한계

**완성도와 시간**을 둘 다 챙기기 위해 제가 하던 일을 AI에게 **100%** 위임하는 방향으로 진행하고 있습니다.
- 문제 정의부터 배포까지 [workflow.md](instructions/workflow/README.md)
- 문제 해결방법 선택하기 [roadmap.md](instructions/self-help/roadmap.md)

이 과정을 반복하면 언젠가는 100% 위임에 도달할 것입니다.

그때부터는 반대로 일부를 제가 직접 하려고 합니다. 토큰이 무제한이 아니고, AI가 아직 덜 발전했기 때문입니다.

저는 이 방향성이 맞다고 생각합니다. AI가 계속 발전하면 결국 대부분의 작업을 AI가 대체할 것이기 때문입니다.

---

## 접근 방법

### 구조화된 instruction 시스템

모든 규칙과 워크플로우를 마크다운 파일로 구조화했습니다. AI가 필요한 시점에 필요한 문서만 로드할 수 있도록 설계했습니다.

instruction-map.md가 라우팅 역할을 합니다. 사용자가 "복습하자"라고 하면 AI가 자동으로 review-study.md를 찾아 로드합니다.

### AI 주도 설계

**"사용자가 명령문을 잘 기억해서 잘 명령하는 게 아니라, AI가 명령문을 잘 기억하고 사용자를 잘 리드하는 것"**

규칙이 많아지면 사용자가 모든 걸 완벽히 기억하는 건 불가능합니다. 따라서:

- **AI가 주도적으로 안내**: 다음 단계 제안, 선택지 제시, 결정 지점마다 가이드 제공
- **잘못된 요청 제지**: 사용자가 비효율적이거나 잘못된 방향으로 가려 할 때 AI가 제지하고 대안 제시
- **사용자는 편하게**: 모든 디테일을 기억할 필요 없이, AI의 안내를 따라가기만 하면 됨

모든 명령문은 이 원칙에 따라 설계됩니다.

**상세 가이드**: [meta/instruction-guide.md](meta/instruction-guide.md)

---

## 프로젝트 구조

```
ai-contexts/
├─ instruction-map.md    # 문서 라우팅 맵
├─ instructions/         # AI 작업 규칙
│  ├─ workflow/          # 6단계 개발 프로세스
│  ├─ conventions/       # 코딩 컨벤션
│  └─ self-help/         # 학습 & 성장
└─ meta/                 # 프로젝트 관리 가이드
```

---

## 사용법

Claude Code나 다른 AI 에이전트에서 "ai-contexts" 키워드와 함께 요청하면 됩니다.

```
"ai-contexts로 워크플로우 시작하자"
"ai-contexts로 복습하자"
"ai-contexts conventions 적용해서 코드 작성해줘"
```

AI가 instruction-map.md를 참조해서 적절한 문서를 찾아 로드합니다.

자세한 내용은 [instruction-map.md](./instruction-map.md)를 참고해주세요.

---

## 프로젝트 관리 방법

[CONTRIBUTING.md](./CONTRIBUTING.md)를 참고해주세요.
