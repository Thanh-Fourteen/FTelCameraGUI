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
    title: 'Camera Management',
    description: 'View the list, add new items, and configure the camera system.',
    icon: '📹',
    link: '/camera', // Link đến trang CameraManager hiện tại
    bgColor: '#dbeafe', // Xanh dương nhạt
  },
  {
    id: 'facial-recog',
    title: 'Face registration',
    description: 'This page allows you to add faces to the system and update identification information.',
    icon: '👤',
    link: '/face-register', // Route này bạn sẽ tạo sau
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
  {
    id: 'analytics',
    title: 'Image Analysis',
    description: 'Upload images to detect people and recognize their identities.',
    icon: '🖼️',
    link: '/image-analysis',
    bgColor: '#f3e8ff', // Tím nhạt
  },
    {
    id: 'model-comparison',
    title: 'Model Comparison',
    description: 'Compare different models and their performance.',
    icon: '📊',
    link: '/model-comparison',
    bgColor: '#f1f5f9', // Xám nhạt
  },
];