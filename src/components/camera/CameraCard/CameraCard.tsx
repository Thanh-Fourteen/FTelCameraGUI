// src/components/camera/CameraCard/CameraCard.tsx
import React, { useMemo } from 'react';
import { type Camera } from '../../../types/camera';
import { useWebSocketFrame } from '../../../hooks/useWebSocketFrame';
import styles from './CameraCard.module.css';

interface CameraCardProps {
  type?: 'display' | 'add';
  camera?: Camera;
  nodeName?: string; 
  onClick: () => void;
}

const CameraCard: React.FC<CameraCardProps> = ({ 
  type = 'display', 
  camera, 
  nodeName, 
  onClick 
}) => {
  
  // Kiểm tra trạng thái chạy của camera
  const isRunning = camera?.status === 'running';

  // 1. Xác định URL WebSocket cho Card
  const wsUrl = useMemo(() => {
    // Chỉ load WebSocket nếu: Card ở chế độ hiển thị, camera tồn tại và đang RUNNING
    if (type === 'display' && camera && isRunning) {
        
      // ƯU TIÊN 1: Lấy stream_url do API Proxy trả về (Đã ghép sẵn IP và Port)
      if ((camera as any).stream_url) {
        return (camera as any).stream_url;
      }

      // ƯU TIÊN 2 (Fallback): Tự ghép nếu API chỉ trả về IP và Port riêng lẻ
      if ((camera as any).node_ip && (camera as any).public_port) {
          return `ws://${(camera as any).node_ip}:${(camera as any).public_port}`;
      }
    }
    
    // Nếu camera đang Stopped, trả về null để không khởi tạo WebSocket
    return null;
  }, [type, camera, isRunning]);

  // 2. Gọi Hook WebSocket
  // Hook này sẽ tự động bỏ qua nếu wsUrl là null
  const { imgRef, isConnected } = useWebSocketFrame({
    url: wsUrl,
    autoReconnect: true
  });

  // --- RENDER: Card Nút Thêm Mới ---
  if (type === 'add') {
    return (
      <div className={`${styles.cameraCard} ${styles.addCard}`} onClick={onClick}>
        <div className={styles.addIcon}>+</div>
        <div style={{ marginTop: 10, color: '#6b7280', fontSize: 14 }}>Add Camera</div>
      </div>
    );
  }

  // --- RENDER: Card Camera Hiển Thị ---
  return (
    <div className={styles.cameraCard} onClick={onClick}>
      <div className={styles.cardImageWrapper}>
        
        {/* Lớp Stream Video: Chỉ render khi có kết nối WebSocket thành công */}
        {wsUrl && isConnected ? (
             <img 
               ref={imgRef} 
               alt="Live Stream" 
               className={styles.cameraThumb}
             />
        ) : (
            /* Lớp Placeholder: Hiện khi đang Stopped HOẶC đang đợi kết nối */
            <div className={styles.cameraPlaceholderImg}>
                {isRunning ? (
                    <div style={{ textAlign: 'center' }}>
                        <div className={styles.loadingSpinner}>🔄</div>
                        <div style={{ fontSize: '12px', marginTop: '6px', color: '#9ca3af' }}>
                            Connecting...
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px' }}>📷</div>
                        <div style={{ fontSize: '12px', marginTop: '6px', color: '#9ca3af' }}>
                            Camera Stopped
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* Badge hiển thị trạng thái LIVE */}
        {isRunning && isConnected && (
            <span className={styles.badgeLive}>● LIVE</span>
        )}
      </div>

      <div className={styles.cardFooter}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflow: 'hidden' }}>
            
            {/* Hiển thị ID Camera */}
            <span className={styles.cameraName} title={camera?.camera_id}>
                ID: {camera?.camera_id || 'Unknown'}
            </span>
            
            {/* Hiển thị Tên Node/Máy chứa camera */}
            {nodeName && (
                <span className={styles.nodeBadge}>
                    🖥️ {nodeName}
                </span>
            )}
            
            {/* Hiển thị đường dẫn nguồn (RTSP) nhỏ bên dưới */}
            <span className={styles.rtspLink}>
                {camera?.rtsp_url}
            </span>
        </div>

        {/* Chấm tròn chỉ thị trạng thái (Xanh = Running, Xám = Stopped) */}
        <div 
            className={`${styles.statusIndicator} ${isRunning ? styles.running : ''}`} 
            title={isRunning ? "Status: Running" : "Status: Stopped"}
        >
           {isRunning ? '●' : '○'}
        </div>
      </div>
    </div>
  );
};

export default CameraCard;