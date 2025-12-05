import React, { useState, useEffect } from 'react';
import styles from '../AddCameraModal/AddCameraModal.module.css'; // Tận dụng lại CSS
import Button from '../../common/Button/Button';
import ConfigForm from '../../camera/ConfigForm/ConfigForm';
import { cameraService } from '../../../services/cameraService';
import type { Camera, SettingsSchema } from '../../../types/camera';
import PolygonDrawerModal from '../../common/PolygonDrawer/PolygonDrawerModal';

interface EditConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    camera: Camera;
    onUpdate: (updatedCamera: Camera) => void;
    onDelete: (cameraId: string) => void;
    streamResolution?: { width: number; height: number };
    snapshotUrl?: string;
}

const resolveModuleDependencies = (clickedId: string, currentSelected: string[]): string[] => {
    // ... (Giữ nguyên logic resolveModuleDependencies của bạn)
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

    newSelected = newSelected.filter(id => id !== 'fire');
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
    if (clickedId === 'tracking_service') {
        if (!newSelected.includes('detection')) newSelected.push('detection');
        newSelected = newSelected.filter(id => id !== 'counting');
    }
    if (clickedId === 'detection') {
        newSelected = newSelected.filter(id => id !== 'counting');
    }

    return newSelected;
};

// List module
const AVAILABLE_MODULES = [
    { id: 'detection', label: 'Object Detection (YOLO)' },
    { id: 'tracking_service', label: 'Object Tracking' },
    { id: 'pose_detection', label: 'Pose Estimation' },
    { id: 'action_recognition', label: 'Action Recognition' },
    { id: 'counting', label: 'Counting (Crossline/Zone)' },
    { id: 'face', label: 'Face Recognition' },
    { id: 'fire', label: 'Fire Detection' },
];

