# /pre-exit workflow 보강

세션에서 `/workflow`를 사용했거나 `plan/pr{N}/**` 산출물을 수정한 경우의 추가 회고. pre-exit 본 절차(Step 0~3)와 **함께** 수행한다 (대체 X, 추가 ○).

## 트리거 조건

다음 중 하나라도 해당하면 본 보강을 실행한다:

- `/pre-exit workflow` 명시 호출
- 무인자 `/pre-exit`에서 자동 감지: `git status --short` 또는 `git log --since="14 days ago" --name-only --pretty=format:` 결과에 `plan/pr{N}/**` 경로 존재
- 사용자가 본 세션에서 `/workflow` 호출 사실을 회상 가능

자동 감지 시, 보강 실행 전 "workflow 산출물 변경이 감지됐습니다. 보강 회고를 진행할까요?"로 사용자 확인을 받는다.

## 보강 회고

본 절차는 pre-exit Step 1(문제 리스트업) **전에** 수행한다. 발견된 누락은 Step 1의 문제 목록에 합류한다.

### 미탐색 cross-ref 추적

세션에서 Read한 `/workflow` 하위 `.md`에 있던 cross-ref 중 **이번 세션에 안 들어간 링크**를 식별하고 follow한다.

절차:
1. 세션 컨텍스트에서 Read한 `deploy/skills/workflow/**/*.md` 목록 회상
2. 각 파일 본문의 `[...](상대경로.md)` 패턴 추출
3. 추출된 링크 중 본 세션에서 Read 안 한 것 식별
4. 각 미탐색 링크 Read → 룰·체크리스트·산출물 요구사항 추출
5. 추출 룰을 산출물(`plan/pr{N}/**`) 또는 작업 결과에 grep으로 대조
6. 반영 안 된 룰 → Step 1 문제 목록에 추가

회상 누락 보완: 컨텍스트가 압축된 경우, `~/.claude/projects/.../session.jsonl`에서 `tool_use_id=Read` 항목을 추출해 보강.

### 첫 사용자 요청 vs 산출물 1:1 대조

세션 첫 사용자 메시지(또는 명시적 요구사항 메시지)를 회상하고, 산출물에서 각 요구사항 충족 여부를 체크한다.

절차:
1. 세션 첫 메시지 또는 작업 시작 요청 회상 (압축 시 jsonl `type=user` 첫 항목 직접 Read)
2. 요구사항을 N개 항목으로 분해
3. 각 항목을 산출물(plan/pr{N}/**, 코드, 커밋)에 대응
4. 대응 없는 항목 → Step 1 문제 목록에 추가

### 보고 vs 실제 변경 대조

세션 중 메인이 사용자에게 "X 수정함", "L41 변경", "Y 절 추가" 등으로 보고한 항목을 회상하고 `git log -p` / `git diff`와 대조한다.

절차:
1. 보고한 변경 항목 회상 (파일 경로 + 위치 + 변경 내용)
2. `git log --since="14 days ago" -p -- <path>` 또는 `git diff HEAD~N` 실행
3. 보고와 실제가 일치하는지 항목별 확인
4. 환각 보고(보고했지만 실제 안 변경) → Step 1 문제 목록에 추가

### cross-ref 적합성 점검

산출물(특히 `reference.md`, `decisions.md`)이 cross-ref한 외부 문서가 실제 적합한 행선지인지, AC 「단방향 cross-ref 원칙」(`ai-contexts/CLAUDE.md`) 위반이 없는지 점검.

절차:
1. 산출물의 `[...](경로.md)` 링크 추출
2. 각 링크 대상 Read → 산출물에서 인용한 내용이 실제 본문에 있는지 확인
3. 양방향 결합 점검: A→B 참조가 있을 때 B에서 A를 호명하는지 확인
4. 불일치·위반 → Step 1 문제 목록에 추가

### 담당 step 절차 실행 감사

「미탐색 cross-ref 추적」이 '안 읽은 링크 문서'를 잡는다면, 본 절차는 **진입한 step.md 본문에 인라인으로 박힌 [CRITICAL]·필수 절차의 *실행 여부***까지 본다. 특히 "판정·결론을 내리기 전에 읽어야 하는 단일 출처 문서"를 안 읽고 판정한 경우를 잡는다.

절차:
1. 본 세션에서 **진입한 step** 식별 (workflow SKILL.md 「작업 진행 순서」로 자기 세션의 step 범위 확인).
2. 각 step.md를 처음부터 끝까지 Read + step.md가 가리키는 **하위 문서**(`conventions/artifact/*`, `*-spec.md`, `stub.md` 등)도 전부 Read.
3. step.md·하위 문서에서 강제 절차를 항목으로 추출 — `[CRITICAL]`·"필수"·"~한다"·"~전에 …한다"(판정 전 선행 읽기) 형태. 예: Plan mode 진입, 컨벤션 1차 소스 직접 grep, stub 필요성 판정 전 `stub.md` 참조, 종료 시퀀스 각 항목.
4. 각 절차를 세션에서 **실제 실행**했는지 대조 — 미실행분을 Step 1 문제 목록에 추가.
5. 특히 **"X를 판정/결정하기 전에 단일 출처 문서 Y를 읽는다"**는 절차를 Y 미독 상태로 판정한 경우를 핵심 누락으로 분류한다.

사례: step-4 §4가 stub 룰 단일 출처로 `conventions/artifact/stub.md`를 가리키는데, 안 읽고 "stub 불필요"로 판정 → it.todo가 코드 stub으로 안 가고 `implementation.md` 산문으로 샘.

## 출력

본 보강은 별도 보고 섹션을 만들지 않는다. 발견 항목을 pre-exit Step 1 문제 리스트에 흡수시켜 일반 절차로 처리한다.

**「미탐색 cross-ref 추적」·「담당 step 절차 실행 감사」는 토큰 비용을 이유로 생략하지 않는다** — 미실행 절차·미독 단일출처 누락을 잡는 핵심 절차다(가벼운 버전으로 대체 금지).
