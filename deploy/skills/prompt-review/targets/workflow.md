# Workflow 특화 체크리스트

`skills/workflow/`를 리뷰할 때 더 보는 것.

## 산출물을 쓸지 말지 고르게 읽히는 말

[realize-plan 「파생 산출물」 표](../../workflow/steps/realize-plan.md#3-파생-산출물) 같은 산출물 정의에 「옵션」처럼 써도 되고 안 써도 되는 것으로 읽히는 말이 있으면, 쓰는지 안 쓰는지를 정해 적게 한다.

## 산출물 라이프사이클 폴더

`persistent/`·`retained/`·`consumable/` 폴더가 곧 그 산출물을 언제 지울지를 나타낸다(정의는 [plan-folder 「라이프사이클 규칙」](../../workflow/conventions/plan-folder.md#라이프사이클-규칙)).
그래서 step 파일 본문에 「어느 step 뒤에 지운다」를 따로 적지 않고, 폴더 분류가 맞는지를 본다.

- `pr{N}/`이나 `background/` 바로 아래에 폴더 분류 없이 놓인 산출물이 있으면, 분류하거나 왜 분류하지 않았는지 적게 한다.
- 기본은 `consumable/`이다. 여러 step이 쓰고 그 컨텍스트(BG 또는 PR)가 끝나면 버려도 되면 `retained/`, 끝나도 가치가 있으면(회사 맥락에 의존한 결정 등) `persistent/`다.
  위로 올린 산출물은 그 이유가 그 산출물을 정의한 곳(plan-folder 「폴더 트리」의 항목 주석이나 그 산출물 문서)에 적혀 있는지 본다.
- `consumable/`인데 여러 step이 나눠 쓰기 어려우면 `retained/`로, `persistent/`인데 그 컨텍스트(BG 또는 PR) 안에서만 쓰이면 `retained/`로 옮기게 한다.

## realize-plan과 implement의 코드 경계

둘 다 코드를 쓰므로 경계가 흐려지기 쉽다. 경계 자체는 workflow `conventions/artifact/stub.md`가 정한다. 리뷰에서는 이것을 본다.

- realize-plan이 stub으로 넘긴 부분의 내부 함수·컴포넌트까지 stub이 있는가. 없으면 로직 구조가 stub에 안 드러난다.
- realize-plan stub에 긴 함수 본문이 들어 있지 않은가. 길면 한글 명세로 바꿀 후보다.
- implement가 외부 공개 시그니처를 바꾸거나, 결정된 분기·매핑·상수를 새로 넣지 않았는가. 그랬다면 realize-plan에서 빠진 것이다.

## step 순서와 의존

step·세션을 더하거나 옮기거나 순서를 바꿀 때, 「X 다음에 Y」로 적힌 것이 정말 산출물 의존인지 본다. 산출물 파일 단위로 따져서, 의존이 없는데 순서가 박혀 있으면 병렬로 풀게 한다. 새 step이 기존 앞뒤 관계를 깨지 않는지도 본다.

## step 파일의 순서 절과 사건 절

위에서부터 진행하는 순서 절과, 어떤 일이 생길 때 발동하는 사건 절이 한 step 파일에 같이 있으면, 순서 절이 뒤 절의 이름을 부르거나 뒤 절이 할 일을 미리 정하지 않는지 본다(「다음 단계로 넘어가기 전에」처럼 때만 가리키는 말은 괜찮다). 그런 내용은 대개 사건 절로 옮기거나 지울 것이다.

## step과 스킬 연결

- 다른 스킬을 부르는 step이 그 스킬 SKILL.md로 가는 링크를 두는가. 새로 생긴 스킬을 부르는 곳도 그런가
- 각 step 파일이 적은 산출물 경로가 다음 step이 읽는 경로와 맞는가
- 파생 산출물이 그것을 읽어야 할 에이전트에게 실제로 넘어가는가
- 에이전트가 폴더를 스스로 뒤지지 않고, Lead가 넘긴 경로만 읽는가. 마크업 구현자와 기능 구현자의 맥락이 섞이지 않는가

## impl-review-loop 연결

- 구현자를 부르는 step이 구현자마다 구현자·재료·정답 대조 A·규칙검사 B·커밋 단위를 넘기는가
- 축 A 없이 끝나는 호출이 없는가. 축 B가 원본과 맞는지를 직접 판정하지 않고 축 A로 넘기는가
- 정답 대조 A의 정답 위치가 [impl-review-loop 「입력」](../../workflow/impl-review-loop/SKILL.md#입력-호출자가-주입)의 「재료 ≠ 정답 대조 A」가 정답으로 치는 것인가. AI가 쓴 md 산출물(decisions.md 등)을 정답 위치로 두면 지적한다
- 리뷰어가 code-review SKILL.md 절차를 따르는가

## 컨벤션

- `contexts/coding-standards/{rules,principles}/` 아래 규칙마다 realize-plan이나 code-review 중 한 곳에서는 걸리는가. implement에 규칙 참조가 없는 것은 지적하지 않는다.
- workflow가 만드는 코드(stub·구현)의 컨벤션은 `deploy/skills/workflow/conventions/` 한 곳에 두고, step·다른 스킬은 링크만 두는가. `/code-review`가 그 컨벤션을 받아 읽는가.
