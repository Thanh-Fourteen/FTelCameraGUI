from pydantic import BaseModel
from typing import Dict, List, Optional

class VastInstance(BaseModel):
    instance_id: str
    # name: str
    ip_address: str
    port: int          # Port cho REST API (để chỉnh sửa property cam)
    kafka_topics: str  # Lưu dạng chuỗi, ví dụ: "topic1,topic2" (vì SQLite không lưu List)
    port_mappings: Optional[Dict[str, int]] = {}
    cameras: str       # Lưu danh sách ID camera, ví dụ: "cam1,cam2"
    status: str = "online"