import subprocess
import os

class SystemService:
    def __init__(self):
        # Đường dẫn tới file docker compose của kafka
        self.compose_file = "kafka/docker-compose.kafka.yml"
        
        # Tên container để check status (Khớp với file yaml của bạn)
        self.kafka_container_name = "kafka-broker"
        self.zookeeper_container_name = "kafka-zookeeper"

    def _run_compose_cmd(self, action, ignore_error=False):
        """
        Chạy lệnh docker compose tác động lên file kafka
        action: 'up -d', 'down -v', ...
        ignore_error: Nếu True thì lỗi sẽ chỉ in ra warning chứ không return False
        """
        if not os.path.exists(self.compose_file):
            return False, f"File not found: {self.compose_file}"

        try:
            # Command: docker compose -f kafka/docker-compose.kafka.yml [action]
            cmd = ["docker", "compose", "-f", self.compose_file] + action.split()

            print(cmd)
            # capture_output=True để ẩn log rác, check=True để raise lỗi nếu thất bại
            subprocess.run(cmd, check=True, capture_output=True)
            return True, "Success"
        
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr.decode().strip() if e.stderr else str(e)
            if ignore_error:
                print(f"Warning (Safe to ignore): {error_msg}")
                return True, "Ignored" # Coi như thành công để chạy tiếp
            else:
                print(f"Docker Error: {error_msg}")
                return False, error_msg

    def is_running(self, container_name):
        """Kiểm tra container có đang chạy không"""
        try:
            cmd = ["docker", "inspect", "-f", "{{.State.Running}}", container_name]
            result = subprocess.run(cmd, capture_output=True, text=True)
            return result.stdout.strip() == "true"
        except Exception:
            return False

    def toggle_kafka(self, turn_on: bool):
        """
        True = Bật (Clean Start: Down -v trước -> Up -d)
        False = Tắt (Down -v)
        """
        if turn_on:
            print("Preparing to Start Kafka System...")
            
            # BƯỚC 1: Dọn dẹp trước (Clean up)
            # ignore_error=True vì nếu chưa có gì chạy thì lệnh down có thể báo warning
            print("-> Cleaning up old instance...")
            self._run_compose_cmd("down -v", ignore_error=True)
            
            # BƯỚC 2: Chạy mới (Start)
            print("-> Starting new instance...")
            success, msg = self._run_compose_cmd("up -d")
            
            if success:
                return "Kafka System Started (Clean Mode)"
            else:
                raise Exception(f"Failed to start Kafka: {msg}")
        else:
            print("Stopping Kafka System...")
            
            # Tắt và xóa sạch volume
            success, msg = self._run_compose_cmd("down -v")
            
            if success:
                return "Kafka System Stopped and Cleaned"
            else:
                raise Exception(f"Failed to stop Kafka: {msg}")

    def get_kafka_status(self):
        kafka_on = self.is_running(self.kafka_container_name)
        zookeeper_on = self.is_running(self.zookeeper_container_name)
        
        status = "stopped"
        if kafka_on and zookeeper_on:
            status = "running"
        elif kafka_on or zookeeper_on:
            status = "partial"
            
        return {
            "status": status,
            "kafka": "running" if kafka_on else "stopped",
            "zookeeper": "running" if zookeeper_on else "stopped"
        }