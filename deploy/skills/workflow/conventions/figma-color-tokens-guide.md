# 아이콘·이미지의 색은 인라인이 아니라 `get_variable_defs`로 가져온다

## 적용 조건

- 실무 프로젝트만 (채용과제는 피그마 dev 권한이 없으므로 불가)
- 피그마 MCP 연결 상태

## 규칙

- 텍스트 fill은 `get_design_context` 응답 코드에 hex로 박혀 오므로 그대로 쓴다.
- 아이콘·일러스트·로고 등 컴포넌트 인스턴스는 이미지 에셋으로 export 되며 fill 변수가 응답에서 누락된다. 해당 노드 id로 `get_variable_defs`를 호출해 hex를 확정한 뒤 쓴다.
- 응답 상단 styles 목록(파일 전체 토큰 카탈로그)에서 그럴듯한 톤을 골라 추론으로 메우지 않는다.

## 예시 — Figma `Purchase` 파일 `7006:1377` (공통 혜택)

응답 코드에 박혀서 온 색 (그대로 사용):

```tsx
<p className="... text-[#f56f16] ...">라스트 런 추가 할인</p>
<p className="... text-[#646464] ...">수강권 이월</p>
<p className="... text-[#898989] ...">만료 전 7일 이내에 ...</p>
```

아이콘은 hex 없이 이미지 에셋으로만 옴 (이 응답만 봐서는 색 미상):

```tsx
<div ... data-name="Checkmark Circle">
  <img src={imgShape1} />
</div>
```

해당 노드(`7006:1385`)에 `get_variable_defs` 호출:

```
{ "Grey/4": "#898989" }
```

→ 비강조 체크 원 색 = `#898989` 로 확정.
