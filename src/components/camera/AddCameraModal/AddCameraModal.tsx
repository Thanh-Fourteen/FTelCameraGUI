import React, { useState, useEffect, useCallback } from 'react';
import styles from './AddCameraModal.module.css';
import Button from '../../common/Button/Button';
import type { Camera, CreateCameraPayload, SettingsSchema } from '../../../types/camera';
import ConfigForm from '../../camera/ConfigForm/ConfigForm';
import { cameraService } from '../../../services/cameraService';
import PolygonDrawerModal from '../../common/PolygonDrawer/PolygonDrawerModal';
import { useNotification } from '../../../context/NotificationContext';

interface AddCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  instanceId: string;
  initialData?: Camera | null;
}

const AVAILABLE_MODULES = [
  { id: 'detection', label: 'Object Detection (YOLO)' },
  { id: 'tracking_service', label: 'Object Tracking' },
  { id: 'pose_detection', label: 'Pose Estimation' },
  { id: 'action_recognition', label: 'Action Recognition' },
  { id: 'counting', label: 'Counting (Crossline/Zone)' },
  { id: 'face', label: 'Face Recognition' },
  { id: 'fire', label: 'Fire Detection' },
];

const RTSP_RECOMMENDS = [
  "rtsp://172.17.0.1:8222/live_face",
  "rtsp://172.17.0.1:8222/live_crowd",
  "rtsp://172.17.0.1:8222/live_bv",
  "rtsp://172.17.0.1:8222/live_fire",
  "rtsp://172.17.0.1:8222/live_fall"
];

// Logic xử lý ràng buộc giữa các module
const resolveModuleDependencies = (clickedId: string, currentSelected: string[]): string[] => {
    const isCurrentlyChecked = currentSelected.includes(clickedId);
    let newSelected = [...currentSelected];
    
    if (isCurrentlyChecked) {
        newSelected = newSelected.filter(id => id !== clickedId);
        if (clickedId === 'detection') newSelected = newSelected.filter(id => !['tracking_service', 'pose_detection', 'action_recognition', 'counting'].includes(id));
        if (clickedId === 'tracking_service') newSelected = newSelected.filter(id => !['pose_detection', 'action_recognition', 'counting'].includes(id));
        if (clickedId === 'pose_detection') newSelected = newSelected.filter(id => id !== 'action_recognition');
        return newSelected;
    }
    
    if (clickedId === 'fire') return ['fire'];
    if (clickedId === 'face') return ['face'];
    newSelected = newSelected.filter(id => !['fire', 'face'].includes(id));
    newSelected.push(clickedId);
    
    if (clickedId === 'action_recognition') {
        if (!newSelected.includes('pose_detection')) newSelected.push('pose_detection');
        if (!newSelected.includes('tracking_service')) newSelected.push('tracking_service');
        if (!newSelected.includes('detection')) newSelected.push('detection');
        newSelected = newSelected.filter(id => id !== 'counting');
    }
    if (clickedId === 'pose_detection') {
        if (!newSelected.includes('tracking_service')) newSelected.push('tracking_service');
        if (!newSelected.includes('detection')) newSelected.push('detection');
        newSelected = newSelected.filter(id => id !== 'counting');
    }
    if (clickedId === 'counting') {
        if (!newSelected.includes('tracking_service')) newSelected.push('tracking_service');
        if (!newSelected.includes('detection')) newSelected.push('detection');
        newSelected = newSelected.filter(id => !['action_recognition', 'pose_detection'].includes(id));
    }
    return newSelected;
};

