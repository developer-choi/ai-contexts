# 파일을 쉽게 찾을 수 있어야 한다

## 컨셉 (1줄)

폴더 구조의 진짜 목표는 "새 코드를 어디에 둘지, 기존 코드가 어디 있을지 예측 가능하게 만드는 것" — FSD의 segment 네이밍 규칙(why가 아니라 what을 금지)에 방향은 동의하지만 그 해결 방법에는 동의하지 못한다는 문제 제기.

## 재료

#### FSD 규칙

[https://feature-sliced.design/docs/get-started/tutorial#reuse-generic-code](https://feature-sliced.design/docs/get-started/tutorial#reuse-generic-code)

> Those are just a few examples of segment names in Shared, but you can omit any of them or create your own.
> The only important thing to remember when creating new segments is that segment names should describe **purpose (the why), not essence (the what).**
> Names like "components", "hooks", "modals" should not be used because they describe what these files are, but don't help to navigate the code inside.
> This requires people on the team to dig through every file in such folders and also keeps unrelated code close, which leads to broad areas of code being affected by refactoring and thus makes code review and testing harder.

- 방향성은 동의하지만,
- 그걸 해결하는 방법 (why, what)은 동의하지 못하겠음.
- 잘 이해도 안 되고…

#### 세부 목표 1. 예측 가능하게 만들어야 한다.

아래 폴더에는 어떤 파일들이 들어가 있을지 상상해보세요.

```
1  features + auth + ui = ?
5  features + notification + lib = ?
7  features + product + model = ?
8  features + review + ui = ?
9  features + order + api = ?
10 features + user + config = ?
11 entities + auth + api = ?
14 entities + search + lib = ?
15 entities + notification + ui = ?
16 widgets + auth + ui = ?
20 widgets + notification + ui = ?
21 features + product + ui = ?
25 features + notification + model = ?
26 entities + order + api = ?
29 entities + review + config = ?
```

##### 반대로, 새 코드를 어디에 둬야 할지 모른다면, 이 목표를 달성하지 못했다는 증거

Atomic Pattern이 그랬음.

![ProductCard는 어디에 두어야 할까요? molecules일까? organisms? 노트북 앞에서 고민하는 사람 일러스트](placeholder)
<!-- 일러스트(다이어그램), PDF p.2 참조. 노트북 앞에 앉은 사람의 생각 풍선: "ProductCard는 어디에 두어야 할까요? molecules일까? organisms?" -->

## 구상 (선택)

- 글의 핵심 주장: 폴더 구조의 목표는 "예측 가능성"(새 코드를 어디 둘지, 기존 코드가 어디 있을지 바로 안다)이다. FSD의 segment 네이밍 규칙(why를 기술하라, what을 금지하라)은 방향엔 동의하나 해결 방법엔 동의 못 함 → 대안 제시가 본문에 아직 없음(미완성).
- 흐름 초안: FSD 규칙 인용 → 동의/비동의 지점 → "세부 목표 1: 예측 가능성" → Atomic Pattern이 실패한 사례(ProductCard를 molecules/organisms 중 어디 둘지 모름) → (이후 본인 대안 — 미작성).
- 발행 전 처리:
  - 본문이 문제 제기 단계에서 끝남 — FSD/Atomic 비판에 대한 본인 대안·해결책 본문 미작성. 채워야 함.
  - "세부 목표 1"이라는 번호 — 세부 목표 2 이후가 원본에 없음. 시리즈로 갈지 단일 글로 갈지 결정 필요.
  - 일러스트(PDF p.2)는 직접 그린/생성한 이미지로 보임 — 발행 시 이미지 자산 처리 또는 텍스트 대체 결정 필요.
