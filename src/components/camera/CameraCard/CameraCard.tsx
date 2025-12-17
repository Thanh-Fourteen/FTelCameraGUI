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
  onDelete?: (e: React.MouseEvent) => void; // Thêm prop onDelete
}

const CameraCard: React.FC<CameraCardProps> = ({
  type = 'display',
  camera,
  nodeName,
  onClick,
  onDelete
}) => {

  const isRunning = camera?.status === 'running';

  const wsUrl = useMemo(() => {
    if (type === 'display' && camera && isRunning) {
      if ((camera as any).stream_url) return (camera as any).stream_url;
      if ((camera as any).node_ip && (camera as any).public_port) {
        return `ws://${(camera as any).node_ip}:${(camera as any).public_port}`;
      }
    }
    return null;
  }, [type, camera, isRunning]);

  const { imgRef, isConnected } = useWebSocketFrame({
    url: wsUrl,
    autoReconnect: true
  });

  if (type === 'add') {
    return (
      <div className={`${styles.cameraCard} ${styles.addCard}`} onClick={onClick}>
        <div className={styles.addIcon}>+</div>
        <div style={{ marginTop: 10, color: '#6b7280', fontSize: 14 }}>Add Camera</div>
      </div>
    );
  }

  return (
    <div className={styles.cameraCard} onClick={onClick}>
      {/* 1. Header: Chứa ID và nút X */}
      <div className={styles.cardHeader}>
        <span className={styles.cameraTitle}>
          {camera?.name || `ID: ${camera?.camera_id}`}
        </span>
        {onDelete && (
          <button className={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); onDelete(e); }}>
            &times;
          </button>
        )}
      </div>

      {/* 2. Image: Nằm ở giữa, có lề 2 bên */}
      <div className={styles.cardImageWrapper}>
        {wsUrl && isConnected ? (
          <img ref={imgRef} alt="Stream" className={styles.cameraThumb} />
        ) : (
          <div className={styles.cameraPlaceholderImg}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px' }}>📷</div>
              <div style={{ fontSize: '12px', marginTop: '8px', color: '#6b7280', fontWeight: 500 }}>Stopped</div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Footer: Chứa RTSP và Status dot */}
      <div className={styles.cardFooter}>
        <div className={styles.footerInfo}>
          <span className={styles.rtspLinkSmall}>{camera?.rtsp_url}</span>
        </div>
        <div className={`${styles.statusIndicator} ${isRunning ? styles.running : ''}`}>
          {isRunning ? '●' : '○'}
        </div>
      </div>
    </div>
  );
};

export default CameraCard;