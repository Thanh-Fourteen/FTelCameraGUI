import React, { useState, useEffect } from 'react';
import styles from './AddCameraModal.module.css';
import Button from '../../common/Button/Button';
import type { CreateCameraPayload, SettingsSchema } from '../../../types/camera';
import ConfigForm from '../../camera/ConfigForm/ConfigForm'; // Import component mới
import { cameraService } from '../../../services/cameraService';
import PolygonDrawerModal from '../../common/PolygonDrawer/PolygonDrawerModal';
import { useNotification } from '../../../context/NotificationContext';

interface AddCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateCameraPayload) => void;
}

const resolveModuleDependencies = (clickedId: string, currentSelected: string[]): string[] => {
  const isCurrentlyChecked = currentSelected.includes(clickedId);
  let newSelected = [...currentSelected];

  // 1. NẾU ĐANG CHECK -> UNCHECK (Hủy chọn)
  if (isCurrentlyChecked) {
    newSelected = newSelected.filter(id => id !== clickedId);

    // Luật Hủy Ngược (Uncheck cha thì con chết theo)
    if (clickedId === 'detection') {
      // Mất Detection -> Mất hết tất cả thằng cần nó
      newSelected = newSelected.filter(id => !['tracking_service', 'pose_detection', 'action_recognition', 'counting'].includes(id));
    }
    if (clickedId === 'tracking_service') {
      // Mất Tracking -> Mất Pose, Action, Counting
      newSelected = newSelected.filter(id => !['pose_detection', 'action_recognition', 'counting'].includes(id));
    }
    if (clickedId === 'pose_detection') {
      // Mất Pose -> Mất Action
      newSelected = newSelected.filter(id => id !== 'action_recognition');
    }

    return newSelected;
  }

  // 2. NẾU ĐANG UNCHECK -> CHECK (Chọn mới)

  // Luật Fire (Độc quyền)
  if (clickedId === 'fire') {
    return ['fire']; // Chỉ lấy mình nó, xóa hết cái khác
  }

  // Nếu chọn cái khác Fire -> Bỏ Fire trước
  newSelected = newSelected.filter(id => id !== 'fire');
  newSelected.push(clickedId); // Thêm cái vừa chọn vào

  // Luật Dây Chuyền (Hierarchy: Thêm cha tự thêm con)
  if (clickedId === 'action_recognition') {
    if (!newSelected.includes('pose_detection')) newSelected.push('pose_detection');
    if (!newSelected.includes('tracking_service')) newSelected.push('tracking_service');
    if (!newSelected.includes('detection')) newSelected.push('detection');
    // Action kỵ Counting
    newSelected = newSelected.filter(id => id !== 'counting');
  }

  if (clickedId === 'pose_detection') {
    if (!newSelected.includes('tracking_service')) newSelected.push('tracking_service');
    if (!newSelected.includes('detection')) newSelected.push('detection');
    // Pose kỵ Counting
    newSelected = newSelected.filter(id => id !== 'counting');
  }

  if (clickedId === 'counting') {
    if (!newSelected.includes('tracking_service')) newSelected.push('tracking_service');
    if (!newSelected.includes('detection')) newSelected.push('detection');
    // Counting kỵ Action & Pose
    newSelected = newSelected.filter(id => !['action_recognition', 'pose_detection'].includes(id));
  }

  if (clickedId === 'tracking_service') {
    if (!newSelected.includes('detection')) newSelected.push('detection');
    // "Nếu tick tracking ... thì sẽ kh có counting nữa"
    // Nghĩa là nếu user chủ động chọn Tracking, họ muốn mode Tracking thuần -> Tắt Counting
    newSelected = newSelected.filter(id => id !== 'counting');
  }

  if (clickedId === 'detection') {
    // Tương tự, nếu chủ động chọn Detection -> Tắt Counting (về mode cơ bản)
    newSelected = newSelected.filter(id => id !== 'counting');
  }

  return newSelected;
};

// --- MODULES LIST ---
const AVAILABLE_MODULES = [
  { id: 'detection', label: 'Object Detection (YOLO)' },
  { id: 'tracking_service', label: 'Object Tracking' },
  { id: 'pose_detection', label: 'Pose Estimation' },
  { id: 'action_recognition', label: 'Action Recognition' },
  { id: 'counting', label: 'Counting (Crossline/Zone)' },
  { id: 'face', label: 'Face Recognition' },
  { id: 'fire', label: 'Fire Detection' },
];

