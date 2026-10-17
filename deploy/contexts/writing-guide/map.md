# writing-guide

## 역할

글쓰기 자산을 둘 자리를 정한다.

- 모든 글에 거는 규칙: `common.md`. 따로 서는 주제면 루트에 새 파일
- 사용자가 반려한 낱말·문구: `rejected.md`
- 패키지 frontmatter 형식: `package-format.md`
- 규칙의 Bad/Good 사례: `examples/` 아래 주제가 맞는 파일
- 글 종류 하나에만 거는 것: `types/<type>/`
  - 골격·칸: `template.md`
  - 그 종류의 작성 규칙: `guide.md`
  - 그 종류만 write-doc 단계에서 더 도는 절차: `steps.md`
  - 그 종류의 파일이 부르는 자료: 그 type 폴더 안
  - subtype에만 거는 규칙·절차·자료는 `types/<type>/<subtype>/`에 같은 이름으로 둔다
