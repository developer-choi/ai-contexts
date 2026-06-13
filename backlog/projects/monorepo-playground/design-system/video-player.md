# Video Player

## References

상위문서: 상세페이지 (https://docs.google.com/document/d/1duzMjnxNUclvwnPPkW7HbHTiWVM-oOgxbih00O3sFmI/edit?tab=t.0)

관련문서:
- window key down (shortcut 구현방법): https://docs.google.com/document/d/1uZLOByowdB8hPDVzDHaSkaBij8T08LOkkobxGi8jAHs/edit#heading=h.oavl8n6ygsri
- CustomImage: https://docs.google.com/document/d/1HOZvxrwpqqsXWs_-1JT624iDEKQSeoiv1jn6HkqTyTU/edit?tab=t.0

## TODO

- auto pause out viewport 기능을 강제로 집어넣기. 내부적으로.
- 요구사항 정의부터 새로 하기. 다른 문서에 많이 적던 required features 이런거. 예를 들면 단축키 기능 지원하기 하면서 단축키 기능 문서 링크를 여기에 건다거나
- 코드에 주석으로 박혀있는 필기가 지금도 유효한지. 너무 몇 년 전 내용들이어서

## Required features

### load on viewport

Video는 img처럼 lazy 속성이 없음. 그래서 intersection-observer 기반으로 현재 뷰포트에 있는지 체크해서 만들었음.

비디오 로딩 중 상태에서는, 처음에 `<video>` 겉에 div를 감싸서 만들었었는데, video에 src를 안 집어넣으면 안 불러오는 것과 똑같으니까, div 안 감싸기로 했음.

참고: https://www.youtube.com/watch?v=ZAesVM6gVeg (Video를 Lazy하게 불러오지 않으면 생기는 일)

- 처음엔 한 페이지에 play되는 비디오가 여러 개 있을 때만 버벅거리는 게 심할 줄 알았는데,
- 동시에 여러 개 불러오는 것도 문제더라.
- 그래서, auto pause out viewport 기능도 필수지만, lazy 기능도 필수였음.

### default style

컨테이너 사이즈와 그 안에 들어가는 비디오 사이즈의 크기 차이에 따라 기본 스타일이 적용되야 함.

**이제 height props는 더이상 안씀. 오직 aspectRatio + width만 사용함.**

<!-- 컨테이너/비디오 스타일 다이어그램, PDF 참조 (PDF Read 불가 환경) -->

### playsinline

> A Boolean attribute indicating that the video is to be played "inline", that is, within the element's playback area.
> — https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video#playsinline

아이폰 모바일 크롬으로 동영상에 autoplay 넣어서 자동재생 시켜보니, 페이지 진입하자마자 동영상이 전체화면으로 재생됐음. inline으로 play한다는 의미가 전체화면으로 재생 안 시킨다는 얘기임.

> Note that the absence of this attribute does not imply that the video will always be played in fullscreen.

이 말도 진짜 애매하게 써놓음. 실제로는 아이폰에서만 저런 현상이 발생함.

<!-- playsinline 관련 검색결과 캡처, PDF 참조 (PDF Read 불가 환경) -->

## (Legacy??) Chrome autoplay policy

현재도 유효한지 모름. 그냥 코드에 있던 주석만 옮겨왔음.

chrome autoplay policy: https://developers.google.com/web/updates/2017/09/autoplay-policy-changes

요점:
1. muted=true이면 항상 자동재생됨.
2. 위 조건(1)이 충족되지 않으면, 사용자가 인터랙션한 경우에만 자동재생됨. (마우스로 링크 클릭해서 진입하면 자동재생됨. URL 직접 입력해서 진입하면 자동재생 안 됨)

IOS autoplay policy: https://developer.apple.com/documentation/webkit/delivering_video_content_for_safari

요점:
1. muted=true이면 항상 자동재생됨.
2. 홈 버튼 눌러 홈 화면 갔다가 다시 웹 브라우저 켜면 자동재생 안 됨. (비디오가 뷰포트에서 사라졌기 때문)

Related: https://stackoverflow.com/questions/43570460/html5-video-autoplay-on-iphone#answer-49137124

요점:
1. 저전력 모드이면 autoplay 불가.
