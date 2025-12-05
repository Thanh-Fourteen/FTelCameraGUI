import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import CreateCollectionModal from '../../components/face/CollectionModal/CreateCollectionModal';

// --- API CONFIG ---
// const API_DB_BASE = 'https://fra.doca.love'; 
// const API_COLLECTION_BASE = 'https://vec.doca.love/v1'; // Hoặc /det-api tùy bạn cấu hình
const API_DB_BASE = '/fra-api'
const API_COLLECTION_BASE = '/vec-api'

// --- CẤU HÌNH 5 GÓC CHỤP ---
const CAPTURE_STEPS = [
  { id: 'front', label: 'Nhìn Thẳng', icon: '😐', arrow: '•', hint: 'Giữ khuôn mặt chính diện' },
  { id: 'left', label: 'Quay Trái', icon: '👈', arrow: '←', hint: 'Quay mặt nhẹ sang trái' },
  { id: 'right', label: 'Quay Phải', icon: '👉', arrow: '→', hint: 'Quay mặt nhẹ sang phải' },
  { id: 'up', label: 'Ngước Lên', icon: '☝️', arrow: '↑', hint: 'Ngước cằm lên một chút' },
  { id: 'down', label: 'Cúi Xuống', icon: '👇', arrow: '↓', hint: 'Cúi nhẹ đầu xuống' },
];

// Key lưu trạng thái camera
const CAM_STATE_KEY = 'FACE_REG_CAM_ACTIVE';

