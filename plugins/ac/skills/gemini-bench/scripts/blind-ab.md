# blind-ab.mjs 사용법

```
node "${CLAUDE_SKILL_DIR}/scripts/blind-ab.mjs" build <쌍 JSON> --out <폴더>
node "${CLAUDE_SKILL_DIR}/scripts/blind-ab.mjs" decode <키 JSON> <결과 JSON|->
```

두 버전의 산출물을 문항마다 A/B로 섞은 블라인드 비교 페이지를 만들고, 사용자가 선택한 A/B를 버전 이름으로 되돌린다.

## build

`<쌍 JSON>` 꼴:

```json
{
  "title": "페이지 제목",
  "labels": ["claude", "gemini"],
  "format": "HTML",
  "items": [
    { "id": "카드 1", "context": "양쪽 위에 함께 보일 원문 (선택)", "versions": { "claude": "…", "gemini": "…" } }
  ]
}
```

- `labels`: 비교할 두 버전의 이름. `versions`의 키와 같아야 한다
- `format`: `HTML`(기본)이면 `context`·`versions` 값을 HTML로 넣고, `TEXT`면 줄바꿈을 살린 글로 넣는다

`--out` 폴더에 `blind.html`(페이지)과 `blind-key.json`(문항마다 A·B가 어느 버전인지)을 저장하고, 두 절대경로를 stdout에 출력한다.

## decode

`<결과 JSON>`은 사용자가 페이지의 [결과 복사]로 붙여넣은 글이다. `-`이면 표준입력에서 읽는다. 앞뒤에 다른 글이 섞여 있어도 된다.

`{"rows":[{"id","winner","good","note"}],"tally":{"versions","TIE","NEITHER","UNPICKED","good"}}`를 stdout에 출력한다.

- `winner`: 하나만 좋음이면 그 버전 이름, 둘 다 좋음이면 더 좋다고 선택한 버전 이름이나 `TIE`, 둘 다 나쁨이면 `NEITHER`, 덜 선택했으면 `UNPICKED`
- `good`: 좋음으로 선택된 버전 이름 목록. `tally.good`은 버전마다 그 수를 센다

실패하면 stderr에 사유와 이 문서 경로를 출력하고 exit 1.
