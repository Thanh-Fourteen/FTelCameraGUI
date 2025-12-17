import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { useWebSocketFrame } from '../../../hooks/useWebSocketFrame';
import { cameraService } from '../../../services/cameraService';
import { type Camera } from '../../../types/camera';
import styles from './CameraView.module.css';
import { useNotification } from '../../../context/NotificationContext';

export interface CameraViewHandle {
  getSnapshot: () => string;
}

interface CameraViewProps {
  camera: Camera;
  onBack: () => void;
  forcedWsUrl?: string | null;
  onFps?: (fps: number) => void;
  isControlHidden?: boolean;
}

const CameraView = forwardRef<CameraViewHandle, CameraViewProps>(({
  camera: initialCamera,
  forcedWsUrl,
  onFps,
  isControlHidden = false
}, ref) => {
  const { notify } = useNotification();
  const [camera, setCamera] = useState<Camera>(initialCamera);

  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [streamResolution, setStreamResolution] = useState({ width: 854, height: 480 });
  const [isProcessing, setIsProcessing] = useState(false);

  // --- 1. LOGIC LẤY STREAM URL MỚI ---
  const getStreamUrl = (cam: Camera) => {
    // Nếu ép cứng từ props thì dùng luôn
    if (forcedWsUrl) return forcedWsUrl;

    // Nếu camera chưa chạy thì không có link
    if (!cam.isLive && cam.status !== 'running') return null;

    // ƯU TIÊN SỐ 1: Backend Proxy đã ghép sẵn URL chuẩn
    if (cam.stream_url) return cam.stream_url;


    console.log(cam)
    // ƯU TIÊN SỐ 2: Tự ghép nếu có đủ Public IP và Public Port
    // (Trường hợp Proxy chưa trả stream_url nhưng có trả public_port)
    const ip = cam.node_ip || cam.ip_address;
    const port = cam.public_port;
    console.log("[CameraView] Attempting to construct Stream URL with IP and Port:", ip, port);

    if (ip && port) {
      console.log(`[CameraView] Auto-construct URL: ws://${ip}:${port}`);
      return `ws://${ip}:${port}`;
    }

    // Fallback thất bại
    console.warn("[CameraView] Cannot determine Stream URL (Missing Public Port mapping?)");
    return null;
  };

  // State WS URL
  const [wsUrl, setWsUrl] = useState<string | null>(() => getStreamUrl(initialCamera));

  // Sync khi props camera thay đổi
  useEffect(() => {
    setCamera(initialCamera);
    setWsUrl(getStreamUrl(initialCamera));
  }, [initialCamera, forcedWsUrl]);

  // Hook WebSocket
  const { imgRef, status, isConnected, lastJsonMessage } = useWebSocketFrame({
    url: wsUrl,
    autoReconnect: true
  });

  // Callback FPS
  useEffect(() => {
    if (lastJsonMessage && lastJsonMessage.fps && onFps) {
      onFps(lastJsonMessage.fps);
    }
  }, [lastJsonMessage, onFps]);

  // Handle Image Resolution
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      if (img.naturalWidth !== streamResolution.width || img.naturalHeight !== streamResolution.height) {
        setStreamResolution({ width: img.naturalWidth, height: img.naturalHeight });
      }
    }
  };

  // Expose Snapshot
  useImperativeHandle(ref, () => ({
    getSnapshot: () => {
      if (imgRef.current) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = imgRef.current.naturalWidth || 1920;
          canvas.height = imgRef.current.naturalHeight || 1080;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL('image/jpeg', 0.8);
          }
        } catch (e) { console.error(e); }
      }
      return '';
    }
  }));

  // --- 2. HÀM PLAY (QUAN TRỌNG) ---
  const handlePlay = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const instanceId = camera.node_id || 'default';
      
      // Gọi API Start
      // LƯU Ý: Backend Proxy bây giờ trả về object camera ĐẦY ĐỦ (gồm cả stream_url)
      const updatedData = await cameraService.start(instanceId, camera.camera_id);

      // Merge dữ liệu mới vào state
      const newCameraState = { 
          ...camera, 
          ...updatedData, // Cập nhật stream_url, public_port từ backend
          isLive: true,
          status: 'running'
      };

      setCamera(newCameraState);
      
      // Cập nhật lại URL WebSocket từ dữ liệu mới nhất
      setWsUrl(getStreamUrl(newCameraState));

    } catch (error: any) {
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Error starting camera:", errorMessage);
      const msg = error.response?.data?.detail || errorMessage || "Error starting camera";
      notify(msg, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStop = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      setWsUrl(null); // Ngắt kết nối ngay lập tức

      const instanceId = camera.node_id || 'default';
      await cameraService.stop(instanceId, camera.camera_id);

      setCamera(prev => ({ ...prev, isLive: false, status: 'stopped' }));
    } catch (error: any) {
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const msg = error.response?.data?.detail || errorMessage || "Error stopping camera";
      console.error(msg);
      notify(msg, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className={styles.container}>
      <div
        className={styles.videoContainer}
        ref={videoContainerRef}
        style={{ backgroundColor: '#000', flex: 1, display: 'flex', flexDirection: 'column' }}
      >
        <div className={styles.videoScreen} style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#000' }}>

          {isProcessing && (
            <div className={styles.loadingOverlay}>
              <div className={styles.spinner}></div>
              <span>Processing...</span>
            </div>
          )}

          {camera.isLive && !isProcessing && <div className={styles.liveBadge}>● LIVE</div>}

          <img
            ref={imgRef}
            alt="Stream"
            onLoad={handleImageLoad}
            style={{
              width: '100%', height: '100%', objectFit: 'contain',
              display: wsUrl ? 'block' : 'none'
            }}
          />

          {!wsUrl && !isProcessing && !isControlHidden && (
            <div className={styles.bigPlayBtn} onClick={handlePlay}>▶</div>
          )}

          {wsUrl && !isConnected && !isProcessing && (
            <div style={{ color: 'white', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>Connecting...</div>
          )}
        </div>

        {!isControlHidden && (
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
                Status: {isProcessing ? 'Waiting...' : status}
              </span>
            </div>

            <div className={styles.controlGroup}>
               {/* Thêm hiển thị IP/Port để debug nếu muốn */}
               {camera.public_port && (
                   <span style={{fontSize: 10, color: '#555', marginRight: 10}}>
                       Port: {camera.internal_port} → {camera.public_port}
                   </span>
               )}
              <span className={styles.controlIcon} onClick={() => notify('Feature unavailable', 'info')}>🔊</span>
              <span className={styles.controlIcon} onClick={handleToggleFullscreen} title="Fullscreen">⛶</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default CameraView;