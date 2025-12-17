from fastapi import APIRouter, HTTPException, Body
import httpx
import asyncio
from services.instance_service import instance_service
from typing import Any, Dict, List, Union

router = APIRouter()

# --- HÀM PHỤ TRỢ (HELPER) ---
def _inject_node_metadata(data: Union[Dict, List], node) -> Union[Dict, List]:
    """
    Hàm đệ quy giúp bơm node_id, node_ip, stream_url vào dữ liệu trả về.
    Hỗ trợ cả trường hợp data là List (nhiều cam) hoặc Dict (1 cam).
    """
    # Trường hợp 1: Data là danh sách (List) -> Lặp qua từng phần tử
    if isinstance(data, list):
        return [_inject_node_metadata(item, node) for item in data]
    
    # Trường hợp 2: Data là đối tượng (Dict) -> Bơm dữ liệu vào
    if isinstance(data, dict):
        # Bơm thông tin định danh
        data['node_id'] = node.instance_id
        data['node_ip'] = node.ip_address
        internal_port = data.get('ws_port') 
        
        # Lấy bảng mapping của node (ví dụ: {'5551': 20934})
        # Lưu ý: node.port_mappings đã được Repo convert sang Dict
        mappings = node.port_mappings or {}

        if internal_port is not None and str(internal_port) in mappings:
            data['public_port'] = mappings[str(internal_port)]
        
        # Bơm Stream URL nếu có đủ thông tin
        # Logic: ws://[Node_IP]:[Public_Port]
        if 'public_port' in data and data['public_port']:
            data['stream_url'] = f"ws://{node.ip_address}:{data['public_port']}"
            
    return data

# --- HÀM PROXY CHÍNH (ĐÃ NÂNG CẤP) ---
async def forward_request_to_node(instance_id: str, method: str, path: str, json_data: Any = None):
    # 1. Tìm node
    instances = instance_service.get_all_nodes()
    target_node = next((n for n in instances if n.instance_id == instance_id), None)
    
    if not target_node:
        # Trả về format "detail" để FE bắt thống nhất
        raise HTTPException(status_code=404, detail=f"Máy {instance_id} không tồn tại")

    base_url = f"http://{target_node.ip_address}:{target_node.port}"
    target_url = f"{base_url}{path}"

    async with httpx.AsyncClient() as client:
        try:
            response = await client.request(
                method=method,
                url=target_url,
                json=json_data,
                timeout=10.0
            )
            
            # --- XỬ LÝ LỖI (MÁY CON TRẢ VỀ 4xx HOẶC 5xx) ---
            if response.status_code >= 400:
                # Log lỗi để bạn debug ở console BE
                print(f"❌ [Node Error] {instance_id} | Status: {response.status_code}")
                
                try:
                    # Đọc JSON lỗi từ máy con
                    error_data = response.json()
                    
                    # Nếu máy con dùng FastAPI mặc định, nó trả về {"detail": "..."}
                    # Nếu máy con dùng format của bạn, nó trả về {"message": "...", ...}
                    # Chúng ta lấy trường 'detail' hoặc 'message' hoặc nguyên cục JSON
                    final_error_detail = error_data.get("detail") or error_data.get("message") or error_data
                except:
                    # Nếu không phải JSON (ví dụ lỗi 500 của Nginx) thì lấy text
                    final_error_detail = response.text

                # RAISE LỖI: detail này sẽ được FastAPI/Middleware trả về cho FE
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=final_error_detail
                )

            # --- NẾU THÀNH CÔNG ---
            origin_data = response.json()
            return _inject_node_metadata(origin_data, target_node)
            
        except httpx.ConnectError:
            raise HTTPException(status_code=503, detail="Không thể kết nối tới máy con (Offline)")
        except HTTPException as e:
            # Re-raise để không bị lọt vào Exception tổng
            raise e
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Lỗi hệ thống Proxy: {str(e)}")

# --- CÁC API ROUTER (GIỮ NGUYÊN) ---
# Vì logic bơm dữ liệu đã nằm trong forward_request_to_node,
# nên tất cả các hàm dưới đây tự động được hưởng lợi.

@router.get("/{instance_id}/cameras")
async def proxy_list_cameras(instance_id: str):
    return await forward_request_to_node(instance_id, "GET", "/api/cameras/")

@router.get("/{instance_id}/cameras/{cam_id}")
async def proxy_get_camera_detail(instance_id: str, cam_id: str):
    return await forward_request_to_node(instance_id, "GET", f"/api/cameras/{cam_id}")

@router.post("/{instance_id}/cameras")
async def proxy_create_camera(instance_id: str, payload: Dict = Body(...)):
    return await forward_request_to_node(instance_id, "POST", "/api/cameras/", payload)

@router.post("/{instance_id}/cameras/{cam_id}/start")
async def proxy_start_camera(instance_id: str, cam_id: str):
    return await forward_request_to_node(instance_id, "POST", f"/api/cameras/{cam_id}/start")

@router.post("/{instance_id}/cameras/{cam_id}/stop")
async def proxy_stop_camera(instance_id: str, cam_id: str):
    return await forward_request_to_node(instance_id, "POST", f"/api/cameras/{cam_id}/stop")

@router.put("/{instance_id}/cameras/{cam_id}")
async def proxy_update_camera(instance_id: str, cam_id: str, payload: Dict = Body(...)):
    return await forward_request_to_node(instance_id, "PUT", f"/api/cameras/{cam_id}", payload)

@router.delete("/{instance_id}/cameras/{cam_id}")
async def proxy_delete_camera(instance_id: str, cam_id: str):
    return await forward_request_to_node(instance_id, "DELETE", f"/api/cameras/{cam_id}")

@router.post("/{instance_id}/system/kafka/toggle")
async def proxy_toggle_kafka(instance_id: str, payload: Dict = Body(...)):
    return await forward_request_to_node(instance_id, "POST", "/api/system/kafka/toggle", payload)

@router.get("/{instance_id}/system/kafka/status")
async def proxy_status_kafka(instance_id: str):
    return await forward_request_to_node(instance_id, "GET", "/api/system/kafka/status")

@router.get("/{instance_id}/settings/schema")
async def proxy_get_schema(instance_id: str):
    return await forward_request_to_node(instance_id, "GET", "/api/settings/schema")

# --- API TỔNG HỢP (Get All) ---
# Hàm này vẫn cần logic riêng vì nó gọi nhiều node
@router.get("/all-cameras")
async def get_all_cameras_aggregated():
    nodes = instance_service.get_all_nodes()
    
    async def fetch_node_cams(node):
        try:
            # Gọi hàm proxy nội bộ để tái sử dụng logic bơm dữ liệu
            # Lưu ý: forward_request_to_node là async, cần await
            cams = await forward_request_to_node(node.instance_id, "GET", "/api/cameras/")
            return cams
        except:
            return [] 

    tasks = [fetch_node_cams(node) for node in nodes]
    results = await asyncio.gather(*tasks)
    
    all_cameras = []
    for res in results:
        all_cameras.extend(res)
        
    return all_cameras