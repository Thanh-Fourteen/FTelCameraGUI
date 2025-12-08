import { useEffect, useRef, useState, useCallback } from 'react';
import { useNotification } from '../context/NotificationContext';

interface UseWebSocketFrameProps {
  url: string | null;
  autoReconnect?: boolean;
}

export const useWebSocketFrame = ({
  url,
  autoReconnect = true
}: UseWebSocketFrameProps) => {
  const {notify} = useNotification();
  const imgRef = useRef<HTMLImageElement>(null);
  const [status, setStatus] = useState('Sẵn sàng');
  const [isConnected, setIsConnected] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUrlRef = useRef<string | null>(null);
  
  // Cờ đánh dấu: "Tôi đang bận vẽ, đừng làm phiền"
  const isRenderingRef = useRef<boolean>(false);

  const connect = useCallback(() => {
    if (!url) return;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);

    setStatus('Đang kết nối...');

    try {
      const fixedUrl = url.replace('localhost', '127.0.0.1');
      const ws = new WebSocket(fixedUrl);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;
      ws.onopen = () => {
        setIsConnected(true);
        setStatus('Đã kết nối');
        ws.send(JSON.stringify({ cmd: "start" }));
      };

      ws.onmessage = (event) => {
        if (!imgRef.current) return;

        // CHIẾN THUẬT MỚI: DROP FRAME
        // Nếu trình duyệt chưa vẽ xong frame trước, ta vứt luôn frame mới này đi
        // để tránh làm nghẽn hàng đợi render.
        if (isRenderingRef.current) {
            return; 
        }

        if (event.data instanceof ArrayBuffer) {
            // Đánh dấu là đang bận
            isRenderingRef.current = true;
            
            const buffer = event.data;

            // Dùng requestAnimationFrame để vẽ đồng bộ với tần số quét màn hình
            requestAnimationFrame(() => {
                if (!imgRef.current) {
                    isRenderingRef.current = false;
                    return;
                }

                try {
                    const blob = new Blob([buffer], { type: 'image/jpeg' });
                    const newUrl = URL.createObjectURL(blob);

                    // Xóa URL cũ để giải phóng RAM
                    if (prevUrlRef.current) {
                        URL.revokeObjectURL(prevUrlRef.current);
                    }

                    // Gán hình mới
                    imgRef.current.src = newUrl;
                    prevUrlRef.current = newUrl;

                    // Update status (Debounce nhẹ)
                    setStatus((prev) => prev !== 'Streaming' ? 'Streaming' : prev);
                } catch (e) {
                    console.error(e);
                } finally {
                    // Vẽ xong rồi, mở cờ để nhận frame tiếp theo
                    isRenderingRef.current = false;
                }
            });
        }
      };

      ws.onclose = () => {
        if (ws !== wsRef.current) return;
        setIsConnected(false);
        setStatus('Mất kết nối');
        if (autoReconnect && url) {
          reconnectTimeoutRef.current = setTimeout(connect, 2000);
        }
      };

      ws.onerror = (err) => {
        if (ws !== wsRef.current) return;
        console.error("⚠️ WS Error:", err);
        ws.close();
      };

    }catch (error: any) {
      let errorMessage = "Error Message";
      
      // Kiểm tra nếu có response từ backend (Axios Error)
      if (error.response && error.response.data) {
          // Backend trả về: { detail: "Port 3456 is already in use..." }
          const detail = error.response.data.detail;
          if (detail) {
              errorMessage = `${detail}`;
          }
      }
      notify(errorMessage, 'error');
      setStatus("URL error")
    }
  }, [url, autoReconnect]);

  useEffect(() => {
    if (!url) {
        if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
        setIsConnected(false);
        setStatus('Sẵn sàng');
        return;
    }

    const timer = setTimeout(connect, 100);

    return () => {
      clearTimeout(timer);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, url]);

  return { imgRef, status, isConnected };
};