from typing import List, Optional
from models.device import Device, DeviceDB
from models.category import CategoryDB
from services.database_service import SessionLocal, engine
from services.tdengine_service import tdengine_service
from services.config_service import ConfigService
from services.simulation_engine import SimulationStateManager
from sqlalchemy.orm import Session
import json

# 创建数据库表
from models.device import Base
Base.metadata.create_all(bind=engine)

class DeviceService:
    @staticmethod
    def _get_db() -> Session:
        """获取数据库会话"""
        return SessionLocal()
    
    @staticmethod
    def get_all_devices() -> List[Device]:
        """获取所有设备"""
        db = DeviceService._get_db()
        try:
            device_dbs = db.query(DeviceDB).all()
            # Pre-fetch all categories to map visual_model
            categories = db.query(CategoryDB).all()
            cat_map = {cat.code: cat.visual_model for cat in categories}
            
            devices = []
            for device_db in device_dbs:
                # 将JSON字符串转换为参数列表
                parameters = device_db.parameters
                if isinstance(parameters, str):
                    parameters = json.loads(parameters)
                
                device = Device(
                    id=device_db.id,
                    name=device_db.name,
                    type=device_db.type,
                    model=device_db.model,
                    description=device_db.description,
                    visual_model=cat_map.get(device_db.type, "Generic"), # Map visual_model
                    parameters=parameters,
                    sampling_rate=device_db.sampling_rate,
                    status=device_db.status,
                    physics_config=device_db.physics_config if device_db.physics_config else {},
                    logic_rules=device_db.logic_rules if device_db.logic_rules else [],
                    created_at=device_db.created_at,
                    updated_at=device_db.updated_at
                )
                devices.append(device)
            return devices
        finally:
            db.close()
    
    @staticmethod
    def get_device_by_id(device_id: str) -> Optional[Device]:
        """根据ID获取设备"""
        db = DeviceService._get_db()
        try:
            device_db = db.query(DeviceDB).filter(DeviceDB.id == device_id).first()
            if not device_db:
                return None
            
            # Get category for visual_model
            category = db.query(CategoryDB).filter(CategoryDB.code == device_db.type).first()
            visual_model = category.visual_model if category else "Generic"

            # 将JSON字符串转换为参数列表
            parameters = device_db.parameters
            if isinstance(parameters, str):
                parameters = json.loads(parameters)
            
            return Device(
                id=device_db.id,
                name=device_db.name,
                type=device_db.type,
                model=device_db.model,
                description=device_db.description,
                visual_model=visual_model, # Map visual_model
                parameters=parameters,
                sampling_rate=device_db.sampling_rate,
                status=device_db.status,
                physics_config=device_db.physics_config if device_db.physics_config else {},
                logic_rules=device_db.logic_rules if device_db.logic_rules else [],
                created_at=device_db.created_at,
                updated_at=device_db.updated_at
            )
        finally:
            db.close()
    
    @staticmethod
    def create_device(device: Device) -> Device:
        """创建设备"""
        db = DeviceService._get_db()
        try:
            # 检查设备名称是否已存在
            existing_device = db.query(DeviceDB).filter(DeviceDB.name == device.name).first()
            if existing_device:
                raise ValueError(f"设备名称 {device.name} 已存在")
            
            # 将参数列表转换为JSON字符串
            parameters_json = json.dumps([param.dict() for param in device.parameters])
            
            # 创建数据库设备对象
            device_db = DeviceDB(
                id=device.id,
                name=device.name,
                type=device.type,
                model=device.model,
                description=device.description,
                parameters=parameters_json,
                sampling_rate=device.sampling_rate,
                status=device.status,
                physics_config=device.physics_config,
                logic_rules=device.logic_rules,
                created_at=device.created_at,
                updated_at=device.updated_at
            )
            
            db.add(device_db)
            db.commit()
            db.refresh(device_db)
            
            # 为设备创建TDengine表（如果TDengine启用）
            if ConfigService.is_tdengine_enabled():
                try:
                    print(f"尝试为设备 {device.name} (ID: {device.id}) 创建TDengine表...")
                    # 使用设备类型作为超级表名称 (设备类型即为Category Code)
                    st_name = device.type
                    print(f"使用超级表: {st_name}")
                    
                    # 创建超级表（如果不存在）
                    # 注意：通常超级表应该在创建分类时创建，这里作为保险措施
                    try:
                        tdengine_service.create_super_table(st_name, device.parameters)
                        print(f"检查/创建超级表 {st_name} 完成")
                    except Exception as e:
                        print(f"检查超级表失败 (可能已存在): {e}")

                    # 创建子表
                    sub_table_name = f"`device_{device.id}`"
                    tags = {
                        "device_id": device.id,
                        "device_name": device.name,
                        "device_model": device.model
                    }
                    print(f"正在创建子表: {sub_table_name} tags={tags}")
                    result = tdengine_service.create_sub_table(st_name, sub_table_name, tags)
                    if result:
                        print(f"TDengine子表 {sub_table_name} 创建成功")
                    else:
                        print(f"TDengine子表 {sub_table_name} 创建失败 (返回False)")
                    
                    # 兼容旧代码，保留create_table_for_device如果需要，或者直接替换
                    # tdengine_service.create_table_for_device(device)
                except Exception as e:
                    print(f"TDengine表创建过程中发生异常: {e}")
                    import traceback
                    traceback.print_exc()
                    # 不抛出异常，以免影响设备创建的主流程
                    print(f"TDengine表创建失败，但设备数据已保存到SQLite")
            
            # Re-fetch to get visual_model? Or just return input device (which might lack it)
            # Better: manually set it if needed, but frontend usually refreshes list.
            return device
        finally:
            db.close()
    
    @staticmethod
    def update_device(device_id: str, device: Device) -> Optional[Device]:
        """更新设备"""
        db = DeviceService._get_db()
        try:
            # 检查设备是否存在
            existing_device = db.query(DeviceDB).filter(DeviceDB.id == device_id).first()
            if not existing_device:
                return None
            
            # 检查设备名称是否已被其他设备使用
            other_device = db.query(DeviceDB).filter(DeviceDB.name == device.name, DeviceDB.id != device_id).first()
            if other_device:
                raise ValueError(f"设备名称 {device.name} 已被其他设备使用")
            
            # 将参数列表转换为JSON字符串
            parameters_json = json.dumps([param.dict() for param in device.parameters])
            
            # 更新数据库设备对象
            existing_device.name = device.name
            existing_device.type = device.type
            existing_device.model = device.model
            existing_device.description = device.description
            existing_device.parameters = parameters_json
            existing_device.sampling_rate = device.sampling_rate
            existing_device.status = device.status
            existing_device.physics_config = device.physics_config
            existing_device.logic_rules = device.logic_rules
            existing_device.updated_at = device.updated_at
            
            db.commit()
            db.refresh(existing_device)
            
            # 更新TDengine表结构（如果TDengine启用）
            if ConfigService.is_tdengine_enabled():
                try:
                    tdengine_service.delete_device_table(device_id)
                    
                    # 重新创建表（如果是分类设备，创建子表；否则创建普通表）
                    if device.type:
                        st_name = device.type
                        # 确保超级表存在（以防万一）
                        tdengine_service.create_super_table(st_name, device.parameters)
                        
                        sub_table_name = f"`device_{device.id}`"
                        tags = {
                            "device_id": device.id,
                            "device_name": device.name,
                            "device_model": device.model
                        }
                        tdengine_service.create_sub_table(st_name, sub_table_name, tags)
                    else:
                        tdengine_service.create_table_for_device(device)
                except Exception as e:
                    print(f"TDengine表更新失败: {e}，但设备数据已更新到SQLite")
            
            return device
        finally:
            db.close()
    
    @staticmethod
    def delete_device(device_id: str) -> bool:
        """删除设备"""
        db = DeviceService._get_db()
        try:
            # 检查设备是否存在
            existing_device = db.query(DeviceDB).filter(DeviceDB.id == device_id).first()
            if not existing_device:
                return False
            
            # 删除设备
            db.delete(existing_device)
            db.commit()
            
            # 删除设备对应的TDengine表（如果TDengine启用）
            if ConfigService.is_tdengine_enabled():
                try:
                    tdengine_service.delete_device_table(device_id)
                except Exception as e:
                    print(f"TDengine表删除失败: {e}，但设备数据已从SQLite删除")
            
            # 清除仿真状态
            SimulationStateManager.clear_state(device_id)
            
            return True
        finally:
            db.close()
    
    @staticmethod
    def update_device_status(device_id: str, status: str) -> Optional[Device]:
        """更新设备状态"""
        db = DeviceService._get_db()
        try:
            # 检查设备是否存在
            existing_device = db.query(DeviceDB).filter(DeviceDB.id == device_id).first()
            if not existing_device:
                return None
            
            # 更新设备状态
            existing_device.status = status
            db.commit()
            db.refresh(existing_device)
            
            # 将JSON字符串转换为参数列表
            parameters = existing_device.parameters
            if isinstance(parameters, str):
                parameters = json.loads(parameters)
            
            return Device(
                id=existing_device.id,
                name=existing_device.name,
                type=existing_device.type,
                model=existing_device.model,
                description=existing_device.description,
                parameters=parameters,
                sampling_rate=existing_device.sampling_rate,
                status=existing_device.status,
                physics_config=existing_device.physics_config if existing_device.physics_config else {},
                logic_rules=existing_device.logic_rules if existing_device.logic_rules else [],
                created_at=existing_device.created_at,
                updated_at=existing_device.updated_at
            )
        finally:
            db.close()

# 创建全局实例
device_service = DeviceService()
