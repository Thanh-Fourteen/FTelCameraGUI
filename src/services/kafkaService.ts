import axios from "axios";
import { getAppConfig } from './config';

const getConfig = () => getAppConfig();

export const kafkaService = {
    // API Docs: POST /nodes/{instance_id}/system/kafka/toggle
    toggle: async (instanceId: string, enable: boolean) => {
        const { apiBaseUrl } = getConfig();
        const response = await axios.post(`${apiBaseUrl}/nodes/${instanceId}/system/kafka/toggle`, {
            "enable": enable 
        });
        return response.data;
    },

    // Hàm status: API docs chưa thấy route status riêng cho kafka.
    // Tạm thời gọi API lấy thông tin node hoặc giả định
    status: async (instanceId: string) => {
        const { apiBaseUrl } = getConfig();
        const response = await axios.get(`${apiBaseUrl}/nodes/${instanceId}/system/kafka/status`);
        return response.data;
    },

}