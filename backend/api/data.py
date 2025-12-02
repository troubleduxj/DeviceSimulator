from fastapi import APIRouter, HTTPException, status
from typing import List, Dict
from services.tdengine_service import tdengine_service
from services.data_writer import data_writer
from services.device_service import device_service
from services.config_service import ConfigService
from config.config import settings

router = APIRouter()

@router.get("/devices/{device_id}/data", response_model=List[Dict])
def get_device_data(device_id: str, limit: int = 100):
    """获取设备的历史数据"""
    try:
        # 检查TDengine是否启用 - 使用数据库配置
        if not ConfigService.is_tdengine_enabled():
            return []
        
        # 获取设备数据
        data = tdengine_service.get_device_data(device_id, limit)
        return data
    except Exception as e:
        print(f"获取设备数据失败: {e}")
        return []

@router.post("/start")
def start_data_generation():
    """启动数据生成服务"""
    success = data_writer.start()
    if success:
        return {"message": "数据生成服务已启动"}
    else:
        return {"message": "数据生成服务已经在运行"}

@router.post("/stop")
def stop_data_generation():
    """停止数据生成服务"""
    success = data_writer.stop()
    if success:
        return {"message": "数据生成服务已停止"}
    else:
        return {"message": "数据生成服务已经停止"}

@router.get("/status")
def get_data_generation_status():
    """获取数据生成服务状态"""
    return {"running": data_writer.running}
