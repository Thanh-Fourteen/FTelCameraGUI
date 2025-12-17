import React from 'react';

interface FpsData {
    time: number;
    fps1: number;
    fps2: number;
}
interface RealtimeFpsChartProps {
    data: FpsData[];
    height?: number;
    label1?: string; // <--- Thêm dòng này
    label2?: string; // <--- Thêm dòng này
}

const RealtimeFpsChart: React.FC<RealtimeFpsChartProps> = ({
    data,
    height = 100,
    // Thêm giá trị mặc định để không bị lỗi nếu không truyền
    label1 = "Model A",
    label2 = "Model B"
}) => {
    const width = 1000;
    const maxFps = 60;

    const createPath = (key: 'fps1' | 'fps2') => {
        if (data.length < 2) return "";
        return data.map((d, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - (Math.min(d[key], maxFps) / maxFps) * height;
            return `${x},${y}`;
        }).join(' ');
    };

    return (
        <div style={{ width: '100%', height: height, background: '#111827', borderRadius: '8px', padding: '10px', position: 'relative', overflow: 'hidden' }}>
            <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="#333" strokeDasharray="4" />
                <polyline points={createPath('fps1')} fill="none" stroke="#3b82f6" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                <polyline points={createPath('fps2')} fill="none" stroke="#ef4444" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
            <div style={{ position: 'absolute', top: 5, right: 10, fontSize: '12px', color: 'white', fontWeight: 'bold' }}>
                <span style={{ color: '#3b82f6' }}>Original: {data[data.length - 1]?.fps1.toFixed(1) || 0}</span>
                <span style={{ margin: '0 8px' }}>|</span>
                <span style={{ color: '#ef4444' }}>Benchmark: {data[data.length - 1]?.fps2.toFixed(1) || 0}</span>
            </div>
        </div>
    );
};

export default RealtimeFpsChart;