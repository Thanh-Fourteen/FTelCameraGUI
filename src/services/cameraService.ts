import axios from 'axios';
import { getAppConfig } from './config';
import type { Camera, CreateCameraPayload, SettingsSchema } from '../types/camera';

const getConfig = () => getAppConfig();

export const cameraService = {
  // 1. GET ALL (Aggregated)
  // API Docs: GET /nodes/all-cameras
  getAllAggregated: async (): Promise<Camera[]> => {
    const { apiBaseUrl } = getConfig();
    try {
      // SỬA: Đưa /nodes/ ra sau apiBaseUrl
      const response = await axios.get(`${apiBaseUrl}/nodes/all-cameras`);
      
      // FIX LỖI "cameras.map is not a function": Kiểm tra kỹ data trả về
      const data = response.data;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.data)) return data.data;
      if (data && Array.isArray(data.cameras)) return data.cameras;
      return []; 
    } catch (e) {
      console.error("Error fetching aggregated cameras:", e);
      return [];
    }
  },

  // 2. GET BY INSTANCE
  // API Docs: GET /nodes/{instance_id}/cameras
  getByInstance: async (instanceId: string): Promise<Camera[]> => {
    const { apiBaseUrl } = getConfig();
    try {
      const response = await axios.get(`${apiBaseUrl}/nodes/${instanceId}/cameras`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (e) {
      console.error(`Error fetching cameras for ${instanceId}:`, e);
      return [];
    }
  },

  // 3. GET DETAIL (Tự tìm Node ID nếu không biết)
  getById: async (cameraId: string, instanceId: string): Promise<Camera | null> => {
    try {
      const { apiBaseUrl } = getConfig();
      const response = await axios.get(`${apiBaseUrl}/nodes/${instanceId}/cameras/${cameraId}`);
      return response.data;
    } catch (e) {
      console.error("Error finding camera:", e);
      return null;
    }
  },

  // 4. CREATE
  // API Docs: POST /nodes/{instance_id}/cameras
  create: async (instanceId: string, payload: CreateCameraPayload): Promise<Camera> => {
    const { apiBaseUrl } = getConfig();
    const response = await axios.post(`${apiBaseUrl}/nodes/${instanceId}/cameras`, payload);
    return response.data;
  },

  // 5. DELETE
  // API Docs: DELETE /nodes/{instance_id}/cameras/{cam_id}
  delete: async (instanceId: string, cameraId: string) => {
    const { apiBaseUrl } = getConfig();
    const response = await axios.delete(`${apiBaseUrl}/nodes/${instanceId}/cameras/${cameraId}`);
    return response.data;
  },

  // 6. START
  // API Docs: POST /nodes/{instance_id}/cameras/{cam_id}/start
  start: async (instanceId: string, cameraId: string) => {
    const { apiBaseUrl } = getConfig();
    const response = await axios.post(`${apiBaseUrl}/nodes/${instanceId}/cameras/${cameraId}/start`);
    return response.data;
  },

  // 7. STOP
  // API Docs: POST /nodes/{instance_id}/cameras/{cam_id}/stop
  stop: async (instanceId: string, cameraId: string) => {
    const { apiBaseUrl } = getConfig();
    const response = await axios.post(`${apiBaseUrl}/nodes/${instanceId}/cameras/${cameraId}/stop`);
    return response.data;
  },

  // 8. SCHEMA
  // API Docs: GET /nodes/{instance_id}/settings/schema
  getSettingsSchema: async (instanceId: string): Promise<SettingsSchema> => {
    const { apiBaseUrl } = getConfig();
    const response = await axios.get(`${apiBaseUrl}/nodes/${instanceId}/settings/schema`);
    console.log("Settings Schema:", response.data);
    return response.data;
  },

  // 9. UPDATE
  // API Docs: PUT /nodes/{instance_id}/cameras/{cam_id}
  update: async (instanceId: string, cameraId: string, payload: any) => {
    const { apiBaseUrl } = getConfig();
    const response = await axios.put(`${apiBaseUrl}/nodes/${instanceId}/cameras/${cameraId}`, payload);
    return response.data;
  }
};