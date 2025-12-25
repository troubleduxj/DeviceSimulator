from fastapi import FastAPI
print("Importing CORS...", flush=True)
from fastapi.middleware.cors import CORSMiddleware
print("Importing settings...", flush=True)
from config.config import settings
print("Importing api routers...", flush=True)
# from api import device, data, system, category, simulation_model, ai
print("Importing api.device...", flush=True)
from api import device
print("Importing api.data...", flush=True)
from api import data
print("Importing api.system...", flush=True)
from api import system
print("Importing api.category...", flush=True)
from api import category
print("Importing api.simulation_model...", flush=True)
from api import simulation_model
print("Importing api.ai...", flush=True)
from api import ai
print("Importing api.prompt...", flush=True)
from api import prompt
print("Importing database...", flush=True)
from services.database_service import Base, engine
print("Importing data_writer...", flush=True)
from services.data_writer import data_writer
print("Importing mqtt_service...", flush=True)
from services.protocols.mqtt_service import mqtt_service
print("Importing modbus_service...", flush=True)
from services.protocols.modbus_service import modbus_service
print("Importing opcua_service...", flush=True)
from services.protocols.opcua_service import opcua_service
print("Importing models...", flush=True)
from models import config, category as category_model, prompt as prompt_model

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
app.include_router(prompt.router, prefix="/api/prompt", tags=["prompt"])

@app.on_event("startup")
async def startup_event():
    """Application startup: Start background services"""
    print("Starting background services...")
    # Start DataWriter (Simulation Loop)
    data_writer.start()
    
    # Start Protocols
    mqtt_service.start()
    modbus_service.start()
    # opcua_service.start() # OPC UA might be disabled if asyncua missing, handled internally

@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown: Stop background services"""
    print("Stopping background services...")
    data_writer.stop()
    mqtt_service.stop()
    modbus_service.stop()
    opcua_service.stop()

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
