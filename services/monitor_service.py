import asyncio
import httpx # Dùng cái này thay cho websockets
import time
import json
from typing import Dict

# Kho chứa dữ liệu realtime
realtime_data_store: Dict[str, dict] = {}

class MonitorService:
    def __init__(self):
        self.active_connections = {}

    # Hàm này sẽ chạy ngầm, cứ 2s gọi HTTP GET một lần
    async def poll_status_loop(self, instance_id: str, status_url: str):
        print(f"📡 Bắt đầu theo dõi {instance_id} qua {status_url}...")
        
        async with httpx.AsyncClient(timeout=3.0) as client:
            while True:
                try:
                    response = await client.get(status_url)
                    
                    if response.status_code == 200:
                        data = response.json()
                        
                        # # --- ĐOẠN CODE IN RA TERMINAL ĐỂ DEBUG ---
                        # print(f"\n✅ [DEBUG] Dữ liệu từ {instance_id}:")
                        # print(json.dumps(data, indent=2, ensure_ascii=False)) 
                        # print("-" * 50) 
                        # ------------------------------------------

                        data["last_updated"] = time.time()
                        data["status"] = "online"
                        realtime_data_store[instance_id] = data
                        
                    else:
                        # In lỗi nếu status code không phải 200
                        print(f"⚠️ [DEBUG] {instance_id} lỗi: {response.status_code}")
                        print("Nội dung lỗi:", response.text) # Xem server trả về gì
                        
                        self._mark_offline(instance_id, f"HTTP {response.status_code}")

                except httpx.ConnectError:
                    print(f"❌ [DEBUG] Không kết nối được tới {status_url} (Máy tắt?)")
                    self._mark_offline(instance_id, "Connection refused")
                except Exception as e:
                    print(f"❌ [DEBUG] Lỗi lạ: {str(e)}")
                    self._mark_offline(instance_id, str(e))
                
                await asyncio.sleep(2)

    def _mark_offline(self, instance_id: str, error_msg: str):
        realtime_data_store[instance_id] = {
            "system": {"error": error_msg},
            "cameras": [],
            "status": "offline",
            "last_updated": time.time()
        }

    def start_monitoring_task(self, instance_id: str, ip: str, port: int):
        # Kiểm tra xem task đã chạy chưa
        if instance_id in self.active_connections:
            return

        # Dùng HTTP Polling (như chúng ta đã chốt ở bước trước)
        # Port này là Port API (ví dụ 8000)
        status_url = f"http://{ip}:{port}/ws/status" 
        
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        task = loop.create_task(self.poll_status_loop(instance_id, status_url))
        self.active_connections[instance_id] = task
        
monitor_service = MonitorService()