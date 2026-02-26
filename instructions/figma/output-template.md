# 레이아웃 구조 산출물 템플릿

리뷰 완료 후 AI가 마크업할 때 참고할 레이아웃 구조 명세.

`|` 기준으로 왼쪽은 배치, 오른쪽은 크기/간격. CSS 기본값은 생략.

---

## 예시

```
ListItem (display:flex, align-items:center | gap:12, padding:16)
├─ Icon (width:24, height:24)
├─ Content (display:flex, flex-direction:column | gap:4, flex:1)
│  ├─ Title
│  └─ Description
└─ Action (width:24, height:24)
```
