from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
import traceback

async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail, # Lấy nội dung lỗi bạn viết
            "error_code": exc.status_code
        }
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        field = ".".join(str(x) for x in error['loc'])
        msg = error['msg'] 
        errors.append(f"{field}: {msg}")

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": "Dữ liệu gửi lên không hợp lệ",
            "error_detail": errors,
            "error_code": 422
        }
    )

class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
            
        except Exception as e:
            print(f"------------ SYSTEM ERROR ------------")
            print(f"Path: {request.url.path}")
            print(f"Error: {str(e)}")
            traceback.print_exc()
            
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "success": False,
                    "message": "Lỗi hệ thống nội bộ",
                    "error_detail": str(e), 
                    "error_code": 500
                }
            )