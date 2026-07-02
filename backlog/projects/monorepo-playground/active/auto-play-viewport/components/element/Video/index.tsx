'use client';

import {ComponentPropsWithoutRef, CSSProperties, forwardRef, useEffect, useRef, useState} from 'react';
import classNames from 'classnames';
import styles from './index.module.scss';
import {useShowOnViewport} from '@/utils/extend/browser/intersection-observer';

export interface VideoProps extends Omit<ComponentPropsWithoutRef<'video'>, 'width' | 'height'> {
  aspectRatio: `${number}/${number}`; // 원본 동영상 비율과 똑같은 비율로 전달해야함. 그래야 Letterbox 안생김.
  width?: number | `${number}%`; // 화면에 노출될 크기, default 100%, 단 부모 컨테이너보다 커져서 뚫고나가지 않도록 max-width가 미리 셋팅되어있음.
}

/** 가장 큰 목적 = 로딩중 비디오 크기지정 (LayoutShift 방지)
 * 1. 동영상 width 기본 스타일 특징
 * - (1) 동영상 크기 < 컨테이너 크기 = 컨테이너 너비 3000px 이고, 동영상이 1920px 이면, 원래 1920px 만큼만 늘어남. ==> 이 특징은 유지됨. 따로 건드리지않음.
 * - (2) 동영상 크기 > 컨테이너 크기 ==> 동영상이 컨테이너를 뚫고 나감. ==> 이 특징을 방지하기위해 max-width: 100%를 했음
 */

/**
 * muted props 기본값 정책
 * 1. muted가 지정되었다면 (true or false) 지정된 값으로 설정됨.
 * 2. muted가 따로 지정되지 않았고 AND autoPlay가 true라면 muted의 값도 true로 지정됨.
 * - [Muted autoplay is always allowed.](https://developer.chrome.com/blog/autoplay)
 * - 랭디에서는 딱 이정도 수준이면 되고,
 * - 동영상 플랫폼에서도 쓸 수 있으려면 이 시스템을 바꿔서, 일단 자동재생 시도하고 실패하면 muted로 자동재생 시켜야함. (거긴 소리켜놓고 자동재생이 가능한 조건이면 소리켜진 상태로 자동재생 시켜야하니까) << RP legacy VideoPlayer에 코드랑 필기있음.
 */
const Video = forwardRef<HTMLVideoElement, VideoProps>(function Video(props: VideoProps, ref) {
  const {
    width,
    style,
    aspectRatio,
    className,
    autoPlay,
    muted = autoPlay,
    ...rest
  } = props;

  const customStyle: CSSProperties = {
    aspectRatio,
    width,
    ...style
  };

  return (
    <video
      ref={ref}
      style={customStyle}
      className={classNames(styles.video, className)}
      autoPlay={autoPlay}
      muted={muted}
      playsInline // IOS 자동 전체화면 재생 방지를 위한 true
      {...rest}
    />
  );
});

export default Video;

/**
 * Video에서 한가지 추가된건, id만 추가로 전달하면 됨.
 * (실제 html element의 id와 같은 규칙으로 웹 페이지에서 unique한 값으로 전달하면됨)
 */
export type LazyVideoProps = VideoProps & {
  id: string;
  autoPlayOnViewport?: boolean;
};

export function LazyVideo({id, src, autoPlayOnViewport = true, ...rest}: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [onViewport, setOnViewport] = useState(false);

  // 이부분을 LW에서는 scroll 기반으로 viewport에 올라왔는지 체크하던데, 난 이걸로 바꿨음.
  useShowOnViewport({
    elementsSelector: `#${id}`,
    callback: function () {
      console.log('on-viewport');
      setLoaded(true);
      setOnViewport(true);
    },
    outViewportCallback: () => {
      console.log('out-viewport');
      setOnViewport(false);
    },
    offset: 500
  });

  useEffect(() => {
    if (onViewport) {
      videoRef.current?.play();
    }
  }, [onViewport]);

  return (
    <Video id={id} className={classNames({['on-viewport']: loaded})} src={loaded ? src : undefined} {...rest}/>
  );
}
