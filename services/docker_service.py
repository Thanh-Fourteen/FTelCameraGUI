import subprocess
import yaml
import os
import shutil

DEPLOY_DIR = "deployments"

class DockerService:
    def ensure_dir(self, cam_id):
        path = os.path.join(DEPLOY_DIR, cam_id)
        os.makedirs(path, exist_ok=True)
        return path

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

        project_name = f"cam_{cam_id}"

        # BƯỚC 1: Dọn dẹp trước (Stop & Remove Volume)
        # check=False nghĩa là: Nếu chưa có container nào chạy thì lệnh down sẽ lỗi,
        # nhưng ta KỆ NÓ (False), cứ cho qua để chạy tiếp lệnh up.
        try:
            print(f"Cleaning up resources for {cam_id}...")
            cmd_down = ["docker", "compose", "-p", project_name, "-f", filepath, "down", "-v"]
            subprocess.run(cmd_down, check=False) 
        except Exception as e:
            print(f"Warning during cleanup: {e}")

        # BƯỚC 2: Chạy mới (Start)
        try:
            print(f"Starting pipeline for {cam_id}...")
            cmd_up = ["docker", "compose", "-p", project_name, "-f", filepath, "up", "-d"]
            subprocess.run(cmd_up, check=True)
            return True
        except subprocess.CalledProcessError as e:
            raise Exception(f"Docker Up Failed: {e}")
        
    def stop_pipeline(self, cam_id):
        folder = os.path.join(DEPLOY_DIR, cam_id)
        filepath = os.path.join(folder, "pipeline.yml")
        
        if os.path.exists(filepath):
            try:
                project_name = f"cam_{cam_id}"
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