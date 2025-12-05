import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// Component & Service
import CameraView from '../../components/camera/CameraView/CameraView';
import { cameraService } from '../../services/cameraService';
import { kafkaService } from '../../services/kafkaService';
import type { Camera } from '../../types/camera';

const CameraViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [camera, setCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);

  // --- STATE CHO KAFKA ---
  const [isKafkaEnabled, setIsKafkaEnabled] = useState<boolean>(false);
  const [isToggling, setIsToggling] = useState<boolean>(false);

  // --- FETCH DATA ---
  useEffect(() => {
    // 1. Lấy trạng thái Kafka
    const fetchKafkaStatus = async () => {
      try {
        const data = await kafkaService.status();
        const isRunning = data.status === 'running' || data.is_active === true || data === true;
        setIsKafkaEnabled(isRunning);
      } catch (error) {
        console.error("Failed to fetch Kafka status", error);
      }
    };

    // 2. Lấy thông tin Camera
    const fetchCameraDetail = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const all = await cameraService.getAll();
        const found = all.find((c: any) => c.camera_id === id);

        if (found) {
          const mappedCam: Camera = {
            ...found,
            id: found.camera_id,
            name: found.camera_id,
            isLive: found.status === 'running',
          };
          setCamera(mappedCam);
        } else {
          alert("Camera not found!");
          navigate('/camera');
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchKafkaStatus();
    fetchCameraDetail();
  }, [id, navigate]);

  // --- HANDLER TOGGLE KAFKA (Logic mới cho Inline Style) ---
  const handleToggleKafka = async () => {
    if (isToggling) return; // Chặn spam click

    const newState = !isKafkaEnabled; // Đảo ngược trạng thái hiện tại
    setIsToggling(true);
    
    try {
        await kafkaService.toggle(newState);
        setIsKafkaEnabled(newState);
    } catch (error) {
        console.error("Failed to toggle Kafka", error);
        alert("Lỗi kết nối tới Kafka System!");
    } finally {
        setIsToggling(false);
    }
  };

  // --- RENDER ---
  if (loading) return <div style={{ color: '#666', padding: 40, textAlign: 'center' }}>Loading camera info...</div>;
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
          
          {/* Nút Kafka (Custom Toggle bằng Div) */}
          <div style={styles.kafkaControl}>
            <span style={styles.kafkaLabel}>Kafka Stream</span>
            
            {/* Toggle Switch Container */}
            <div 
                style={{
                    ...styles.switchBase,
                    backgroundColor: isKafkaEnabled ? '#f97316' : '#cbd5e1', // Cam hoặc Xám
                    opacity: isToggling ? 0.6 : 1,
                    cursor: isToggling ? 'not-allowed' : 'pointer'
                }}
                onClick={handleToggleKafka}
            >
                {/* Cái nút tròn bên trong */}
                <div style={{
                    ...styles.switchKnob,
                    transform: isKafkaEnabled ? 'translateX(18px)' : 'translateX(0)' // Di chuyển
                }} />
            </div>
          </div>

          {/* Avatar */}
          <div style={styles.userAvatar}>
            <img src="/logo.jpg" alt="User" style={styles.avatarImg} />
          </div>
        </div>
      </header>

      {/* COMPONENT VIEW CAMERA */}
      <CameraView
        camera={camera}
        onBack={() => navigate('/camera')}
      />
    </div>
  );
};

// --- INLINE STYLES ---
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '32px',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '20px',
    borderBottom: '1px solid #e5e7eb',
  },
  titleGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0,
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  
  // Style cho cụm Kafka
  kafkaControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'white',
    padding: '8px 16px',
    borderRadius: '24px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  kafkaLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
  },
  
  // Style cho nút gạt (Switch Base)
  switchBase: {
    width: '40px',
    height: '22px',
    borderRadius: '34px',
    position: 'relative',
    transition: 'background-color 0.3s',
    display: 'flex',
    alignItems: 'center',
    padding: '2px', // Padding để tạo khoảng cách cho nút tròn
    boxSizing: 'border-box'
  },
  
  // Style cho nút tròn (Knob)
  switchKnob: {
    width: '16px',
    height: '16px',
    backgroundColor: 'white',
    borderRadius: '50%',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    transition: 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)', // Hiệu ứng trượt mượt
  },

  // Avatar
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
    cursor: 'pointer',
    border: '2px solid #fff',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  }
};

export default CameraViewPage;