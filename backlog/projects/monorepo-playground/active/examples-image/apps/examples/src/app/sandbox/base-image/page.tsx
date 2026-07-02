import BaseImage from '@/shared/components/BaseImage';
import styles from './page.module.scss';

export default function BaseImageSandbox() {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
      <h1>BaseImage Sandbox</h1>

      <div className={styles.grid}>
        <div>
          <h3>정상 이미지</h3>
          <BaseImage src={VALID_IMAGE} alt="valid" className={styles.image} />
        </div>
        <div>
          <h3>잘못된 URL → hidden</h3>
          <BaseImage src={INVALID_IMAGE} alt="invalid" className={styles.image} fallback={{ type: 'hidden' }} />
        </div>
        <div>
          <h3>null → default-404</h3>
          <BaseImage src={null} alt="null" className={styles.image} fallback={{ type: 'default-404' }} />
        </div>
        <div>
          <h3>빈 문자열 → replace-image</h3>
          <BaseImage src="" alt="empty" className={styles.image} fallback={{ type: 'replace-image', src: FALLBACK_IMAGE }} />
        </div>
        <div>
          <h3>잘못된 URL → replace-element</h3>
          <BaseImage src={INVALID_IMAGE} alt="invalid" className={styles.image} fallback={{ type: 'replace-element', element: <div style={{ padding: 20, background: '#f0f0f0' }}>커스텀 대체 UI</div> }} />
        </div>
      </div>
    </div>
  );
}

const VALID_IMAGE = 'https://picsum.photos/400/480';
const INVALID_IMAGE = 'https://invalid-url-test.com/not-found.jpg';
const FALLBACK_IMAGE = 'https://picsum.photos/seed/fallback/400/480';