const FaceRegistration: React.FC = () => {
  // --- STATE ---
  const [collectionName, setCollectionName] = useState('');
  const [userName, setUserName] = useState('');
  const [userType, setUserType] = useState('Staff');
  const [availableCollections, setAvailableCollections] = useState<string[]>([]);

  // State UI
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); 
  const [isProcessStarted, setIsProcessStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // --- 1. KHỞI TẠO & CHECK TRẠNG THÁI CŨ ---
  useEffect(() => {
    // 1.1 Load Collections
    const fetchCollections = async () => {
      try {
        const res = await axios.get(`${API_COLLECTION_BASE}/collections`);
        const data = res.data;
        if (data.data && Array.isArray(data.data)) setAvailableCollections(data.data);
        else if (Array.isArray(data)) setAvailableCollections(data);
        else if (data.collections) setAvailableCollections(data.collections);
      } catch (err) {
        console.error("Fetch collections failed", err);
      }
    };
    fetchCollections();

    // 1.2 Check LocalStorage để tự bật Cam
    const savedState = localStorage.getItem(CAM_STATE_KEY);
    if (savedState === 'true') {
        startCamera();
    }
  }, []);

  // --- 2. CAMERA CONTROL ---
  const startCamera = async () => {
    setError(''); 
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      streamRef.current = stream;
      setIsCameraOpen(true);
      // Lưu trạng thái ON
      localStorage.setItem(CAM_STATE_KEY, 'true');
    } catch (err) {
      setError('Không thể mở camera. Kiểm tra quyền truy cập!');
      setIsCameraOpen(false);
      localStorage.setItem(CAM_STATE_KEY, 'false');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setIsProcessStarted(false);
    setCurrentStep(0);
    // Lưu trạng thái OFF
    localStorage.setItem(CAM_STATE_KEY, 'false');
  };

  const toggleCamera = () => {
      if (isCameraOpen) stopCamera();
      else startCamera();
  };

  // Cleanup khi rời trang (Chỉ tắt phần cứng, không đổi localStorage)
  useEffect(() => {
    return () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
    };
  }, []);

  // Gán stream vào video tag khi bật
  useEffect(() => {
    if (isCameraOpen && videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(console.error);
    }
  }, [isCameraOpen]);

  // --- HELPER & ACTIONS ---
  const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  };

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
        return canvas.toDataURL('image/jpeg', 0.9);
      }
    }
    return null;
  }, []);

  const handleStartProcess = () => {
    if (!userName || !collectionName) {
      setError("Vui lòng nhập đầy đủ thông tin trước!");
      return;
    }
    setError(''); setMessage('');
    setIsProcessStarted(true);
    setCurrentStep(0);
  };

  const handleCaptureStep = async () => {
    const frame = captureFrame();
    if (!frame) return;
    setIsSubmitting(true); setError('');

    try {
      const formData = new FormData();
      formData.append('collection_name', collectionName);
      formData.append('personal_name', userName);
      formData.append('personal_type', userType);
      const blob = dataURLtoBlob(frame);
      formData.append('image_file', blob, `pose_${CAPTURE_STEPS[currentStep].id}.jpg`);

      const response = await axios.post(`${API_DB_BASE}/register`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.status === 200) {
        if (currentStep < CAPTURE_STEPS.length - 1) {
          setMessage(`✅ Xong bước ${currentStep + 1}/5! Tiếp tục...`);
          setTimeout(() => { setMessage(''); setCurrentStep(prev => prev + 1); }, 500);
        } else {
          setMessage(`🎉 Đăng ký thành công!`);
          setIsProcessStarted(false);
          // Không tự tắt cam, giữ nguyên theo ý người dùng
        }
      }
    } catch (err: any) {
      if (err.response?.status === 422) setError("⚠️ Không thấy mặt! Thử lại.");
      else setError("❌ Lỗi Server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPose = CAPTURE_STEPS[currentStep];

  // --- RENDER ---
  return (
    <div style={styles.pageContainer}>
      <div style={styles.card}>
        
        {/* HEADER: Tiêu đề + Toggle Switch */}
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
            <h2 style={{ color: '#1f2937', margin: 0 }}>Face Registration</h2>
            
            {/* TOGGLE CAMERA */}
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <span style={{fontSize: '14px', color: isCameraOpen ? '#10b981' : '#6b7280', fontWeight: '600'}}>
                    {isCameraOpen ? 'Camera ON' : 'Camera OFF'}
                </span>
                <label className="switch" style={styles.switch}>
                    <input type="checkbox" checked={isCameraOpen} onChange={toggleCamera} style={{opacity: 0, width: 0, height: 0}} />
                    <span style={{
                        ...styles.slider, 
                        backgroundColor: isCameraOpen ? '#10b981' : '#ccc',
                    }}>
                        <span style={{
                            ...styles.sliderBefore,
                            transform: isCameraOpen ? 'translateX(20px)' : 'translateX(0)'
                        }} />
                    </span>
                </label>
            </div>
        </div>

        {/* INPUT FORM */}
        <div style={{ opacity: isProcessStarted ? 0.5 : 1, pointerEvents: isProcessStarted ? 'none' : 'auto' }}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Collection</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input list="collection-options" style={styles.input} value={collectionName} onChange={e => setCollectionName(e.target.value)} placeholder="Type..." />
              <datalist id="collection-options">
                {availableCollections.map((col, idx) => <option key={idx} value={col} />)}
              </datalist>
              {/* <button style={styles.btnSmall} onClick={() => setIsCollectionModalOpen(true)}>+</button> */}
            </div>
          </div>
          <div style={styles.row}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Full name</label>
              <input style={styles.input} value={userName} onChange={e => setUserName(e.target.value)} placeholder="Enter name..." />
            </div>
            <div style={{ width: '140px' }}>
              <label style={styles.label}>Position</label>
              <input list="position-options" style={styles.input} value={userType} onChange={e => setUserType(e.target.value)} placeholder="Type..." />
              <datalist id="position-options">
                <option value="Staff" /><option value="Manager" /><option value="VIP" /><option value="Guest" /><option value="Security" />
              </datalist>
            </div>
          </div>
        </div>

        {/* CAMERA AREA */}
        <div style={styles.previewArea}>
          {!isCameraOpen ? (
            <div style={styles.placeholder}>
              <div style={{ fontSize: '50px', opacity: 0.3 }}>📷</div>
              <p style={{color: '#9ca3af'}}>Camera is turned off</p>
            </div>
          ) : (
            <>
              <video ref={videoRef} style={styles.media} autoPlay playsInline muted />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              {isProcessStarted && (
                <div style={styles.guideOverlay}>
                  <div style={styles.guideIcon}>{currentPose.arrow}</div>
                  <div style={styles.guideText}>
                    <span>{currentPose.icon}</span> <span>{currentPose.label}</span>
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
            <button onClick={handleStartProcess} style={styles.btnRegister} disabled={!userName || !collectionName}>
              🚀 Bắt đầu Quét (5 Bước)
            </button>
          )}
          {isProcessStarted && (
            <button onClick={handleCaptureStep} style={styles.btnCapture} disabled={isSubmitting}>
              {isSubmitting ? '⏳ Sending...' : `📸 Capture: ${currentPose.label}`}
            </button>
          )}
        </div>
      </div>

      <CreateCollectionModal isOpen={isCollectionModalOpen} onClose={() => setIsCollectionModalOpen(false)} onSuccess={setCollectionName} />
    </div>
  );
};

// --- STYLES ---
const styles: {[key: string]: React.CSSProperties} = {
  pageContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f3f4f6', fontFamily: 'Inter, sans-serif' },
  card: { background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '100%', maxWidth: '500px' },
  
  switch: { position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' },
  slider: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, transition: '.4s', borderRadius: '34px' },
  sliderBefore: { position: 'absolute', content: '""', height: '18px', width: '18px', left: '3px', bottom: '3px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' },

  inputGroup: { marginBottom: '15px' },
  row: { display: 'flex', gap: '10px', marginBottom: '15px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#4b5563', marginBottom: '5px' },
  input: { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box' },
  btnSmall: { padding: '0 15px', borderRadius: '8px', border: '1px solid #d1d5db', cursor: 'pointer', background: '#f9fafb', fontSize: '18px', fontWeight: 'bold' },
  
  previewArea: { position: 'relative', width: '100%', height: '350px', background: '#e5e7eb', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' },
  media: { width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' },
  placeholder: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: 'white' },
  
  guideOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', color: 'white', pointerEvents: 'none' },
  guideIcon: { fontSize: '80px', fontWeight: 'bold', textShadow: '0 2px 10px rgba(0,0,0,0.5)', opacity: 0.9 },
  guideText: { fontSize: '24px', fontWeight: 'bold', marginTop: '10px', textShadow: '0 2px 5px black', display: 'flex', alignItems: 'center', gap: '10px' },
  guideSubText: { fontSize: '14px', opacity: 1, marginTop: '5px', textShadow: '0 1px 3px black', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: '4px' },
  progressContainer: { position: 'absolute', bottom: '20px', display: 'flex', gap: '8px' },
  progressDot: { width: '10px', height: '10px', borderRadius: '50%', transition: 'all 0.3s' },

  msgError: { background: '#fee2e2', color: '#dc2626', padding: '10px', borderRadius: '8px', fontSize: '14px', textAlign: 'center', marginBottom: '10px' },
  msgSuccess: { background: '#dcfce7', color: '#16a34a', padding: '10px', borderRadius: '8px', fontSize: '14px', textAlign: 'center', marginBottom: '10px' },
  
  btnRegister: { width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: '#10b981', color: 'white', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' },
  btnCapture: { width: '100%', padding: '15px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' },
};

export default FaceRegistration;