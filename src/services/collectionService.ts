import axios from 'axios';

// Cấu hình URL API (Nên đưa vào biến môi trường)
// const API_BASE_URL = 'https://vec.doca.love/v1'; 
const API_BASE_URL = '/vec-api'

export interface CollectionConfig {
  name: string;
  vector_size: number;
  distance: string; // 'Cosine', 'Euclidean', 'DotProduct'
  id_type: string;  // 'String', 'Int'
}

export const collectionService = {
  // Tạo collection mới
  create: async (config: CollectionConfig) => {
    const response = await axios.post(`${API_BASE_URL}/collections`, config);
    return response.data;
  },

  // Lấy danh sách collection (Để hiển thị gợi ý - Optional)
  getAll: async () => {
    // Giả sử có API này, nếu chưa có thì bạn bỏ qua hàm này
    const response = await axios.get(`${API_BASE_URL}/collections`);
    return response.data; // Mong đợi trả về mảng tên collection
  }
};