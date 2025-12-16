import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.camera_service import CameraService
from services.system_service import SystemService

router = APIRouter(tags=["Realtime Status"])
cam_service = CameraService()
sys_service = SystemService() # Để lấy cả status Kafka nếu muốn

def get_realtime_status():
    cameras = cam_service.sync_realtime_status()
    kafka_status = sys_service.get_kafka_status()

    return {
        "system": {
            "kafka": kafka_status
        },
        "cameras": cameras
    }

@router.get("/api/status", tags=["Realtime Status"])
def get_status():
    """
    HTTP API dùng cho:
    - Load trang lần đầu
    - Debug
    - Health check
    """
    return get_realtime_status()

@router.get("/ws/status", tags=["Realtime Status"])
def ws_info():
    return {
        "url": "ws://<host>/ws/status",
        "description": "Realtime system + camera status via WebSocket"
    }

@router.websocket("/ws/status")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            payload = get_realtime_status()
            await websocket.send_json(payload)
            await asyncio.sleep(2)

    except WebSocketDisconnect:
        print("Client disconnected from Status WebSocket")
    except Exception as e:
        print(f"WebSocket Error: {e}")
        try:
            await websocket.close()
        except:
            pass