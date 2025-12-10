import subprocess
import os
import json

DB_FILE = "data/cameras.json"
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

    def _has_running_cameras(self):
        if not os.path.exists(DB_FILE):
            return False
        
        try:
            with open(DB_FILE, 'r') as f:
                data = json.load(f)
                # Duyệt qua tất cả camera
                for cam in data.values():
                    # Nếu thấy bất kỳ ông nào đang running -> Báo động
                    if cam.get("status") == "running":
                        return True, cam.get("camera_id") # Trả về luôn tên cam đang chạy
            return False, None
        except Exception as e:
            print(f"Error reading DB: {e}")
            return False, None

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
            has_running, cam_id = self._has_running_cameras()
            if has_running:
                # Ném lỗi ValueError để Router bắt và trả về 409
                raise ValueError(f"Cannot stop Kafka! Camera '{cam_id}' is still running. Please stop all cameras first.")

            print("Stopping Kafka System...")
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