// src/services/cameraService.ts
import axios from 'axios';
import type { Camera, CreateCameraPayload, SettingsSchema } from '../types/camera';

// Cấu hình Base URL (Nên đưa vào biến môi trường .env)
// const API_URL = 'https://api.doca.love/api';
const API_URL = '/api'

export const cameraService = {
  // Lấy danh sách camera (nếu có API get all)
  getAll: async (): Promise<Camera[]> => {
    // Giả sử API trả về list
    const response = await axios.get(`${API_URL}/cameras/`);
    return response.data;
  },

  // Tạo camera mới
  create: async (payload: CreateCameraPayload): Promise<Camera> => {
    const response = await axios.post(`${API_URL}/cameras/`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json'
      }
    });
    return response.data;
  },
  delete: async (cameraId: string) => {
    // Gọi DELETE /api/cameras/:id
    const response = await axios.delete(`${API_URL}/cameras/${cameraId}`);
    return response.data;
  },

  // Hàm kích hoạt AI Camera
  start: async (cameraId: string) => {
    // Gọi POST /api/cameras/{cam_id}/start
    const response = await axios.post(`${API_URL}/cameras/${cameraId}/start`);
    return response.data;
  },

  stop: async (cameraId: string) => {
    const response = await axios.post(`${API_URL}/cameras/${cameraId}/stop`);
    return response.data;
  },

  getSettingsSchema: async (): Promise<SettingsSchema> => {
    const response = await axios.get(`${API_URL}/settings/schema`);
    return response.data;
  },

  update: async (cameraId: string, payload: any) => {
    // API PUT thường dùng để update
    const response = await axios.put(`${API_URL}/cameras/${cameraId}`, payload);
    return response.data;
  }
};