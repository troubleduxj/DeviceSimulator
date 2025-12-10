from fastapi import APIRouter, HTTPException, status, Body
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from services.tdengine_service import tdengine_service
from services.data_writer import data_writer
from services.device_service import device_service
from services.config_service import ConfigService
from services.data_generator import DataGenerator
from config.config import settings

router = APIRouter()

@router.post("/devices/{device_id}/generate-history")
def generate_history_data(
    device_id: str, 
    payload: Dict = Body(...)
):
    """
    生成指定时间段的历史数据
    payload: {
        "start_time": "ISO string",
        "end_time": "ISO string",
        "interval_ms": 1000 (optional, default to device sampling rate)
    }
    """
    try:
        # 1. Check if TDengine enabled
        if not ConfigService.is_tdengine_enabled():
            raise HTTPException(status_code=400, detail="TDengine is disabled")
            
        start_str = payload.get("start_time")
        end_str = payload.get("end_time")
        interval_ms = payload.get("interval_ms")
        
        if not start_str or not end_str:
            raise HTTPException(status_code=400, detail="Start and End time required")
            
        start_dt = datetime.fromisoformat(start_str.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_str.replace('Z', '+00:00'))
        
        if start_dt >= end_dt:
            raise HTTPException(status_code=400, detail="Start time must be before end time")
            
        # Handle cleanup if requested
        clean_existing = payload.get("clean_existing", False)
        if clean_existing:
            print(f"Cleaning existing data for device {device_id} from {start_str} to {end_str}")
            tdengine_service.delete_device_data(device_id, start_str, end_str)

        # 2. Get Device Config
        device = device_service.get_device_by_id(device_id)
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
            
        if not interval_ms:
            interval_ms = device.sampling_rate or 1000
            
        # 3. Generate Loop
        current_dt = start_dt
        count = 0
        batch_size = 100 # Write in batches
        batch_data = []
        
        # Ensure connection
        if not tdengine_service.connect():
             raise HTTPException(status_code=500, detail="Failed to connect to TDengine")

        while current_dt <= end_dt:
            # Generate data point
            data = DataGenerator.generate_device_data(
                device.id, 
                device.parameters, 
                device.physics_config, 
                device.logic_rules,
                timestamp=current_dt
            )
            
            # Prepare for insertion (similar to data_writer logic)
            # Remove TAGS from data payload for TDengine insertion if using independent tables?
            # Or handle in tdengine_service.insert_data?
            # data_writer handles this by filtering. Let's reuse that logic or simplified.
            
            # The tdengine_service.insert_data expects:
            # { "timestamp": "...", "data": { param: val ... } }
            # DataGenerator returns exactly this structure.
            
            # However, insert_data writes one by one.
            # Ideally we need batch insert for performance.
            # But let's reuse insert_data for simplicity first, or check if we can optimize.
            # tdengine_service doesn't have batch insert yet.
            
            # Optimization: Just call insert_data for now.
            # Filter tags here? tdengine_service.insert_data takes "data" dict.
            # We should filter tags out from data["data"] if they are tags.
            
            # Filter tags
            insert_payload = data.copy()
            filtered_data = {}
            
            # Identify tag IDs
            tag_ids = set()
            for p in device.parameters:
                is_tag = False
                if isinstance(p, dict): is_tag = p.get('is_tag', False)
                elif hasattr(p, 'is_tag'): is_tag = p.is_tag
                if is_tag: 
                    p_id = p.get('id') if isinstance(p, dict) else p.id
                    tag_ids.add(p_id)
            
            for k, v in data["data"].items():
                if k not in tag_ids:
                    filtered_data[k] = v
            
            insert_payload["data"] = filtered_data
            
            tdengine_service.insert_data(device_id, insert_payload)
            
            count += 1
            current_dt += timedelta(milliseconds=interval_ms)
            
        return {"message": f"Successfully generated {count} data points", "count": count}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"History generation error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/devices/{device_id}/data", response_model=List[Dict])
def get_device_data(device_id: str, limit: int = 100, start_time: str = None, end_time: str = None):
    """获取设备的历史数据"""
    try:
        # 检查TDengine是否启用 - 使用数据库配置
        if not ConfigService.is_tdengine_enabled():
            return []
        
        # 获取设备数据
        data = tdengine_service.get_device_data(device_id, limit, start_time, end_time)
        return data
    except Exception as e:
        print(f"获取设备数据失败: {e}")
        return []

@router.delete("/devices/{device_id}/data")
def delete_device_data(device_id: str, start_time: str = None, end_time: str = None):
    """删除设备数据"""
    try:
        # 检查TDengine是否启用
        if not ConfigService.is_tdengine_enabled():
             raise HTTPException(status_code=400, detail="TDengine is disabled")
        
        success = tdengine_service.delete_device_data(device_id, start_time, end_time)
        if success:
            return {"message": "数据删除成功"}
        else:
            raise HTTPException(status_code=500, detail="数据删除失败")
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"删除设备数据异常: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/devices/{device_id}/range")
def get_device_data_range(device_id: str):
    """获取设备数据的时间范围"""
    try:
        if not ConfigService.is_tdengine_enabled():
             return None
        
        return tdengine_service.get_device_data_range(device_id)
    except Exception as e:
        print(f"获取数据范围异常: {e}")
        return None

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
