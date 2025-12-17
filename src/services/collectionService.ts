// src/services/collectionService.ts
import axios from 'axios';
import { getAppConfig } from './config';

// 1. Helper lấy config mới nhất mỗi khi gọi hàm
const getConfig = () => getAppConfig();

export interface CollectionConfig {
  name: string;
  vector_size: number;
  distance: string; // 'Cosine', 'Euclidean', 'DotProduct'
  id_type: string;  // 'String', 'Int'
}

export const collectionService = {
  // Tạo collection mới
  create: async (config: CollectionConfig) => {
    // Lấy vecBaseUrl từ config (Thay thế cho const API_BASE_URL cũ)
    const { vecBaseUrl } = getConfig();
    
    const response = await axios.post(`${vecBaseUrl}/collections`, config);
    return response.data;
  },

  // Lấy danh sách collection
  getAll: async () => {
    const { vecBaseUrl } = getConfig();
    
    const response = await axios.get(`${vecBaseUrl}/collections`);
    return response.data;
  }
};