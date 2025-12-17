import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Components
import SharedHeader from '../../components/layout/SharedHeader/SharedHeader';
import CameraCard from '../../components/camera/CameraCard/CameraCard';
import AddCameraModal from '../../components/camera/AddCameraModal/AddCameraModal'; // <-- Uncomment khi có Modal

// Services & Hooks
import { instanceService, type VastInstance } from '../../services/instanceService';
import { cameraService } from '../../services/cameraService';
import { kafkaService } from '../../services/kafkaService';
import { useNotification } from '../../context/NotificationContext';

// Types
import type { Camera } from '../../types/camera';

const CardManager: React.FC = () => {
  const navigate = useNavigate();
  const { notify } = useNotification();

  // --- STATE DATA ---
  const [instances, setInstances] = useState<VastInstance[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(false);

  // --- STATE UI CONTROL ---
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | 'all'>(() => {
    const saved = localStorage.getItem('last_selected_instance');
    return saved || 'all';
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false); // State mở modal thêm cam

  // --- STATE KAFKA ---
  const [isKafkaEnabled, setIsKafkaEnabled] = useState(false);
  const [isTogglingKafka, setIsTogglingKafka] = useState(false);

  const handleInstanceChange = (val: string | 'all') => {
    setSelectedInstanceId(val);
    // Lưu ngay vào LocalStorage
    localStorage.setItem('last_selected_instance', val);
  };


  // --------------------------------------------------------
  // 1. FETCH DANH SÁCH INSTANCES
  // --------------------------------------------------------
  const fetchInstances = useCallback(async () => {
    try {
      const data = await instanceService.getAll();
      setInstances(data);
      const savedId = localStorage.getItem('last_selected_instance');
      if (savedId && savedId !== 'all') {
        const exists = data.find(i => i.instance_id === savedId);
        if (!exists) {
          console.warn(`Instance ${savedId} no longer exists. Resetting to 'all'.`);
          setSelectedInstanceId('all');
          localStorage.setItem('last_selected_instance', 'all');
        }
      }

    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';
      notify(errorMessage, "error");
    }
  }, [notify]);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  // --------------------------------------------------------
  // 2. FETCH CAMERAS
  // --------------------------------------------------------
  const fetchCameras = useCallback(async () => {
    setLoading(true);
    setCameras([]);
    try {
      let data: Camera[] = [];

      if (selectedInstanceId === 'all') {
        data = await cameraService.getAllAggregated();
      } else {
        data = await cameraService.getByInstance(selectedInstanceId);

        // Check Kafka status nếu chọn instance cụ thể
        try {
          const status = await kafkaService.status(selectedInstanceId);
          setIsKafkaEnabled(status.status === 'running' || status.is_active === true);
        } catch (e) {
          console.log("Could not fetch Kafka status:", e);
        }
      }

      setCameras(data);

    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Failed to load cameras", error);
      notify(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  }, [selectedInstanceId, notify]);

  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  // --------------------------------------------------------
  // 3. HANDLERS
  // --------------------------------------------------------
  const handleToggleKafka = async () => {
    if (selectedInstanceId === 'all') {
      notify("Please select a specific backend to toggle Kafka", "info");
      return;
    }

    if (isTogglingKafka) return;
    setIsTogglingKafka(true);

    try {
      const newState = !isKafkaEnabled;
      await kafkaService.toggle(selectedInstanceId, newState);
      setIsKafkaEnabled(newState);
      notify(`Kafka on ${selectedInstanceId} turned ${newState ? 'ON' : 'OFF'}`, "success");
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';
      notify(errorMessage, "error");
    } finally {
      setIsTogglingKafka(false);
    }
  };

  const handleCameraClick = (cam: Camera) => {
    // 1. Lấy ID camera (cam_id)
    const targetCamId = (cam as any).camera_id || cam.id;

    const targetInstanceId = (cam as any).node_id ||
      (selectedInstanceId !== 'all' ? selectedInstanceId : 'default');

    if (!targetCamId || !targetInstanceId) {
      notify("Missing Camera ID or Node ID", "error");
      return;
    }

    // 3. Điều hướng theo URL mới
    navigate(`/camera/${targetInstanceId}/${targetCamId}`);
  };
  // Mở modal thêm camera
  const handleAddCameraClick = () => {
    if (selectedInstanceId === 'all') {
      // Nếu đang xem tất cả, yêu cầu user chọn backend cụ thể trước
      // Hoặc bạn có thể mở modal và cho user chọn backend trong modal đó
      notify("Please select a specific backend instance to add camera", "warning");
    } else {
      setIsAddModalOpen(true); // <-- Bật cái này khi có modal
      // notify("Open Add Camera Modal (Coming Soon)", "info");
    }
  };

  // Xử lý sau khi thêm thành công
  const handleCameraAdded = () => {
    setIsAddModalOpen(false);
    fetchCameras(); // Reload danh sách
    notify("Camera added successfully", "success");
  };

  // --------------------------------------------------------
  // RENDER
  // --------------------------------------------------------
  return (
    <div style={styles.container}>

      <SharedHeader
        title="Camera Management"
        subtitle={selectedInstanceId === 'all'
          ? `All Cameras (${cameras.length})`
          : `Cameras on ${instances.find(i => i.instance_id === selectedInstanceId)?.name || selectedInstanceId} (${cameras.length})`
        }
        instances={instances}
        selectedInstanceId={selectedInstanceId}
        onInstanceChange={(val) => handleInstanceChange(val as string | 'all')}
        onRefreshInstances={fetchInstances}
        kafkaState={{
          isEnabled: isKafkaEnabled,
          isToggling: isTogglingKafka,
          onToggle: handleToggleKafka
        }}
      >
      </SharedHeader>

      <div style={styles.content}>
        {loading ? (
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <p>Loading cameras...</p>
          </div>
        ) : (
          <div style={styles.grid}>

            {/* CARD THÊM MỚI (Luôn hiển thị đầu tiên) */}

            {/* DANH SÁCH CAMERA */}
            {cameras && Array.isArray(cameras) && cameras.map((cam, index) => (
              <div
                key={cam.camera_id ? `${cam.camera_id}-${index}` : index}
                onClick={() => handleCameraClick(cam)}
              >
                <CameraCard
                  camera={cam}
                  nodeName={selectedInstanceId === 'all' ? (cam as any).node_name : undefined}
                  onClick={() => handleCameraClick(cam)}
                />
              </div>
            ))}

            {/* CHỈ HIỆN CARD THÊM MỚI KHI ĐÃ CHỌN INSTANCE CỤ THỂ */}
            {selectedInstanceId !== 'all' && (
              <CameraCard
                type="add"
                onClick={handleAddCameraClick}
              />
            )}
            {cameras.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#9ca3af', padding: 40 }}>
                <p>No cameras found.</p>
                {selectedInstanceId === 'all' ? (
                  <p style={{ fontSize: '14px', color: '#3b82f6' }}>
                    💡 Select a specific Backend Instance to add a new camera.
                  </p>
                ) : (
                  <p>Use the "+" card to create one on this instance.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL THÊM CAMERA (Placeholder) */}
      {isAddModalOpen && (
        <AddCameraModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          instanceId={selectedInstanceId as string}
          onSuccess={handleCameraAdded}
        />
      )}

    </div>
  );
};

// --- STYLES ---
const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: '32px', backgroundColor: '#f8f9fa', minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  content: { flex: 1, marginTop: '20px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' },
  refreshBtn: { padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontWeight: '500' },
  loading: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#6b7280' },
  spinner: { width: '40px', height: '40px', border: '4px solid #e5e7eb', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '10px' },
};

const styleSheet = document.createElement("style");
styleSheet.innerText = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
document.head.appendChild(styleSheet);

export default CardManager;