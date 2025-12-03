export interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string; // Có thể dùng emoji hoặc đường dẫn ảnh
  link: string;
  bgColor: string; // Màu nền cho icon
}

export const features: Feature[] = [
  {
    id: 'camera-manage',
    title: 'Quản lý Camera',
    description: 'Xem danh sách, thêm mới và cấu hình hệ thống camera.',
    icon: '📹',
    link: '/camera', // Link đến trang CameraManager hiện tại
    bgColor: '#dbeafe', // Xanh dương nhạt
  },
  {
    id: 'facial-recog',
    title: 'Nhận diện khuôn mặt',
    description: 'Quản lý cơ sở dữ liệu khuôn mặt và xem lịch sử nhận diện.',
    icon: '👤',
    link: '/face-recognition', // Route này bạn sẽ tạo sau
    bgColor: '#dcfce7', // Xanh lá nhạt
  },
  // {
  //   id: 'fire-detect',
  //   title: 'Cảnh báo cháy',
  //   description: 'Xem lại các sự kiện phát hiện lửa và khói.',
  //   icon: '🔥',
  //   link: '/fire-alerts',
  //   bgColor: '#fee2e2', // Đỏ nhạt
  // },
  // {
  //   id: 'analytics',
  //   title: 'Thống kê & Báo cáo',
  //   description: 'Biểu đồ phân tích lưu lượng người và các sự kiện AI.',
  //   icon: '📊',
  //   link: '/analytics',
  //   bgColor: '#f3e8ff', // Tím nhạt
  // },
  //   {
  //   id: 'settings',
  //   title: 'Cài đặt hệ thống',
  //   description: 'Cấu hình chung, quản lý người dùng và kết nối.',
  //   icon: '⚙️',
  //   link: '/settings',
  //   bgColor: '#f1f5f9', // Xám nhạt
  // },
];