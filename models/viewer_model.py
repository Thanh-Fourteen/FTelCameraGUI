from pydantic import BaseModel

class ViewerStartRequest(BaseModel):
    camera_id: str
    ws_port: int
    plot_mode: str = "all"      # all, tracking, face...
    alert_mode: str = "true"