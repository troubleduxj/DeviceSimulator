from fastapi import APIRouter
from services.tdengine_service import tdengine_service
from services.config_service import ConfigService, TDengineConfig, SystemSettings
from config.config import settings
from services.database_service import Base, engine
from services.protocols.mqtt_service import mqtt_service
from services.protocols.modbus_service import modbus_service
from services.protocols.opcua_service import opcua_service

router = APIRouter()

# 确保配置表存在
TDengineConfig.__table__.create(bind=engine, checkfirst=True)
SystemSettings.__table__.create(bind=engine, checkfirst=True)

@router.get("/settings")
def get_system_settings():
    """获取系统全局配置"""
    return ConfigService.get_system_settings()

@router.put("/settings")
def update_system_settings(settings: dict):
    """更新系统全局配置"""
    try:
        success = ConfigService.update_system_settings(settings)
        if not success:
            return {"success": False, "message": "Failed to update settings"}
            
        # Restart services with new config
        mqtt_service.start() # Will restart if config changed
        modbus_service.start() # Will restart if config changed
        
        # Restart OPC UA Service
        if settings.get("opcua_enabled"):
            # Force restart to apply new config (endpoint)
            if opcua_service.running:
                opcua_service.stop()
            opcua_service.start()
        else:
            opcua_service.stop()
        
        return {"success": True, "message": "Settings updated successfully"}
    except Exception as e:
        return {"success": False, "message": f"Error: {e}"}

@router.get("/status")
def get_system_status():
    """获取系统状态"""
    # 从数据库获取TDengine配置
    tdengine_config = ConfigService.get_tdengine_config()
    
    # 检查TDengine连接状态
    tdengine_connected = False
    if tdengine_config.get("enabled", False):
        try:
            tdengine_connected = tdengine_service.connect()
            if tdengine_connected:
                tdengine_service.disconnect()
        except Exception as e:
            print(f"TDengine连接检查失败: {e}")
            tdengine_connected = False
    
    return {
        "status": "running",
        "tdengine_connected": tdengine_connected,
        "tdengine_enabled": tdengine_config.get("enabled", False),
        "app_host": settings.app_host,
        "app_port": settings.app_port,
        "debug": settings.debug
    }

@router.get("/tdengine/config")
def get_tdengine_config():
    """获取TDengine配置"""
    return ConfigService.get_tdengine_config()

@router.get("/tdengine/info")
def get_tdengine_info():
    """获取TDengine数据库信息"""
    return tdengine_service.get_database_info()

@router.post("/tdengine/test-connection")
def test_tdengine_connection(config_data: dict = None):
    """测试TDengine连接"""
    import traceback
    
    try:
        print("开始测试TDengine连接...")
        
        # 如果提供了配置数据，临时使用该配置进行测试
        # 注意：这需要TDengineService支持传递配置，或者我们临时修改ConfigService的行为
        # 目前简单起见，如果提供了config_data，我们更新服务实例的属性（这在单线程/简单应用中可行，但在并发下有风险）
        # 更稳健的做法是重构TDengineService.connect接受参数
        
        # 由于当前前端调用时不传参，依赖数据库中的配置
        # 且我们已经去掉了 settings.tdengine_enabled 的检查，
        # 这样即使配置中 enabled=False，也可以点击“测试连接”
        
        connected = tdengine_service.connect()
        
        if connected:
            # 连接成功后断开，释放资源
            tdengine_service.disconnect()
            print("TDengine连接测试成功")
            return {"connected": True, "message": "TDengine连接成功"}
        else:
            print("TDengine连接测试失败")
            return {"connected": False, "message": "TDengine连接失败，请检查服务是否启动和配置是否正确"}
            
    except Exception as e:
        print(f"TDengine连接测试异常: {e}")
        print(f"异常堆栈: {traceback.format_exc()}")
        return {"connected": False, "message": f"TDengine连接异常: {str(e)}。请确保TDengine服务已启动且配置正确"}

@router.post("/tdengine/config")
@router.put("/tdengine/config")
def update_tdengine_config(config: dict):
    """更新TDengine配置"""
    try:
        # 更新数据库中的配置
        success = ConfigService.update_tdengine_config(config)
        
        if not success:
            return {"success": False, "message": "数据库配置更新失败"}
        
        # 如果启用了TDengine，重新连接
        if config.get("enabled", False):
            tdengine_service.disconnect()
            success = tdengine_service.connect()
            if not success:
                return {"success": False, "message": "配置更新成功，但TDengine连接失败"}
        
        return {"success": True, "message": "配置更新成功"}
        
    except Exception as e:
        return {"success": False, "message": f"配置更新失败: {str(e)}"}
