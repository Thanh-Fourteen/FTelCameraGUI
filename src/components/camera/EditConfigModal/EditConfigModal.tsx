import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from '../AddCameraModal/AddCameraModal.module.css';
import Button from '../../common/Button/Button';
import ConfigForm from '../../camera/ConfigForm/ConfigForm';
import { cameraService } from '../../../services/cameraService';
import type { Camera, SettingsSchema } from '../../../types/camera';
import PolygonDrawerModal from '../../common/PolygonDrawer/PolygonDrawerModal';
import { useNotification } from '../../../context/NotificationContext';

interface EditConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    camera: Camera;
    onUpdate: (updatedCamera: Camera) => void;
    instanceId: string;
    onDelete: (cameraId: string) => void;
    streamResolution?: { width: number; height: number };
    snapshotUrl?: string;
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
    "rtsp://172.17.0.1:8222/live_fire"
];

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

const EditConfigModal: React.FC<EditConfigModalProps> = ({
    isOpen, onClose, camera, onUpdate, onDelete, instanceId,
    streamResolution = { width: 854, height: 480 }, snapshotUrl
}) => {
    const { notify } = useNotification();

    // Flag để tránh việc load schema nhiều lần khi modal đã mở
    const isInitialized = useRef(false);

    // Form State
    const [rtspUrl, setRtspUrl] = useState('');
    const [wsPort, setWsPort] = useState<string>('9090');
    const [selectedModules, setSelectedModules] = useState<string[]>([]);
    const [polygonStr, setPolygonStr] = useState('[]');
    const [schema, setSchema] = useState<SettingsSchema | null>(null);
    const [config, setConfig] = useState<Record<string, any>>({});

    // UI State
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Hàm build config từ Schema
    const buildFullConfigFromSchema = useCallback((schemaData: SettingsSchema, fetchedCamera: Camera) => {
        const fullConfig: Record<string, any> = {};
        Object.keys(schemaData).forEach((serviceKey) => {
            if (typeof schemaData[serviceKey] !== 'object' || !schemaData[serviceKey].fields) return;
            const serviceConfig: Record<string, any> = {};
            schemaData[serviceKey].fields.forEach((field) => {
                const savedValue = fetchedCamera.settings?.config?.[serviceKey]?.[field.key];
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

    // Logic lấy Schema và khởi tạo dữ liệu
    const loadDataOnce = useCallback(async (currentCamera: Camera) => {
        setLoading(true);
        try {
            const schemaData = await cameraService.getSettingsSchema(instanceId);
            setSchema(schemaData);

            const mergedConfig = buildFullConfigFromSchema(schemaData, currentCamera);
            setConfig(mergedConfig);

            isInitialized.current = true;
        } catch (error: any) {
            notify("Failed to load configuration schema", "error");
            onClose();
        } finally {
            setLoading(false);
        }
    }, [instanceId, buildFullConfigFromSchema, notify, onClose]);

    // CHỈ CHẠY KHI MỞ MODAL
    useEffect(() => {
        if (isOpen && camera) {
            // Khởi tạo các state đơn giản
            setRtspUrl(camera.rtsp_url || '');
            setWsPort(camera.ws_port?.toString() || '9090');
            setSelectedModules(camera.settings?.modules || []);
            setPolygonStr(JSON.stringify(camera.settings?.polygon || []));

            // Tải schema và map config nâng cao
            loadDataOnce(camera);
        } else {
            // Reset khi đóng modal để lần sau load lại sạch sẽ
            isInitialized.current = false;
        }
    }, [isOpen]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const payload = {
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
            const updatedData = await cameraService.update(instanceId, camera.camera_id, payload);
            onUpdate({ ...camera, ...updatedData });
            notify("Updated successfully", "success");
            onClose();
        } catch (e) {
            notify("Update failed", "error");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className={styles.overlay} onClick={onClose}>
                <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.header}>
                        <h3 className={styles.title}>Config: {camera.name || camera.camera_id}</h3>
                        <button className={styles.closeBtn} onClick={onClose}>&times;</button>
                    </div>

                    <div className={styles.body} style={{ overflowY: 'auto', maxHeight: '70vh' }}>
                        {loading && !schema ? (
                            <div style={{ textAlign: 'center', padding: '20px' }}>Loading configuration...</div>
                        ) : (
                            <>
                                <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
                                    <label className={styles.label}>RTSP URL</label>
                                    <input
                                        className={styles.input}
                                        value={rtspUrl}
                                        list="rtsp-recommends"
                                        onChange={e => setRtspUrl(e.target.value)}
                                    />
                                    <datalist id="rtsp-recommends">
                                        {RTSP_RECOMMENDS.map(url => <option key={url} value={url} />)}
                                    </datalist>
                                </div>

                                <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
                                    <label className={styles.label}>WS Port</label>
                                    <input type="number" className={styles.input} value={wsPort} onChange={e => setWsPort(e.target.value)} />
                                </div>

                                <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
                                    <label className={styles.label}>Active AI Modules</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '10px', border: '1px solid #eee', borderRadius: '8px', marginTop: '5px' }}>
                                        {AVAILABLE_MODULES.map(mod => (
                                            <label key={mod.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedModules.includes(mod.id)}
                                                    onChange={() => setSelectedModules(resolveModuleDependencies(mod.id, selectedModules))}
                                                />
                                                {mod.label}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ color: '#2563eb', cursor: 'pointer', marginTop: '15px', fontWeight: 600, userSelect: 'none' }} onClick={() => setShowAdvanced(!showAdvanced)}>
                                    {showAdvanced ? '▼ Hide Advanced Settings' : '▶ Show Advanced Configuration'}
                                </div>

                                {showAdvanced && (
                                    <div style={{ marginTop: '15px', borderTop: '1px solid #f0f0f0', paddingTop: '15px' }}>
                                        {selectedModules.includes('counting') && (
                                            <div className={styles.formGroup} style={{ marginBottom: '15px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                    <label className={styles.label}>Polygon Coords (JSON)</label>
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
                            </>
                        )}
                    </div>

                    <div className={styles.footer} style={{ justifyContent: 'space-between' }}>
                        <Button variant="danger" onClick={() => onDelete(camera.camera_id)} disabled={loading}>Delete Camera</Button>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <Button variant="text" onClick={onClose} disabled={loading}>Cancel</Button>
                            <Button variant="primary" onClick={handleSave} disabled={loading}>
                                {loading ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <PolygonDrawerModal
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onSave={p => setPolygonStr(JSON.stringify(p))}
                initialData={(() => { try { return JSON.parse(polygonStr) } catch { return [] } })()}
                backgroundImage={snapshotUrl}
                videoWidth={streamResolution.width}
                videoHeight={streamResolution.height}
            />
        </>
    );
};

export default EditConfigModal;