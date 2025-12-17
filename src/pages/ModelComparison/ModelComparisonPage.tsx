import React, { useState, useEffect, useCallback, useRef } from 'react';
import SharedHeader from '../../components/layout/SharedHeader/SharedHeader';
import AddComparisonModal from '../../components/camera/AddComparisonModal/AddComparisonModal';
import ComparisonCard from '../../components/comparisonView/ComparisonCard';
import MultiLineFpsChart from '../../components/chart/MultiLineFpsChart'; // Component Chart mới

import { instanceService, type VastInstance } from '../../services/instanceService';
import { cameraService } from '../../services/cameraService';
import { kafkaService } from '../../services/kafkaService';
import { useNotification } from '../../context/NotificationContext';
import type { Camera } from '../../types/camera';

// Hàm sinh màu ngẫu nhiên nhưng cố định theo index hoặc id để đẹp mắt
const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];
const getColor = (index: number) => COLORS[index % COLORS.length];


const MODEL_LABEL_MAP: Record<string, string> = {
    'yolov9_ensemble': 'Yolo V9',
    'yolov12_ensemble': 'Yolo V12',
    'detection_ensemble': 'DOAI'
};

// Hàm helper để lấy tên hiển thị an toàn
const getFriendlyModelName = (rawName: string) => {
    return MODEL_LABEL_MAP[rawName] || rawName || 'N/A';
};
const ModelComparisonPage: React.FC = () => {
    const { notify } = useNotification();

    // State Data
    const [instances, setInstances] = useState<VastInstance[]>([]);
    const [cameras, setCameras] = useState<Camera[]>([]);
    const [loading, setLoading] = useState(false);

    // State UI
    const [selectedInstanceId, setSelectedInstanceId] = useState<string | 'all'>('all');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isKafkaEnabled, setIsKafkaEnabled] = useState(false);

    // --- LOGIC CHART UNIFIED ---
    // Lưu trữ lịch sử FPS để vẽ: [{ time: 123, cam1: 30, cam2: 50 }, ...]
    const [chartData, setChartData] = useState<any[]>([]);

    // Dùng Ref để lưu giá trị FPS mới nhất nhận được từ các cam (tránh re-render liên tục)
    const latestFpsRef = useRef<Record<string, number>>({});



    // Reset chart khi danh sách camera thay đổi
    useEffect(() => {
        setChartData([]);
        latestFpsRef.current = {};
    }, [cameras.length]); // Reset khi số lượng cam thay đổi

    // Interval để update Chart (Sampling mỗi 1s)
    useEffect(() => {
        const interval = setInterval(() => {
            if (cameras.length === 0) return;

            setChartData(prev => {
                const now = Date.now();
                const newPoint: any = { time: now };

                cameras.forEach(cam => {
                    const camId = cam.camera_id || (cam as any).id;
                    newPoint[camId] = latestFpsRef.current[camId] || 0;
                });

                const newHistory = [...prev, newPoint];

                // GIỮ LẠI 60 ĐIỂM GẦN NHẤT (Nếu update 1s/lần thì tương đương 1 phút)
                if (newHistory.length > 60) {
                    return newHistory.slice(newHistory.length - 60);
                }
                return newHistory;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [cameras]);

    // Callback được gọi từ ComparisonCard
    const handleFpsUpdate = useCallback((cameraIdFromCard: string, fps: number) => {
        // Log ra để kiểm tra nếu cần: console.log("FPS Update:", cameraIdFromCard, fps);
        latestFpsRef.current[cameraIdFromCard] = fps;
    }, []);

    // --- Fetch Data Logic (Giữ nguyên) ---
    const fetchInstances = useCallback(async () => {
        try {
            const data = await instanceService.getAll();
            setInstances(data);
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => { fetchInstances(); }, [fetchInstances]);

    const fetchCameras = useCallback(async () => {
        setLoading(true);
        // setCameras([]); // Không clear để tránh nháy giao diện
        try {
            let data: Camera[] = [];
            if (selectedInstanceId === 'all') {
                data = await cameraService.getAllAggregated();
            } else {
                data = await cameraService.getByInstance(selectedInstanceId);
                try {
                    const status = await kafkaService.status(selectedInstanceId);
                    setIsKafkaEnabled(status.status === 'running');
                } catch (e) { }
            }
            setCameras(data);
        } catch (e) {
            notify("Failed to load comparison cameras", "error");
        } finally {
            setLoading(false);
        }
    }, [selectedInstanceId, notify]);

    useEffect(() => { fetchCameras(); }, [fetchCameras]);

    // --- Handlers ---
    const handleAddClick = () => {
        if (selectedInstanceId === 'all') {
            notify("Please select a specific backend instance to add camera", "warning");
        } else {
            setIsAddModalOpen(true);
        }
    };

    const handleDeleteCamera = async (cam: Camera) => {
        if (!window.confirm(`Delete comparison camera ${cam.name}?`)) return;
        try {
            const instanceId = (cam as any).node_id || selectedInstanceId;
            await cameraService.delete(instanceId, cam.camera_id);

            // Xóa data rác trong ref
            delete latestFpsRef.current[cam.camera_id];

            fetchCameras();
            notify("Deleted", "success");
        } catch (e) {
            notify("Delete failed", "error");
        }
    };

    return (
        <div style={styles.container}>
            <SharedHeader
                title="Model Comparison Arena"
                subtitle="Benchmark multiple models in a unified timeline"
                instances={instances}
                selectedInstanceId={selectedInstanceId}
                onInstanceChange={(val) => setSelectedInstanceId(val as string | 'all')}
                onRefreshInstances={fetchInstances}
                kafkaState={{ isEnabled: isKafkaEnabled, isToggling: false, onToggle: () => { } }}
            >
                <button onClick={fetchCameras} style={styles.btn}>🔄 Refresh</button>
            </SharedHeader>

            {/* --- SECTION 1: METRICS CHART (UNIFIED) --- */}
            {/* Chỉ hiển thị khi có ít nhất 1 camera */}
            {cameras.length > 0 && (
                <div style={styles.chartSection}>
                    <h3 style={styles.sectionTitle}>📈 Live Performance Metrics</h3>
                    <MultiLineFpsChart
                        data={chartData}
                        lines={cameras.map((c, idx) => {
                            const modelName =
                                c.settings?.config?.['pythera_detection']?.['MODEL_NAME'] ||
                                'N/A';

                            const friendlyName = getFriendlyModelName(modelName);
                            return {
                                key: c.camera_id,
                                color: getColor(idx),
                                label: `${c.name || c.camera_id} - [${friendlyName}]`
                            };
                        })}
                        height={250}
                    />
                </div>
            )}

            {/* --- SECTION 2: CAMERA GRID --- */}
            <div style={styles.grid}>
                {/* Card Add */}


                {/* List Cameras */}
                {cameras.map((cam, idx) => (
                    <ComparisonCard
                        key={cam.camera_id}
                        camera={cam}
                        nodeName={selectedInstanceId === 'all' ? (cam as any).node_name : undefined}
                        color={getColor(idx)} // Truyền màu xuống để card hiển thị border
                        onFps={handleFpsUpdate} // Truyền callback lấy FPS
                        onDelete={() => handleDeleteCamera(cam)}
                    />
                ))}
                <div style={styles.addCard} onClick={handleAddClick}>
                    <div style={{ fontSize: '40px' }}>+</div>
                    <div>Add Model</div>
                </div>
            </div>

            <AddComparisonModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchCameras}
                instanceId={selectedInstanceId as string}
            />
        </div>
    );
};

const styles = {
    container: { padding: '32px', background: '#f8f9fa', minHeight: '100vh', display: 'flex', flexDirection: 'column' as const, gap: '24px' },
    btn: { padding: '6px 12px', borderRadius: '6px', border: '1px solid #ccc', background: 'white', cursor: 'pointer' },

    chartSection: { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    sectionTitle: { margin: '0 0 16px 0', fontSize: '18px', color: '#111827', fontWeight: '600' },

    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' },
    addCard: {
        border: '2px dashed #ccc', borderRadius: '8px', display: 'flex', flexDirection: 'column' as const,
        alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#888', minHeight: '260px', background: 'rgba(0,0,0,0.02)',
        transition: 'all 0.2s'
    }
};

export default ModelComparisonPage;