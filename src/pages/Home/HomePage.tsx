import React from 'react';
import HomeBanner from './HomeBanner';
import FeatureCarousel from './FeatureCarousel';

// Style inline đơn giản cho container chính của Home
const containerStyle: React.CSSProperties = {
  padding: '24px',
  maxWidth: '1400px', // Giới hạn chiều rộng trên màn hình cực lớn
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '32px', // Khoảng cách giữa Banner và Carousel
};

const sectionTitleStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '16px'
}

export const HomePage: React.FC = () => {
  return (
    <div style={containerStyle}>
      {/* Phần 1: Banner lớn */}
      <section>
        <HomeBanner />
      </section>
      
      {/* Phần 2: Carousel các tính năng */}
      <section>
        <h2 style={sectionTitleStyle}>Quick Access</h2>
        <FeatureCarousel />
      </section>
      
      {/* Bạn có thể thêm các section khác bên dưới (ví dụ: Bảng thống kê gần đây) */}
    </div>
  );
};