// src/components/chart/MultiLineFpsChart.tsx
import React from 'react';

interface ChartDataPoint {
    time: number;
    [key: string]: number;
}

interface LineConfig {
    key: string;   // cam_id
    color: string; // Màu của line
    label: string; // Tên hiển thị chú thích (đã map ở Page cha)
}

interface MultiLineFpsChartProps {
    data: ChartDataPoint[];
    lines: LineConfig[];
    height?: number;
}

const MultiLineFpsChart: React.FC<MultiLineFpsChartProps> = ({ data, lines, height = 220 }) => {
    const width = 1000; 
    const maxFps = 60;  
    const MAX_POINTS = 60; // Giả định hiển thị 60 giây gần nhất

    if (!data || data.length < 2) {
        return (
            <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111827', color: '#6b7280', borderRadius: 8 }}>
                Waiting for data stream...
            </div>
        );
    }

    const createPath = (key: string) => {
        return data.map((d, i) => {
            const x = (i / (MAX_POINTS - 1)) * width;
            const val = d[key] || 0;
            const y = height - (Math.min(val, maxFps) / maxFps) * height;
            return `${x},${y}`;
        }).join(' ');
    };

    // Các mốc thời gian trên trục X (giây)
    const xTicks = [0, 15, 30, 45, 60];

    return (
        <div style={{ background: '#111827', padding: '20px 30px 40px 40px', borderRadius: '8px' }}>
            <div style={{ position: 'relative', height: height, width: '100%' }}>
                <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    {/* Grid ngang (Trục Y) */}
                    <line key="grid-60" x1="0" y1="0" x2={width} y2="0" stroke="#374151" strokeDasharray="4" />
                    <line key="grid-30" x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#374151" strokeDasharray="4" />
                    <line key="grid-0" x1="0" y1={height} x2={width} y2={height} stroke="#4b5563" strokeWidth="2" />

                    {/* Grid dọc (Trục X) */}
                    {xTicks.map(tick => (
                        <line 
                            key={`v-grid-${tick}`}
                            x1={(tick / 60) * width} 
                            y1={0} 
                            x2={(tick / 60) * width} 
                            y2={height} 
                            stroke="#1f2937" 
                        />
                    ))}

                    {/* Vẽ các đường FPS */}
                    {lines.map((line) => (
                        <polyline
                            key={line.key}
                            points={createPath(line.key)}
                            fill="none"
                            stroke={line.color}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                            style={{ transition: 'points 0.3s linear' }}
                        />
                    ))}
                </svg>

                {/* Nhãn trục Y (FPS) */}
                <div style={{ position: 'absolute', left: -30, top: -5, fontSize: 11, color: '#9ca3af', fontWeight: 'bold' }}>60</div>
                <div style={{ position: 'absolute', left: -30, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#9ca3af' }}>30</div>
                <div style={{ position: 'absolute', left: -30, bottom: -5, fontSize: 11, color: '#9ca3af' }}>0</div>
                <div style={{ position: 'absolute', left: -45, top: '50%', transform: 'rotate(-90deg) translateX(50%)', fontSize: 10, color: '#4b5563', letterSpacing: 1 }}>FPS</div>

                {/* Nhãn trục X (Thời gian) */}
                {xTicks.map((tick) => (
                    <div 
                        key={`x-label-${tick}`}
                        style={{
                            position: 'absolute',
                            bottom: -25,
                            left: `${(tick / 60) * 100}%`,
                            transform: 'translateX(-50%)',
                            fontSize: 11,
                            color: '#9ca3af',
                            fontWeight: '500'
                        }}
                    >
                        {tick}s
                    </div>
                ))}
            </div>

            {/* Chú thích (Legend) bên dưới */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '40px', justifyContent: 'center', borderTop: '1px solid #1f2937', paddingTop: '15px' }}>
                {lines.map((line, index) => {
                    const uniqueKey = line.key || `fallback-${index}`;
                    const currentFps = data[data.length - 1][uniqueKey] || 0;
                    return (
                        <div key={`legend-${uniqueKey}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '4px 12px', borderRadius: '20px' }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: line.color, boxShadow: `0 0 8px ${line.color}` }}></span>
                            <span style={{ fontSize: '12px', color: '#e5e7eb', whiteSpace: 'nowrap' }}>{line.label}</span>
                            <span style={{ fontSize: '12px', color: line.color, fontWeight: 'bold' }}>
                                {currentFps.toFixed(1)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MultiLineFpsChart;