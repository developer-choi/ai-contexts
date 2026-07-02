'use client';

import {ComponentPropsWithoutRef, type ReactElement, useEffect, useState} from 'react';
import classNames from 'classnames';
import ResourceLoadError from '@/shared/error/class/ResourceLoadError';
import styles from './BaseImage.module.scss';

/**
 * 이미지 불러오다 실패했을 때 처리
 * (default) 기존 img 동작 그대로 유지 (엑박이미지 노출)
 * hidden 이미지 미노출 처리
 * default-404 디자이너와 협의된 애플리케이션 기본 404 이미지 UI 노출
 * replace-image 대체이미지 노출
 * replace-element 대체 UI 노출
 */
type Fallback =
  | { type: 'hidden' }
  | { type: 'default-404' }
  | { type: 'replace-image'; src: string }
  | { type: 'replace-element'; element: ReactElement };

interface BaseImageProps extends Omit<ComponentPropsWithoutRef<'img'>, 'onError' | 'src'> {
  src: ComponentPropsWithoutRef<'img'>['src'] | null | undefined; // 이미지 src 출처가 API 같은 외부이고, 그 값이 유효하지않은 케이스도 대응하기 위함

  fallback?: Fallback;
}

export default function BaseImage({
  src,
  fallback,
  className,
  ...rest
}: BaseImageProps) {
  const [hasError, setHasError] = useState(!src);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasError(!src);
  }, [src]);

  const handleError = () => {
    if (!fallback) {
      return;
    }

    setHasError(true);

    throw new ResourceLoadError({ url: src, type: 'image' });
  };

  /**
   * 이미지 노출되는 케이스
   * 1. 이미지 URL 형식이 유효하고, 이미지 불러오는 과정에서 오류가 발생하지 않은경우
   * 2. 위 1번 케이스가 아니면서 fallback 따로 지정 안한경우 (기본 이미지 동작 그대로 엑박 노출)
   */
  if (!hasError || !fallback) {
    return (
      <img
        {...rest}
        loading="lazy"
        src={src ?? undefined}
        className={classNames(styles.image, className)}
        onError={handleError}
      />
    );
  }

  if (fallback.type === 'replace-image') {
    return (
      <img
        {...rest}
        src={fallback.src}
        className={classNames(styles.image, className)}
        alt={rest.alt ?? 'Fallback image'}
      />
    );
  }

  if (fallback.type === 'hidden') {
    return null;
  }

  if (fallback.type === 'replace-element') {
    return fallback.element;
  }

  return <DefaultPlaceholder className={className} />;
}

function DefaultPlaceholder({ className }: { className?: string }) {
  /**
   * 보통 이 자리에 사이트 로고가 많이 쓰임.
   * 이미지 종류, 배경색은 디자인 시스템에 정의하면됨.
   * 핵심은, 액박대체 기본이미지를 통으로 쓰는게 아니라, 이미지를 감싼 박스에 배경색을 칠하는 형태로 대체를 해야한다는것.
   * 원래 이미지가 노출되던 사이즈의 비율이 당연히 위치마다 다 다르기때문에, 이걸 통이미지로 대체하려고했다간 이미지가 상하나 좌우로 찌부됨.
   */
  return (
    <div className={classNames(styles.placeholder, className)}>
      <span className={styles.placeholderIcon}>🖼</span>
    </div>
  );
}
