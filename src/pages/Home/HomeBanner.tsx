import React from 'react';
import styles from './HomeBanner.module.css';

const HomeBanner: React.FC = () => {
  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <h1 className={styles.title}>Hệ Thống Giám Sát Camera Thông Minh</h1>
        <p className={styles.subtitle}>
          Chào mừng trở lại! Dưới đây là tổng quan hệ thống và các chức năng quản lý chính của bạn.
        </p>
        <button className={styles.ctaButton}>Xem Báo Cáo Nhanh</button>
      </div>
      {/* Bạn có thể thêm một thẻ img vào đây nếu muốn dùng ảnh thật thay vì gradient */}
      {/* <img src="/path-to-your-banner-image.png" alt="Banner" className={styles.bannerImage} /> */}
    </div>
  );
};

export default HomeBanner;