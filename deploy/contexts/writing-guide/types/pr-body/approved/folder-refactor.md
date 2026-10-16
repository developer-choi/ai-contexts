# 폴더·구조 리팩터

https://github.com/developer-choi/plan-for-myself/pull/52 · 2026-10-13 승인

`````markdown
# 개인 프로젝트들과 같은 폴더 컨벤션으로 웹 폴더를 재배치

제 개인 프로젝트들은 모두 하나의 코딩 컨벤션을 따르도록 맞추고 있습니다. 프로젝트를 오가도 파일이 어디 있는지 다시 익히지 않아도 되기 때문입니다.

폴더 구조 컨벤션은 [monorepo-playground의 폴더 구조 문서](https://github.com/developer-choi/monorepo-playground/blob/master/docs/patterns/folder-structure/FolderStructure.md)에 있습니다.

이 PR에서 웹 앱 `src`를 이 컨벤션에 맞춰 옮겼습니다. 파일 위치와 import 경로만 바뀌었고 동작은 그대로입니다.

## 컨벤션대로 도메인과 shared로 나누기

**역할(components·styles·utils)별로 나뉘어 있던 최상위 폴더를 도메인별로 다시 나눴습니다.** 컨벤션은 최상위를 도메인 단위로 나누고, 어느 도메인에도 속하지 않는 공통 모듈은 `shared/`에 두게 합니다.

```
# 전                              # 후
src/                              src/
├── app/                          ├── app/
├── components/                   ├── auth/
│   ├── error/                    ├── server/
│   ├── logo/                     │   ├── db/
│   └── setting/                  │   ├── study-record/
├── styles/                       │   └── user/
├── types/                        └── shared/
└── utils/service/                    ├── components/
    ├── auth/                         ├── styles/
    ├── db/                           └── types/
    ├── study-record/
    └── user/
```

- 로그인·세션·페이지 접근 판정 코드는 `auth/` 도메인으로 모았습니다.
- 에러 안내·로고·Provider처럼 도메인에 속하지 않는 컴포넌트와 스타일·타입은 `shared/`로 옮겼습니다.
- `components/error/` 같은 컴포넌트별 서브폴더는 없애고, 컴포넌트 파일을 `shared/components/` 바로 아래에 두었습니다. 컨벤션이 컴포넌트 서브폴더를 두지 않도록 정해 두었기 때문입니다.
- `index.ts`는 `next-auth.ts`·`pool.ts`·`repository.ts`처럼 역할 이름으로 바꿨습니다. `index.ts`가 여러 폴더에 있으면 에디터 탭에 같은 이름이 여럿 떠서 구분이 안 됩니다.

## 컨벤션에 없는 server 폴더

**컨벤션에 없는 `server/`를 하나 더 두고, 나중에 별도 백엔드로 떼어 갈 코드를 여기 모았습니다.** 여기 들어가는 코드는 아래와 같습니다.

- DB 연결
- 사용자·기록 쿼리
- 기록 요청 검증
- API 응답

`auth/`는 `server/`에 넣지 않았습니다. next-auth 설정과 페이지 접근 판정은 Next 안에서 도는 코드라, 백엔드를 떼어 가도 웹에 남기 때문입니다.

`server/`를 따로 두면서 기록 도메인 코드는 두 폴더로 나뉩니다. 뒤이은 작업에서도 기록 화면 코드는 `study-record/`에, 그 기록을 읽고 쓰는 쿼리는 `server/study-record/`에 두었습니다.
`````
