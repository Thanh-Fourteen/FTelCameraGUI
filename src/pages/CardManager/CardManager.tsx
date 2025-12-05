import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// --- COMPONENTS ---
import CameraCard from '../../components/camera/CameraCard/CameraCard';
import AddCameraModal from '../../components/camera/AddCameraModal/AddCameraModal';

// --- SERVICES & TYPES ---
import { cameraService } from '../../services/cameraService';
import { kafkaService } from '../../services/kafkaService';
import type { Camera, CreateCameraPayload } from '../../types/camera';

// --- STYLES ---
import styles from './CardManager.module.css';

const CardManager: React.FC = () => {
  // --- STATE ---
  const [cameras, setCameras] = useState<Camera[]>([]);
  
  // Loading này CHỈ DÀNH RIÊNG cho danh sách Camera
  const [loadingCameras, setLoadingCameras] = useState<boolean>(true);
  
  // State quản lý Kafka
  const [isKafkaEnabled, setIsKafkaEnabled] = useState<boolean>(false); 
  const [isToggling, setIsToggling] = useState<boolean>(false);

  // Quản lý Modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navigate = useNavigate();

  // --- EFFECTS ---
  useEffect(() => {
    // Gọi 2 hàm này hoàn toàn độc lập. 
    // Hàm nào xong trước thì update UI phần đó trước.
    fetchCameras();
    fetchKafkaStatus();
  }, []);

  // 1. Lấy danh sách Camera (Quan trọng -> Có Loading)
  const fetchCameras = async () => {
    try {
      setLoadingCameras(true); // Bắt đầu load cam
      
      const data = await cameraService.getAll();
      const mappedCameras: Camera[] = data.map((cam: any) => ({
        ...cam,
        id: cam.camera_id,
        name: cam.camera_id,
        isLive: cam.status === 'running',
        thumbnailUrl: cam.thumbnailUrl || undefined
      }));
      setCameras(mappedCameras);
      
    } catch (error) {
      console.error("Failed to fetch cameras:", error);
    } finally {
      setLoadingCameras(false); // Xong cam thì tắt loading ngay, kệ Kafka
    }
  };

  // 2. Lấy trạng thái Kafka (Phụ -> Chạy ngầm)
  const fetchKafkaStatus = async () => {
      try {
          // Nút toggle sẽ ở trạng thái mặc định (false) cho đến khi API này trả về
          const data = await kafkaService.status();
          
          // Map dữ liệu từ backend (giả sử backend trả về status hoặc is_active)
          const isRunning = data.status === 'running' || data.is_active === true || data === true;
          
          setIsKafkaEnabled(isRunning);
          // console.log("Kafka Status Loaded:", isRunning);
      } catch (error) {
          console.error("Failed to fetch Kafka status (User might not notice this):", error);
      }
  };

  // --- HANDLERS ---
  
  const handleCameraClick = (cam: Camera) => {
    navigate(`/camera/${cam.id}`);
  };

  const handleSaveNewCamera = async (payload: CreateCameraPayload) => {
    try {
      const newCameraData: any = await cameraService.create(payload);
      const newCameraUI: Camera = {
        ...newCameraData,
        id: newCameraData.camera_id,
        name: newCameraData.camera_id,
        isLive: newCameraData.status === 'running',
      };
      setCameras((prev) => [...prev, newCameraUI]);
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      alert("Failed to create camera.");
    }
  };

  const handleToggleKafka = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newState = e.target.checked;
    setIsToggling(true); // Disable nút trong lúc gọi API
    
    try {
        console.log(`Switching Kafka to: ${newState}`);
        await kafkaService.toggle(newState);
        setIsKafkaEnabled(newState);
    } catch (error) {
        console.error("Failed to toggle Kafka", error);
        alert("Lỗi kết nối tới Kafka System!");
        setIsKafkaEnabled(!newState); // Revert lại nếu lỗi
    } finally {
        setIsToggling(false);
    }
  };

  // --- RENDER ---
  return (
    <div className={styles.container}>
      
      {/* HEADER: Luôn hiển thị ngay lập tức, không chờ loading */}
      <header className={styles.header}>
        <div className={styles.titleGroup}>
            <h1 className={styles.title}>Camera Management</h1>
            <p style={{color: '#6b7280', fontSize: '14px', margin: 0}}>Manage camera list and status</p>
        </div>
        
        <div className={styles.headerActions}>
           {/* Nút Kafka load độc lập, người dùng có thể thấy nó bật/tắt sau 1 xíu */}
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

      {/* GRID CAMERA: Chỉ phụ thuộc vào loadingCameras */}
      {loadingCameras ? (
          <div style={{
              textAlign: 'center', 
              marginTop: '60px', 
              color: '#6b7280',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px'
          }}>
              {/* Spinner đơn giản */}
              <div style={{
                  width: '30px', height: '30px', 
                  border: '3px solid #e5e7eb', borderTop: '3px solid #3b82f6', 
                  borderRadius: '50%', animation: 'spin 1s linear infinite'
              }}></div>
              <span>Đang tải danh sách camera...</span>
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

      {/* MODAL */}
      <AddCameraModal 
         isOpen={isModalOpen} 
         onClose={() => setIsModalOpen(false)} 
         onSave={handleSaveNewCamera} 
      />
      
      {/* Inject CSS animation cho spinner nếu chưa có */}
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default CardManager;