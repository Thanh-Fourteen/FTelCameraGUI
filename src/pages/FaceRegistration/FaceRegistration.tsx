import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import CreateCollectionModal from '../../components/face/CollectionModal/CreateCollectionModal';

// --- API CONFIG ---
const API_DB_BASE = 'http://192.168.2.130:2022'; // API Đăng ký (Port 2022)

// --- CẤU HÌNH 5 GÓC CHỤP ---
const CAPTURE_STEPS = [
  { id: 'front', label: 'Nhìn Thẳng', icon: '😐', arrow: '•', hint: 'Giữ khuôn mặt chính diện' },
  { id: 'left', label: 'Quay Trái', icon: '👈', arrow: '←', hint: 'Quay mặt nhẹ sang trái' },
  { id: 'right', label: 'Quay Phải', icon: '👉', arrow: '→', hint: 'Quay mặt nhẹ sang phải' },
  { id: 'up', label: 'Ngước Lên', icon: '☝️', arrow: '↑', hint: 'Ngước cằm lên một chút' },
  { id: 'down', label: 'Cúi Xuống', icon: '👇', arrow: '↓', hint: 'Cúi nhẹ đầu xuống' },
];

const FaceRegistration: React.FC = () => {
  // --- STATE DỮ LIỆU ---
  const [collectionName, setCollectionName] = useState('');
  const [userName, setUserName] = useState('');
  const [userType, setUserType] = useState('Staff');

  // --- STATE UI & CAMERA ---
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0 -> 4
  const [isProcessStarted, setIsProcessStarted] = useState(false); // Bắt đầu quy trình?
  const [isSubmitting, setIsSubmitting] = useState(false); // Đang gửi API?

  const [error, setError] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);

  // --- REFS ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // --- HELPER: Base64 to Blob ---
  const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  };

  // --- 1. CAMERA CONTROL ---
  const startCamera = async () => {
    setError(''); setMessage('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      streamRef.current = stream;
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Camera Error:", err);
      setError('Không thể mở camera. Hãy kiểm tra quyền truy cập!');
    }
  };

  // Fix lỗi màn hình đen: Gán stream khi video tag đã sẵn sàng
  useEffect(() => {
    if (isCameraOpen && videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(e => console.error("Play error:", e));
    }
  }, [isCameraOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setIsProcessStarted(false);
    setCurrentStep(0);
  };

  // --- 2. HÀM CHỤP ẢNH (Dùng cho nút bấm) ---
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.9); // Chất lượng cao hơn chút để đăng ký (0.9)
      }
    }
    return null;
  }, []);

  // --- 3. QUY TRÌNH CHỤP & GỬI ---
  const handleStartProcess = () => {
    if (!userName || !collectionName) {
      setError("Vui lòng nhập đầy đủ thông tin trước!");
      return;
    }
    setError('');
    setMessage('');
    setIsProcessStarted(true);
    setCurrentStep(0);
  };

  const handleCaptureStep = async () => {
    const frame = captureFrame();
    if (!frame) return;

    setIsSubmitting(true);
    setError('');

    try {
      // 1. Chuẩn bị FormData
      const formData = new FormData();
      formData.append('collection_name', collectionName);
      formData.append('personal_name', userName);
      formData.append('personal_type', userType);

      // Convert ảnh sang file blob
      const blob = dataURLtoBlob(frame);
      // Đặt tên file gợi nhớ: pose_front.jpg, pose_left.jpg ...
      formData.append('image_file', blob, `pose_${CAPTURE_STEPS[currentStep].id}.jpg`);

      // 2. Gửi API (Port 2022)
      const response = await axios.post(`${API_DB_BASE}/register`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // 3. Xử lý kết quả
      if (response.status === 200) {
        if (currentStep < CAPTURE_STEPS.length - 1) {
          // Chưa hết 5 bước -> Next
          setMessage(`✅ Xong bước ${currentStep + 1}/5! Giữ nguyên tư thế tiếp theo...`);
          setTimeout(() => {
            setMessage('');
            setCurrentStep(prev => prev + 1);
          }, 500); 
        } else {
          // Đã xong bước cuối
          setMessage(`🎉 CHÚC MỪNG! Đăng ký thành công trọn bộ 5 góc.`);
          setIsProcessStarted(false); // Kết thúc quy trình
          setTimeout(() => stopCamera(), 3000); // Tự tắt cam sau 3s
        }
      }

    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 422) {
        setError("⚠️ Không tìm thấy khuôn mặt! Vui lòng giữ yên và thử lại.");
      } else {
        setError(`❌ Lỗi Server: ${err.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDER ---
  const currentPose = CAPTURE_STEPS[currentStep];

  return (
    <div style={styles.pageContainer}>
      <div style={styles.card}>
        <h2 style={{ color: '#1f2937', marginBottom: '20px' }}>Đăng ký Khuôn mặt</h2>

        {/* INPUT FORM (Disable khi đang chụp) */}
        <div style={{ opacity: isProcessStarted ? 0.5 : 1, pointerEvents: isProcessStarted ? 'none' : 'auto' }}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Collection</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input style={styles.input} value={collectionName} onChange={e => setCollectionName(e.target.value)} />
              <button style={styles.btnSmall} onClick={() => setIsCollectionModalOpen(true)}>+</button>
            </div>
          </div>
          <div style={styles.row}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Họ tên</label>
              <input style={styles.input} value={userName} onChange={e => setUserName(e.target.value)} placeholder="Nhập tên..." />
            </div>
            <div style={{ width: '120px' }}>
              <label style={styles.label}>Chức vụ</label>
              <select style={styles.select} value={userType} onChange={e => setUserType(e.target.value)}>
                <option value="Staff">Staff</option>
                <option value="Manager">Manager</option>
                <option value="VIP">VIP</option>
                <option value="Guest">Guest</option>
              </select>
            </div>
          </div>
        </div>

        {/* CAMERA AREA */}
        <div style={styles.previewArea}>
          {!isCameraOpen ? (
            <div style={styles.placeholder}>
              <div style={{ fontSize: '50px' }}>📸</div>
              <button onClick={startCamera} style={styles.btnPrimary}>Bật Camera</button>
            </div>
          ) : (
            <>
              <video ref={videoRef} style={styles.media} autoPlay playsInline muted />
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {/* OVERLAY HƯỚNG DẪN */}
              {isProcessStarted && (
                <div style={styles.guideOverlay}>
                  <div style={styles.guideIcon}>{currentPose.arrow}</div>
                  <div style={styles.guideText}>
                    <span style={{ fontSize: '24px' }}>{currentPose.icon}</span>
                    <span>{currentPose.label}</span>
                  </div>
                  <div style={styles.guideSubText}>{currentPose.hint}</div>

                  <div style={styles.progressContainer}>
                    {CAPTURE_STEPS.map((step, idx) => (
                      <div key={step.id} style={{
                        ...styles.progressDot,
                        backgroundColor: idx < currentStep ? '#10b981' : (idx === currentStep ? '#3b82f6' : '#e5e7eb')
                      }} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* NOTIFICATIONS */}
        {error && <div style={styles.msgError}>{error}</div>}
        {message && <div style={styles.msgSuccess}>{message}</div>}

        {/* ACTIONS */}
        <div style={{ marginTop: '20px' }}>
          {isCameraOpen && !isProcessStarted && (
            <button
              onClick={handleStartProcess}
              style={styles.btnRegister}
              disabled={!userName || !collectionName}
            >
              🚀 Bắt đầu Quét (5 Bước)
            </button>
          )}

          {isProcessStarted && (
            <button
              onClick={handleCaptureStep}
              style={styles.btnCapture}
              disabled={isSubmitting}
            >
              {isSubmitting ? '⏳ Đang gửi...' : `📸 Chụp: ${currentPose.label}`}
            </button>
          )}
        </div>

      </div>

      <CreateCollectionModal
        isOpen={isCollectionModalOpen} onClose={() => setIsCollectionModalOpen(false)} onSuccess={setCollectionName}
      />
    </div>
  );
};

// --- STYLES ---
const styles = {
  pageContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f3f4f6', fontFamily: 'Inter, sans-serif' },
  card: { background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '100%', maxWidth: '500px' },
  inputGroup: { marginBottom: '15px' },
  row: { display: 'flex', gap: '10px', marginBottom: '15px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#4b5563', marginBottom: '5px' },
  input: { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box' as const },
  select: { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', background: 'white' },
  btnSmall: { padding: '0 15px', borderRadius: '8px', border: '1px solid #d1d5db', cursor: 'pointer', background: '#f9fafb', fontSize: '18px' },

  previewArea: { position: 'relative' as const, width: '100%', height: '350px', background: '#000', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' },
  media: { width: '100%', height: '100%', objectFit: 'cover' as const, transform: 'scaleX(-1)' },
  placeholder: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '10px', color: 'white' },

  guideOverlay: {
    position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0,
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.2)', // Giảm độ mờ để thấy mặt rõ hơn
    color: 'white', pointerEvents: 'none' as const
  },
  guideIcon: { fontSize: '80px', fontWeight: 'bold', textShadow: '0 2px 10px rgba(0,0,0,0.5)', opacity: 0.9 },
  guideText: { fontSize: '24px', fontWeight: 'bold', marginTop: '10px', textShadow: '0 2px 5px black', display: 'flex', alignItems: 'center', gap: '10px' },
  guideSubText: { fontSize: '14px', opacity: 1, marginTop: '5px', textShadow: '0 1px 3px black', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: '4px' },

  progressContainer: { position: 'absolute' as const, bottom: '20px', display: 'flex', gap: '8px' },
  progressDot: { width: '10px', height: '10px', borderRadius: '50%', transition: 'all 0.3s' },

  msgError: { background: '#fee2e2', color: '#dc2626', padding: '10px', borderRadius: '8px', fontSize: '14px', textAlign: 'center' as const, marginBottom: '10px' },
  msgSuccess: { background: '#dcfce7', color: '#16a34a', padding: '10px', borderRadius: '8px', fontSize: '14px', textAlign: 'center' as const, marginBottom: '10px' },

  btnPrimary: { padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 'bold', cursor: 'pointer' },
  btnRegister: { width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: '#10b981', color: 'white', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' },
  btnCapture: { width: '100%', padding: '15px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.4)' },
};

export default FaceRegistration;