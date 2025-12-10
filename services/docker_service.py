import subprocess
import yaml
import os
import shutil
import socket

DEPLOY_DIR = "deployments"

class DockerService:
    def ensure_dir(self, cam_id):
        path = os.path.join(DEPLOY_DIR, cam_id)
        os.makedirs(path, exist_ok=True)
        return path

    def is_port_in_use(self, port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('0.0.0.0', port)) == 0

    def generate_compose_file(self, cam_id, services):
        folder = self.ensure_dir(cam_id)
        # Tên file cố định là pipeline.yml cho mọi camera
        filepath = os.path.join(folder, "pipeline.yml")
        
        content = {
            "services": services,
            "networks": {
                "stream-kafka": {
                    "external": True,
                    "name": "ftelcamera_stream-kafka"
                }
            }
        }
        with open(filepath, 'w') as f:
            yaml.dump(content, f)
        return filepath

    def start_pipeline(self, cam_id):
        folder = os.path.join(DEPLOY_DIR, cam_id)
        filepath = os.path.join(folder, "pipeline.yml")
        
        if not os.path.exists(filepath):
            raise Exception("Configuration file not found. Please create/update camera first.")

        try:
            with open(filepath, 'r') as f:
                config = yaml.safe_load(f)
                viewer = config.get('services', {}).get('viewer_service', {})
                ports = viewer.get('ports', [])
                if ports:
                    host_port = int(str(ports[0]).split(':')[0])
                    if self.is_port_in_use(host_port):
                        raise ValueError(f"Port {host_port} is already in use by another application.")
        except ValueError as ve:
            raise ve # Ném tiếp ValueError ra ngoài
        except Exception as e:
            if "Port" in str(e) and "in use" in str(e): 
                raise e
            print(f"Warning skipping port check: {e}")

        project_name = f"cam_{cam_id.lower()}"

        try:
            print(f"Cleaning up resources for {cam_id}...")
            cmd_down = ["docker", "compose", "-p", project_name, "-f", filepath, "down", "-v"]
            subprocess.run(cmd_down, check=False) 
        except Exception as e:
            print(f"Warning during cleanup: {e}")

        # BƯỚC 2: Chạy mới (Start)
        try:
            print(f"starting up resources for {cam_id}...")
            cmd_up = ["docker", "compose", "-p", project_name, "-f", filepath, "up", "-d"]
            subprocess.run(cmd_up, check=True, capture_output=True, text=True)
            return True
            
        except subprocess.CalledProcessError as e:
            err_msg = e.stderr
            if "port is already allocated" in err_msg or "bind: address already in use" in err_msg:

                 raise ValueError(f"Start Failed: The WebSocket Port is already busy. Please change port.")
            

            raise RuntimeError(f"Docker Error: {err_msg}")
        
    def stop_pipeline(self, cam_id):
        folder = os.path.join(DEPLOY_DIR, cam_id)
        filepath = os.path.join(folder, "pipeline.yml")
        
        if os.path.exists(filepath):
            try:
                project_name = f"cam_{cam_id.lower()}"
                cmd = ["docker", "compose", "-p", project_name, "-f", filepath, "down", "-v"]
                subprocess.run(cmd, check=True)
            except Exception as e:
                print(f"Warning: Could not stop cleanly: {e}")

    def delete_deployment_folder(self, cam_id):
        folder = os.path.join(DEPLOY_DIR, cam_id)
        if os.path.exists(folder):
            try:
                shutil.rmtree(folder)
                return True
            except Exception as e:
                print(f"Error removing folder {folder}: {e}")
                return False
        return True

    def smart_update_pipeline(self, cam_id):
        """
        Chỉ cập nhật những container có thay đổi config.
        Nhanh hơn nhiều so với Stop -> Start lại từ đầu.
        """
        folder = os.path.join(DEPLOY_DIR, cam_id)
        filepath = os.path.join(folder, "pipeline.yml")
        
        if not os.path.exists(filepath):
            raise FileNotFoundError("Configuration file not found.")

        # Vẫn check port để an toàn
        # (Lưu ý: Nếu port không đổi thì docker sẽ không báo lỗi vì nó sẽ kill container cũ trả lại port)
        # Nên đoạn check port này có thể bỏ qua hoặc xử lý khéo léo hơn.
        # Ở đây ta cứ chạy lệnh up, Docker sẽ tự lo việc recreate container cũ.
        
        project_name = f"cam_{cam_id.lower()}"

        try:
            # Lệnh magic: up -d --remove-orphans
            # --remove-orphans: Nếu bạn bỏ bớt module (vd bỏ Face), nó tự kill container Face thừa.
            cmd_up = ["docker", "compose", "-p", project_name, "-f", filepath, "up", "-d", "--remove-orphans"]
            
            subprocess.run(cmd_up, check=True, capture_output=True, text=True)
            return True
            
        except subprocess.CalledProcessError as e:
            err_msg = e.stderr
            if "port is already allocated" in err_msg:
                 raise ValueError(f"Update Failed: Port conflict.")
            raise RuntimeError(f"Docker Update Error: {err_msg}")
    
    def get_running_viewer_ids(self):
        """
        Quét toàn bộ Docker để tìm xem Viewer của camera nào đang chạy.
        Trả về: Set các camera_id đang running thực tế.
        """
        try:
            # Lấy danh sách tên tất cả container đang chạy
            # Output dạng: viewer_service_cam1\nrtsp_reader_cam1...
            cmd = ["docker", "ps", "--format", "{{.Names}}"]
            result = subprocess.run(cmd, capture_output=True, text=True)
            output = result.stdout.strip()
            
            running_ids = set()
            for line in output.split('\n'):
                # Quy ước tên container viewer là: viewer_service_{cam_id}
                if "viewer_service_" in line:
                    # Cắt chuỗi để lấy cam_id. VD: viewer_service_cam1 -> cam1
                    # Lưu ý: Nếu cam_id có dấu gạch dưới, logic split này cần cẩn thận.
                    # Cách an toàn nhất: remove prefix "viewer_service_"
                    cam_id = line.replace("viewer_service_", "")
                    running_ids.add(cam_id)
            
            return running_ids
        except Exception as e:
            print(f"Error checking docker status: {e}")
            return set()