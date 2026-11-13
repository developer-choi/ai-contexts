# check-links.mjs 사용법

`node scripts/check-links.mjs [<레포경로>…] [--json]` 또는 `npm run check:links [-- <레포경로>…]` — ai-contexts 레포 루트 기준 경로다.

레포마다 git이 추적하는 `.md` 전수에서 깨진 링크를 찾는다. 외부 HTTP는 요청하지 않는다. 레포가 크면 1분 가까이 걸린다.

## 인자

- `<레포경로>…` 볼 레포 루트. `~`로 시작하면 홈으로 푼다. 생략하면 현재 폴더 하나다
- 여러 레포를 함께 주면 서로의 GitHub URL(`origin` 원격 슬러그)을 로컬 파일로 풀어 확인한다
- `--json` 사람용 출력 대신 `{broken, external, orphans, mutual}` JSON을 낸다

git 레포가 아닌 경로는 md 0개로 넘어간다.

## 출력 (사람용)

- `README 깨진 링크 (Phase 4-readme 자동수정 대상)`·`비-README 깨진 링크 (Phase 2 보고만)` — refresh-projects 스킬이 이 구분대로 처리한다. 줄마다 `<레포>/<파일>:<줄>  [<분류>] <사유>`와 `→ <대상>`
- `모르는 외부 URL — 사용자 직접 확인` — 확인하지 않은 외부 링크. 사용자에게 넘긴다
- `아무도 안 가리키는 md — 존폐 판정 대상` — 고아 후보. 휴리스틱이라 오탐이 있다
- `서로 호명하는 md 쌍 — 단방향 cross-ref 위반 후보` — 링크·백틱 경로로 서로 가리키는 쌍. 오탐이 있다
- 끝 줄 `깨진 링크·미확인 외부 URL 없음.` 또는 `깨진 in-repo/내레포 링크 없음 …`

## exit code

- 깨진 링크가 하나라도 있으면 1, 없으면 0
- 외부 URL·고아·서로 호명하는 쌍은 exit code를 바꾸지 않는다