const AddCameraModal: React.FC<AddCameraModalProps> = ({ isOpen, onClose, onSuccess, instanceId, initialData }) => {
  const { notify } = useNotification();
  
  const [cameraId, setCameraId] = useState('');
  const [rtspUrl, setRtspUrl] = useState('');
  const [wsPort, setWsPort] = useState<string>('9090');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [polygonStr, setPolygonStr] = useState('[[0,0],[854,0],[854,480],[0,480]]');

  const [schema, setSchema] = useState<SettingsSchema | null>(null);
  const [config, setConfig] = useState<Record<string, any>>({});
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const buildFullConfigFromSchema = useCallback((schemaData: SettingsSchema, savedSettings?: any) => {
    const fullConfig: Record<string, any> = {};
    Object.keys(schemaData).forEach((serviceKey) => {
      if (typeof schemaData[serviceKey] !== 'object' || !schemaData[serviceKey].fields) return;

      const serviceConfig: Record<string, any> = {};
      schemaData[serviceKey].fields.forEach((field) => {
        const savedValue = savedSettings?.config?.[serviceKey]?.[field.key];
        if (savedValue !== undefined) {
          serviceConfig[field.key] = savedValue;
        } else {
          serviceConfig[field.key] = field.default !== undefined ? field.default : (field.type === 'boolean' ? false : "");
        }
      });
      fullConfig[serviceKey] = serviceConfig;
    });
    return fullConfig;
  }, []);

  useEffect(() => {
    if (isOpen && instanceId) {
      if (initialData) {
        setCameraId(initialData.camera_id || '');
        setRtspUrl(initialData.rtsp_url || '');
        setWsPort(String(initialData.ws_port || '9090'));
        setSelectedModules(initialData.settings?.modules || []);
        setPolygonStr(JSON.stringify(initialData.settings?.polygon || []));
        setShowAdvanced(true);
      } else {
        setCameraId(''); setRtspUrl(''); setWsPort('9090'); setSelectedModules([]);
        setPolygonStr('[[0,0],[854,0],[854,480],[0,480]]'); setShowAdvanced(false);
      }

      setSchema(null);
      cameraService.getSettingsSchema(instanceId).then(data => {
        setSchema(data);
        setConfig(buildFullConfigFromSchema(data, initialData?.settings));
      }).catch(() => notify("Failed to load schema", "error"));
    }
  }, [isOpen, instanceId, initialData, buildFullConfigFromSchema, notify]);

  const handleSave = async () => {
    if (!cameraId || !rtspUrl) {
      notify("Missing required fields", "warning"); return;
    }
    setLoading(true);
    try {
      const payload: CreateCameraPayload = {
        camera_id: cameraId,
        rtsp_url: rtspUrl,
        ws_port: parseInt(wsPort),
        settings: {
          modules: selectedModules,
          polygon: JSON.parse(polygonStr),
          plot_mode: config?.viewer_service?.PLOT || "all",
          alert_mode: config?.viewer_service?.ALERT ? "1" : "0",
          config: config 
        }
      };
      await cameraService.create(instanceId, payload);
      notify("Saved successfully", "success"); onSuccess(); onClose();
    } catch (error: any) {
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';
      notify(`Save failed: ${errorMessage}`, "error");
    } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.header}>
            <h3 className={styles.title}>{initialData ? 'Edit Camera' : 'Add New Camera'}</h3>
            <button className={styles.closeBtn} onClick={onClose}>&times;</button>
          </div>

          <div className={styles.body} style={{ overflowY: 'auto', maxHeight: '70vh' }}>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label className={styles.label}>Camera ID *</label>
                <input type="text" className={styles.input} value={cameraId} onChange={(e) => setCameraId(e.target.value)} disabled={!!initialData} />
              </div>
              <div className={styles.formGroup} style={{ width: '120px' }}>
                <label className={styles.label}>WS Port</label>
                <input type="number" className={styles.input} value={wsPort} onChange={(e) => setWsPort(e.target.value)} />
              </div>
            </div>

            <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
              <label className={styles.label}>RTSP URL *</label>
              <input 
                type="text" 
                list="rtsp-recommends"
                className={styles.input} 
                value={rtspUrl} 
                onChange={(e) => setRtspUrl(e.target.value)} 
                placeholder="rtsp://..."
              />
              <datalist id="rtsp-recommends">
                {RTSP_RECOMMENDS.map(url => <option key={url} value={url} />)}
              </datalist>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Active AI Modules</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '10px', border: '1px solid #eee', borderRadius: '8px' }}>
                {AVAILABLE_MODULES.map(mod => (
                  <label key={mod.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedModules.includes(mod.id)} 
                      onChange={() => setSelectedModules(resolveModuleDependencies(mod.id, selectedModules))} 
                    /> {mod.label}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ color: '#2563eb', cursor: 'pointer', marginTop: '15px', fontWeight: 600 }} onClick={() => setShowAdvanced(!showAdvanced)}>
              {showAdvanced ? '▼ Hide Advanced' : '▶ Show Advanced Configuration'}
            </div>

            {showAdvanced && (
              <div style={{ marginTop: '15px', borderTop: '1px solid #f0f0f0', paddingTop: '15px' }}>
                {selectedModules.includes('counting') && (
                   <div className={styles.formGroup} style={{ marginBottom: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <label className={styles.label}>Polygon JSON</label>
                        <button onClick={() => setIsDrawerOpen(true)} style={{ border: 'none', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>✏️ Draw</button>
                      </div>
                      <textarea className={styles.input} value={polygonStr} onChange={e => setPolygonStr(e.target.value)} rows={2} style={{ fontFamily: 'monospace', fontSize: '12px' }} />
                   </div>
                )}
                {schema && (
                  <ConfigForm 
                    schema={schema} 
                    selectedModules={selectedModules} 
                    config={config} 
                    onChange={(s, k, v) => setConfig(prev => ({ ...prev, [s]: { ...prev[s], [k]: v } }))} 
                  />
                )}
              </div>
            )}
          </div>

          <div className={styles.footer}>
            <Button variant="text" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={loading}>Save</Button>
          </div>
        </div>
      </div>
      
      <PolygonDrawerModal 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        onSave={(p) => setPolygonStr(JSON.stringify(p))} 
        initialData={(() => { try { return JSON.parse(polygonStr) } catch { return [] } })()} 
      />
    </>
  );
};

export default AddCameraModal;