const AddCameraModal: React.FC<AddCameraModalProps> = ({ isOpen, onClose, onSave }) => {
  // --- STATE ---
  const { notify } = useNotification()
  const [cameraId, setCameraId] = useState('');
  const [rtspUrl, setRtspUrl] = useState('');
  const [wsPort, setWsPort] = useState<string>('9090');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  // State cho Dynamic Config
  const [schema, setSchema] = useState<SettingsSchema | null>(null);
  const [config, setConfig] = useState<Record<string, any>>({});
  const [showAdvanced, setShowAdvanced] = useState(false); // Toggle ẩn/hiện

  // State Polygon
  const [polygonStr, setPolygonStr] = useState('[[0,0],[854,0],[854,480],[0,480]]');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [loading, setLoading] = useState(false);


  const extractDefaultConfig = (schemaData: SettingsSchema) => {
    const defaultConfig: Record<string, any> = {};

    // Duyệt qua từng service (ví dụ: pythera_detection, tracking_service...)
    Object.keys(schemaData).forEach((serviceKey) => {
      const serviceConfig: Record<string, any> = {};
      const fields = schemaData[serviceKey].fields;

      // Duyệt qua từng field trong service đó
      fields.forEach((field) => {
        // Nếu có giá trị default thì lấy, không thì null
        if (field.default !== undefined) {
          serviceConfig[field.key] = field.default;
        }
      });

      // Gán vào object tổng
      defaultConfig[serviceKey] = serviceConfig;
    });

    return defaultConfig;
  };
  // Reset form khi mở Modal
  useEffect(() => {
    if (isOpen) {
      // Reset các field cơ bản
      setCameraId('');
      setRtspUrl('');
      setWsPort('9090');
      setSelectedModules([]);
      setShowAdvanced(false);

      // Load Schema
      cameraService.getSettingsSchema().then(data => {
        setSchema(data);

        // --- LOGIC MỚI: Đổ giá trị mặc định vào state ---
        const defaults = extractDefaultConfig(data);
        setConfig(defaults); // Giờ thì state config đã có đầy đủ giá trị mặc định

      }).catch(err => console.error("Failed to load schema", err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handler khi user chỉnh sửa form dynamic
  const handleConfigChange = (serviceName: string, key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [serviceName]: {
        ...prev[serviceName],
        [key]: value
      }
    }));
  };

  const handleSavePolygon = (points: number[][]) => {
    // Chuyển mảng thành chuỗi JSON để lưu vào state polygonStr
    setPolygonStr(JSON.stringify(points));
  };

  const handleModuleToggle = (moduleId: string) => {
    const nextModules = resolveModuleDependencies(moduleId, selectedModules);
    setSelectedModules(nextModules);
  };

  const handleSave = async () => {
    // 1. Validation
    if (!cameraId || !rtspUrl || !wsPort) {
      notify("Please fill in Camera ID, RTSP URL and Port.", "warning");
      return;
    }

    setLoading(true);

    try {
      // 2. Parse Polygon
      let polygonData: number[][] = [];

      if (selectedModules.includes('counting')) {
        try {
          const parsed = JSON.parse(polygonStr);
          if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
            polygonData = parsed;
          } else {
            throw new Error("Invalid format");
          }
        } catch (e) {
          notify("Invalid Polygon format! Use JSON: [[x1,y1], [x2,y2]...]", 'error');
          setLoading(false);
          return;
        }
      }

      // 3. Tạo Payload
      const payload: CreateCameraPayload = {
        camera_id: cameraId,
        rtsp_url: rtspUrl,
        ws_port: parseInt(wsPort),
        settings: {
          modules: selectedModules,
          polygon: polygonData,
          plot_mode: "all",
          alert_mode: "1",
          config: config // Gửi kèm config dynamic
        }
      };

      await onSave(payload);

    } catch (error: any) {
      let errorMessage = "Error Message";
      
      // Kiểm tra nếu có response từ backend (Axios Error)
      if (error.response && error.response.data) {
          // Backend trả về: { detail: "Port 3456 is already in use..." }
          const detail = error.response.data.detail;
          if (detail) {
              errorMessage = `${detail}`;
          }
      }
      notify(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

          <div className={styles.header}>
            <h3 className={styles.title}>Add New Camera</h3>
            <button className={styles.closeBtn} onClick={onClose}>&times;</button>
          </div>

          {/* --- FORM BODY (Có scroll) --- */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '70vh', paddingRight: '5px' }}>

            {/* Row 1: ID & Port */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label className={styles.label}>Camera ID <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text" className={styles.input} placeholder="e.g. cam_01"
                  value={cameraId} onChange={(e) => setCameraId(e.target.value)}
                  autoFocus
                />
              </div>
              <div className={styles.formGroup} style={{ width: '100px' }}>
                <label className={styles.label}>WS Port</label>
                <input
                  type="number" className={styles.input} placeholder="9090"
                  value={wsPort} onChange={(e) => setWsPort(e.target.value)}
                />
              </div>
            </div>

            {/* Row 2: RTSP URL */}
            <div className={styles.formGroup}>
              <label className={styles.label}>RTSP URL <span style={{ color: 'red' }}>*</span></label>
              <input
                list='rtsp-options'
                type="text" className={styles.input}
                placeholder="rtsp://admin:pass@192.168.1.10..."
                value={rtspUrl} onChange={(e) => setRtspUrl(e.target.value)}
              />


              <datalist id="rtsp-options">
                <option value="rtsp://192.168.2.130:8222/live_face" />
                <option value="rtsp://192.168.2.130:8222/live_fall" />
                <option value="rtsp://192.168.2.130:8222/live_crowd" />
                <option value="rtsp://192.168.2.130:8222/live_bv" />
              </datalist>
            </div>

            {/* Row 3: AI Modules Selection */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Active AI Modules</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px', border: '1px solid #eee', padding: '10px', borderRadius: '8px' }}>
                {AVAILABLE_MODULES.map(mod => (
                  <label key={mod.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedModules.includes(mod.id)}
                      onChange={() => handleModuleToggle(mod.id)}
                    />
                    {mod.label}
                  </label>
                ))}
              </div>
            </div>

            {/* --- NEW: ADVANCED CONFIGURATION SECTION --- */}
            <div style={{ marginTop: '10px', borderTop: '1px solid #f0f0f0', paddingTop: '10px' }}>
              <div
                style={{
                  cursor: 'pointer', color: '#2563eb', fontWeight: 600, fontSize: '14px',
                  display: 'flex', alignItems: 'center', gap: '6px', userSelect: 'none'
                }}
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <span>{showAdvanced ? '▼' : '▶'}</span>
                <span>Advanced Configuration</span>
              </div>

              {/* Render Form Động + Polygon nằm trong này */}
              {showAdvanced && (
                <div style={{ marginTop: '12px' }}>

                  {/* 1. POLYGON INPUT (Đã di chuyển vào đây) */}
                  {selectedModules.includes('counting') && (
                    <div className={styles.formGroup} style={{ marginBottom: '16px', borderBottom: '1px dashed #eee', paddingBottom: '16px' }}>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label className={styles.label} style={{ marginBottom: 0 }}>
                          Polygon Coords <span style={{ fontSize: '11px', color: '#999' }}>(JSON)</span>
                        </label>

                        {/* NÚT MỞ BẢNG VẼ */}
                        <button
                          type="button" // Quan trọng để không submit form
                          onClick={() => setIsDrawerOpen(true)}
                          style={{
                            fontSize: '12px', padding: '4px 8px',
                            background: '#e0f2fe', color: '#0284c7',
                            border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600'
                          }}
                        >
                          ✏️ Draw on the screen
                        </button>
                      </div>

                      <textarea
                        className={styles.input} rows={2}
                        value={polygonStr}
                        onChange={(e) => setPolygonStr(e.target.value)}
                        style={{ fontFamily: 'monospace', fontSize: '12px' }}
                        placeholder="[[x1,y1], [x2,y2], ...]"
                      />
                    </div>
                  )}

                  {/* 2. DYNAMIC CONFIG FORM */}
                  <ConfigForm
                    schema={schema}
                    selectedModules={selectedModules}
                    config={config}
                    onChange={handleConfigChange}
                  />
                </div>
              )}
            </div>

          </div>

          {/* Footer Buttons */}
          <div className={styles.footer}>
            <Button variant="text" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={loading}>
              {loading ? 'Creating...' : 'Create Camera'}
            </Button>
          </div>

        </div>
      </div>
      <PolygonDrawerModal
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSave={handleSavePolygon}
        // Nếu ở EditModal và có snapshot url thì truyền vào đây:
        // backgroundImage={camera?.thumbnailUrl} 
        // Parse chuỗi hiện tại để vẽ lại vùng cũ (nếu có)
        initialData={(() => {
          try { return JSON.parse(polygonStr) } catch { return [] }
        })()}
      />
    </>
  );
};

export default AddCameraModal;