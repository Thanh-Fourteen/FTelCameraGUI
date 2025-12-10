import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.camera_service import CameraService
from services.system_service import SystemService

router = APIRouter(tags=["Realtime Status"])
cam_service = CameraService()
sys_service = SystemService() # Để lấy cả status Kafka nếu muốn

@router.websocket("/ws/status")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # 1. Thực hiện đồng bộ hóa trạng thái (Check docker -> Update DB)
            cameras = cam_service.sync_realtime_status()
            
            # 2. Lấy status Kafka (Optional - để hiển thị luôn)
            kafka_status = sys_service.get_kafka_status()
            
            # 3. Đóng gói dữ liệu
            payload = {
                "system": {
                    "kafka": kafka_status
                },
                "cameras": cameras
            }
            
            # 4. Gửi về Frontend
            await websocket.send_json(payload)
            
            # 5. Nghỉ 2 giây rồi lặp lại (Tránh spam CPU)
            await asyncio.sleep(2)
            
    except WebSocketDisconnect:
        print("Client disconnected from Status WebSocket")
    except Exception as e:
        print(f"WebSocket Error: {e}")
        try:
            await websocket.close()
        except:
            pass