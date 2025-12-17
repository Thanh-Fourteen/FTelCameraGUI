from typing import List
from models.instance import VastInstance
from repositories.instance_repo import InstanceRepository

class InstanceService:
    # Service sẽ gọi Repository
    def __init__(self):
        self.repo = InstanceRepository()

    def get_all_nodes(self) -> List[VastInstance]:
        # Ở đây có thể thêm logic: filter, sort, v.v...
        return self.repo.get_all()

    def register_node(self, data: VastInstance) -> VastInstance:
        # Ví dụ logic nghiệp vụ: Tự động set status là "online" trước khi lưu
        data.status = "online" 
        return self.repo.save(data)

    def remove_node(self, instance_id: str) -> bool:
        return self.repo.delete(instance_id)

# Tạo một instance (singleton) để các Router dùng chung
instance_service = InstanceService()