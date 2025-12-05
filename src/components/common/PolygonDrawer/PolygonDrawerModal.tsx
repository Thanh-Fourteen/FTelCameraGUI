import React, { useState, useRef, useEffect } from 'react';
import styles from './PolygonDrawerModal.module.css';

interface Point {
  x: number;
  y: number;
}

interface PolygonDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (points: number[][]) => void;
  initialData?: number[][]; // Dữ liệu cũ nếu có
  backgroundImage?: string; // (Optional) Ảnh snapshot từ camera để vẽ đè lên

  videoWidth?: number;
  videoHeight?: number;
}


const PolygonDrawerModal: React.FC<PolygonDrawerModalProps> = ({
  isOpen, onClose, onSave, initialData, backgroundImage, videoWidth = 854, // Default nếu không truyền
  videoHeight = 480
}) => {
  // State lưu danh sách điểm (Tọa độ chuẩn 1920x1080)
  const [points, setPoints] = useState<Point[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load dữ liệu cũ khi mở modal
  useEffect(() => {
    if (isOpen && initialData && initialData.length > 0) {
      // Convert mảng mảng [[x,y]] sang object [{x,y}]
      const formatted = initialData.map(p => ({ x: p[0], y: p[1] }));
      setPoints(formatted);
    } else {
      setPoints([]);
    }
  }, [isOpen, initialData]);

  // Vẽ lại Canvas mỗi khi points thay đổi hoặc resize
  useEffect(() => {
    if (!isOpen || !canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { clientWidth, clientHeight } = containerRef.current;

    canvas.width = clientWidth;
    canvas.height = clientHeight;

    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Tính tỉ lệ scale từ 1920 -> Màn hình thực tế
    const drawScaleX = clientWidth / videoWidth;
    const drawScaleY = clientHeight / videoHeight;

    // VẼ ĐA GIÁC
    if (points.length > 0) {
      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#00ff00'; // Màu xanh lá
      ctx.fillStyle = 'rgba(0, 255, 0, 0.3)'; // Màu nền mờ

      // Di chuyển tới điểm đầu
      ctx.moveTo(points[0].x * drawScaleX, points[0].y * drawScaleY);

      // Line to
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x * drawScaleX, points[i].y * drawScaleY);
      }

      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // VẼ CÁC CHẤM TRÒN TẠI ĐỈNH
      points.forEach((p, index) => {
        ctx.beginPath();
        // Scale tọa độ điểm để vẽ đúng vị trí trên màn hình nhỏ
        ctx.arc(p.x * drawScaleX, p.y * drawScaleY, 5, 0, 2 * Math.PI);
        // ...
        ctx.fillStyle = index === 0 ? 'red' : 'yellow'; // Điểm đầu màu đỏ
        ctx.fill();
        ctx.stroke();
      });
    }
  }, [points, isOpen]);

  // Xử lý click chuột để thêm điểm
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // --- CÔNG THỨC SCALE MỚI ---
    // Tỉ lệ = Kích thước video gốc / Kích thước hiển thị trên màn hình
    const scaleX = videoWidth / rect.width;
    const scaleY = videoHeight / rect.height;

    const realX = Math.round(clickX * scaleX);
    const realY = Math.round(clickY * scaleY);

    // Lưu tọa độ thực (theo video gốc)
    setPoints([...points, { x: realX, y: realY }]);
  };

  const handleUndo = () => {
    setPoints(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPoints([]);
  };

  const handleConfirm = () => {
    // Convert về dạng mảng lồng nhau [[x,y], [x,y]]
    const exportData = points.map(p => [p.x, p.y]);
    onSave(exportData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Vẽ vùng đếm người (Counting Zone)</h3>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.body}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
            Resolution Base: {videoWidth} x {videoHeight}
          </div>
          <p className={styles.instruction}>Click chuột vào khung hình để tạo các điểm. Máy tính sẽ tự nối chúng lại.</p>

          {/* KHUNG VẼ */}
          <div
            className={styles.canvasContainer}
            ref={containerRef}
            onClick={handleCanvasClick}
            style={{
              backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
              backgroundColor: backgroundImage ? 'transparent' : '#000'
            }}
          >
            {/* Nếu không có ảnh nền thì hiện text placeholder */}
            {!backgroundImage && <div className={styles.placeholderText}>Khung hình Camera (16:9)</div>}

            <canvas ref={canvasRef} className={styles.canvas} />
          </div>

          <div className={styles.coordPreview}>
            Điểm đã chọn: {points.length}
            {points.length > 0 && <span style={{ fontSize: '11px', color: '#666' }}> (Last: {points[points.length - 1].x}, {points[points.length - 1].y})</span>}
          </div>
        </div>

        <div className={styles.footer}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className={styles.btnSecondary} onClick={handleUndo} disabled={points.length === 0}>↩ Undo</button>
            <button className={styles.btnSecondary} onClick={handleClear} disabled={points.length === 0}>🗑 Clear</button>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className={styles.btnSecondary} onClick={onClose}>Hủy</button>
            <button className={styles.btnPrimary} onClick={handleConfirm}>✅ Lưu Vùng</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PolygonDrawerModal;