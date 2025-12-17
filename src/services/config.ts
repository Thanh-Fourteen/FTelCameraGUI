// src/services/config.ts

export const getAppConfig = () => {
    const saved = localStorage.getItem('APP_CONFIG');
    if (saved) {
        return JSON.parse(saved);
    }

    // KHÔNG dùng relative path nữa, dùng thẳng IP của Backend Tổng (Proxy Backend)
    // Giả sử Backend Tổng của bạn đang chạy ở port 31313
    const BACKEND_IP = "http://192.168.2.130:31313";

    return {
        // Gọi thẳng IP, bỏ qua Vite Proxy
        apiBaseUrl: BACKEND_IP + '/api', 
        
        // Các api khác cũng gọi thẳng IP gốc của chúng
        vecBaseUrl: "http://192.168.2.130:8686/v1",
        fraBaseUrl: "http://192.168.2.130:2022",
        detBaseUrl: "http://192.168.2.130:2468",
        
        // WebSocket cũng trỏ thẳng về IP máy quản lý hệ thống
        wsBaseUrl: 'ws://192.168.2.130:5171' 
    };
};