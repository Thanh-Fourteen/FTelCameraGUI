import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// Component & Service
import CameraView from '../../components/camera/CameraView/CameraView';
import { cameraService } from '../../services/cameraService';
import { kafkaService } from '../../services/kafkaService';
import { useSystemStatus } from '../../hooks/useSystemStatus'; // <--- Hook Realtime
import { useNotification } from '../../context/NotificationContext';
import type { Camera } from '../../types/camera';

const CameraViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notify } = useNotification();

  // Gọi Hook Realtime
  const { systemStatus, cameraStatuses } = useSystemStatus();

  const [camera, setCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);

  // State Kafka
  const [isKafkaEnabled, setIsKafkaEnabled] = useState<boolean>(false);
  const [isToggling, setIsToggling] = useState<boolean>(false);

  // --- INITIAL FETCH (HTTP) ---
  useEffect(() => {
    if (!id) return;

    const initData = async () => {
      try {
        setLoading(true);
        // 1. Lấy thông tin Camera
        const camData = await cameraService.getById(id);
        if (camData) {
            setCamera({
                ...camData,
                id: camData.camera_id,
                name: camData.camera_id,
                isLive: camData.status === 'running' || camData.status === 'starting'
            });
        } else {
            notify("Camera not found!", "error");
            navigate('/camera');
        }

        // 2. Lấy trạng thái Kafka
        const kafkaData = await kafkaService.status();
        setIsKafkaEnabled(kafkaData.status === 'running' || kafkaData.is_active === true);

      } catch (error) {
        console.error("Init error:", error);
        notify("Failed to load camera details", "error");
        navigate('/camera');
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [id, navigate, notify]);

  // --- REAL-TIME SYNC (WebSocket) ---
  // --- REAL-TIME SYNC (WebSocket) ---
  useEffect(() => {
    // 1. Sync Kafka (Giữ nguyên)
    if (systemStatus?.kafka) {
        setIsKafkaEnabled(systemStatus.kafka.status === 'running');
    }

    // 2. Sync Camera Status (LOGIC MỚI QUAN TRỌNG)
    if (cameraStatuses && id) {
        // Tìm xem camera hiện tại còn tồn tại trong hệ thống không
        const update = cameraStatuses.find(s => s.camera_id === id);
        
        if (update) {
            // TRƯỜNG HỢP A: Camera còn sống -> Cập nhật trạng thái
            const newIsLive = update.status === 'running' || update.status === 'starting';
            
            if (camera?.status !== update.status || camera?.isLive !== newIsLive) {
                setCamera(prev => prev ? ({
                    ...prev,
                    status: update.status,
                    isLive: newIsLive
                }) : null);
            }
        } else {
            // TRƯỜNG HỢP B: Camera đã biến mất khỏi danh sách (Bị xóa)
            // Chỉ redirect nếu camera đã load xong lần đầu (để tránh redirect nhầm khi mới vào chưa sync kịp)
            if (camera && !loading) {
                console.warn(`Camera ${id} no longer exists. Redirecting...`);
                notify("Camera has been removed by system!", "warning");
                navigate('/camera'); // Đẩy về trang quản lý
            }
        }
    }
  }, [systemStatus, cameraStatuses, camera, id, loading, navigate, notify]);
  // --- HANDLER TOGGLE KAFKA ---
  const handleToggleKafka = async () => {
    if (isToggling) return;
    const newState = !isKafkaEnabled;
    setIsToggling(true);
    try {
        await kafkaService.toggle(newState);
        setIsKafkaEnabled(newState);
    } catch (error) {
        console.error("Failed to toggle Kafka", error);
        notify("Failed to connect to Kafka System", "error");
    } finally {
        setIsToggling(false);
    }
  };

  // --- RENDER ---
  if (loading) return (
    <div style={{ color: '#666', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px'}}>
            <div style={styles.spinner}></div>
            <span>Loading camera info...</span>
        </div>
    </div>
  );

  if (!camera) return null;

  return (
    <div style={styles.container}>
      
      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.titleGroup}>
          <h1 style={styles.title}>Camera Detail</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
             Monitor and configure individual camera
          </p>
        </div>

        <div style={styles.headerActions}>
          <div style={styles.kafkaControl}>
            <span style={styles.kafkaLabel}>Kafka Stream</span>
            <div 
                style={{
                    ...styles.switchBase,
                    backgroundColor: isKafkaEnabled ? '#f97316' : '#cbd5e1',
                    opacity: isToggling ? 0.6 : 1,
                    cursor: isToggling ? 'not-allowed' : 'pointer'
                }}
                onClick={handleToggleKafka}
            >
                <div style={{
                    ...styles.switchKnob,
                    transform: isKafkaEnabled ? 'translateX(18px)' : 'translateX(0)' 
                }} />
            </div>
          </div>

          <div style={styles.userAvatar}>
            <img src="/logo.jpg" alt="User" style={styles.avatarImg} />
          </div>
        </div>
      </header>

      {/* VIEW */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <CameraView
            camera={camera}
            onBack={() => navigate('/camera')}
          />
      </div>

      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// --- STYLES ---
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '32px', backgroundColor: '#f8f9fa', height: '100vh',
    boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e5e7eb', flexShrink: 0,
  },
  titleGroup: { display: 'flex', flexDirection: 'column' },
  title: { fontSize: '28px', fontWeight: '700', color: '#1f2937', margin: 0 },
  headerActions: { display: 'flex', alignItems: 'center', gap: '20px' },
  
  kafkaControl: {
    display: 'flex', alignItems: 'center', gap: '12px',
    backgroundColor: 'white', padding: '8px 16px', borderRadius: '24px',
    border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  kafkaLabel: { fontSize: '14px', fontWeight: '600', color: '#374151' },
  
  switchBase: {
    width: '40px', height: '22px', borderRadius: '34px', position: 'relative',
    transition: 'background-color 0.3s', display: 'flex', alignItems: 'center',
    padding: '2px', boxSizing: 'border-box'
  },
  switchKnob: {
    width: '16px', height: '16px', backgroundColor: 'white',
    borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    transition: 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)', 
  },
  userAvatar: {
    width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e5e7eb',
    overflow: 'hidden', cursor: 'pointer', border: '2px solid #fff', boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  spinner: {
    width: '40px', height: '40px', border: '4px solid #e5e7eb', borderTop: '4px solid #3b82f6', 
    borderRadius: '50%', animation: 'spin 1s linear infinite'
  }
};

export default CameraViewPage;