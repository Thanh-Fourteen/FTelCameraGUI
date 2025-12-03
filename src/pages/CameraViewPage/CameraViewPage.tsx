import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CameraView from '../../components/camera/CameraView/CameraView';
import { cameraService } from '../../services/cameraService';
import type { Camera } from '../../types/camera';

const CameraViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // Lấy ID từ URL
  const navigate = useNavigate();
  
  const [camera, setCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchCameraDetail = async () => {
      try {
        setLoading(true);
        // CÁCH 1: Nếu Backend có API get detail (Tốt nhất)
        // const data = await cameraService.getById(id);
        
        // CÁCH 2: Nếu chưa có, ta gọi getAll rồi lọc (Tạm thời)
        const all = await cameraService.getAll();
        const found = all.find((c: any) => c.camera_id === id);
        
        if (found) {
           // Map data cho khớp type Camera
           const mappedCam: Camera = {
              ...found,
              id: found.camera_id,
              name: found.camera_id,
              isLive: found.status === 'running',
           };
           setCamera(mappedCam);
        } else {
           alert("Camera not found!");
           navigate('/camera'); // Quay về trang chủ nếu không thấy
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchCameraDetail();
  }, [id, navigate]);

  if (loading) return <div style={{color:'black', padding: 20}}>Loading camera info...</div>;
  if (!camera) return null;

  return (
    // Reuse component CameraView cũ
    // Sửa hàm onBack để nó dùng navigate của router
    <CameraView 
      camera={camera} 
      onBack={() => navigate('/camera')} 
    />
  );
};

export default CameraViewPage;