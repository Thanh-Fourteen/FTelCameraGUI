import React, { useState, useEffect } from 'react';
import styles from '../AddCameraModal/AddCameraModal.module.css'; // Tận dụng lại CSS của modal thêm mới
import Button from '../../common/Button/Button';
import ConfigForm from '../../camera/ConfigForm/ConfigForm';
import { cameraService } from '../../../services/cameraService';
import type { Camera, SettingsSchema } from '../../../types/camera';

interface EditConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    camera: Camera; // Nhận vào camera hiện tại để fill dữ liệu
    onUpdate: (updatedCamera: Camera) => void; // Callback khi save thành công
    onDelete: (cameraId: string) => void;
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

// List module (Copy từ file cũ hoặc tách ra file constant chung)
const AVAILABLE_MODULES = [
    { id: 'detection', label: 'Object Detection (YOLO)' },
    { id: 'tracking_service', label: 'Object Tracking' },
    { id: 'pose_detection', label: 'Pose Estimation' },
    { id: 'action_recognition', label: 'Action Recognition' },
    { id: 'counting', label: 'Counting (Crossline/Zone)' },
    { id: 'fire', label: 'Fire Detection' },
    // { id: 'face', label: 'Face Recognition' },
];

const EditConfigModal: React.FC<EditConfigModalProps> = ({ isOpen, onClose, camera, onUpdate, onDelete }) => {
    // State
    const [rtspUrl, setRtspUrl] = useState('');
    const [wsPort, setWsPort] = useState<string>('9090');
    const [selectedModules, setSelectedModules] = useState<string[]>([]);

    // Advanced Config
    const [schema, setSchema] = useState<SettingsSchema | null>(null);
    const [config, setConfig] = useState<Record<string, any>>({});
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Polygon
    const [polygonStr, setPolygonStr] = useState('[[0,0],[1920,0],[1920,1080],[0,1080]]');

    const [loading, setLoading] = useState(false);

    const handleDeleteClick = () => {
        // Dùng confirm mặc định của trình duyệt cho nhanh
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
            if (camera.settings) {
                setSelectedModules(camera.settings.modules || []);
                setConfig(camera.settings.config || {});

                // Fill Polygon
                if (camera.settings.polygon && camera.settings.polygon.length > 0) {
                    setPolygonStr(JSON.stringify(camera.settings.polygon));
                }
            }

            // 3. Load Schema mới nhất
            cameraService.getSettingsSchema().then(data => {
                setSchema(data);
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
            let polygonData: number[][] = [[0]];
            if (selectedModules.includes('counting')) {
                try {
                    polygonData = JSON.parse(polygonStr);
                } catch {
                    alert("Invalid Polygon JSON");
                    setLoading(false);
                    return;
                }
            }

            // Construct Payload (Giống cấu trúc PUT mà bạn gửi)
            const payload = {
                rtsp_url: rtspUrl,
                ws_port: parseInt(wsPort),
                settings: {
                    modules: selectedModules,
                    polygon: polygonData,
                    plot_mode: "all",
                    alert_mode: "1",
                    config: config
                }
            };

            console.log("Updating camera:", payload);

            // Gọi API Update
            const updatedData = await cameraService.update(camera.id, payload);

            // Merge data trả về với data cũ để update UI
            const newCameraObj = { ...camera, ...updatedData };

            onUpdate(newCameraObj); // Báo cho cha biết
            onClose(); // Đóng modal

        } catch (error) {
            console.error("Update failed", error);
            alert("Failed to update settings");
        } finally {
            setLoading(false);
        }
    };

    return (
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
                            className={styles.input}
                            value={rtspUrl}
                            onChange={(e) => setRtspUrl(e.target.value)}
                        />
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

                    {/* Polygon */}
                    {/* {selectedModules.includes('counting') && (
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Polygon JSON</label>
                            <textarea
                                className={styles.input} rows={3}
                                value={polygonStr}
                                onChange={(e) => setPolygonStr(e.target.value)}
                                style={{ fontFamily: 'monospace', fontSize: '12px' }}
                            />
                        </div>
                    )} */}

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

                    {/* Nút Xóa nằm bên trái */}
                    <Button variant="danger" onClick={handleDeleteClick} disabled={loading}>
                        Delete Camera
                    </Button>

                    {/* Nhóm nút Hủy/Lưu nằm bên phải */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <Button variant="text" onClick={onClose} disabled={loading}>Cancel</Button>
                        <Button variant="primary" onClick={handleSave} disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </div>
            </div>


        </div>
    );
};

export default EditConfigModal;