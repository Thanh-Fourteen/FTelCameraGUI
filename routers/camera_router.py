from fastapi import APIRouter, HTTPException
from models.camera_model import CameraCreate, CameraUpdate, CameraResponse
from services.camera_service import CameraService

router = APIRouter(prefix="/api/cameras", tags=["Cameras"])
cam_service = CameraService()

@router.post("/")
def create_camera(camera: CameraCreate):
    # Chỉ tạo config, KHÔNG chạy docker
    try:
        return cam_service.create_camera(camera)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{cam_id}")
def update_camera(cam_id: str, update: CameraUpdate):
    # Sửa setting và tạo lại config file
    try:
        return cam_service.update_camera(cam_id, update)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{cam_id}/start")
def start_camera(cam_id: str):
    # Lúc này mới chạy Docker
    try:
        return cam_service.start_camera(cam_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{cam_id}/stop")
def stop_camera(cam_id: str):
    try:
        return cam_service.stop_camera(cam_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{cam_id}")
def delete_camera(cam_id: str):
    if cam_service.delete_camera(cam_id):
        return {"message": "Camera deleted and resources cleaned up"}
    raise HTTPException(status_code=404, detail="Camera not found")

@router.get("/")
def list_cameras():
    return cam_service.get_all_cameras()

@router.get("/{cam_id}", response_model=CameraResponse)
def get_camera_detail(cam_id: str):
    """
    API dùng cho trang Edit Setting: Lấy thông tin chi tiết 1 camera
    """
    cam = cam_service.get_camera(cam_id)
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    return cam