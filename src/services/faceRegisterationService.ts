import axios from 'axios';
import { getAppConfig } from './config';

// Helper lấy config mới nhất mỗi khi gọi hàm
const getConfig = () => getAppConfig();

export const faceRegistrationService = {
  // Lấy danh sách Collection (từ Vector Service)
  getCollections: async () => {
    const { vecBaseUrl } = getConfig(); 
    const response = await axios.get(`${vecBaseUrl}/collections`);
    return response.data;
  },

  // Đăng ký khuôn mặt (Gửi ảnh lên Face Service)
  registerFace: async (formData: FormData) => {
    const { fraBaseUrl } = getConfig();
    
    // Lưu ý: fraBaseUrl tương ứng với /fra-api hoặc URL thật
    const response = await axios.post(`${fraBaseUrl}/register`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response;
  }
};