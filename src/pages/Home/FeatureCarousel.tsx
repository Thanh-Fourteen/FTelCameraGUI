import React from 'react';
import Slider from 'react-slick';
import { features } from './featuresData';
import FeatureCard from './FeatureCard';

// Import CSS của slick-carousel (Bắt buộc)
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

// Tùy chỉnh CSS cho dots và mũi tên điều hướng nếu cần
import './FeatureCarousel.css'; 

const FeatureCarousel: React.FC = () => {
  // Cấu hình cho Slider
  const settings = {
    dots: true, // Hiện chấm tròn điều hướng bên dưới
    infinite: true, // Vòng lặp vô tận
    speed: 500,
    slidesToShow: 4, // Số thẻ hiện trên màn hình lớn
    slidesToScroll: 1,
    autoplay: true, // Tự động chạy
    autoplaySpeed: 3000,
    pauseOnHover: true,
    responsive: [
        {
          breakpoint: 1280, // Màn hình trung bình
          settings: { slidesToShow: 3 }
        },
        {
          breakpoint: 1024, // Tablet
          settings: { slidesToShow: 2 }
        },
        {
          breakpoint: 640, // Mobile
          settings: { slidesToShow: 1, arrows: false } // Ẩn mũi tên trên mobile
        }
      ]
  };

  return (
    <div style={{ padding: '20px 0' }}>
      <Slider {...settings}>
        {features.map((feature) => (
          // Slider yêu cầu các phần tử con phải là một div bọc ngoài component của mình
          <div key={feature.id}>
             <FeatureCard feature={feature} />
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default FeatureCarousel;