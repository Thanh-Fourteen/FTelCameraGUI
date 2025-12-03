import axios from "axios";

// Sử dụng Proxy đã cấu hình trong vite.config.ts để tránh lỗi Mixed Content
// Nếu port 5171 chưa có proxy, bạn cần thêm vào vite.config.ts hoặc dùng đường dẫn đầy đủ nếu đang test local HTTP
const API_URL = 'http://192.168.2.130:5171/api'; 

export const kafkaService = {
    toggle: async (enable: boolean) => {
        // Sửa typo: 'enalbe' -> 'enable'
        const response = await axios.post(`${API_URL}/system/kafka/toggle`, {
            "enable": enable 
        }, {
            headers: {
                'Content-Type': 'application/json',
                'accept': 'application/json',
            }
        });
        return response.data;
    }
}