const EditConfigModal: React.FC<EditConfigModalProps> = ({ isOpen, onClose, camera, onUpdate, onDelete, streamResolution = { width: 1920, height: 1080 }, snapshotUrl }) => {
    // State
    const [rtspUrl, setRtspUrl] = useState('');
    const [wsPort, setWsPort] = useState<string>('9090');
    const [selectedModules, setSelectedModules] = useState<string[]>([]);

    // Advanced Config
    const [schema, setSchema] = useState<SettingsSchema | null>(null);
    const [config, setConfig] = useState<Record<string, any>>({});
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Polygon
    const [polygonStr, setPolygonStr] = useState('[[0,0],[854,0],[854,480],[0,480]]');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const [loading, setLoading] = useState(false);

    // Helper: Trích xuất default config từ Schema
    const extractDefaultConfig = (schemaData: SettingsSchema) => {
        const defaultConfig: Record<string, any> = {};
        Object.keys(schemaData).forEach((serviceKey) => {
            const serviceConfig: Record<string, any> = {};
            const fields = schemaData[serviceKey].fields;
            fields.forEach((field) => {
                if (field.default !== undefined) {
                    serviceConfig[field.key] = field.default;
                }
            });
            defaultConfig[serviceKey] = serviceConfig;
        });
        return defaultConfig;
    };

    const handleSavePolygon = (points: number[][]) => {
        // Chuyển mảng thành chuỗi JSON để lưu vào state polygonStr
        setPolygonStr(JSON.stringify(points));
    };

    const handleDeleteClick = () => {
        const isConfirmed = window.confirm(`Are you sure you want to delete camera "${camera.name}"?\nThis action cannot be undone.`);
        if (isConfirmed) {
            onDelete(camera.id);
        }
    };

    // --- INIT DATA TỪ CAMERA HIỆN TẠI ---
    useEffect(() => {
        if (isOpen && camera) {
            // 1. Fill thông tin cơ bản
            setRtspUrl(camera.rtsp_url || '');
            setWsPort(camera.ws_port?.toString() || '9090');

            // 2. Fill Settings
            // FIX: Khai báo kiểu rõ ràng để TS biết đây là object chứa key-value
            let existingConfig: Record<string, any> = {};

            if (camera.settings) {
                setSelectedModules(camera.settings.modules || []);
                existingConfig = camera.settings.config || {};

                // Fill Polygon
                if (camera.settings.polygon && camera.settings.polygon.length > 0) {
                    setPolygonStr(JSON.stringify(camera.settings.polygon));
                }
            }

            // 3. Load Schema & Merge Config
            cameraService.getSettingsSchema().then(data => {
                setSchema(data);

                // Lấy default từ schema
                const defaults = extractDefaultConfig(data);

                // Trộn config cũ của camera vào config mặc định
                const mergedConfig: Record<string, any> = { ...defaults };

                Object.keys(existingConfig).forEach(key => {
                    // Deep merge từng service
                    if (mergedConfig[key]) {
                        mergedConfig[key] = {
                            ...mergedConfig[key],
                            // FIX: Ép kiểu 'as any' hoặc 'as object' để sửa lỗi TS2698
                            ...(existingConfig[key] as any)
                        };
                    } else {
                        mergedConfig[key] = existingConfig[key];
                    }
                });

                setConfig(mergedConfig);

            }).catch(console.error);
        }
    }, [isOpen, camera]);

    if (!isOpen) return null;

    const handleConfigChange = (serviceName: string, key: string, value: any) => {
        setConfig(prev => ({
            ...prev,
            [serviceName]: { ...prev[serviceName], [key]: value }
        }));
    };

    const handleModuleToggle = (moduleId: string) => {
        const nextModules = resolveModuleDependencies(moduleId, selectedModules);
        setSelectedModules(nextModules);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // Parse Polygon
            let polygonData: number[][] = [];
            if (selectedModules.includes('counting')) {
                try {
                    polygonData = JSON.parse(polygonStr);
                } catch {
                    alert("Invalid Polygon JSON");
                    setLoading(false);
                    return;
                }
            }

            // Construct Payload
            const payload = {
                rtsp_url: rtspUrl,
                ws_port: parseInt(wsPort),
                settings: {
                    modules: selectedModules,
                    polygon: polygonData,
                    plot_mode: "all",
                    alert_mode: "1",
                    config: config // Gửi kèm config đầy đủ (đã merge)
                }
            };

            console.log("Updating camera:", payload);

            // Gọi API Update
            const updatedData = await cameraService.update(camera.id, payload);

            const newCameraObj = { ...camera, ...updatedData };

            onUpdate(newCameraObj);
            onClose();

        } catch (error) {
            console.error("Update failed", error);
            alert("Failed to update settings");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className={styles.overlay} onClick={onClose}>
                <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.header}>
                        <h3 className={styles.title}>Config Camera: {camera.name}</h3>
                        <button className={styles.closeBtn} onClick={onClose}>&times;</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '70vh', paddingRight: '5px' }}>

                        {/* RTSP & Port */}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>RTSP URL</label>
                            <input
                                list="rtsp-options"
                                className={styles.input}
                                value={rtspUrl}
                                onChange={(e) => setRtspUrl(e.target.value)}
                            />
                            <datalist id="rtsp-options">
                                <option value="rtsp://192.168.1.130:8222/live_face" />
                                <option value="rtsp://192.168.1.130:8222/live_fall" />
                                <option value="rtsp://192.168.1.130:8222/live_crowd" />
                                <option value="rtsp://192.168.1.130:8222/live_bv" />
                            </datalist>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>WS Port</label>
                            <input
                                type="number" className={styles.input}
                                value={wsPort}
                                onChange={(e) => setWsPort(e.target.value)}
                            />
                        </div>

                        {/* Modules */}
                        {/* Modules */}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Modules</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', border: '1px solid #eee', padding: '10px', borderRadius: '8px' }}>
                                {AVAILABLE_MODULES.map(mod => (
                                    <label key={mod.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
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

                        {/* Advanced Config */}
                        <div style={{ marginTop: '10px', borderTop: '1px solid #f0f0f0', paddingTop: '10px' }}>
                            <div
                                style={{ cursor: 'pointer', color: '#2563eb', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                onClick={() => setShowAdvanced(!showAdvanced)}
                            >
                                <span>{showAdvanced ? '▼' : '▶'}</span>
                                <span>Advanced Configuration</span>
                            </div>

                            {showAdvanced && (
                                <div style={{ marginTop: '12px' }}>

                                    {/* 1. POLYGON INPUT (Di chuyển vào đây) */}
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
                                                    ✏️ Vẽ trên màn hình
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

                    <div className={styles.footer} style={{ justifyContent: 'space-between' }}>
                        <Button variant="danger" onClick={handleDeleteClick} disabled={loading}>
                            Delete Camera
                        </Button>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <Button variant="text" onClick={onClose} disabled={loading}>Cancel</Button>
                            <Button variant="primary" onClick={handleSave} disabled={loading}>
                                {loading ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div >
            <PolygonDrawerModal
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onSave={handleSavePolygon}
                initialData={(() => { try { return JSON.parse(polygonStr) } catch { return [] } })()}

                videoWidth={streamResolution.width}
                videoHeight={streamResolution.height}

                // TRUYỀN ẢNH SNAPSHOT VÀO ĐÂY
                // Nếu có snapshot thì dùng, không thì để trống (đen thui)
                backgroundImage={snapshotUrl}
            />
        </>

    );
};

export default EditConfigModal;