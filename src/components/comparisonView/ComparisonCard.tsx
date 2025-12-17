import React, { useEffect, useMemo } from 'react';
import { useWebSocketFrame } from '../../hooks/useWebSocketFrame';
import type { Camera } from '../../types/camera';

interface ComparisonCardProps {
    camera: Camera;
    nodeName?: string;
    onDelete: () => void;
    onFps: (cameraId: string, fps: number) => void;
    color: string;
}

const MODEL_LABEL_MAP: Record<string, string> = {
    'yolov9_ensemble': 'Yolo V9',
    'yolov12_ensemble': 'Yolo V12',
    'detection_ensemble': 'DOAI'
};

// Hàm helper để lấy tên hiển thị an toàn
const getFriendlyModelName = (rawName: string) => {
    return MODEL_LABEL_MAP[rawName] || rawName || 'N/A';
};

const ComparisonCard: React.FC<ComparisonCardProps> = ({ camera, nodeName, onDelete, onFps, color }) => {
    // 1. Tạo URL Stream (Sử dụng stream_url từ type mới nếu có)
    const wsUrl = useMemo(() => {
        if (camera.stream_url) return camera.stream_url;
        if (camera.ws_port) {
            // Ưu tiên dùng node_ip/ip_address nếu có trong type Camera
            const host = camera.node_ip || camera.ip_address || '72.49.200.123';
            return `ws://${host}:${camera.ws_port}`;
        }
        return null;
    }, [camera]);

    // 2. Hook WS
    const { imgRef, isConnected, lastJsonMessage } = useWebSocketFrame({
        url: wsUrl,
        autoReconnect: true
    });

    // 3. Xử lý FPS
    useEffect(() => {
        if (lastJsonMessage && typeof lastJsonMessage.fps === 'number') {
            onFps(camera.camera_id, lastJsonMessage.fps);
        }
    }, [lastJsonMessage, camera.camera_id, onFps]);

    // 4. Lấy tên Model đúng theo cấu trúc CameraSettings
    const modelDisplay = useMemo(() => {
        // Truy xuất theo log schema bạn gửi: pythera_detection -> MODEL_NAME
        const config = camera.settings?.config;
        console.log("Camera Config:", config);
        // Kiểm tra lần lượt các khả năng có thể xảy ra trong config
        const modelName =
            config?.['pythera_detection']?.['MODEL_NAME'] ||
            config?.['detection']?.['MODEL_NAME'] ||
            camera.settings?.model ||
            'N/A';

        const friendlyName = getFriendlyModelName(modelName);

        return friendlyName;
    }, [camera.settings]);

    return (
        <div style={{ ...styles.card, borderTop: `4px solid ${color}` }}>
            <div style={styles.header}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85%' }}>
                    <b style={{ fontSize: '14px' }}>{camera.name}</b>
                    <span style={{ fontSize: '11px', color: '#666', marginLeft: '5px', background: '#f0f0f0', padding: '2px 4px', borderRadius: '4px' }}>
                        {modelDisplay}
                    </span>
                </div>
            </div>

            <div style={styles.videoWrapper}>
                <img
                    ref={imgRef}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: isConnected ? 'block' : 'none' }}
                    alt="Stream"
                />
                {!isConnected && (
                    <div style={styles.placeholder}>
                        <div className="spinner"></div>
                        <span style={{ marginTop: '8px' }}>Connecting Stream...</span>
                    </div>
                )}
                {nodeName && <span style={styles.nodeBadge}>Node: {nodeName}</span>}
            </div>

            <div style={styles.infoFooter}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isConnected ? '#10b981' : '#ef4444' }}></span>
                    {isConnected ? 'Live' : 'Disconnected'}
                </div>
                <div style={{ fontSize: '10px', color: '#999' }}>
                    Port: {camera.ws_port}
                </div>
            </div>
        </div>
    );
};

const styles = {
    card: { background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' as const },
    header: { padding: '10px 12px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' },
    delBtn: { border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', padding: '4px', borderRadius: '4px', color: '#ff4d4f' },
    videoWrapper: { height: '200px', background: '#000', position: 'relative' as const, display: 'flex', justifyContent: 'center', alignItems: 'center' },
    placeholder: { color: '#9ca3af', fontSize: '12px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center' },
    nodeBadge: { position: 'absolute' as const, bottom: 8, right: 8, background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' },
    infoFooter: { padding: '6px 12px', fontSize: '11px', color: '#4b5563', background: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee' }
};

export default ComparisonCard;