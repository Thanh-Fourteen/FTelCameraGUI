from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class CameraSettings(BaseModel):
    # Các setting cơ bản logic
    modules: List[str] = []  
    polygon: Optional[List[List[int]]] = None 
    
    # --- DYNAMIC CONFIG ---
    # Cấu trúc: { "module_name": { "ENV_VAR": "VALUE", ... } }
    # Ví dụ: { "viewer_service": { "PLOT": "face", "FPS": 60 }, "pythera_detection": { "THRESHOLD": 0.8 } }
    config: Dict[str, Dict[str, Any]] = {} 

class CameraCreate(BaseModel):
    camera_id: str
    rtsp_url: str
    ws_port: int             
    settings: CameraSettings

class CameraUpdate(BaseModel):
    rtsp_url: Optional[str] = None
    ws_port: Optional[int] = None
    settings: Optional[CameraSettings] = None

class CameraResponse(CameraCreate):
    status: str = "stopped" 
    output_topic: str = ""