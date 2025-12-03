// // src/components/camera/CameraView/CameraOverlay.tsx
// import React, { useRef, useEffect } from 'react';
// import { type StreamMetadata } from '../../../hooks/useWebSocketFrame';

// interface CameraOverlayProps {
//   metadataRef: React.MutableRefObject<StreamMetadata | null>; // Nhận Ref thay vì data
//   originalWidth?: number; // 1920
//   originalHeight?: number; // 1080
// }

// // Giữ nguyên các hằng số SKELETON, POSE_COLORS...
// const SKELETON = [[0, 13], [1, 2], [1, 3], [3, 5], [2, 4], [4, 6], [13, 7], [7, 9], [9, 11], [13, 8], [8, 10], [10, 12]];
// const POSE_COLORS = ['#00D7FF', '#00FFCC', '#0086FF', '#00FF32', '#4DFFDE', '#4DC4FF', '#4D87FF', '#BFFF4D', '#4DFF4D', '#4DDEFF', '#FF9C7F', '#007FFF', '#FF7F4D', '#004DFF', '#FF4D24'];

// const CameraOverlay: React.FC<CameraOverlayProps> = ({ 
//   metadataRef, 
//   originalWidth = 1920,
//   originalHeight = 1080
// }) => {
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const containerRef = useRef<HTMLDivElement>(null); // Để đo kích thước thật của khung

//   useEffect(() => {
//     const canvas = canvasRef.current;
//     const container = containerRef.current;
//     if (!canvas || !container) return;

//     let animationFrameId: number;

//     const render = () => {
//         const ctx = canvas.getContext('2d');
//         if (!ctx) return;

//         // 1. Lấy kích thước hiện tại của khung chứa
//         const containerW = container.clientWidth;
//         const containerH = container.clientHeight;

//         // Cập nhật size canvas cho khớp khung chứa
//         if (canvas.width !== containerW || canvas.height !== containerH) {
//             canvas.width = containerW;
//             canvas.height = containerH;
//         }

//         // Clear màn hình cũ
//         ctx.clearRect(0, 0, containerW, containerH);

//         // Lấy data mới nhất từ Ref (Không cần đợi React render)
//         const data = metadataRef.current;
//         if (!data) {
//             // Loop tiếp kể cả khi chưa có data để giữ FPS
//             animationFrameId = requestAnimationFrame(render);
//             return;
//         }

//         // ============================================================
//         // 2. LOGIC TÍNH TOÁN "OBJECT-FIT: CONTAIN" (FIX LỖI LỆCH HÌNH)
//         // ============================================================
        
//         // Tỉ lệ scale để ảnh vừa khít khung
//         const scale = Math.min(containerW / originalWidth, containerH / originalHeight);
        
//         // Kích thước thật của ảnh sau khi resize
//         const displayedW = originalWidth * scale;
//         const displayedH = originalHeight * scale;

//         // Khoảng cách thừa (đen/trắng) để căn giữa ảnh
//         const offsetX = (containerW - displayedW) / 2;
//         const offsetY = (containerH - displayedH) / 2;

//         // Hàm helper chuyển toạ độ gốc (1920x1080) -> toạ độ màn hình
//         const toScreenX = (x: number) => offsetX + (x * scale);
//         const toScreenY = (y: number) => offsetY + (y * scale);

//         // ============================================================
//         // 3. VẼ (DRAWING LOGIC) - Dùng hàm toScreenX/Y thay vì scale thường
//         // ============================================================

//         // --- DRAW COUNTING POLYGON ---
//         if (data.count?.polygon?.coordinates) {
//             data.count.polygon.coordinates.forEach((poly: number[][]) => {
//                 ctx.beginPath();
//                 if (poly.length > 0) {
//                     ctx.moveTo(toScreenX(poly[0][0]), toScreenY(poly[0][1]));
//                     for (let i = 1; i < poly.length; i++) {
//                         ctx.lineTo(toScreenX(poly[i][0]), toScreenY(poly[i][1]));
//                     }
//                 }
//                 ctx.closePath();
//                 ctx.fillStyle = "rgba(0, 255, 0, 0.2)";
//                 ctx.fill();
//                 ctx.strokeStyle = "#00FF00";
//                 ctx.lineWidth = 2;
//                 ctx.stroke();
//             });
//         }

