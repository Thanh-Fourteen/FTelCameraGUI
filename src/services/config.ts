// src/services/config.ts

// Helper lấy config
export const getAppConfig = () => {
    const saved = localStorage.getItem('APP_CONFIG');
    if (saved) {
        return JSON.parse(saved);
    }
    // Fallback về Proxy mặc định (relative path)
    return {
        apiBaseUrl: 'http://localhost:8000',
        vecBaseUrl: '/vec-api',
        fraBaseUrl: '/fra-api',
        detBaseUrl: '/det-api',
        wsBaseUrl: (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/sys-ws'
    };
};