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
  const { notify } = useNotification();
  
  // Ref cho thẻ img
  const imgRef = useRef<HTMLImageElement>(null);
  
  // State quản lý
  const [status, setStatus] = useState('Sẵn sàng');
  const [isConnected, setIsConnected] = useState(false);
  
  // State chứa dữ liệu JSON mới nhất (FPS, Stats...)
  const [lastJsonMessage, setLastJsonMessage] = useState<any>(null);

  // Refs nội bộ
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUrlRef = useRef<string | null>(null);
  const isRenderingRef = useRef<boolean>(false);

  const connect = useCallback(() => {
    if (!url) return;

    // Cleanup kết nối cũ
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);

    setStatus('Đang kết nối...');

    try {
      const ws = new WebSocket(url);
      // Dù backend gửi JSON (string), ta cứ để arraybuffer để support cả case binary cũ nếu config đổi lại
      ws.binaryType = 'arraybuffer'; 
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setStatus('Đã kết nối');
        ws.send(JSON.stringify({ cmd: "start" }));
      };

      ws.onmessage = (event) => {
        // --- TRƯỜNG HỢP 1: Backend gửi JSON (ViewerConfig.COMPARE = True) ---
        // Payload: { "fps": 30, "image": "base64_string..." }
        if (typeof event.data === 'string') {
            try {
                const data = JSON.parse(event.data);
                
                // 1. Cập nhật Stats (FPS)
                setLastJsonMessage(data);

                // 2. Xử lý ảnh Base64 (nếu có key "image")
                if (data.image && imgRef.current) {
                    // Cơ chế Drop Frame đơn giản để tránh UI bị lag
                    if (isRenderingRef.current) return;
                    isRenderingRef.current = true;

                    requestAnimationFrame(() => {
                        if (imgRef.current) {
                            // Format: data:image/jpeg;base64,<base64_string>
                            // Lưu ý: Nếu backend gửi png thì đổi jpeg thành png, nhưng thường stream là jpeg
                            imgRef.current.src = `data:image/jpeg;base64,${data.image}`;
                            
                            // Nếu trước đó đang dùng Blob URL (binary), cần revoke để giải phóng bộ nhớ
                            if (prevUrlRef.current) {
                                URL.revokeObjectURL(prevUrlRef.current);
                                prevUrlRef.current = null;
                            }
                        }
                        isRenderingRef.current = false;
                    });
                }
            } catch (e) {
                // console.warn("JSON Parse Error ignore:", e);
            }
            return;
        }

        // --- TRƯỜNG HỢP 2: Backend gửi Binary (ViewerConfig.COMPARE = False) ---
        if (!imgRef.current) return;
        if (isRenderingRef.current) return;

        if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
            isRenderingRef.current = true;
            const buffer = event.data;

            requestAnimationFrame(() => {
                if (!imgRef.current) {
                    isRenderingRef.current = false;
                    return;
                }

                try {
                    const blob = new Blob([buffer], { type: 'image/jpeg' });
                    const newUrl = URL.createObjectURL(blob);

                    if (prevUrlRef.current) {
                        URL.revokeObjectURL(prevUrlRef.current);
                    }

                    imgRef.current.src = newUrl;
                    prevUrlRef.current = newUrl;
                } catch (e) {
                    console.error("Render error", e);
                } finally {
                    isRenderingRef.current = false;
                }
            });
        }
      };

      ws.onclose = (e) => {
        if (ws !== wsRef.current) return;
        setIsConnected(false);
        setStatus('Mất kết nối');

        if (autoReconnect && url) {
          reconnectTimeoutRef.current = setTimeout(() => {
             connect();
          }, 2000);
        }
      };

      ws.onerror = (err) => {
        if (ws !== wsRef.current) return;
        console.error("⚠️ WS Error:", err);
        ws.close(); 
      };

    } catch (error: any) {
      console.error("WS Connection Setup Error:", error);
      setStatus("Lỗi URL");
      notify(`Invalid WebSocket URL: ${url}`, 'error');
    }
  }, [url, autoReconnect, notify]);

  useEffect(() => {
    if (!url) {
        if (wsRef.current) {
             wsRef.current.close(); 
             wsRef.current = null;
        }
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

  return { imgRef, status, isConnected, lastJsonMessage };
};