import json
import os
from models.camera_model import CameraCreate, CameraUpdate
from utils.templates import get_ai_template, get_viewer_service_config 
from services.docker_service import DockerService

DB_FILE = "data/cameras.json"

# ==========================================
# 🚨 CÔNG TẮC CHẾ ĐỘ DEMO (LẤP LIẾM MODE) 🚨
# True = Chạy video có sẵn, đổi topic, không chạy AI thật
# False = Chạy hệ thống thật (Full Docker AI)
DEMO_MODE = False 
# ==========================================

class CameraService:
    def __init__(self):
        self.docker_service = DockerService()
        self._ensure_db()

    def _ensure_db(self):
        if not os.path.exists(DB_FILE):
            os.makedirs("data", exist_ok=True)
            with open(DB_FILE, 'w') as f:
                json.dump({}, f)

    def _read_db(self):
        with open(DB_FILE, 'r') as f:
            return json.load(f)

    def _write_db(self, data):
        with open(DB_FILE, 'w') as f:
            json.dump(data, f, indent=4)

    def _resolve_dependencies(self, modules_list):
        """
        Tự động thêm các module phụ thuộc.
        """
        modules = set(modules_list)
        if "action_recognition" in modules: modules.update(["pose_detection", "tracking_service", "detection"])
        if "pose_detection" in modules: modules.update(["tracking_service", "detection"])
        if "counting" in modules: modules.update(["tracking_service", "detection"])
        if "tracking_service" in modules: modules.add("detection")
        return modules

    def _apply_user_config(self, service_template, module_name, user_config_dict):
        """
        Ghi đè environment từ setting user gửi lên.
        """
        if module_name in user_config_dict:
            custom_envs = user_config_dict[module_name]
            for key, value in custom_envs.items():
                if isinstance(value, bool):
                     service_template["environment"][key] = "True" if value else "False"
                else:
                     service_template["environment"][key] = str(value)
        return service_template

    # =========================================================
    # LOGIC XỬ LÝ URL "FAKE" CHO DEMO
    # =========================================================
    def _get_demo_suffix_and_topic(self, modules, cam_id, rtsp_url):
        """
        Xử lý logic fallback:
        - Nếu BV chọn Fire -> Trả về gốc (vì BV ko có Fire).
        - Nếu Crow/Fire chọn Action -> Trả về Pose (vì ko có Action).
        """
        suffix_url = ""      
        suffix_topic = ""    
        
        # 1. Nhận diện video gốc đang dùng là gì
        is_live_crow = "live_crow" in rtsp_url
        is_live_fire = "live_fire" in rtsp_url
        is_live_bv   = "live_bv"   in rtsp_url
        is_live_fall = "live_fall1" in rtsp_url

        # 2. Logic ưu tiên và Fallback
        
        # --- Ưu tiên 1: ACTION RECOGNITION ---
        if "action_recognition" in modules:
            if is_live_crow or is_live_fire:
                # Crow và Fire không có Action -> Fallback về Pose
                suffix_url = "_pose"
                suffix_topic = "_pose"
            else:
                # Fall1 chắc chắn có Action
                suffix_url = "_action"
                suffix_topic = "_action"

        # --- Ưu tiên 2: FIRE ---
        elif "fire" in modules:
            if is_live_fire:
                # Chỉ video Fire mới có cảnh Fire
                suffix_url = "_fire"
                suffix_topic = "_fire"
            else:
                # Crow, BV, Fall không có Fire -> Giữ nguyên video gốc
                suffix_url = "" 
                suffix_topic = "" # Topic gốc

        # --- Ưu tiên 3: COUNTING ---
        elif "counting" in modules:
            suffix_url = "_counting"
            suffix_topic = "_counting"

        # --- Ưu tiên 4: FACE ---
        elif "face" in modules:
            # Giả sử chỉ BV hoặc Crow có face, còn lại về gốc
            suffix_url = "_face"
            suffix_topic = "_face"

        elif "pose_detection" in modules:
            suffix_url = "_pose"
            suffix_topic = "_pose"

        # --- Ưu tiên 5: TRACKING ---
        elif "tracking_service" in modules:
            suffix_url = "_tracking"
            suffix_topic = "_tracking"

        # --- Ưu tiên 6: DETECTION ---
        elif "detection" in modules:
            suffix_url = "_detection"
            suffix_topic = "_detection"
        
        # Tạo topic fake
        # Nếu suffix rỗng -> Topic là CAMERA_camid (Topic gốc)
        fake_output_topic = f"CAMERA_{cam_id}{suffix_topic}"
        
        return suffix_url, fake_output_topic

    def _prepare_full_pipeline_config(self, cam_id, rtsp_url, ws_port, settings):
        services = {}
        topic_camera = f"CAMERA_{cam_id}"
        full_templates = get_ai_template(cam_id, "", topic_camera)
        user_conf = settings.config

        # -----------------------------------------------------------
        # 🛑 CASE 1: DEMO MODE (Fake Pipeline)
        # -----------------------------------------------------------
        if DEMO_MODE:
            print(f"⚠️ [DEMO MODE] Checking logic for {rtsp_url}")
            
            # 1. Gọi hàm Logic mới (Truyền thêm rtsp_url vào để check)
            suffix_url, fake_final_topic = self._get_demo_suffix_and_topic(settings.modules, cam_id, rtsp_url)
            
            # 2. Tạo URL Fake
            # Nếu suffix_url rỗng -> Video gốc
            fake_rtsp_url = f"{rtsp_url}{suffix_url}"
            
            print(f"   -> Result URL: {fake_rtsp_url}")
            print(f"   -> Result Topic: {fake_final_topic}")
            
            # 3. RTSP READER
            # rtsp_srv = full_templates["rtsp_reader"]
            # rtsp_srv["environment"]["RTSP_URL"] = fake_rtsp_url
            # rtsp_srv["environment"]["TOPIC"] = fake_final_topic 
            # services["rtsp_reader"] = rtsp_srv

            # 4. Viewer
            viewer_srv = get_viewer_service_config(cam_id, ws_port, fake_final_topic, "all", "1")
            viewer_srv = self._apply_user_config(viewer_srv, "viewer_service", user_conf)
            # viewer_srv["depends_on"] = ["rtsp_reader"]
            services["viewer_service"] = viewer_srv
            
            self.docker_service.generate_compose_file(cam_id, services)
            return fake_final_topic

        # -----------------------------------------------------------
        # ✅ CASE 2: REAL MODE (Full AI Pipeline)
        # -----------------------------------------------------------
        
        all_needed_modules = self._resolve_dependencies(settings.modules)
        
        # A. RTSP READER
        rtsp_srv = full_templates["rtsp_reader"]
        rtsp_srv["environment"]["RTSP_URL"] = rtsp_url
        rtsp_srv["environment"]["TOPIC"] = topic_camera
        services["rtsp_reader"] = rtsp_srv

        final_output_topic = topic_camera 
        current_main_topic = topic_camera

        # Helper override config
        def add_service(key_name, template_key, input_topic, output_topic):
            srv = full_templates[template_key]
            srv["environment"]["INPUT_TOPIC"] = input_topic
            srv["environment"]["OUTPUT_TOPIC"] = output_topic
            srv = self._apply_user_config(srv, template_key, user_conf)
            services[key_name] = srv
            return output_topic

        # B. NHÁNH CHÍNH
        if "detection" in all_needed_modules:
            current_main_topic = f"DETECTION_{cam_id}"
            add_service("pythera_detection", "pythera_detection", topic_camera, current_main_topic)
            final_output_topic = current_main_topic

        if "tracking_service" in all_needed_modules:
            prev = current_main_topic
            current_main_topic = f"TRACKING_{cam_id}"
            add_service("tracking_service", "tracking_service", prev, current_main_topic)
            final_output_topic = current_main_topic

        if "pose_detection" in all_needed_modules:
            prev = current_main_topic
            current_main_topic = f"POSE_{cam_id}"
            add_service("pose_detection", "pose_detection", prev, current_main_topic)
            final_output_topic = current_main_topic

        if "action_recognition" in all_needed_modules:
            final_output_topic = f"ACTION_{cam_id}"
            add_service("action_recognition", "action_recognition", current_main_topic, final_output_topic)

        if "counting" in all_needed_modules:
            cnt_input = f"TRACKING_{cam_id}"
            final_output_topic = f"COUNTING_{cam_id}"
            srv = full_templates["counting_service"]
            srv["environment"]["INPUT_TOPIC"] = cnt_input
            srv["environment"]["OUTPUT_TOPIC"] = final_output_topic
            if settings.polygon: srv["environment"]["POLYGON_COORDS"] = str(settings.polygon)
            srv = self._apply_user_config(srv, "counting_service", user_conf)
            services["counting_service"] = srv
            
        # C. NHÁNH PHỤ
        if "fire" in all_needed_modules:
            final_output_topic = f"FIRE_{cam_id}"
            add_service("fire_service", "fire_service", topic_camera, final_output_topic)

        if "face" in all_needed_modules:
            final_output_topic = f"FACE_{cam_id}"
            add_service("face_service", "face_service", topic_camera, final_output_topic)

        # D. VIEWER SERVICE
        viewer_srv = get_viewer_service_config(cam_id, ws_port, final_output_topic, "all", "1")
        viewer_srv = self._apply_user_config(viewer_srv, "viewer_service", user_conf)
        
        last_ai = list(services.keys())[-1]
        if last_ai != "rtsp_reader": 
            viewer_srv["depends_on"] = [last_ai]
            
        services["viewer_service"] = viewer_srv

        self.docker_service.generate_compose_file(cam_id, services)
        return final_output_topic

    # =========================================================
    # PUBLIC METHODS
    # =========================================================
    
    def create_camera(self, cam: CameraCreate):
        data = self._read_db()
        if cam.camera_id in data:
            raise Exception(f"Camera {cam.camera_id} already exists")
        
        output_topic = self._prepare_full_pipeline_config(
            cam.camera_id, cam.rtsp_url, cam.ws_port, cam.settings
        )

        cam_dict = cam.dict()
        cam_dict["status"] = "stopped"
        cam_dict["output_topic"] = output_topic
        
        data[cam.camera_id] = cam_dict
        self._write_db(data)
        return cam_dict

    def update_camera(self, cam_id, update: CameraUpdate):
        data = self._read_db()
        if cam_id not in data:
            raise Exception("Camera not found")
        
        current = data[cam_id]
        
        current_settings_obj = CameraCreate(**current).settings
        new_settings = update.settings if update.settings else current_settings_obj
        new_rtsp = update.rtsp_url or current["rtsp_url"]
        new_ws_port = update.ws_port or current["ws_port"]
        
        if update.rtsp_url: current["rtsp_url"] = update.rtsp_url
        if update.ws_port: current["ws_port"] = update.ws_port
        if update.settings: current["settings"] = update.settings.dict()

        # Re-generate Config
        output_topic = self._prepare_full_pipeline_config(
            cam_id, new_rtsp, new_ws_port, new_settings
        )
        current["output_topic"] = output_topic
        
        # Auto Restart if Running
        if current.get("status") == "running":
            print(f"Restarting {cam_id} for new settings...")
            try:
                self.docker_service.stop_pipeline(cam_id)
                self.docker_service.start_pipeline(cam_id)
                current["status"] = "running"
            except Exception as e:
                print(f"Restart failed: {e}")
                current["status"] = "stopped"
                raise Exception(f"Updated settings but failed to restart: {e}")
        
        self._write_db(data)
        return current

    def start_camera(self, cam_id):
        data = self._read_db()
        if cam_id not in data: raise Exception("Camera not found")
        self.docker_service.start_pipeline(cam_id)
        data[cam_id]["status"] = "running"
        self._write_db(data)
        return {"status": "started", "output_topic": data[cam_id]["output_topic"], "ws_port": data[cam_id]["ws_port"]}

    def stop_camera(self, cam_id):
        data = self._read_db()
        if cam_id not in data: raise Exception("Camera not found")
        self.docker_service.stop_pipeline(cam_id)
        data[cam_id]["status"] = "stopped"
        self._write_db(data)
        return {"status": "stopped"}

    def delete_camera(self, cam_id):
        data = self._read_db()
        if cam_id in data:
            self.docker_service.stop_pipeline(cam_id)
            self.docker_service.delete_deployment_folder(cam_id)
            del data[cam_id]
            self._write_db(data)
            return True
        return False
    
    def get_all_cameras(self):
        return list(self._read_db().values())
    
    def get_camera(self, cam_id):
        return self._read_db().get(cam_id)