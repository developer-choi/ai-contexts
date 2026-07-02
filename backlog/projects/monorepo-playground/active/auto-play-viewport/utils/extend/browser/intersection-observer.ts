import {useEffect, useRef} from 'react';

export interface ShowOnViewportOptions {
  offset?: number; // default 0, HTML Element가 화면에 나타났음을 감지하는 상단 간격값
  callback?: ((target: Element) => void) | string; // 콜백함수를 지정하던가, 아님 클래스이름만 지정하던가.
  outViewportCallback?: (target: Element) => void;
  elementsSelector: string;
}

// 전달한 elementsSelector에 해당하는 Element가 Viewport에 등장하면 Callback을 실행함. (기본 콜백은, 그 element에 on-viewport 클래스를 넣음.
export function useShowOnViewport({elementsSelector, offset = 0, callback, outViewportCallback}: ShowOnViewportOptions) {
  const observerRef = useRef<IntersectionObserver>();

  useEffect(() => {
    const elements = document.querySelectorAll(elementsSelector);

    observerRef.current = new IntersectionObserver(function(entries) {
      // observe 한 element가 viewport에 보이는 여부가 바뀌었을 때에만 이 콜백함수가 호출됨.
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          outViewportCallback?.(entry.target);
        } else {
          if (!callback) {
            defaultCallback(entry.target);
          } else if (typeof callback === 'string') {
            defaultCallback(entry.target, callback);
          } else {
            callback(entry.target);
          }
        }
      });
    }, {
      rootMargin: `0px 0px ${offset}px 0px`
    })

    elements.forEach(target => {
      observerRef.current?.observe(target);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [elementsSelector, offset, callback]);
}

function defaultCallback(element: Element, className = 'on-viewport') {
  element.classList.add(className);
}
