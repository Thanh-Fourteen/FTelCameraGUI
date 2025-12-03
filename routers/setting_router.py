from fastapi import APIRouter
from utils.settings_schema import get_module_schema

router = APIRouter(prefix="/api/settings", tags=["Settings"])

@router.get("/schema")
def get_settings_schema():
    """
    Trả về cấu trúc cài đặt của toàn bộ hệ thống để FE render form dynamic.
    """
    return get_module_schema()