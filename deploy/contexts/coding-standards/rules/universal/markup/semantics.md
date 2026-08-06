# 시맨틱 마크업 규칙

태그는 **화면에 어떻게 보이느냐가 아니라 그 내용이 무엇이냐**로 고른다. 굵게·기울임·여백·크기는 전부 CSS가 맡는다.

각 태그의 근거·상세는 KA `knowledge/frontend/html/`에 있다.

## 내용별 태그 판정

| 마크업할 내용 | 태그 |
|---|---|
| 문단 | `<p>` |
| 구획의 제목 (레벨은 위계 순서대로, 건너뛰지 않음) | `<h1>`~`<h6>` |
| 순서가 뜻을 갖는 목록 | `<ol>` |
| 순서가 뜻이 없는 목록 | `<ul>` |
| 용어와 그 설명의 짝 | `<dl>` + `<dt>`/`<dd>` |
| 페이지의 핵심 내용 (페이지당 하나) | `<main>` |
| 떼어내도 그 자체로 완결되는 덩어리 | `<article>` |
| 하나의 주제로 묶이는 구획 | `<section>` |
| 본문과 간접적으로만 관련된 곁가지 | `<aside>` |
| 구획의 도입부 묶음 | `<header>` |
| 구획의 마무리 묶음 (저작권·연락처·잔글) | `<footer>` |
| 페이지·구획을 잇는 주요 링크 묶음 | `<nav>` |
| 실제 URL로 이동하는 것 | `<a href="...">` |
| 그 자리에서 동작을 실행하는 것 | `<button>` |
| 연락처 | `<address>` |
| 날짜·시각 | `<time datetime="...">` |
| 말할 때 힘이 들어가는 부분 | `<em>` |
| 중요·심각·긴급한 부분 | `<strong>` |
| 위 어디에도 해당하지 않는 덩어리 | `<div>` (블록) / `<span>` (인라인) |

## div·span은 남는 것만 맡는다

`<div>`·`<span>`은 뜻이 없는 요소라, 위 표에서 맞는 태그를 찾지 못했을 때만 쓴다. 스타일·레이아웃을 붙일 자리가 필요하다는 것은 이 태그를 고를 근거가 되지 못한다 — 뜻이 맞는 태그에 그 스타일을 붙인다.

```tsx
// ❌ Bad
<div className={styles.desc}>배송은 영업일 기준 2~3일 걸립니다.</div>
<span className={styles.author}>최유진</span>

// ✅ Good
<p className={styles.desc}>배송은 영업일 기준 2~3일 걸립니다.</p>
<address className={styles.author}>최유진</address>
```

## 갈 곳 없는 `<a>`를 버튼으로 쓰지 않는다

`href`에 `#`·`javascript:void(0)`를 넣고 클릭 이벤트를 붙였다면 그것은 이동이 아니라 동작이므로 `<button>`이다. 반대로 `<div>`·`<span>`에 `onClick`을 달아 버튼을 만드는 것도 같은 위반이다 — 키보드로 누를 수 없고, 화면 낭독기가 버튼으로 읽지 않는다.

```tsx
// ❌ Bad
<a href="#" onClick={openDialog}>상세 보기</a>
<div className={styles.btn} onClick={submit}>제출</div>

// ✅ Good
<button type="button" className={styles.btn} onClick={openDialog}>상세 보기</button>
<button type="submit" className={styles.btn}>제출</button>

// ✅ Good — 실제로 이동하면 <a>
<a href="/orders/123">상세 보기</a>
```

## 헤딩 레벨은 글자 크기 조절 수단이 아니다

`<h1>`~`<h6>`의 숫자는 문서 안에서의 위계이지 크기가 아니다. 작게 보이고 싶어서 `<h4>`를 고르거나, 크게 보이고 싶어서 `<h2>`를 고르지 않는다. 레벨을 건너뛰지도 않는다.

```tsx
// ❌ Bad — 크기 때문에 h2 다음이 h4
<h2>주문 내역</h2>
<h4>결제 수단</h4>

// ✅ Good — 위계대로 h3, 크기는 CSS로
<h2>주문 내역</h2>
<h3 className={styles.small}>결제 수단</h3>
```

## 시각 효과를 노리고 em·strong을 쓰지 않는다

기울임이 필요해서 `<em>`, 굵게가 필요해서 `<strong>`을 고르는 것은 위반이다. 이 둘은 말의 힘과 중요도를 나타내는 태그이므로, 화면에서 그 표시를 뗄 수도 붙일 수도 있어야 한다.

`<b>`·`<i>`·`<u>`는 위 표의 어떤 태그도 맞지 않는데 관용적으로 그 서체를 쓰는 경우(학명, 다른 언어 어구, 요약문의 핵심어 등)에 한해 쓴다. 특히 `<u>`는 링크로 오인되므로 밑줄이 다른 뜻을 갖는 자리에만 쓴다.

## br·hr로 여백이나 구분선을 만들지 않는다

`<br>`은 줄바꿈 자체가 내용의 일부일 때만 쓴다 (주소, 시). `<hr>`은 주제가 바뀌는 자리를 나타내며, 가로줄을 그리려고 쓰지 않는다. 간격·구분선은 CSS가 맡는다.

```tsx
// ❌ Bad — 문단 사이를 띄우려고 br, 선을 그으려고 hr
<p>첫 문단</p>
<br /><br />
<hr />
<p>둘째 문단</p>

// ✅ Good
<p className={styles.paragraph}>첫 문단</p>
<p className={styles.paragraph}>둘째 문단</p>
```
