import React, { useEffect, useRef, useState } from 'react';
import { useWebSocketFrame } from '../hooks/useWebSocketFrame';

interface ComparisonViewProps {
  label: string;
  wsUrl: string | null;
  onFpsUpdate: (fps: number) => void; // Callback bắn FPS ra ngoài cha
}

const ComparisonView: React.FC<ComparisonViewProps> = ({ label, wsUrl, onFpsUpdate }) => {
  // Dùng hook kết nối WS
  const { imgRef, isConnected, lastJsonMessage } = useWebSocketFrame({
    url: wsUrl,
    autoReconnect: false
  });

  // Lắng nghe FPS từ JSON message (khi team bạn làm xong)
  useEffect(() => {
    if (lastJsonMessage && lastJsonMessage.fps) {
        onFpsUpdate(lastJsonMessage.fps);
    }
    // Fallback: Tự tính FPS ở frontend nếu backend chưa gửi
    // (Logic này chỉ là tạm thời)
  }, [lastJsonMessage, onFpsUpdate]);

  return (
    <div style={styles.viewContainer}>
      <div style={styles.viewHeader}>
        <span style={styles.modelLabel}>{label}</span>
        <span style={{ fontSize: '12px', color: isConnected ? '#10b981' : '#ef4444' }}>
            {isConnected ? '● Live' : '○ Disconnected'}
        </span>
      </div>
      
      <div style={styles.videoBox}>
        <img 
            ref={imgRef} 
            alt={label} 
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: wsUrl ? 'block' : 'none' }} 
        />
        {!wsUrl && <div style={styles.placeholder}>Waiting for config...</div>}
        {wsUrl && !isConnected && <div style={styles.loading}>Connecting...</div>}
      </div>
    </div>
  );
};

const styles = {
    viewContainer: { flex: 1, display: 'flex', flexDirection: 'column' as const, gap: '8px' },
    viewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' },
    modelLabel: { fontWeight: '700', fontSize: '14px', color: '#374151', backgroundColor: '#e5e7eb', padding: '4px 8px', borderRadius: '4px' },
    videoBox: { flex: 1, backgroundColor: 'black', borderRadius: '8px', overflow: 'hidden', position: 'relative' as const, minHeight: '300px' },
    placeholder: { color: '#6b7280', position: 'absolute' as const, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    loading: { color: 'white', position: 'absolute' as const, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
};

export default ComparisonView;