# 세션이 남긴 것 정리

이 세션이 만든 것을 정리한다.

## 미커밋 변경

있으면 목록을 보이고 커밋할지 묻는다.

## 커밋

이 세션이 쌓은 커밋을 작업 단위로 합친다. 합친 뒤에도 내용은 그대로여야 한다.
합치다 hunk가 빠져도 로그는 깔끔해 보이니, 합치기 전에 HEAD의 SHA를 잡아 두고 합친 뒤 `node {{skill_dir}}/scripts/session-state.mjs squash-check --repo <레포 경로> --before <그 SHA>`로 맞댄다.

## 개발 서버

띄웠으면 끈다 — 셸만 멈추면 npm·node가 포트를 잡고 남으니 `node {{contexts}}/stop-servers.mjs stop --port <포트>`로 끈다.

## 워크트리

만들었으면 지운다.

## 브라우저 탭

열었으면 닫는다.
