// src/components/camera/CameraCard/CameraCard.tsx
import React, { useMemo } from 'react';
import { type Camera } from '../../../types/camera';
import { useWebSocketFrame } from '../../../hooks/useWebSocketFrame'; // Import hook
import styles from './CameraCard.module.css';

interface CameraCardProps {
  type?: 'display' | 'add';
  camera?: Camera;
  onClick: () => void;
}

const CameraCard: React.FC<CameraCardProps> = ({ type = 'display', camera, onClick }) => {
  
  // 1. Xác định URL WebSocket cho Card
  // Nếu camera có trạng thái 'running' (hoặc isLive), ta tạo URL kết nối ngay.
  const wsUrl = useMemo(() => {
    if (type === 'display' && camera?.isLive && camera?.ws_port) {
      return `ws://192.168.2.130:${camera.ws_port}`;
    }
    return null;
  }, [type, camera?.isLive, camera?.ws_port]);

  // 2. Gọi Hook. Nếu wsUrl có giá trị, nó sẽ tự stream.
  const { imgRef, isConnected } = useWebSocketFrame({
    url: wsUrl,
    autoReconnect: true
  });

  // --- RENDER: Nút Thêm Mới ---
  if (type === 'add') {
    return (
      <div className={`${styles.cameraCard} ${styles.addCard}`} onClick={onClick}>
        <div className={styles.addIcon}>+</div>
      </div>
    );
  }

  // --- RENDER: Camera Card ---
  return (
    <div className={styles.cameraCard} onClick={onClick}>
      <div className={styles.cardImageWrapper}>
        
        {/* ƯU TIÊN 1: Nếu đang có kết nối WS -> Hiện ảnh Stream */}
        {wsUrl ? (
             <img 
               ref={imgRef} 
               alt="Live Stream" 
               className={styles.cameraThumb}
               // Nếu chưa connect xong thì ẩn đi để hiện thumbnail bên dưới
               style={{ display: isConnected ? 'block' : 'none' }} 
             />
        ) : null}

        {/* ƯU TIÊN 2: Nếu chưa connect hoặc chưa có stream -> Hiện Thumbnail tĩnh */}
        {(!isConnected) && (
            camera?.thumbnailUrl ? (
            <img src={camera.thumbnailUrl} alt={camera.name} className={styles.cameraThumb} />
            ) : (
            <div className={styles.cameraPlaceholderImg}>📷</div>
            )
        )}

        {/* Badge Live */}
        {camera?.isLive && <span className={styles.badgeLive}>● LIVE</span>}
      </div>

      <div className={styles.cardFooter}>
        <span className={styles.cameraName}>ID: {camera?.name}</span>
        <div className={`${styles.statusIndicator} ${camera?.status ? styles[camera.status] : ''}`}>
           {camera?.status === 'online' ? '✔' : '●'}
        </div>
      </div>
    </div>
  );
};

export default CameraCard;