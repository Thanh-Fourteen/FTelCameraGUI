import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Dùng để chuyển trang khi xóa
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
  const navigate = useNavigate();
  const [camera, setCamera] = useState<Camera>(initialCamera);

  const [snapshotUrl, setSnapshotUrl] = useState<string>('');
  const [streamResolution, setStreamResolution] = useState({ width: 854, height: 480 });
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- HÀM TẠO URL STREAM THÔNG MINH ---
  // Tự động xử lý Proxy (WSS) hoặc Direct (WS) dựa trên giao thức hiện tại
  const getStreamUrl = (cam: Camera) => {
    if (!cam.isLive || !cam.ws_port) return null;

    // TRƯỜNG HỢP 2: Chạy HTTP thường -> Kết nối trực tiếp tới Backend
    // return `https:ws.doca.love/camera/${cam.ws_port}`;
    return `ws://192.168.1.130:${cam.ws_port}`
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
        console.log(`🎥 Stream Dimensions Detected: ${img.naturalWidth}x${img.naturalHeight}`);
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
      console.log(`Starting camera ${camera.id}...`);
      await cameraService.start(camera.id);

      // Update trạng thái local
      const updatedCam = { ...camera, isLive: true };
      setCamera(updatedCam);

      // Tạo URL và kết nối
      const streamUrl = getStreamUrl(updatedCam);
      setWsUrl(streamUrl);

    } catch (error) {
      console.error("Start failed:", error);
      alert("Không thể khởi động camera.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- HANDLER: STOP ---
  const handleStop = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      console.log(`Stopping camera ${camera.id}...`);

      // 1. Ngắt hiển thị ngay lập tức
      setWsUrl(null);

      // 2. Gọi API tắt Backend AI
      await cameraService.stop(camera.id);

      setCamera(prev => ({ ...prev, isLive: false }));

    } catch (error) {
      console.error("Stop failed:", error);
      alert("Lỗi khi dừng camera");
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
      console.log(`Deleting camera ${cameraId}...`);
      await cameraService.delete(cameraId);

      // 3. Đóng modal & Chuyển hướng
      setIsConfigOpen(false);
      navigate('/camera'); // Quay về trang danh sách

    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete camera.");
      setIsProcessing(false);
    }
  };

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

      {/* VIDEO CONTAINER */}
      <div className={styles.videoContainer}>
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
            onLoad={handleImageLoad} // <--- THÊM DÒNG NÀY
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
            <span className={styles.controlIcon}>🔊</span>
            <span className={styles.controlIcon}>⛶</span>
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