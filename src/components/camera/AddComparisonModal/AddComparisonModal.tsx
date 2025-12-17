import React, { useState, useEffect, useCallback } from 'react';
import styles from '../AddCameraModal/AddCameraModal.module.css'; 
import Button from '../../common/Button/Button';
import ConfigForm from '../../camera/ConfigForm/ConfigForm';
import { cameraService } from '../../../services/cameraService';
import { useNotification } from '../../../context/NotificationContext';
import type { CreateCameraPayload, SettingsSchema } from '../../../types/camera';

const AVAILABLE_MODULES = [
    { id: 'detection', label: 'Object Detection (YOLO)' },
    { id: 'tracking_service', label: 'Object Tracking' },
    { id: 'pose_detection', label: 'Pose Estimation' },
    { id: 'action_recognition', label: 'Action Recognition' },
    { id: 'counting', label: 'Counting (Crossline/Zone)' },
    { id: 'face', label: 'Face Recognition' },
    { id: 'fire', label: 'Fire Detection' },
];

const MODEL_OPTIONS = [
    { label: 'Yolo V9', value: 'yolov9_ensemble' },
    { label: 'Yolo V12', value: 'yolov12_ensemble' },
    { label: 'DOAI', value: 'detection_ensemble' },
];

const RTSP_RECOMMENDS = [
    "rtsp://172.17.0.1:8222/live_face",
    "rtsp://172.17.0.1:8222/live_crowd",
    "rtsp://172.17.0.1:8222/live_bv",
    "rtsp://172.17.0.1:8222/live_fire"
];

interface AddComparisonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    instanceId: string;
}

