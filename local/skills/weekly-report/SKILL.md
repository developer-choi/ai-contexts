---
name: weekly-report
description: >
  AC·DP·KA·MP·DC·PP 6개 레포의 커밋을 기간별로 조회해 주간 리포트 형태로 요약한다.
  무슨 스킬을 만들었는지, 어떤 기능을 구현했는지, 어떤 정비를 했는지 리마인드 용도.
  "/weekly-report", "주간 리포트", "이번 주 뭐했지", "지난 주 커밋 요약", "이번 달 작업 정리" 등의 요청 시 사용.
---

## 레포 경로

| 약어 | 경로 |
|------|------|
| AC | `~/WebstormProjects/main/ai-contexts` |
| DP | `~/WebstormProjects/main/dsa-playground` |
| KA | `~/WebstormProjects/main/knowledge-archive` |
| MP | `~/WebstormProjects/main/monorepo-playground` |
| DC | `~/WebstormProjects/my-else/developer-choi` |
| PP | `~/WebstormProjects/my-else/private-playground` |

## 기간 파싱

args가 없으면 **이번 주 토~금** (가장 최근 토요일 00:00 ~ 다음 금요일 23:59)을 기본값으로 사용한다. 주간 토큰 만료일이 금요일이므로 토~금을 한 주 단위로 사용한다.

args 예시:
- `2026-06-18 ~ 2026-06-24` — 절대 날짜 범위
- `2026-06-18` — 해당 날짜가 속한 주 (토~금)
- `2주` / `2 weeks` — 오늘 기준 N주 전부터 오늘까지

날짜 계산은 PowerShell로 한다:

```powershell
# 이번 주 토요일 구하기 (토~금 기준)
$today = Get-Date
$dow = [int]$today.DayOfWeek  # 0=일, 1=월 ... 6=토
$daysFromSat = ($dow + 1) % 7   # 토=0, 일=1, 월=2, ..., 금=6
$saturday = $today.AddDays(-$daysFromSat).Date
$friday = $saturday.AddDays(6).Date
$since = $saturday.ToString("yyyy-MM-dd")
$until = $friday.ToString("yyyy-MM-dd 23:59:59")
```

## 커밋 수집

각 레포에서 git log를 실행한다. `.git`이 없거나 경로가 없으면 해당 레포를 건너뛴다.

```powershell
git -C <path> log --no-merges `
  --after="<since> 00:00:00" --before="<until> 23:59:59" `
  --format="%h %s"
```

워크트리(`ai-contexts-backlog`, `*-tradeoff`)는 제외한다 — 경로 목록에 없으므로 자동 제외.

## 리포트 형식

리포트는 3개 섹션으로 구성된다. 해당 내용이 없는 섹션은 출력하지 않는다.

```
# 주간 리포트 — <since> ~ <until>

## 이번 주 한 일
커밋 전체를 의미 단위로 클러스터링. 레포 구분 없이 작업 주제별로 묶는다.
각 클러스터는 1~2줄로 압축. 레포 태그([AC], [MP] 등)는 2개 이상 레포가 섞인 경우에만 붙인다.

예:
- [AC] 훅 정합 lint 3종 추가 — coupling 검출·map.md 동기화·hook 존재 확인
- [MP] 모노레포 초기 세팅 — turborepo 설치 및 workspace 구성

## 새로 생긴 도구
이번 기간 내 신규 생성된 파일 중 아래 경로에 해당하는 것만 추출한다:
- 스킬: `deploy/skills/*/SKILL.md`, `local/skills/*/SKILL.md`
- 룰: `deploy/rules/`
- 컨텍스트: `deploy/contexts/`

출력 형식:
- 스킬: <이름> (신규 / 개선)
- 룰: <파일명> — <변경 요약>
- 컨텍스트: <파일명> — <변경 요약>

```

## 주의

- 커밋이 하나도 없으면 "커밋 없음" 한 줄로 끝낸다.
- 커밋 메시지는 원문 그대로 사용한다 (번역·의역 금지).
- "이번 주 한 일" 클러스터는 묶음당 1~2줄 엄수. 길어지면 안 읽힌다.
