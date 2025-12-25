from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.config import settings
from api import device, data, system, category, simulation_model, ai
from services.database_service import Base, engine
from services.data_writer import data_writer
from models import config, category as category_model  # 确保导入 config 和 category 模型

# 创建数据库表
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Device Simulator API",
    description="设备运行模拟器API服务",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(device.router, prefix="/api/device", tags=["device"])
app.include_router(data.router, prefix="/api/data", tags=["data"])
app.include_router(system.router, prefix="/api/system", tags=["system"])
app.include_router(category.router, prefix="/api/category", tags=["category"])
app.include_router(simulation_model.router, prefix="/api/simulation-model", tags=["simulation-model"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])

@app.on_event("startup")
async def startup_event():
    # 启动数据写入服务
    print("Starting data writer service...")
    data_writer.start()
    
    for route in app.routes:
        if hasattr(route, "path"):
            print(f"Route: {route.path} Methods: {route.methods}")

@app.on_event("shutdown")
async def shutdown_event():
    # 停止数据写入服务
    print("Stopping data writer service...")
    data_writer.stop()

@app.get("/")
def root():
    return {"message": "Device Simulator API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=settings.debug
    )
