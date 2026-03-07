# 채용 과제 제출 마무리

Step 1에서 작성한 `/plan/background/requirement.md`와 각 PR의 `/plan/pr{N}/pr-body.md`를 참조합니다.

## Step 8.5. 커밋 정리 — 사용자에게 안내

- /plan/* 등 AI 산출물 커밋 삭제
  - **단, README에서 `plan/` 내 이미지를 참조하는 경우, 해당 이미지는 삭제하지 않고 md 파일만 삭제**
- 그 외 커밋 순서 정리하면서 동시에 코드리뷰

## Step 8.6. PR 작성 — 사용자에게 안내

- `/plan/pr{N}/pr-body.md`를 기반으로 GitHub PR 작성
- PR body의 커밋 링크, 이미지 링크가 모두 유효한지 확인
- PR 본문을 `coding-standards/universal/writing/` 컨벤션과 대조하여 부정확한 표현이 없는지 검토

## Step 8.7. README.md / MAIL.md 작성 — AI 작업

`/plan/background/requirement.md`와 `/plan/pr{N}/pr-body.md`를 모두 읽고 다음 문서를 작성하여 사용자에게 제시합니다.

1. **README.md** — 과제 요구사항에 맞는 프로젝트 소개 문서
2. **MAIL.md** — 제출 시 보낼 메일 본문 초안
   - `.env.local` 등 환경변수 파일을 메일에 첨부하도록 안내 포함

**README.md 공통 스펙:**

1. 개요
2. 배포 링크
3. 실행 방법
4. 폴더 구조
5. PR 링크별 요약
6. `/plan/background/requirement.md`에 따라 추가 섹션 (기술 선택 근거, 완성/미완성 등)

## Step 8.8. 배포 및 정상 동작 확인 — 사용자에게 안내

- Vercel(또는 해당 플랫폼)에 배포
- 배포된 URL에서 주요 기능이 정상 동작하는지 확인
- 환경변수가 배포 환경에 올바르게 설정되었는지 확인

## Step 8.9. README 최종 점검 — 사용자에게 안내

- 배포 링크가 실제로 접속 가능한지 확인
- 프로젝트 실행 방법대로 따라했을 때 정상 동작하는지 확인
- 이미지가 모두 정상 렌더링되는지 GitHub에서 확인 (로컬 경로가 아닌 상대 경로)

## Step 8.10. GitHub 저장소 설정 — 사용자에게 안내

- Private repository 확인
- `.env.local`이 `.gitignore`에 포함되어 push되지 않는지 확인
- `plan/` 폴더 등 제출에 불필요한 파일이 포함되어 있지 않은지 확인

## Step 8.11. Collaborator 초대 — 사용자에게 안내

- 과제 안내에 명시된 GitHub 계정을 해당 저장소의 collaborator로 초대

## Step 8.12. 메일 발송 — 사용자에게 안내

- MAIL.md 내용을 메일로 발송
