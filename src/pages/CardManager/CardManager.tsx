import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// --- COMPONENTS ---
import CameraCard from '../../components/camera/CameraCard/CameraCard';
import AddCameraModal from '../../components/camera/AddCameraModal/AddCameraModal';

// --- SERVICES & TYPES ---
import { cameraService } from '../../services/cameraService';
import { kafkaService } from '../../services/kafkaService'; // <--- Import Kafka Service
import type { Camera, CreateCameraPayload } from '../../types/camera';

// --- STYLES ---
import styles from './CardManager.module.css';

const CardManager: React.FC = () => {
  // --- STATE ---
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // State quản lý Kafka
  const [isKafkaEnabled, setIsKafkaEnabled] = useState<boolean>(false); // Mặc định false
  const [isToggling, setIsToggling] = useState<boolean>(false);

  // Quản lý Modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navigate = useNavigate();

  // --- EFFECTS ---
  useEffect(() => {
    fetchCameras();
    // TODO: Nếu có API check trạng thái Kafka thì gọi ở đây
    // checkKafkaStatus();
  }, []);

  const fetchCameras = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  // --- HANDLERS ---
  
  // 1. Chuyển trang chi tiết
  const handleCameraClick = (cam: Camera) => {
    navigate(`/camera/${cam.id}`);
  };

  // 2. Lưu camera mới
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

  // 3. Toggle Kafka
  const handleToggleKafka = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newState = e.target.checked;
    setIsToggling(true);
    
    try {
        console.log(`Switching Kafka to: ${newState}`);
        
        // Gọi API
        await kafkaService.toggle(newState);
        
        // Cập nhật UI nếu thành công
        setIsKafkaEnabled(newState);
        
    } catch (error) {
        console.error("Failed to toggle Kafka", error);
        alert("Lỗi kết nối tới Kafka System!");
        // Revert lại nút gạt nếu lỗi
        setIsKafkaEnabled(!newState); 
    } finally {
        setIsToggling(false);
    }
  };

  // --- RENDER ---
  return (
    <div className={styles.container}>
      
      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.titleGroup}>
            <h1 className={styles.title}>Camera Management</h1>
            <p style={{color: '#6b7280', fontSize: '14px', margin: 0}}>Quản lý danh sách và trạng thái camera</p>
        </div>
        
        <div className={styles.headerActions}>
           
           {/* --- NÚT TOGGLE KAFKA --- */}
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

           {/* User Avatar */}
           <div className={styles.userAvatar}>
              <img src="https://i.pravatar.cc/150?img=12" alt="User" />
           </div>
        </div>
      </header>

      {/* GRID CAMERA */}
      {loading ? (
          <div style={{textAlign: 'center', marginTop: '40px', color: '#6b7280'}}>Đang tải danh sách camera...</div>
      ) : (
          <div className={styles.cameraGrid}>
              {cameras.map((cam) => (
                <CameraCard
                  key={cam.id}
                  camera={cam}
                  onClick={() => handleCameraClick(cam)}
                />
              ))}
              {/* Nút thêm mới */}
              <CameraCard type="add" onClick={() => setIsModalOpen(true)} />
          </div>
      )}

      {/* MODAL THÊM MỚI */}
      <AddCameraModal 
         isOpen={isModalOpen} 
         onClose={() => setIsModalOpen(false)} 
         onSave={handleSaveNewCamera} 
      />
    </div>
  );
};

export default CardManager;