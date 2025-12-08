import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// --- COMPONENTS ---
import CameraCard from '../../components/camera/CameraCard/CameraCard';
import AddCameraModal from '../../components/camera/AddCameraModal/AddCameraModal';

// --- SERVICES & HOOKS ---
import { cameraService } from '../../services/cameraService';
import { kafkaService } from '../../services/kafkaService';
import { useSystemStatus } from '../../hooks/useSystemStatus'; // <--- Hook Realtime
import { useNotification } from '../../context/NotificationContext';
import type { Camera, CreateCameraPayload } from '../../types/camera';

// --- STYLES ---
import styles from './CardManager.module.css';

const CardManager: React.FC = () => {
  const navigate = useNavigate();
  const { notify } = useNotification();

  // 1. Gọi Hook Realtime (Lắng nghe toàn bộ hệ thống)
  const { systemStatus, cameraStatuses } = useSystemStatus();

  // --- STATE ---
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loadingCameras, setLoadingCameras] = useState<boolean>(true);
  
  // State Kafka & Toggle
  const [isKafkaEnabled, setIsKafkaEnabled] = useState<boolean>(false);
  const [isToggling, setIsToggling] = useState<boolean>(false);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- INITIAL FETCH (HTTP) ---
  useEffect(() => {
    const initData = async () => {
      try {
        setLoadingCameras(true);
        // Lấy danh sách camera ban đầu
        const data = await cameraService.getAll();
        
        const mapped = data.map((c: any) => ({
          ...c,
          id: c.camera_id,
          name: c.camera_id,
          // Status ban đầu lấy từ DB
          isLive: c.status === 'running' || c.status === 'starting',
          thumbnailUrl: c.thumbnailUrl
        }));
        setCameras(mapped);

        // Lấy trạng thái Kafka ban đầu (để nút không bị sai trước khi WS kết nối)
        const kafkaData = await kafkaService.status();
        const isRunning = kafkaData.status === 'running' || kafkaData.is_active === true;
        setIsKafkaEnabled(isRunning);

      } catch (e) {
        console.error("Init data failed", e);
        notify("Failed to load initial data", "error");
      } finally {
        setLoadingCameras(false);
      }
    };

    initData();
  }, [notify]);

  // --- REAL-TIME SYNC (WebSocket) ---
  // --- REAL-TIME SYNC (WebSocket) ---
  useEffect(() => {
    // 1. Đồng bộ Kafka Switch (Giữ nguyên)
    if (systemStatus?.kafka) {
        setIsKafkaEnabled(systemStatus.kafka.status === 'running');
    }

    // 2. ĐỒNG BỘ DANH SÁCH CAMERA (LOGIC MỚI)
    if (cameraStatuses && Array.isArray(cameraStatuses)) {
        // Thay vì chỉ update status, ta sẽ RE-SYNC lại toàn bộ danh sách
        // Tuy nhiên, WS thường chỉ trả về status rút gọn (id, status, rtsp), thiếu thumbnail.
        // Nên ta phải merge khéo léo:
        
        setCameras(prevCameras => {
            // Tạo Map để tra cứu nhanh camera cũ
            const prevMap = new Map(prevCameras.map(c => [c.id, c]));
            
            // Tạo danh sách mới từ dữ liệu WebSocket
            const newCameras = cameraStatuses.map(wsCam => {
                const oldCam = prevMap.get(wsCam.camera_id);
                
                // Nếu camera đã tồn tại -> Giữ lại thumbnail cũ, update status mới
                if (oldCam) {
                    const newIsLive = wsCam.status === 'running' || wsCam.status === 'starting';
                    // Chỉ return object mới nếu có thay đổi (để tối ưu render)
                    if (oldCam.status !== wsCam.status || oldCam.isLive !== newIsLive) {
                        return { ...oldCam, status: wsCam.status, isLive: newIsLive };
                    }
                    return oldCam;
                }

                // Nếu camera mới tinh (do người khác thêm) -> Tạo object mới
                return {
                    id: wsCam.camera_id,
                    name: wsCam.camera_id, // Hoặc wsCam.name nếu backend trả về
                    rtsp_url: wsCam.rtsp_url,
                    ws_port: wsCam.ws_port,
                    status: wsCam.status,
                    isLive: wsCam.status === 'running' || wsCam.status === 'starting',
                    thumbnailUrl: undefined, // Mới thì chưa có ảnh
                    settings: wsCam.settings || {}
                } as Camera;
            });

            return newCameras;
        });
    }
  }, [systemStatus, cameraStatuses]);

  // --- HANDLERS ---

  const handleCameraClick = (cam: Camera) => {
    navigate(`/camera/${cam.id}`);
  };

  const handleSaveNewCamera = async (payload: CreateCameraPayload) => {
    try {
      const newCameraData: any = await cameraService.create(payload);
      // Thêm camera mới vào list ngay lập tức
      const newCameraUI: Camera = {
        ...newCameraData,
        id: newCameraData.camera_id,
        name: newCameraData.camera_id,
        isLive: newCameraData.status === 'running',
      };
      setCameras(prev => [...prev, newCameraUI]);
      
      setIsModalOpen(false);
      notify("Camera created successfully", "success");
    } catch (error: any) {
      const msg = error.response?.data?.detail || "Failed to create camera.";
      notify(msg, "error");
    }
  };

  const handleToggleKafka = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newState = e.target.checked;
    setIsToggling(true);
    
    try {
        // Gọi API Toggle
        await kafkaService.toggle(newState);
        // UI sẽ tự cập nhật nhờ useEffect lắng nghe WebSocket ở trên
        // Nhưng ta set tạm state để phản hồi nhanh (Optimistic UI)
        setIsKafkaEnabled(newState);
        notify(`Kafka ${newState ? 'Enabled' : 'Disabled'}`, "success");
    } catch (error) {
        console.error("Toggle Kafka failed", error);
        notify("Failed to toggle Kafka", "error");
        setIsKafkaEnabled(!newState); // Revert nếu lỗi
    } finally {
        setIsToggling(false);
    }
  };

  // --- RENDER ---
  return (
    <div className={styles.container}>
      
      <header className={styles.header}>
        <div className={styles.titleGroup}>
            <h1 className={styles.title}>Camera Management</h1>
            <p style={{color: '#6b7280', fontSize: '14px', margin: 0}}>Manage camera list and status</p>
        </div>
        
        <div className={styles.headerActions}>
           {/* Nút Kafka */}
           <div className={styles.kafkaControl}>
              <span className={styles.kafkaLabel}>Kafka Stream</span>
              <label className={styles.switch}>
                  <input 
                    type="checkbox" 
                    checked={isKafkaEnabled}
                    onChange={handleToggleKafka}
                    disabled={isToggling} 
                  />
                  <span className={styles.slider}></span>
              </label>
           </div>

           <div className={styles.userAvatar}>
              <img src="/logo.jpg" alt="User" />
           </div>
        </div>
      </header>

      {/* Camera Grid */}
      {loadingCameras ? (
          <div style={{
              textAlign: 'center', marginTop: '60px', color: '#6b7280',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px'
          }}>
              <div className={styles.spinner}></div>
              <span>Loading cameras...</span>
          </div>
      ) : (
          <div className={styles.cameraGrid}>
              {cameras.map((cam) => (
                <CameraCard
                  key={cam.id}
                  camera={cam}
                  onClick={() => handleCameraClick(cam)}
                />
              ))}
              <CameraCard type="add" onClick={() => setIsModalOpen(true)} />
          </div>
      )}

      {/* Modal */}
      <AddCameraModal 
         isOpen={isModalOpen} 
         onClose={() => setIsModalOpen(false)} 
         onSave={handleSaveNewCamera} 
      />
      
      {/* CSS Spinner Animation (Inline for simplicity) */}
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default CardManager;