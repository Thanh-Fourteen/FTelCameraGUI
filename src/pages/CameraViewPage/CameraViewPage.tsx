import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// Component
import CameraView, { type CameraViewHandle } from '../../components/camera/CameraView/CameraView';
import EditConfigModal from '../../components/camera/EditConfigModal/EditConfigModal';
import SharedHeader from '../../components/layout/SharedHeader/SharedHeader';

// Service & Hooks
import { cameraService } from '../../services/cameraService';
import { kafkaService } from '../../services/kafkaService';
import { useNotification } from '../../context/NotificationContext';

// Types
import type { Camera } from '../../types/camera';

const CameraViewPage: React.FC = () => {
  const { instanceId, camId } = useParams<{ instanceId: string; camId: string }>();
  const navigate = useNavigate();
  const { notify } = useNotification();

  // --- STATE ---
  const [camera, setCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);
  const [nodeIp, setNodeIp] = useState<string>('');

  // State Kafka
  const [isKafkaEnabled, setIsKafkaEnabled] = useState<boolean>(false);
  const [isToggling, setIsToggling] = useState<boolean>(false);

  // State Config Modal
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [snapshotUrl, setSnapshotUrl] = useState('');
  const [isConfigHover, setIsConfigHover] = useState(false);

  const cameraRef = useRef<CameraViewHandle>(null);

  // 1. FETCH DỮ LIỆU BAN ĐẦU
  const initData = useCallback(async () => {
    if (!instanceId || !camId) return;
    try {
      setLoading(true);
      const camData = await cameraService.getById(camId, instanceId);

      if (camData) {
        setNodeIp((camData as any).node_ip || '');
        setCamera({
          ...camData,
          node_id: instanceId,
          id: camData.camera_id || camId,
          node_ip: (camData as any).node_ip || '',
          name: camData.name || camId,
          isLive: camData.status === 'running'
        } as any);
      } else {
        notify("Camera not found", "error");
        navigate('/camera');
      }
    } catch (error) {
      console.error(error);
      notify("Failed to load camera details", "error");
    } finally {
      setLoading(false);
    }
  }, [instanceId, camId, navigate, notify]);

  // 2. FETCH STATUS (KAFKA & CAMERA) - GIỐNG CARD MANAGER
  const fetchStatuses = useCallback(async () => {
    if (!instanceId || !camId) return;
    try {
      // Gọi song song để tối ưu
      const [kafkaStatus, freshCamData] = await Promise.all([
        kafkaService.status(instanceId).catch(() => null),
        cameraService.getById(camId, instanceId).catch(() => null)
      ]);

      // Cập nhật Kafka
      if (kafkaStatus) {
        setIsKafkaEnabled(kafkaStatus.status === 'running' || kafkaStatus.is_active === true);
      }

      // Cập nhật Camera Status (Chỉ cập nhật những trường liên quan đến trạng thái)
      if (freshCamData) {
        const newIsLive = freshCamData.status === 'running' || freshCamData.status === 'starting';
        setCamera(prev => {
          if (!prev) return null;
          // Chỉ cập nhật nếu status thay đổi để tránh trigger re-render Modal vô ích
          if (prev.status === freshCamData.status && prev.isLive === newIsLive) return prev;
          return { ...prev, status: freshCamData.status, isLive: newIsLive };
        });
      }
    } catch (e) {
      console.error("Polling status error:", e);
    }
  }, [instanceId, camId]);

  // Khởi tạo lần đầu
  useEffect(() => {
    initData();
  }, [initData]);

  // Thiết lập Polling (Lấy status liên tục mỗi 5 giây)
  useEffect(() => {
    fetchStatuses(); // Chạy ngay lập tức lần đầu
    const timer = setInterval(fetchStatuses, 5000);
    return () => clearInterval(timer);
  }, [fetchStatuses]);

  // --- HANDLERS ---
  const handleToggleKafka = async () => {
    if (isToggling || !instanceId) return;
    setIsToggling(true);
    try {
      const newState = !isKafkaEnabled;
      await kafkaService.toggle(instanceId, newState);
      setIsKafkaEnabled(newState);
      notify(`Kafka turned ${newState ? 'ON' : 'OFF'}`, "success");
    } catch (e: any) {
      notify(e.message || "Failed to toggle Kafka", "error");
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
    // Merge dữ liệu mới sau khi save thành công
    setCamera(prev => prev ? ({ ...prev, ...updatedCamera }) : null);
  };

  const handleDeleteCamera = async (cameraId: string) => {
    if (!instanceId) return;
    try {
      await cameraService.delete(instanceId, cameraId);
      setIsConfigOpen(false);
      navigate('/camera');
      notify("Camera deleted successfully", "success");
    } catch (error) {
      notify("Failed to delete camera", "error");
    }
  };

  // Header display data
  const currentInstanceDisplay = useMemo(() => [{
    instance_id: instanceId || 'unknown',
    ip_address: nodeIp,
    port: 0,
    status: 'online'
  }], [instanceId, nodeIp]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#6b7280' }}>
      <div className="spinner"></div>
      <p style={{marginLeft: '10px'}}>Loading camera details...</p>
    </div>
  );

  if (!camera) return null;

  return (
    <div style={inlineStyles.container}>
      <SharedHeader
        title={`Camera: ${camera.name}`}
        subtitle={camera.isLive ? "● LIVE STREAMING" : "Offline"}
        onBack={() => navigate('/camera')}
        instances={currentInstanceDisplay as any}
        selectedInstanceId={instanceId || 'default'}
        onInstanceChange={() => { }}
        onRefreshInstances={initData}
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
          }}
        >
          ⚙ Config
        </button>
      </SharedHeader>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        <CameraView
          ref={cameraRef}
          camera={camera}
          onBack={() => navigate('/camera')}
        />
      </div>

      {isConfigOpen && (
        <EditConfigModal
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          camera={camera}
          instanceId={instanceId || 'default'}
          onUpdate={handleConfigUpdate}
          onDelete={handleDeleteCamera}
          snapshotUrl={snapshotUrl}
        />
      )}
    </div>
  );
};

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