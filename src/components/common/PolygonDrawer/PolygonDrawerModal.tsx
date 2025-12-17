import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './PolygonDrawerModal.module.css';

interface Point {
  x: number;
  y: number;
}

interface PolygonDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (points: number[][]) => void;
  initialData?: number[][];
  backgroundImage?: string;
  videoWidth?: number;
  videoHeight?: number;
}

const PolygonDrawerModal: React.FC<PolygonDrawerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  backgroundImage,
  videoWidth = 854,
  videoHeight = 480
}) => {
  const [points, setPoints] = useState<Point[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load dữ liệu ban đầu
  useEffect(() => {
    if (isOpen) {
      if (initialData && initialData.length > 0) {
        setPoints(initialData.map(p => ({ x: p[0], y: p[1] })));
      } else {
        setPoints([]);
      }
    }
  }, [isOpen]);

  // Hàm vẽ Canvas
  const draw = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { clientWidth, clientHeight } = containerRef.current;

    // Cập nhật kích thước canvas theo thực tế hiển thị
    canvas.width = clientWidth;
    canvas.height = clientHeight;

    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Tỉ lệ scale để hiển thị tọa độ thực lên màn hình
    const drawScaleX = clientWidth / videoWidth;
    const drawScaleY = clientHeight / videoHeight;

    if (points.length > 0) {
      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#3b82f6'; // Màu xanh dương highlight
      ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';

      ctx.moveTo(points[0].x * drawScaleX, points[0].y * drawScaleY);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x * drawScaleX, points[i].y * drawScaleY);
      }

      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Vẽ các đỉnh đa giác
      points.forEach((p, index) => {
        ctx.beginPath();
        ctx.arc(p.x * drawScaleX, p.y * drawScaleY, 6, 0, 2 * Math.PI);
        ctx.fillStyle = index === 0 ? '#ef4444' : '#fbbf24'; // Điểm đầu đỏ, điểm sau vàng
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }
  }, [points, videoWidth, videoHeight]);

  // Vẽ lại khi points thay đổi hoặc cửa sổ resize
  useEffect(() => {
    if (isOpen) {
      draw();
      window.addEventListener('resize', draw);
    }
    return () => window.removeEventListener('resize', draw);
  }, [isOpen, draw]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Tính toán tọa độ thực tế dựa trên độ phân giải gốc của camera
    const realX = Math.round((clickX / rect.width) * videoWidth);
    const realY = Math.round((clickY / rect.height) * videoHeight);

    // Giới hạn tọa độ trong phạm vi video
    const boundedX = Math.max(0, Math.min(realX, videoWidth));
    const boundedY = Math.max(0, Math.min(realY, videoHeight));

    setPoints([...points, { x: boundedX, y: boundedY }]);
  };

  const handleUndo = () => setPoints(prev => prev.slice(0, -1));
  const handleClear = () => setPoints([]);

  const handleConfirm = () => {
    const exportData = points.map(p => [p.x, p.y]);
    onSave(exportData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>✏️ Draw Detection Zone</h3>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <div className={styles.body}>
          <p className={styles.instruction}>
            Click on the image to define the boundaries. The system will connect the points in order.
          </p>

          <div
            className={styles.canvasContainer}
            ref={containerRef}
            onClick={handleCanvasClick}
            style={{
              backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              backgroundColor: '#000',
              aspectRatio: `${videoWidth}/${videoHeight}`,
            }}
          >
            {!backgroundImage && (
              <div className={styles.placeholderText}>
                No preview available. Drawing on {videoWidth}x{videoHeight} canvas.
              </div>
            )}
            <canvas ref={canvasRef} className={styles.canvas} />
          </div>

          <div className={styles.coordPreview}>
            <strong>Points: {points.length}</strong>
            {points.length > 0 && (
              <span className={styles.lastPoint}> 
                (Current pos: {points[points.length - 1].x}, {points[points.length - 1].y})
              </span>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            <button className={styles.btnSecondary} onClick={handleUndo} disabled={points.length === 0}>
              Undo
            </button>
            <button className={styles.btnSecondary} onClick={handleClear} disabled={points.length === 0}>
              Clear All
            </button>
          </div>
          <div className={styles.footerRight}>
            <button className={styles.btnText} onClick={onClose}>Cancel</button>
            <button className={styles.btnPrimary} onClick={handleConfirm} disabled={points.length < 3}>
              Save Polygon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PolygonDrawerModal;