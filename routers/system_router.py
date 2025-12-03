from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.system_service import SystemService

router = APIRouter(prefix="/api/system", tags=["System"])
sys_service = SystemService()

class ToggleRequest(BaseModel):
    enable: bool # True = Bật, False = Tắt

@router.post("/kafka/toggle")
def toggle_kafka(req: ToggleRequest):
    try:
        msg = sys_service.toggle_kafka(req.enable)
        return {
            "message": msg,
            "target_state": "running" if req.enable else "stopped"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/kafka/status")
def get_kafka_status():
    """
    API để Frontend biết nút bấm nên hiện màu Xanh (On) hay Đỏ (Off)
    """
    return sys_service.get_kafka_status()