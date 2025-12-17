from fastapi import APIRouter, HTTPException, Query

from models.instance import VastInstance
from services.instance_service import instance_service
from services.monitor_service import monitor_service, realtime_data_store

router = APIRouter()

@router.get("/", response_model=list[VastInstance])
def get_list():
    return instance_service.get_all_nodes()

@router.post("/register", response_model=VastInstance)
# SỬA Ở ĐÂY: Thêm 'async'
@router.post("/register", response_model=VastInstance)
async def register(data: VastInstance):
    # Lưu vào DB
    saved_node = instance_service.register_node(data)
    
    # Kích hoạt Monitor (Chỉ truyền IP và PORT API)
    monitor_service.start_monitoring_task(
        saved_node.instance_id, 
        saved_node.ip_address, 
        saved_node.port
    )
    
    return saved_node

@router.get("/status/realtime")
def get_realtime_status():
    """
    Frontend gọi API này mỗi 2-3 giây để cập nhật giao diện.
    Dữ liệu lấy từ RAM nên cực nhanh.
    """
    return realtime_data_store

# 3. Lấy status của 1 máy cụ thể
@router.get("/{instance_id}/status")
def get_node_status(instance_id: str):
    return realtime_data_store.get(instance_id, {"status": "unknown"})

@router.delete("/{instance_id}")
def delete(instance_id: str):
    success = instance_service.remove_node(instance_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy Instance ID")
    
    return {"message": "Xóa thành công"}

@router.put("/{instance_id}", response_model=VastInstance)
def update_node(instance_id: str, data: VastInstance):
        # Có thể thêm logic kiểm tra tồn tại nếu muốn
        return instance_service.repo.update(instance_id, data)

@router.get("/filter", response_model=list[VastInstance])
def filter_nodes(kafka_topic: str = Query(..., description="Tên Kafka Topic cần tìm")):
    # Gọi xuống Repo tìm các máy đang chạy topic này
    # Bạn nên thêm hàm này vào Service -> Repo nhé (ở đây mình viết tắt gọi luôn Repo ví dụ)
    return instance_service.repo.find_by_kafka_topic(kafka_topic)

# 2. API trả về cấu hình kết nối đầy đủ cho FE (Quan trọng)
@router.get("/{instance_id}/connection-info")
def get_connection_info(instance_id: str):
    # Lấy thông tin máy
    instances = instance_service.get_all_nodes()
    target = next((x for x in instances if x.instance_id == instance_id), None)
    
    if not target:
        raise HTTPException(status_code=404, detail="Máy không tồn tại")
        
    # Trả về URL đã ghép sẵn cho FE dùng luôn
    return {
        "rest_api_url": f"http://{target.ip_address}:{target.port}",
        "websocket_url": f"ws://{target.ip_address}:{target.ws_port}/ws",
        "cameras": target.cameras.split(","), # Tách chuỗi thành mảng cho FE dễ dùng
        "kafka_topics": target.kafka_topics.split(",")
    }