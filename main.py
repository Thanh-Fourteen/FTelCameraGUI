import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import camera_router, setting_router, system_router

app = FastAPI(title="AI Camera Orchestrator v4")

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

# Đăng ký các router
app.include_router(camera_router.router)
app.include_router(setting_router.router)
app.include_router(system_router.router)
# app.include_router(viewer_router.router)

@app.get("/")
def root():
    return {"message": "Orchestrator is running. Use /docs for API."}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5173, reload=True)