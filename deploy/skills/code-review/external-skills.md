# 외부 스킬 고르기

메인이 2단계에서 읽은 diff를 아래 표의 「리뷰 대상」 칸에 대어 **외부 베스트 프랙티스 스킬**을 고른다.

| 리뷰 대상 | 외부 스킬 |
|---|---|
| React/Next.js 컴포넌트, 데이터 페칭, 번들 최적화, 성능 | `vercel-react-best-practices` |
| 합성 패턴 리팩토링 (boolean prop 다수, compound, render props, context) | `vercel-composition-patterns` |

메인은 고른 스킬의 본문을 읽지 않는다.
그 스킬을 맡은 External-Skill Reviewer에게 스킬 이름과 `{{skill_dir}}/../<name>/SKILL.md` 경로를 넘겨 직접 로드하게 한다.

외부 스킬이 설치돼 있지 않거나 리뷰어가 「로드 못 함」으로 보고하면, 사용자에게 https://vercel.com/docs/agent-resources/skills 에서 설치하도록 안내하고 리뷰는 이어 간다.
