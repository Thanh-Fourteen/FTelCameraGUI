import React, { useState, useEffect, useCallback, useRef } from 'react';
import SharedHeader from '../../components/layout/SharedHeader/SharedHeader';
import AddComparisonModal from '../../components/camera/AddComparisonModal/AddComparisonModal';
import ComparisonCard from '../../components/comparisonView/ComparisonCard';
import MultiLineFpsChart from '../../components/chart/MultiLineFpsChart';

import { instanceService, type VastInstance } from '../../services/instanceService';
import { cameraService } from '../../services/cameraService';
import { kafkaService } from '../../services/kafkaService';
import { useNotification } from '../../context/NotificationContext';
import type { Camera } from '../../types/camera';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];
const getColor = (index: number) => COLORS[index % COLORS.length];

const MODEL_LABEL_MAP: Record<string, string> = {
    'yolov9_ensemble': 'Yolo V9',
    'yolov12_ensemble': 'Yolo V12',
    'detection_ensemble': 'DOAI'
};

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
    const [selectedInstanceId, setSelectedInstanceId] = useState<string>(() => {
        return localStorage.getItem('last_selected_instance') || '';
    });

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isKafkaEnabled, setIsKafkaEnabled] = useState(false);
    const [isTogglingKafka, setIsTogglingKafka] = useState(false);

    // --- LOGIC CHART ---
    const [chartData, setChartData] = useState<any[]>([]);
    const latestFpsRef = useRef<Record<string, number>>({});

    useEffect(() => {
        setChartData([]);
        latestFpsRef.current = {};
    }, [cameras.length, selectedInstanceId]);

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
                return newHistory.slice(-60);
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [cameras]);

    const handleFpsUpdate = useCallback((cameraIdFromCard: string, fps: number) => {
        latestFpsRef.current[cameraIdFromCard] = fps;
    }, []);

    // --- FETCH LOGIC ---
    const fetchInstances = useCallback(async () => {
        try {
            const data = await instanceService.getAll();
            setInstances(data);

            // Nếu chưa có instanceId hoặc instance cũ không còn tồn tại, chọn cái đầu tiên
            if (data.length > 0) {
                const exists = data.find(i => i.instance_id === selectedInstanceId);
                if (!selectedInstanceId || !exists) {
                    const firstId = data[0].instance_id;
                    setSelectedInstanceId(firstId);
                    localStorage.setItem('last_selected_instance', firstId);
                }
            }
        } catch (e) { console.error(e); }
    }, [selectedInstanceId]);

    useEffect(() => { fetchInstances(); }, [fetchInstances]);

    const fetchCamerasAndStatus = useCallback(async () => {
        if (!selectedInstanceId || selectedInstanceId === 'all') return;
        setLoading(true);
        try {
            const data = await cameraService.getByInstance(selectedInstanceId);
            setCameras(data);

            const status = await kafkaService.status(selectedInstanceId);
            setIsKafkaEnabled(status.status === 'running' || status.is_active === true);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [selectedInstanceId]);

    useEffect(() => { fetchCamerasAndStatus(); }, [fetchCamerasAndStatus]);

    const handleToggleKafka = async () => {
        if (!selectedInstanceId || isTogglingKafka) return;
        setIsTogglingKafka(true);
        try {
            const newState = !isKafkaEnabled;
            await kafkaService.toggle(selectedInstanceId, newState);
            setIsKafkaEnabled(newState);
            notify(`Kafka service is now ${newState ? 'active' : 'inactive'}`, "success");
        } catch (error) {
            notify("Failed to toggle Kafka service", "error");
        } finally {
            setIsTogglingKafka(false);
        }
    };

    return (
        <div style={styles.container}>
            <SharedHeader
                title="Model Arena"
                subtitle="High-performance model benchmarking & comparison"
                instances={instances}
                selectedInstanceId={selectedInstanceId}
                onInstanceChange={(val) => {
                    setSelectedInstanceId(val as string);
                    localStorage.setItem('last_selected_instance', val as string);
                }}
                onRefreshInstances={fetchInstances}
                kafkaState={{
                    isEnabled: isKafkaEnabled,
                    isToggling: isTogglingKafka,
                    onToggle: handleToggleKafka
                }}
            />

            {/* --- INTRODUCTION SECTION --- */}
            <div style={styles.introSection}>
                <div style={styles.introContent}>
                    <h2 style={styles.introTitle}>Welcome to the Performance Arena</h2>
                    <p style={styles.introText}>
                        This specialized environment allows you to <strong>benchmark multiple AI models</strong> side-by-side.
                        By deploying different engines on the same RTSP stream, you can directly compare
                        accuracy, inference latency, and throughput in real-time.
                    </p>
                    <ul style={styles.introList}>
                        <li>🚀 <strong>Real-time Metrics:</strong> Monitor FPS stability across different architectures.</li>
                        <li>📊 <strong>Unified Timeline:</strong> Compare model behaviors on the exact same video frames.</li>
                        <li>⚙️ <strong>Easy Switching:</strong> Quickly toggle between Yolo V9, V12, and DOAI engines.</li>
                    </ul>
                </div>
            </div>

            {/* --- METRICS CHART --- */}
            {cameras.length > 0 && (
                <div style={styles.chartSection}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={styles.sectionTitle}>📈 Live Performance Metrics</h3>
                        <span style={styles.instanceBadge}>Node: {selectedInstanceId}</span>
                    </div>
                    <MultiLineFpsChart
                        data={chartData}
                        lines={cameras.map((c, idx) => {
                            const modelName = c.settings?.config?.['pythera_detection']?.['MODEL_NAME'] || 'N/A';
                            const friendlyName = getFriendlyModelName(modelName);
                            return {
                                key: c.camera_id,
                                color: getColor(idx),
                                label: `${c.name || c.camera_id} (${friendlyName})`
                            };
                        })}
                        height={250}
                    />
                </div>
            )}

            {/* --- CAMERA GRID --- */}
            <div style={styles.grid}>
                {cameras.map((cam, idx) => (
                    <ComparisonCard
                        key={cam.camera_id}
                        camera={cam}
                        color={getColor(idx)}
                        onFps={handleFpsUpdate}
                        onDelete={() => {
                        }}
                    />
                ))}

                <div style={styles.addCard} onClick={() => setIsAddModalOpen(true)}>
                    <div style={{ fontSize: '40px', marginBottom: '8px' }}>+</div>
                    <div style={{ fontWeight: 600 }}>Deploy New Model</div>
                    <div style={{ fontSize: '12px', opacity: 0.7 }}>Add engine for benchmarking</div>
                </div>
            </div>

            {selectedInstanceId && (
                <AddComparisonModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={fetchCamerasAndStatus}
                    instanceId={selectedInstanceId}
                />
            )}
        </div>
    );
};

const styles = {
    container: { padding: '32px', background: '#f8f9fa', minHeight: '100vh', display: 'flex', flexDirection: 'column' as const, gap: '24px' },

    // Intro Section Styles
    introSection: {
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        padding: '30px',
        borderRadius: '16px',
        color: 'white',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
    },
    introContent: { maxWidth: '900px' },
    introTitle: { margin: '0 0 12px 0', fontSize: '24px', fontWeight: '700', color: '#3b82f6' },
    introText: { margin: '0 0 20px 0', fontSize: '15px', lineHeight: '1.6', color: '#94a3b8' },
    introList: { display: 'flex', gap: '20px', listStyle: 'none', padding: 0, fontSize: '13px' },

    chartSection: { background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
    sectionTitle: { margin: 0, fontSize: '18px', color: '#111827', fontWeight: '600' },
    instanceBadge: { fontSize: '11px', background: '#f1f5f9', padding: '4px 10px', borderRadius: '20px', color: '#64748b', fontWeight: 600 },

    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' },
    addCard: {
        border: '2px dashed #cbd5e1', borderRadius: '16px', display: 'flex', flexDirection: 'column' as const,
        alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', minHeight: '280px', background: '#fff',
        transition: 'all 0.2s ease',
        '&:hover': { borderColor: '#3b82f6', color: '#3b82f6', background: '#f0f7ff' }
    }
};

export default ModelComparisonPage;