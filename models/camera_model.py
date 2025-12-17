from pydantic import BaseModel, Field
from typing import Optional

class CameraCreate(BaseModel):
    cam_id: str
    rtsp_url: str
    ai_module: str = "yolo_v8"
    
    # Cấu hình Port
    internal_port: int = 5551      # Port để chạy Docker nội bộ
    public_port: int               # Port Vast.ai cấp (User nhập tay)
    
    # Cấu hình khác
    fps: int = 25
    kafka_topic: str = "general"   # Gửi data về topic nào

class CameraResponse(CameraCreate):
    status: str = "stopped"        # running / stopped
    stream_url: Optional[str] = None # URL đầy đủ để FE play luôn