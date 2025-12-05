// src/services/kafkaService.ts
import axios from "axios";

// Đảm bảo URL này khớp với cấu hình proxy (nếu dùng proxy) hoặc full URL
// const API_URL = 'https://api.doca.love/api'; 
const API_URL = '/api'

export const kafkaService = {
    toggle: async (enable: boolean) => {
        const response = await axios.post(`${API_URL}/system/kafka/toggle`, {
            "enable": enable 
        }, {
            headers: {
                'Content-Type': 'application/json',
                'accept': 'application/json',
            }
        });
        return response.data;
    },
    // Thêm hàm lấy status
    status: async () => {
        const response = await axios.get(`${API_URL}/system/kafka/status`);
        // Giả sử API trả về { status: "running" | "stopped", ... }
        return response.data;
    }
}