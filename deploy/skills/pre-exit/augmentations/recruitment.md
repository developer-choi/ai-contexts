<!-- deploy-anchor -->
이 파일은 `C:\Users\forwo\.claude\skills\pre-exit\augmentations`에 있다. 본문의 상대 경로는 이 경로를 기준으로 푼다.

# /pre-exit recruitment 보강

`private-playground` 서류지원·지원동기 세션의 추가 회고. **밖에서 떠온 원문 중 안 쓰인 것**과 **뒤에서 다시 판 조사**를 보고, 다음 회차에 무엇을 더 떠오고 무엇을 안 떠올지 정한다. pre-exit 본 절차와 **함께** 수행한다 (대체 X, 추가 ○).

[읽었는데 안 쓴 문서 쌓기](../read-usage.md)와 대상이 다르다 — 그쪽은 이 세션이 연 **프롬프트 문서**이고, 여기는 회사를 조사해 **파일로 떠온 외부 원문**이다.

## 트리거 조건

다음 중 하나라도 해당하면 본 보강을 실행한다:

- `/pre-exit recruitment` 명시 호출
- 무인자 `/pre-exit`에서 자동 감지: cwd가 `private-playground`이고, 세션에서 `/recruitment-application`·`/recruitment-motivation` 호출 사실을 회상 가능

자동 감지 시, 보강 실행 전 사용자 확인을 받는다.

## 회고 대상

### 떠왔는데 안 쓴 절

```
node C:\Users\forwo\WebstormProjects\main\private-playground\local\contexts\recruitment\scripts\site-usage.mjs {회사명}
```

기억으로 목록을 만들지 않는다 — 한 회차가 떠오는 원문은 수백에서 3,000줄이라, 떠올려 적으면 인상에 남은 몇 개만 올라온다.

**한 회차에 안 쓰였다는 것만으로는 안 떠올 이유가 못 된다.** 회사마다 재료가 있는 자리가 다르다 — 2026-09-16 다섯 회차에서 FAQ는 arkain의 주 재료였고 ggi에선 통째로 버려졌다. 그래서 올릴 것은 **페이지 한 개가 아니라 종류**이고, 그 종류가 회차를 가리지 않고 거듭 안 쓰였을 때만이다.

종류가 보이면 사용자에게 둘 중 하나를 고르게 한다.

- **안 떠온다** — PP `local/contexts/recruitment/scripts/check-site-scope.mjs`의 `EXCLUDED`에 행을 더한다. 더하기 전에 지난 회차 덤프에 돌려, 인용된 절이 걸리는지 본다(그 파일 첫 주석의 FAQ 사례가 그렇게 잡혔다)
- **그대로 둔다** — 아무것도 안 고친다. 다음 회차 회고가 같은 종류를 다시 만나면 그때 판단이 한 번 더 쌓인다

### 뒤에서 다시 판 조사

지원동기 세션의 최종 보고에 「서류 단계 조사가 못 대서 다시 판 자리」 줄이 있으면(없으면 이 절은 건너뛴다) 그 자리마다 판정한다.

- **그 회사만의 사정인가, 판을 가리지 않는 자리인가.** 앞이면 아무것도 안 고친다. 뒤면 PP `local/skills/recruitment-company-analysis/SKILL.md` 「입력 자료 수집」이 여는 자리 목록에 그 자리를 올릴지 제안한다
- 3단(업계·법령·기사)을 뒤늦게 연 회차는 **여는 조건이 늦게 난 것인지, 1·2단을 덜 판 것인지** 가른다. 뒤면 고칠 자리는 3단 조건이 아니라 회사 자기 진술을 찾는 순서다

### 재료가 없어서 난 반려

지원동기 시안이 「재료 부족」으로 반려된 건이 있으면, 그 재료가 **떠온 원문에는 있었는데 회사 분석이 안 옮긴 것인지** 아니면 **떠오지도 않은 것인지** 가른다. 앞이면 조사 범위가 아니라 재료 절을 채우는 자리의 문제다.

## 회고하지 않는 것

- 지원동기 문장의 표현·오글거림 — 그 판정은 회차 안에서 이미 끝났고, 낱말은 오글 코퍼스가 받는다
- 회차 자체의 기록 — 무슨 일이 있었는지는 남기지 않는다(PP `application/motivation/flow/finish.md` 4.11). 여기서 남기는 것은 규칙 변경 제안뿐이다
- 공고 원문의 모집요강·접수기간·복리후생 절 — 서류지원 요건 점검이 읽고도 인용을 안 남기는 자리라, 사용률 스크립트에 안 쓰인 것으로 잡혀도 빼지 않는다

## 반영 위치

- 안 떠올 종류 → PP `local/contexts/recruitment/scripts/check-site-scope.mjs`의 `EXCLUDED` (+ 지난 덤프에 돌려 확인)
- 새로 여는 자리 → PP `recruitment-company-analysis` SKILL.md 「입력 자료 수집」
- 그 밖의 절차 문제 → 「문제 리스트업 + 규칙화」의 문제 목록
- 한 세션에서 못 정할 것 → 백로그 `projects/private-playground/active/recruitment/`

## 출력

별도 보고 섹션 없음. 발견 항목은 「문제 리스트업 + 규칙화」의 문제 목록에 흡수한다.
