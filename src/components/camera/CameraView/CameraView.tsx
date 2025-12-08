import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // Dùng để chuyển trang khi xóa
import { useWebSocketFrame } from '../../../hooks/useWebSocketFrame';
import { cameraService } from '../../../services/cameraService';
import { type Camera } from '../../../types/camera';
import EditConfigModal from '../EditConfigModal/EditConfigModal';
import styles from './CameraView.module.css';
import { useNotification } from '../../../context/NotificationContext';

interface CameraViewProps {
  camera: Camera;
  onBack: () => void;
}

const CameraView: React.FC<CameraViewProps> = ({ camera: initialCamera, onBack }) => {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const [camera, setCamera] = useState<Camera>(initialCamera);

  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string>('');
  const [streamResolution, setStreamResolution] = useState({ width: 854, height: 480 });
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);



  useEffect(() => {
      setCamera(initialCamera);
      
      // Nếu camera đang chạy mà chưa có URL -> Tự tạo URL
      if (initialCamera.isLive && !wsUrl) {
          const streamUrl = getStreamUrl(initialCamera);
          setWsUrl(streamUrl);
      }
      // Nếu camera đã tắt -> Tắt URL
      if (!initialCamera.isLive && wsUrl) {
          setWsUrl(null);
      }
  }, [initialCamera]);
  // --- HÀM TẠO URL STREAM THÔNG MINH ---
  // Tự động xử lý Proxy (WSS) hoặc Direct (WS) dựa trên giao thức hiện tại
  const getStreamUrl = (cam: Camera) => {
    if (!cam.isLive || !cam.ws_port) return null;

    // TRƯỜNG HỢP 2: Chạy HTTP thường -> Kết nối trực tiếp tới Backend
    // return `https:ws.doca.love/camera/${cam.ws_port}`;
    return `ws://192.168.2.130:${cam.ws_port}`
  };

  // Khởi tạo URL ban đầu
  const [wsUrl, setWsUrl] = useState<string | null>(() => getStreamUrl(initialCamera));

  // Hook xử lý nhận ảnh Binary
  const { imgRef, status, isConnected } = useWebSocketFrame({
    url: wsUrl,
    autoReconnect: true
  });

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    // Kiểm tra nếu kích thước thay đổi thì mới set state (để tránh re-render vô tận)
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      if (img.naturalWidth !== streamResolution.width || img.naturalHeight !== streamResolution.height) {
        setStreamResolution({ width: img.naturalWidth, height: img.naturalHeight });
      }
    }
  };

  const handleOpenConfig = () => {
    // 1. Chụp frame hiện tại từ thẻ img
    if (imgRef.current) {
      try {
        // Tạo canvas ảo để vẽ lại ảnh
        const canvas = document.createElement('canvas');
        canvas.width = imgRef.current.naturalWidth || 1920;
        canvas.height = imgRef.current.naturalHeight || 1080;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Vẽ ảnh từ thẻ img lên canvas
          ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);

          // Xuất ra dạng Base64 (JPEG quality 0.8)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setSnapshotUrl(dataUrl);
        }
      } catch (e) {
        console.error("Failed to capture snapshot:", e);
        setSnapshotUrl(''); // Fallback về màn hình đen nếu lỗi
      }
    }

    // 2. Mở Modal
    setIsConfigOpen(true);
  };

  // --- HANDLER: PLAY ---
  const handlePlay = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      
      // Gọi API Start
      await cameraService.start(camera.id);
      
      // Update trạng thái local NẾU start thành công
      const updatedCam = { ...camera, isLive: true };
      setCamera(updatedCam);
      
      const streamUrl = getStreamUrl(updatedCam);
      setWsUrl(streamUrl);

    } catch (error: any) {
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
    } finally {
      setIsProcessing(false);
    }
  };

  
  // --- HANDLER: STOP ---
  const handleStop = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {

      // 1. Ngắt hiển thị ngay lập tức
      setWsUrl(null);

      // 2. Gọi API tắt Backend AI
      await cameraService.stop(camera.id);

      setCamera(prev => ({ ...prev, isLive: false }));

    } catch (error: any) {
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
    } finally {
      setIsProcessing(false);
    }
  };

  

  // --- HANDLER: CONFIG UPDATE ---
  const handleConfigUpdate = (updatedCamera: Camera) => {
    setCamera(updatedCamera);
    // Nếu đổi port thì ngắt kết nối hiện tại để user tự kết nối lại
    if (updatedCamera.ws_port !== camera.ws_port) {
      setWsUrl(null);
      // Reset về trạng thái stop để user bấm play lại với port mới
      setCamera(prev => ({ ...prev, isLive: false }));
    }
  };

  // --- HANDLER: DELETE ---
  const handleDeleteCamera = async (cameraId: string) => {
    try {
      setIsProcessing(true); // Hiện loading chặn thao tác

      // 1. Ngắt kết nối socket trước
      setWsUrl(null);

      // 2. Gọi API Xóa
      await cameraService.delete(cameraId);

      // 3. Đóng modal & Chuyển hướng
      setIsConfigOpen(false);
      navigate('/camera'); // Quay về trang danh sách

    } catch (error) {
      console.error("Delete failed:", error);
      notify("Failed to delete camera.",'error');
      setIsProcessing(false);
    }
  };

  const handleToggleFullscreen = () => {
    if (!videoContainerRef.current) return;

    if (!document.fullscreenElement) {
      // Chưa fullscreen -> Bật lên
      videoContainerRef.current.requestFullscreen().catch(err => {
        console.error(`Error enabling fullscreen: ${err.message}`);
      });
    } else {
      // Đang fullscreen -> Thoát ra
      document.exitFullscreen();
    }
  };


  // --- RENDER ---
  // --- RENDER ---
  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>
          ← Back
        </button>
        <div className={styles.title}>Camera: {camera.name}</div>
        <button className={styles.configBtn} onClick={handleOpenConfig} disabled={isProcessing}>
          ⚙ Config
        </button>
      </div>

      {/* VIDEO CONTAINER (Gộp Ref vào đây) */}
      <div 
        className={styles.videoContainer} 
        ref={videoContainerRef} // <--- QUAN TRỌNG: Gắn ref vào container chính này
        style={{ backgroundColor: '#000' }} // Style nền đen khi fullscreen
      >
        <div className={styles.videoScreen} style={{ position: 'relative', overflow: 'hidden', background: '#000' }}>

          {/* LOADING OVERLAY */}
          {isProcessing && (
            <div className={styles.loadingOverlay}>
              <div className={styles.spinner}></div>
              <span>Processing...</span>
            </div>
          )}

          {/* BADGE LIVE */}
          {camera.isLive && !isProcessing && <div className={styles.liveBadge}>● LIVE</div>}

          {/* MAIN IMAGE STREAM */}
          <img
            ref={imgRef}
            alt="Main Stream"
            onLoad={handleImageLoad}
            style={{
              width: '100%', height: '100%', objectFit: 'contain',
              display: wsUrl ? 'block' : 'none'
            }}
          />

          {/* PLAY BUTTON (BIG) */}
          {!wsUrl && !isProcessing && (
            <div className={styles.bigPlayBtn} onClick={handlePlay}>▶</div>
          )}

          {/* CONNECTING TEXT */}
          {wsUrl && !isConnected && !isProcessing && (
             <div style={{ color: 'white', position: 'absolute' }}>Connecting...</div>
          )}
        </div>

        {/* CONTROLS BAR */}
        <div className={styles.controlsBar}>
          <div className={styles.controlGroup}>
            <span
              className={styles.controlIcon}
              onClick={!isProcessing ? (wsUrl ? handleStop : handlePlay) : undefined}
              style={{ opacity: isProcessing ? 0.5 : 1, cursor: isProcessing ? 'not-allowed' : 'pointer' }}
            >
              {wsUrl ? '⏸' : '▶'}
            </span>
            <span style={{ fontSize: '12px', color: '#aaa', marginLeft: '10px' }}>
              Status: {isProcessing ? 'Waiting response...' : status}
            </span>
          </div>

          <div className={styles.controlGroup}>
            <span className={styles.controlIcon} onClick={() => notify('Feature currently unavailable', 'info')}>🔊</span>
            
            {/* Nút Fullscreen */}
            <span 
                className={styles.controlIcon} 
                onClick={handleToggleFullscreen}
                title="Fullscreen"
             >
                ⛶
             </span>
          </div>
        </div>
      </div>

      {/* CONFIG MODAL */}
      {isConfigOpen && (
        <EditConfigModal
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          camera={camera}
          onUpdate={handleConfigUpdate}
          onDelete={handleDeleteCamera}
          streamResolution={streamResolution}
          snapshotUrl={snapshotUrl}
        />
      )}
    </div>
  );
};

export default CameraView;