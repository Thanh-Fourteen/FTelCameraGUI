from fastapi import FastAPI
from contextlib import asynccontextmanager
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from utils.environment import settings
from routers import instances, node_proxy
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from database.db import create_table
from middlewares.error_handler import (
    ErrorHandlingMiddleware, 
    http_exception_handler, 
    validation_exception_handler
)

from services.instance_service import instance_service
from services.monitor_service import monitor_service



@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Server đang khởi động... Bắt đầu kết nối tới các Node...")
    
    all_nodes = instance_service.get_all_nodes()
    
    for node in all_nodes:
        monitor_service.start_monitoring_task(node.instance_id, node.ip_address, node.port)
    
    yield
    
    print("🛑 Server đang tắt...")


app = FastAPI(
    title=settings.APP_NAME,
    description='Đây là mô tả cho API đầu tiên của tôi sử dụng FastAPI.',
    version=settings.APP_VERSION,
    docs_url="/api-docs",
    redoc_url=None,
    lifespan=lifespan,
    )

origins = [
    "*", 
    # "http://localhost:3000", # Nếu muốn bảo mật hơn thì điền cụ thể domain FE vào đây
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Cho phép tất cả các method (GET, POST, PUT, DELETE, OPTIONS)
    allow_headers=["*"], # Cho phép tất cả các header (Authorization, Content-Type...)
)


create_table()

app.add_middleware(ErrorHandlingMiddleware)

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

app.include_router(node_proxy.router, prefix="/nodes", tags=["Node Proxy"])
app.include_router(instances.router, prefix="/instances", tags=["Instances"])

@app.get("/", include_in_schema=False)
def root():
    return {"message": "API is running successfully. Visit /api-docs for documentation."}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG_MODE,
   )