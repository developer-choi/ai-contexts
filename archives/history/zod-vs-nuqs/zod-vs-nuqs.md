# zod vs nuqs — URL Search Params 관리 전략 비교

## nuqs를 쓰는 이유 (일반적 주장)

- URL Search Params를 편하게 READ / WRITE 할 수 있음
- 타입, 변환을 중앙관리 할 수 있음.
- 이걸로 Server / Client 둘 다 지원이 쉽게 가능함.

---

## 핵심 패턴 비교

### Read — 클라이언트

```ts
// zod + URLSearchParams
const searchParams = useSearchParams();
const parsed = safeParsePartial(BoardListFilterSchema, queryString.parse(searchParams.toString()));

// nuqs
const [searchParams] = useQueryStates(boardSearchParams);
```

메커니즘이 동일하다. "중앙에 정의해둔 스키마를 통해 파싱한다"는 구조가 같고, zod에서는 그게 Schema, nuqs에서는 그게 SearchParams 파서 객체일 뿐이다.

### Read — Server Component

```ts
// zod
const parsed = PaginationParamsSchema.parse(searchParams); // coerce로 string → number 변환

// nuqs
const cache = createSearchParamsCache(boardSearchParams);
const { page } = cache.parse(searchParams);
```

서버에서는 zod만으로 충분하다. nuqs 서버 유틸은 클라이언트 파서 정의를 재사용하기 위한 편의 기능일 뿐이다.

### Write — 클라이언트

```ts
// zod + URLSearchParams
const next = new URLSearchParams(location.search);
next.set('page', page.toString());
router.push(`/path?${next.toString()}`);

// nuqs
setSearchParams({ page }, { history: 'replace' });
```

쓰기에서는 nuqs가 더 간결하다. 다만 파라미터 수가 적으면 체감 차이가 크지 않다.

---

## zod가 하는 것들

| 기능 | 예시 |
|------|------|
| 타입 검증 | `z.enum()`, `z.string().min(1)` |
| 형변환 | `z.coerce.number()`, `.transform()` |
| 기본값 | `.default(1)` |
| null 처리 | `.nullable()`, `.optional()` |
| URL 배열 정규화 | `z.union([z.string().transform(s => [s]), z.array(z.string())])` |

Read/파싱/변환/기본값은 zod 하나로 전부 커버 가능하다.

---

## 결론 — nuqs 도입이 정당한가?

### nuqs의 실질적 차별점

- **중앙관리**: 파서 정의 하나(`boardSearchParams`)로 클라이언트 Read/Write, 서버 Read를 모두 커버. zod는 쓰기(URL 업데이트)를 커버하지 못해 파서 정의를 완전히 공유할 수 없다.

### 트레이드오프

- nuqs 도입의 1순위 명분은 **클라이언트-서버 단일 파서 정의를 통한 중앙관리**다.
- 그러나 zod도 동일한 스키마로 클라이언트/서버 Read를 커버하고, Write는 URLSearchParams로 처리하면 실질적으로 같은 중앙관리가 된다.
- nuqs가 추가로 주는 이점은 Write DX 정도로 좁혀진다.

그래서 zod랑 nuqs 둘다 쓰면 중앙관리 파일이 **2배**가 된다.

### 결과 

- 파라미터가 많은 일부 페이지를 위해 전체 프로젝트에 라이브러리를 도입하는 건 과도하다.
- 그 일부 페이지만 nuqs를 쓰면 패턴이 두 가지로 갈려 오히려 혼란이 생긴다.
- 복잡한 페이지도 결국 zod + URLSearchParams로 해결 가능하다.

**→ 일관성을 위해 zod + URLSearchParams 단일 패턴으로 통일하는 것이 합리적이다.**
