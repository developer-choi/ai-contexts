## 셋팅방법

Generally, it's best to render at the app root.  
You can specify the rendering position using OverlayProvider.

<!-- from PDF p.1 -->
```tsx
import { OverlayProvider } from 'overlay-kit';
import { createRoot } from 'react-dom/client';

export function Example() {
  return (
    <OverlayProvider>
      <App />
    </OverlayProvider>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<Example />);
```

이 Provider는 최대한 다른 Provider보다 아래에 있어야 함.

OverlayProvider는 ReactQueryProvider·RouterProvider보다 아래에 둬야 한다 — 위에 두면 `No QueryClient set` 에러가 발생하고, `useNavigate()` 도 사용 불가.

## Async

[https://overlay-kit.slash.page/en/docs/guides/introduction](https://overlay-kit.slash.page/en/docs/guides/introduction) > Opening Asynchronous Overlays  
[https://overlay-kit.slash.page/en/docs/guides/think-in-overlay-kit](https://overlay-kit.slash.page/en/docs/guides/think-in-overlay-kit) > Minimum API  
[https://overlay-kit.slash.page/en/docs/guides/faq](https://overlay-kit.slash.page/en/docs/guides/faq) > What's the difference between overlay.open and overlay.openAsync?  
[https://overlay-kit.slash.page/en/docs/more/basic](https://overlay-kit.slash.page/en/docs/more/basic) > Opening Asynchronous Overlays

## close

The close animation runs, and the state (count) is retained.  
When reopened, the previous state is restored.

Use for performance optimization with **frequently** opened/closed overlays.

If a close animation is needed, close should be used first, **then unmount should be used.**  
⇒  
close 쓰고 싶으면 꼭 unmount를 같이 써라.

<!-- from PDF p.2 -->
```tsx
overlay.open(({ isOpen, close, unmount }) => (
  <Dialog isOpen={isOpen}>
    onClose={() => {
      close(); // run closing animation
      setTimeout(() => unmount(), 300); // Remove from memory after animation
    }}
    >
      <p>Maintain animation</p>
    </Dialog>
));
```

#### Releasing Overlay Memory

close retains the overlay information in memory after the close animation.  
For this reason, if many overlays are opened and closed at the same time, memory leaks may occur.

To avoid this, you should call unmount after the close animation ends to release memory.  
If there's a callback function that runs after the overlay ends, such as the onExit prop, you can pass the unmount function to release memory.

#### 방법 1. setTimeout << 이게 좀 더 내취향임.

[https://overlay-kit.slash.page/en/docs/more/basic](https://overlay-kit.slash.page/en/docs/more/basic)

<!-- from PDF p.3 -->
```tsx
overlay.open(({ isOpen, close, unmount }) => (
  <ConfirmDialog
    isOpen={isOpen}
    close={() => {
      close();
      setTimeout(unmount, 600);
    }}
  />
));
```

#### 방법 2. onExit

[https://overlay-kit.slash.page/en/docs/guides/introduction](https://overlay-kit.slash.page/en/docs/guides/introduction)

<!-- from PDF p.3 -->
```tsx
overlay.open(({ isOpen, close, unmount }) => (
  <ConfirmDialog
    isOpen={isOpen}
    onExit={unmount}
    close={close}
  />
));
```

## unmount

It's immediately removed from memory, skipping the close animation.  
When reopened, the state is reset.

Use to prevent memory leaks by removing overlays no longer needed.  
Use unmount or unmountAll when overlays are no longer needed or you need to free up memory.  
Generally, using just **close is sufficient** if the overlay doesn't maintain heavy data.  
⇒  
라이브러리에서는 close()로도 충분하다 라는 언급을 했음.  
close()가 더 좋다 라는 느낌하고는 어감이 살짝 다르긴 한데…  
뭐 그렇다고해서 close()는 이럴 때만 쓰세요 라는 어감은 또 아니기 때문에,  
이정도면 걍 나 편한대로 close()는 애니메이션 할 때만 쓰고 나머지는 unmount 쓰지뭐
