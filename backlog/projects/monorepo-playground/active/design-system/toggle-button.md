# Toggle Button

> 구글 문서(`Button (Markup)`)에서 전사한 미검증 재료. 코드는 이미지에서 옮긴 것이라 오타·줄 빠짐 가능 — 구현 전 검수 필요.

## 동기

Like/Subscribe처럼 두 상태를 오가는 토글 버튼을, 도메인별 버튼(코스 좋아요·강사 좋아요·유튜브 구독 등)으로 확장 가능한 형태로 design-system에 두기 위한 인터페이스 스케치.

## Example

- Like / Unlike
- Subscribe / Unsubscribe

## Required features (interface)

도메인별 토글 버튼을 아래처럼 사용할 수 있도록 한다.

```tsx
<CourseLikeButton initial={course.like} pk={course.pk} />
<TeacherLikeButton initial={teacher.like} pk={teacher.pk} />
<YoutubeSubscribeButton initial={youtube.like} pk={youtube.pk} />
```

## Development

도메인별 prop(`initial`, `pk`)을 받는 래퍼와, 토글 동작을 일반화한 베이스 prop(`initial`, `toggleApi`)을 분리하면 다양한 토글 버튼을 확장할 수 있음.

```ts
export interface CourseLikeButtonProp {
  initial: boolean;
  pk: number;
}

interface LikeButtonProp {
  initial: boolean;
  toggleApi: (nextLike: boolean) => Promise<any>;
}
```
