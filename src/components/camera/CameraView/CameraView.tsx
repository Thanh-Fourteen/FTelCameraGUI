import React, { useState } from 'react';
import { useWebSocketFrame } from '../../../hooks/useWebSocketFrame';
import { cameraService } from '../../../services/cameraService';
import { type Camera } from '../../../types/camera';
import EditConfigModal from '../EditConfigModal/EditConfigModal';
import styles from './CameraView.module.css';

interface CameraViewProps {
  camera: Camera;
  onBack: () => void;
}

const CameraView: React.FC<CameraViewProps> = ({ camera: initialCamera, onBack }) => {
  const [camera, setCamera] = useState<Camera>(initialCamera);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Logic tự động kết nối lại nếu camera đang trạng thái LIVE
  const initialUrl = (camera.isLive && camera.ws_port) 
    ? `ws://192.168.2.130:${camera.ws_port}` 
    : null;

  const [wsUrl, setWsUrl] = useState<string | null>(initialUrl);
  
  // Hook này tự động ngắt kết nối Socket khi component unmount (thoát trang)
  // nên bạn không cần lo tốn băng thông khi thoát ra.
  const { imgRef, status, isConnected } = useWebSocketFrame({ 
    url: wsUrl,
    autoReconnect: true 
  });

  // --- XÓA BỎ HOÀN TOÀN useEffect AUTO-STOP Ở ĐÂY ---
  // Giờ thoát trang là thoát luôn, không gọi API stop gì cả.

  const handlePlay = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      console.log(`Starting camera ${camera.id}...`);
      await cameraService.start(camera.id);
      
      const streamUrl = `ws://192.168.2.130:${camera.ws_port}`;
      setWsUrl(streamUrl);
      setCamera(prev => ({ ...prev, isLive: true }));

    } catch (error) {
      console.error("Start failed:", error);
      alert("Không thể khởi động camera.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStop = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
        console.log(`Stopping camera ${camera.id}...`);
        
        // 1. Ngắt hiển thị ngay
        setWsUrl(null); 
        
        // 2. Gọi API tắt hẳn AI Server
        await cameraService.stop(camera.id);
        
        setCamera(prev => ({ ...prev, isLive: false }));

    } catch (error) {
        console.error("Stop failed:", error);
        alert("Lỗi khi dừng camera");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleConfigUpdate = (updatedCamera: Camera) => {
    setCamera(updatedCamera);
    // Nếu đổi port thì ngắt kết nối hiển thị hiện tại để user connect lại
    if (updatedCamera.ws_port !== initialCamera.ws_port) {
       setWsUrl(null);
       // Không set isLive = false, để backend tự xử lý hoặc giữ nguyên trạng thái logic
    }
  };

  // --- HÀM DELETE (Nếu bạn muốn tích hợp luôn) ---
  const handleDeleteCamera = async (cameraId: string) => {
      // Logic xóa...
      await cameraService.delete(cameraId);
      onBack(); // Quay về
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {/* Nút Back luôn bấm được, không bị disabled */}
        <button className={styles.backBtn} onClick={onBack}>
           ← Back
        </button>
        <div className={styles.title}>Camera {camera.name}</div>
        <button className={styles.configBtn} onClick={() => setIsConfigOpen(true)} disabled={isProcessing}>
            ⚙ Config
        </button>
      </div>

      <div className={styles.videoContainer}>
        <div className={styles.videoScreen} style={{ position: 'relative', overflow: 'hidden', background: '#000' }}>
          
          {/* LOADING: Chỉ hiện khi user bấm nút Start/Stop, không hiện khi thoát trang */}
          {isProcessing && (
            <div className={styles.loadingOverlay}>
              <div className={styles.spinner}></div>
              <span>Processing...</span>
            </div>
          )}

          {camera.isLive && !isProcessing && <div className={styles.liveBadge}>● LIVE</div>}
          
          <img 
              ref={imgRef} 
              alt="Main Stream" 
              style={{ 
                  width: '100%', height: '100%', objectFit: 'contain', 
                  display: wsUrl ? 'block' : 'none' 
              }} 
          />

          {!wsUrl && !isProcessing && (
            <div className={styles.bigPlayBtn} onClick={handlePlay}>▶</div>
          )}

          {wsUrl && !isConnected && !isProcessing && (
             <div style={{color: 'white', position: 'absolute'}}>Connecting...</div>
          )}
        </div>

        <div className={styles.controlsBar}>
          <div className={styles.controlGroup}>
            <span 
                className={styles.controlIcon} 
                onClick={!isProcessing ? (wsUrl ? handleStop : handlePlay) : undefined}
                style={{ opacity: isProcessing ? 0.5 : 1, cursor: isProcessing ? 'not-allowed' : 'pointer' }}
            >
              {wsUrl ? '⏸' : '▶'}
            </span>
            <span style={{fontSize: '12px', color: '#aaa', marginLeft: '10px'}}>
                Status: {isProcessing ? 'Waiting response...' : status}
            </span>
          </div>
          
          <div className={styles.controlGroup}>
             <span className={styles.controlIcon}>🔊</span>
             <span className={styles.controlIcon}>⛶</span>
          </div>
        </div>
      </div>

      {isConfigOpen && (
        <EditConfigModal 
            isOpen={isConfigOpen}
            onClose={() => setIsConfigOpen(false)}
            camera={camera}
            onUpdate={handleConfigUpdate}
            onDelete={handleDeleteCamera}
        />
      )}
    </div>
  );
};

export default CameraView;