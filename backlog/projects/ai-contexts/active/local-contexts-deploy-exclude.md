---
target: scripts/local-system/sync-local-skills.js
---

# local/contexts를 로컬 배포에서 제외 (keystone)

## 동기

로컬 스킬의 supporting file을 레포당 `local/contexts/` 한 곳에 모으는 컨벤션(= AC `deploy/contexts/`의 로컬판). keystone 본체(`LOCAL_DEPLOY_EXCLUDE`에 `'contexts'` 추가)는 master `fc4a672`로 반영 완료 — 아래는 그 후속 저우선 항목만 남았다.

## [draft] (저우선) 스킬 옆 개발문서 비배포 처리

scope: global (전 레포 local/skills 스캔)

스킬이 읽지 않는 개발용 문서들이 `local/skills/` 하위에 있어 배포 시 3벌이 된다(2026-06-29 실측):
- AC: `local/skills/doc-router/README.md`, `local/skills/refresh-prompts/STATUS.md`, `local/skills/tech-trends/README.md`
- KA: `local/skills/explain/STATUS.md`

동기: 이들도 grep 노이즈에 기여. 핵심 아이디어: contexts가 아니므로 `local/contexts/`로 옮기는 건 결이 안 맞고, (a) 그냥 두거나 (b) `local/docs/` 같은 비배포 위치를 따로 만들거나 (c) `LOCAL_DEPLOY_EXCLUDE`에 추가 가능한 별도 디렉토리로 빼는 선택지가 있다. 케이스별 판단 필요 — keystone 적용 후 노이즈가 실제로 거슬리면 그때 정한다.
