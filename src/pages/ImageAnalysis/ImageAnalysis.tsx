import React, { useState } from 'react';
import axios from 'axios';

// --- API CONFIG ---
// Lưu ý: Dùng đường dẫn tương đối nếu đã có Proxy, hoặc tuyệt đối nếu chưa
const API_DETECT_URL = 'http://192.168.2.130:8000/detect'; 
const API_RECOGNIZE_URL = 'http://192.168.2.130:8000/recognition'; 

type TaskType = 'detect' | 'recognize';

const ImageAnalysisPage: React.FC = () => {
  // --- STATE ---
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentTask, setCurrentTask] = useState<TaskType | null>(null); // Để biết đang chạy cái nào

  // --- HANDLER UPLOAD ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      // Reset trạng thái
      setProcessedImage(null);
      setError('');
      setCurrentTask(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- HANDLER GỌI API (Chung cho cả Detect và Recognition) ---
  const handleProcess = async (task: TaskType) => {
    if (!originalImage) return;

    setIsLoading(true);
    setError('');
    setCurrentTask(task);
    setProcessedImage(null); // Xóa kết quả cũ nếu có

    // Tách raw base64
    const rawBase64 = originalImage.includes(',') 
        ? originalImage.split(',')[1] 
        : originalImage;

    // Chọn URL dựa trên task
    const url = task === 'detect' ? API_DETECT_URL : API_RECOGNIZE_URL;

    try {
      const response = await axios.post(url, { image: rawBase64 });
      const resultData = response.data;

      // Lấy chuỗi base64 từ response (Backend có thể trả về key khác nhau, ta check hết)
      // Thường là result_image hoặc image
      let resultString = resultData.result_image || resultData.image || resultData;

      if (typeof resultString === 'string') {
        // Thêm header nếu thiếu
        const displayImage = resultString.startsWith('data:image')
          ? resultString
          : `data:image/jpeg;base64,${resultString}`;
        
        setProcessedImage(displayImage);
      } else {
        setError('Dữ liệu trả về không đúng định dạng ảnh.');
      }

    } catch (err: any) {
      console.error("API Error:", err);
      const msg = err.response?.data?.detail || 'Lỗi xử lý. Vui lòng thử lại.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    setError('');
    setCurrentTask(null);
  };

  // --- RENDER ---
  return (
    <div style={styles.pageContainer}>
      <div style={styles.card}>
        <h2 style={{ color: '#1f2937', marginBottom: '20px' }}>AI Image Analysis</h2>

        {/* DISPLAY AREA */}
        <div style={styles.displayArea}>
          {isLoading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner}></div>
              <p>Đang xử lý {currentTask === 'detect' ? 'Detection' : 'Recognition'}...</p>
            </div>
          ) : processedImage ? (
            <img src={processedImage} alt="Result" style={styles.image} />
          ) : originalImage ? (
            <img src={originalImage} alt="Original" style={styles.image} />
          ) : (
            <div style={styles.placeholder}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>🖼️</div>
              <p>Chọn ảnh để bắt đầu</p>
            </div>
          )}
        </div>

        {error && <div style={styles.errorMsg}>{error}</div>}

        {/* CONTROLS */}
        <div style={styles.controls}>
          {!originalImage ? (
            // 1. Chưa có ảnh -> Hiện nút Upload
            <label style={styles.uploadBtn}>
              📂 Tải ảnh lên
              <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          ) : (
            // 2. Đã có ảnh -> Hiện các nút chức năng
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
              
              {/* Hàng nút chức năng AI (Chỉ hiện khi KHÔNG loading) */}
              {!isLoading && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => handleProcess('detect')} 
                    style={{...styles.btnAction, backgroundColor: '#3b82f6'}}
                  >
                    📦 Detect Objects
                  </button>
                  
                  <button 
                    onClick={() => handleProcess('recognize')} 
                    style={{...styles.btnAction, backgroundColor: '#10b981'}}
                  >
                    👤 Recognize Faces
                  </button>
                </div>
              )}

              {/* Hàng nút phụ (Upload khác / Xóa) */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <label style={{...styles.uploadBtn, backgroundColor: '#6b7280', padding: '8px 16px', fontSize: '14px'}}>
                  📸 Ảnh khác
                  <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
                <button onClick={handleReset} style={{...styles.btnReset, padding: '8px 16px', fontSize: '14px'}}>
                  🗑️ Xóa
                </button>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
};

// --- STYLES ---
const styles = {
  pageContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f3f4f6', fontFamily: 'Inter, sans-serif' },
  card: { backgroundColor: '#fff', width: '100%', maxWidth: '640px', padding: '32px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', textAlign: 'center' as const },
  displayArea: { width: '100%', height: '400px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '2px dashed #e5e7eb', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', position: 'relative' as const },
  image: { width: '100%', height: '100%', objectFit: 'contain' as const },
  placeholder: { color: '#9ca3af', display: 'flex', flexDirection: 'column' as const, alignItems: 'center' },
  loadingState: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', color: '#6b7280' },
  spinner: { width: '40px', height: '40px', border: '4px solid #e5e7eb', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '12px' },
  controls: { marginTop: '10px' },
  uploadBtn: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#6366f1', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '16px', boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.2)', transition: 'transform 0.1s' },
  btnAction: { padding: '12px 24px', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '15px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', transition: 'transform 0.1s' },
  btnReset: { backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.2)' },
  errorMsg: { backgroundColor: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }
};

const styleSheet = document.createElement("style");
styleSheet.innerText = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
document.head.appendChild(styleSheet);

export default ImageAnalysisPage;