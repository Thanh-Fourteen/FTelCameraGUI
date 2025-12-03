# # routers/viewer_router.py
# from fastapi import APIRouter, HTTPException
# from models.viewer_model import ViewerStartRequest
# from services.camera_service import CameraService
# from services.docker_service import DockerService
# from utils.templates import get_viewer_template

# router = APIRouter(prefix="/api/viewers", tags=["Viewers"])
# cam_service = CameraService()
# docker_service = DockerService()

# @router.post("/start")
# def start_viewer(req: ViewerStartRequest):
#     cam = cam_service.get_camera(req.camera_id)
#     if not cam:
#         raise HTTPException(status_code=404, detail="Camera not found")
    
#     # Lấy topic output hiện tại của camera đó
#     input_topic = cam.get("output_topic", f"CAMERA_{req.camera_id}")

#     # Tạo config viewer
#     services = get_viewer_template(req.camera_id, req.ws_port, input_topic)
    
#     # Inject thêm setting từ FE (nếu cần alert/plot override)
#     env = services["viewer_service"]["environment"]
#     env["PLOT"] = req.plot_mode
#     env["ALERT"] = req.alert_mode
    
#     try:
#         # Tạo file deployments/{cam_id}/viewer.yml và chạy
#         path = docker_service.generate_compose_file(req.camera_id, "viewer", services)
#         docker_service.start_containers(path)
        
#         return {
#             "status": "viewer_started",
#             "ws_url": f"ws://YOUR_HOST_IP:{req.ws_port}",
#             "topic": input_topic
#         }
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @router.post("/stop")
# def stop_viewer(camera_id: str):
#     # Chỉ stop viewer, không stop AI
#     docker_service.stop_containers(camera_id, "viewer")
#     return {"status": "viewer_stopped"}