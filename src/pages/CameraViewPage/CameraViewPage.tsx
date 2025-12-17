import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// Component
import CameraView, { type CameraViewHandle } from '../../components/camera/CameraView/CameraView';
import EditConfigModal from '../../components/camera/EditConfigModal/EditConfigModal';
import SharedHeader from '../../components/layout/SharedHeader/SharedHeader';

// Service & Hooks
import { cameraService } from '../../services/cameraService';
import { kafkaService } from '../../services/kafkaService';
import { useSystemStatus } from '../../hooks/useSystemStatus';
import { useNotification } from '../../context/NotificationContext';

// Types
import type { Camera } from '../../types/camera';

const CameraViewPage: React.FC = () => {
  const { instanceId, camId } = useParams<{ instanceId: string; camId: string }>();
  const navigate = useNavigate();
  const { notify } = useNotification();

  // Hook Realtime
  const { systemStatus, cameraStatuses } = useSystemStatus();

  // --- STATE ---
  const [camera, setCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);

  // State Kafka
  const [isKafkaEnabled, setIsKafkaEnabled] = useState<boolean>(false);
  const [isToggling, setIsToggling] = useState<boolean>(false);

  // State Config Modal
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [snapshotUrl, setSnapshotUrl] = useState('');


  const currentInstanceDisplay = [{
    instance_id: instanceId || 'unknown',
    // ip_address: (camera as any).node_ip || 'unknown',
    port: 0,
    status: 'online'
  }];
  // State Hover nút Config
  const [isConfigHover, setIsConfigHover] = useState(false);

  const cameraRef = useRef<CameraViewHandle>(null);

  // --- INITIAL FETCH (ĐÃ SỬA LOGIC LẤY INSTANCE ID) ---
  useEffect(() => {
    if (!instanceId || !camId) return;

    const initData = async () => {
      try {
        setLoading(true);
        const camData = await cameraService.getById(camId, instanceId);

        if (camData) {
          setCamera({
            ...camData,
            node_id: instanceId,
            id: camData.camera_id || camId,
            node_ip: (camData as any).node_ip || '',
            name: camData.name || camId,
            isLive: camData.status === 'running'
          } as any);

          // Lấy Kafka status
          try {
            const kafkaData = await kafkaService.status(instanceId);
            setIsKafkaEnabled(kafkaData.status === 'running');
          } catch (e) { }

        } else {
          notify("Camera not found", "error");
          navigate('/camera');
        }
      } catch (error) {
        console.error(error);
        notify("Failed to load camera", "error");
        navigate('/camera');
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [instanceId, camId, navigate, notify]); // Dependencies thay đổi

  // --- REAL-TIME SYNC ---
  useEffect(() => {

    if (systemStatus?.kafka) {
      setIsKafkaEnabled(systemStatus.kafka.status === 'running');
    }

    // 2. Sync Camera Status
    if (cameraStatuses && camId) {
      const update = cameraStatuses.find(s => s.camera_id === camId);
      if (update) {
        const newIsLive = update.status === 'running' || update.status === 'starting';
        if (camera?.status !== update.status || camera?.isLive !== newIsLive) {
          setCamera(prev => prev ? ({ ...prev, status: update.status, isLive: newIsLive }) : null);
        }
      }
      // Logic xóa camera realtime (nếu cần)
    }
  }, [systemStatus, cameraStatuses, camera, camId]);

  // --- HANDLERS ---

  const handleToggleKafka = async () => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      const newState = !isKafkaEnabled;
      // Lấy instanceId từ camera state (đã lưu ở bước init)
      const instanceId = (camera as any)?.node_id || 'default';

      await kafkaService.toggle(instanceId, newState);

      setIsKafkaEnabled(newState);
      notify(`Kafka on ${instanceId} turned ${newState ? 'ON' : 'OFF'}`, "success");
    } catch (e) {
      notify("Kafka toggle failed", "error");
    } finally {
      setIsToggling(false);
    }
  };

  const handleOpenConfig = () => {
    if (cameraRef.current) {
      const url = cameraRef.current.getSnapshot();
      setSnapshotUrl(url);
    }
    setIsConfigOpen(true);
  };

  const handleConfigUpdate = (updatedCamera: Camera) => {
    setCamera(prev => ({ ...prev, ...updatedCamera }));
  };

  const handleDeleteCamera = async (cameraId: string) => {
    try {
      // Lấy instanceId chuẩn xác
      const instanceId = (camera as any)?.node_id || 'default';

      await cameraService.delete(instanceId, cameraId);

      setIsConfigOpen(false);
      navigate('/camera');
      notify("Camera deleted successfully", "success");
    } catch (error) {
      notify("Failed to delete camera", "error");
    }
  };

  // --- RENDER ---
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#6b7280' }}>
      Loading camera details...
    </div>
  );

  if (!camera) return null;

  return (
    <div style={inlineStyles.container}>

      {/* HEADER */}
      <SharedHeader
        title={`Camera: ${camera.name}`}
        subtitle={camera.isLive ? "● LIVE STREAMING" : "Offline"}
        onBack={() => navigate('/camera')}
        instances={currentInstanceDisplay as any}
        selectedInstanceId={instanceId || 'default'}
        onInstanceChange={() => { /* No-op hoặc notify("Cannot change backend in detail view") */ }}
        onRefreshInstances={() => { }}
        kafkaState={{
          isEnabled: isKafkaEnabled,
          isToggling: isToggling,
          onToggle: handleToggleKafka
        }}
      >
        <button
          onClick={handleOpenConfig}
          onMouseEnter={() => setIsConfigHover(true)}
          onMouseLeave={() => setIsConfigHover(false)}
          style={{
            ...inlineStyles.configBtn,
            backgroundColor: isConfigHover ? '#ffffff' : '#e5e7eb',
            borderColor: isConfigHover ? '#9ca3af' : '#d1d5db',
            boxShadow: isConfigHover ? '0 2px 5px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          ⚙ Config
        </button>
      </SharedHeader>

      {/* MAIN VIEWPORT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        <CameraView
          ref={cameraRef}
          camera={camera}
          onBack={() => navigate('/camera')}
        />
      </div>

      {/* CONFIG MODAL */}
      {isConfigOpen && (
        <EditConfigModal
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          camera={camera}
          // Lấy instanceId từ camera object (đã được gán ở bước fetch trước đó)
          instanceId={(camera as any).node_id || 'default'}
          onUpdate={handleConfigUpdate}
          onDelete={handleDeleteCamera}
          snapshotUrl={snapshotUrl}
        />
      )}

    </div>
  );
};

// --- STYLES ---
const inlineStyles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '32px',
    backgroundColor: '#f8f9fa',
    height: '100vh',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  configBtn: {
    padding: '6px 12px',
    background: '#e5e7eb',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'all 0.2s ease',
  }
};

export default CameraViewPage;