import { useState, useEffect, useRef } from 'react';

// Định nghĩa kiểu dữ liệu trả về từ WebSocket
interface SystemStatusData {
  system: {
    kafka: {
      status: 'running' | 'stopped' | 'error';
      [key: string]: any;
    };
  };
  cameras: {
    camera_id: string;
    status: 'running' | 'stopped' | 'starting' | 'stopping';
    rtsp_url: string;
    [key: string]: any;
  }[];
}

export const useSystemStatus = () => {
  const [data, setData] = useState<SystemStatusData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Logic tạo URL: Dùng Proxy WSS nếu đang ở HTTPS
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    // Nếu chạy HTTPS -> Gọi qua Proxy /sys-ws/ws/status
    // Nếu chạy HTTP -> Gọi trực tiếp (nếu Chrome cho phép) hoặc qua Proxy
    const wsUrl = protocol === 'wss:' 
        ? `${protocol}//${host}/sys-ws/ws/status`
        : `ws://192.168.2.130:5171/ws/status`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data);
        setData(parsedData);
      } catch (error) {
        console.error("Failed to parse system status:", error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Có thể thêm logic reconnect ở đây nếu muốn
    };

    return () => {
      ws.close();
    };
  }, []);

  return { 
    systemStatus: data?.system, 
    cameraStatuses: data?.cameras, 
    isConnected 
  };
};