//         // --- DRAW OBJECTS (Box, Label, Skeleton) ---
//         const objectsToDraw = [...(data.detection || []), ...(data.track || [])];

//         objectsToDraw.forEach((obj: any) => {
//             if (!obj.box) return;
//             const { x1, y1, x2, y2 } = obj.box;
            
//             const sx1 = toScreenX(x1);
//             const sy1 = toScreenY(y1);
//             const sx2 = toScreenX(x2);
//             const sy2 = toScreenY(y2);
//             const boxW = sx2 - sx1;
//             const boxH = sy2 - sy1;

//             // Box
//             ctx.strokeStyle = obj.track_id ? "#00FF00" : "#00FFFF";
//             ctx.lineWidth = 2;
//             ctx.strokeRect(sx1, sy1, boxW, boxH);

//             // Label
//             const label = obj.label || obj.track_id || "Unknown";
//             ctx.font = "12px Arial";
//             ctx.fillStyle = ctx.strokeStyle;
//             ctx.fillText(label, sx1, sy1 - 5);

//             // Skeleton
//             if (obj.keypoints) {
//                 obj.keypoints.forEach((kp: any) => {
//                     if (kp.confidence > 0.1) {
//                         ctx.beginPath();
//                         ctx.arc(toScreenX(kp.x), toScreenY(kp.y), 3, 0, 2 * Math.PI);
//                         ctx.fillStyle = "white";
//                         ctx.fill();
//                     }
//                 });
//                 // (Thêm vẽ line skeleton tương tự nếu cần, dùng toScreenX/Y)
//                 SKELETON.forEach(([i, j], idx) => {
//                     const kp1 = obj.keypoints[i];
//                     const kp2 = obj.keypoints[j];
//                     if (kp1?.confidence > 0.1 && kp2?.confidence > 0.1) {
//                         ctx.beginPath();
//                         ctx.moveTo(toScreenX(kp1.x), toScreenY(kp1.y));
//                         ctx.lineTo(toScreenX(kp2.x), toScreenY(kp2.y));
//                         ctx.strokeStyle = POSE_COLORS[idx % POSE_COLORS.length];
//                         ctx.stroke();
//                     }
//                 });
//             }
//         });

//         // --- DRAW ALERT (Fire/Fall) ---
//         const fireState = data.fire?.state || "normal";
//         // Logic check Fall Critical tùy vào data của bạn
//         const hasCriticalFall = data.track?.some((t:any) => /* Logic check */ false); 

//         if (fireState === 'fire' || hasCriticalFall) {
//             const time = Date.now() / 200; // Nhấp nháy nhanh
//             if (Math.floor(time) % 2 === 0) {
//                  ctx.strokeStyle = "red";
//                  ctx.lineWidth = 10;
//                  ctx.strokeRect(0, 0, containerW, containerH);
                 
//                  ctx.font = "bold 40px Arial";
//                  ctx.fillStyle = "red";
//                  ctx.textAlign = "center";
//                  ctx.fillText("WARNING!", containerW / 2, containerH / 2);
//             }
//         }
        
//         // Loop tiếp
//         animationFrameId = requestAnimationFrame(render);
//     };

//     // Bắt đầu loop
//     render();

//     return () => {
//         cancelAnimationFrame(animationFrameId);
//     };
//   }, [metadataRef, originalWidth, originalHeight]);

//   return (
//     // Wrapper div để lấy kích thước 100% của cha
//     <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
//         <canvas ref={canvasRef} style={{ display: 'block' }} />
//     </div>
//   );
// };

// export default CameraOverlay;