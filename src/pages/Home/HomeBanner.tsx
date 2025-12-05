import React from 'react';
import styles from './HomeBanner.module.css';

const HomeBanner: React.FC = () => {
  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <h1 className={styles.title}>Smart Camera Monitoring System</h1>
        <p className={styles.subtitle}>
          Welcome back! Below is an overview of the system and your main management functions.
        </p>
        {/* <button className={styles.ctaButton}>Xem Báo Cáo Nhanh</button> */}
      </div>
      {/* Bạn có thể thêm một thẻ img vào đây nếu muốn dùng ảnh thật thay vì gradient */}
      {/* <img src="/path-to-your-banner-image.png" alt="Banner" className={styles.bannerImage} /> */}
    </div>
  );
};

export default HomeBanner;