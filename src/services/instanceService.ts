// src/services/instanceService.ts
import axios from 'axios';
import { getAppConfig } from './config';

const getConfig = () => getAppConfig();

export interface VastInstance {
  instance_id: string;
  ip_address: string;
  port: number;
  port_mappings: { [key: string]: number };
  kafka_topics: string;
  cameras: string;
  status: string; // 
}

export const instanceService = {
  // Lấy danh sách tất cả các máy Backend
  getAll: async (): Promise<VastInstance[]> => {
    const { apiBaseUrl } = getConfig(); // URL tới Backend API Tổng
    const response = await axios.get(`${apiBaseUrl}/instances`);
    return response.data;
  },

  // Đăng ký máy mới (Register)
  register: async (payload: Omit<VastInstance, 'status'>) => {
    const { apiBaseUrl } = getConfig();
    const response = await axios.post(`${apiBaseUrl}/instances/register`, payload);
    return response.data;
  },
  update: async (instanceId: string, data: VastInstance) => {
    const { apiBaseUrl } = getConfig();
    const response = await axios.put(`${apiBaseUrl}/instances/${instanceId}`, data);
    return response.data;
  },

  // Xóa máy
  delete: async (instanceId: string) => {
    const { apiBaseUrl } = getConfig();
    await axios.delete(`${apiBaseUrl}/${instanceId}`);
  }
};