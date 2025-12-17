import sqlite3
import json  # <--- Quan trọng: Cần import thư viện này
from typing import List, Optional
from database.db import get_connection
from models.instance import VastInstance

class InstanceRepository:
    def _map_row_to_model(self, row) -> VastInstance:
        # Xử lý an toàn: Nếu DB trả về None hoặc rỗng thì gán dict rỗng
        mapping_data = {}
        if row["port_mappings"]:
            try:
                mapping_data = json.loads(row["port_mappings"])
            except:
                mapping_data = {}

        return VastInstance(
            instance_id=row["instance_id"],
            ip_address=row["ip_address"],
            port=row["port"],
            port_mappings=mapping_data, # <--- Convert từ String JSON sang Dict
            kafka_topics=row["kafka_topics"],
            cameras=row["cameras"],
            status=row["status"]
        )

    def get_all(self) -> List[VastInstance]:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM instances")
        rows = cursor.fetchall()
        conn.close()
        return [self._map_row_to_model(row) for row in rows]

    def save(self, data: VastInstance) -> VastInstance:
        conn = get_connection()
        cursor = conn.cursor()
        
        # --- SỬA LỖI TẠI ĐÂY ---
        # Chuyển đổi Dict sang String JSON trước khi lưu
        port_mappings_json = json.dumps(data.port_mappings) if data.port_mappings else "{}"
        
        # Cập nhật câu SQL thêm cột port_mappings
        query = """
        INSERT OR REPLACE INTO instances 
        (instance_id, ip_address, port, port_mappings, kafka_topics, cameras, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        
        cursor.execute(query, (
            data.instance_id, 
            data.ip_address, 
            data.port,
            port_mappings_json, # <--- Lưu String, không lưu Dict
            data.kafka_topics, 
            data.cameras,      
            data.status
        ))
        
        conn.commit()
        conn.close()
        return data

    def update(self, instance_id: str, data: VastInstance) -> VastInstance:
        conn = get_connection()
        cursor = conn.cursor()
        
        # --- SỬA LỖI TẠI ĐÂY ---
        port_mappings_json = json.dumps(data.port_mappings) if data.port_mappings else "{}"
        
        query = """
        UPDATE instances 
        SET ip_address = ?, 
            port = ?, 
            port_mappings = ?,
            kafka_topics = ?, 
            cameras = ?, 
            status = ?
        WHERE instance_id = ?
        """
        
        cursor.execute(query, (
            data.ip_address, 
            data.port,
            port_mappings_json, # <--- Lưu String
            data.kafka_topics, 
            data.cameras,      
            data.status,
            instance_id
        ))
        
        conn.commit()
        conn.close()
        return data

    def delete(self, instance_id: str):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM instances WHERE instance_id = ?", (instance_id,))
        conn.commit()
        conn.close()
        return True

instance_repo = InstanceRepository()