const AddComparisonModal: React.FC<AddComparisonModalProps> = ({ isOpen, onClose, onSuccess, instanceId }) => {
    const { notify } = useNotification();
    const [loading, setLoading] = useState(false);

    // --- FORM STATE ---
    const [cameraId, setCameraId] = useState('');
    const [rtspUrl, setRtspUrl] = useState('');
    const [wsPort, setWsPort] = useState('9090');
    const [selectedModules, setSelectedModules] = useState<string[]>(['detection']);
    
    // --- ARENA SPECIFIC STATE ---
    const [selectedModel, setSelectedModel] = useState(MODEL_OPTIONS[0].value);
    const [isCompareEnabled, setIsCompareEnabled] = useState(true);

    // --- SCHEMA & CONFIG ---
    const [schema, setSchema] = useState<SettingsSchema | null>(null);
    const [config, setConfig] = useState<Record<string, any>>({});
    const [showAdvanced, setShowAdvanced] = useState(false);

    const buildFullConfigFromSchema = useCallback((schemaData: SettingsSchema) => {
        const fullConfig: Record<string, any> = {};
        Object.keys(schemaData).forEach((serviceKey) => {
            if (typeof schemaData[serviceKey] !== 'object' || !schemaData[serviceKey].fields) return;
            const serviceConfig: Record<string, any> = {};
            schemaData[serviceKey].fields.forEach((field) => {
                serviceConfig[field.key] = field.default !== undefined ? field.default : "";
            });
            fullConfig[serviceKey] = serviceConfig;
        });
        return fullConfig;
    }, []);

    useEffect(() => {
        if (isOpen && instanceId) {
            cameraService.getSettingsSchema(instanceId).then(data => {
                setSchema(data);
                setConfig(buildFullConfigFromSchema(data));
            }).catch(() => notify("Failed to load schema", "error"));
        }
    }, [isOpen, instanceId, buildFullConfigFromSchema, notify]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!cameraId || !rtspUrl || !schema) {
            notify("Missing required fields", "warning");
            return;
        }

        setLoading(true);
        try {
            const finalConfig = { ...config };
            
            // 1. Ghi đè Model được chọn vào Service tương ứng (pythera_detection)
            if (finalConfig.pythera_detection) {
                finalConfig.pythera_detection.MODEL_NAME = selectedModel;
            }

            // 2. Ghi đè Compare Mode
            if (finalConfig.viewer_service) {
                finalConfig.viewer_service.COMPARE = isCompareEnabled;
            }

            const payload: CreateCameraPayload = {
                camera_id: cameraId,
                rtsp_url: rtspUrl,
                ws_port: parseInt(wsPort),
                settings: {
                    modules: selectedModules,
                    polygon: [],
                    plot_mode: finalConfig?.viewer_service?.PLOT || "all",
                    alert_mode: "0",
                    config: finalConfig
                }
            };

            await cameraService.create(instanceId, payload);
            notify("Arena camera launched!", "success");
            onSuccess();
            onClose();
        } catch (error: any) {
            notify(error.response?.data?.detail || "Action failed", 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Benchmark New Model</h3>
                    <button className={styles.closeBtn} onClick={onClose}>&times;</button>
                </div>

                <div className={styles.body} style={{ overflowY: 'auto', maxHeight: '75vh' }}>
                    
                    {/* Basic Connection Info */}
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                        <div className={styles.formGroup} style={{ flex: 1 }}>
                            <label className={styles.label}>Camera ID *</label>
                            <input className={styles.input} value={cameraId} onChange={e => setCameraId(e.target.value)} placeholder="e.g. compare-v9-vs-v12" />
                        </div>
                        <div className={styles.formGroup} style={{ width: '100px' }}>
                            <label className={styles.label}>WS Port</label>
                            <input className={styles.input} type="number" value={wsPort} onChange={e => setWsPort(e.target.value)} />
                        </div>
                    </div>

                    <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
                        <label className={styles.label}>RTSP URL *</label>
                        <input className={styles.input} list="rtsp-list" value={rtspUrl} onChange={e => setRtspUrl(e.target.value)} placeholder="rtsp://..." />
                        <datalist id="rtsp-list">
                            {RTSP_RECOMMENDS.map(url => <option key={url} value={url} />)}
                        </datalist>
                    </div>

                    {/* Arena Main Options Section */}
                    <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '16px' }}>
                        
                        <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
                            <label className={styles.label} style={{ color: '#2563eb' }}>1. Select AI Engine (Model)</label>
                            <select 
                                className={styles.input} 
                                value={selectedModel} 
                                onChange={e => setSelectedModel(e.target.value)}
                                style={{ background: '#fff', border: '1px solid #2563eb' }}
                            >
                                {MODEL_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.formGroup} style={{ marginBottom: '12px' }}>
                            <label className={styles.label} style={{ color: '#2563eb' }}>2. Enable Modules</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                {AVAILABLE_MODULES.map(mod => (
                                    <label key={mod.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedModules.includes(mod.id)} 
                                            onChange={() => {
                                                const next = selectedModules.includes(mod.id) 
                                                    ? selectedModules.filter(i => i !== mod.id)
                                                    : [...selectedModules, mod.id];
                                                setSelectedModules(next);
                                            }} 
                                        /> 
                                        {mod.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', padding: '10px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <input 
                                type="checkbox" 
                                id="arena-compare"
                                checked={isCompareEnabled} 
                                onChange={(e) => setIsCompareEnabled(e.target.checked)} 
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <label htmlFor="arena-compare" style={{ fontSize: '14px', fontWeight: 700, color: '#2563eb', cursor: 'pointer' }}>
                                Push to Comparison Chart (Compare Mode)
                            </label>
                        </div>
                    </div>

                    {/* Advanced Section */}
                    <div 
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#94a3b8', fontSize: '13px', padding: '4px 0' }}
                        onClick={() => setShowAdvanced(!showAdvanced)}
                    >
                        <span>{showAdvanced ? '▼' : '▶'} Tuning Options (Thresholds, etc.)</span>
                    </div>

                    {showAdvanced && (
                        <div style={{ marginTop: '10px', padding: '12px', background: '#fff', border: '1px dotted #cbd5e1', borderRadius: '8px' }}>
                            {schema ? (
                                <ConfigForm 
                                    schema={schema} 
                                    selectedModules={selectedModules} 
                                    config={config} 
                                    onChange={(s, k, v) => setConfig(prev => ({ ...prev, [s]: { ...prev[s], [k]: v } }))} 
                                />
                            ) : <div>Loading schema...</div>}
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    <Button variant="text" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave} disabled={loading}>
                        {loading ? 'Processing...' : 'Add to Arena'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AddComparisonModal;