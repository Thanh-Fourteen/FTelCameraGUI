import axios from 'axios';
import { getAppConfig } from './config';

const getConfig = () => getAppConfig();

export const comparisonService = {
  /**
   * Khởi động phiên so sánh trên một Node cụ thể
   * API: POST /nodes/{instance_id}/comparison/start
   */
  startLiveComparison: async (
    instanceId: string, 
    cameraId: string, 
    modelA: string, 
    modelB: string, 
    modules: string[]
  ) => {
    const { apiBaseUrl } = getConfig();

    const response = await axios.post(`${apiBaseUrl}/nodes/${instanceId}/comparison/start`, {
      camera_id: cameraId,
      config_a: { model: modelA, modules },
      config_b: { model: modelB, modules }
    });

    // Backend trả về: { ws_port_a: 1234, ws_port_b: 5678 }
    return response.data;
  },

  /**
   * Dừng phiên so sánh
   * API: POST /nodes/{instance_id}/comparison/stop/{session_id}
   */
  stopLiveComparison: async (instanceId: string, sessionId: string) => {
     const { apiBaseUrl } = getConfig();
     await axios.post(`${apiBaseUrl}/nodes/${instanceId}/comparison/stop/${sessionId}`);
  }
};