from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from services.database_service import SessionLocal
from models.config import TDengineConfig, SystemSettings
import json

class ConfigService:
    """配置管理服务"""
    
    _config_cache = None
    _cache_timestamp = None
    
    @staticmethod
    def _get_db() -> Session:
        """获取数据库会话"""
        return SessionLocal()
    
    @staticmethod
    def get_tdengine_config() -> Dict[str, Any]:
        """获取TDengine配置（优先使用数据库配置）"""
        db = ConfigService._get_db()
        try:
            # 查询数据库中的配置
            config = db.query(TDengineConfig).first()
            
            if config:
                # 返回数据库中的配置
                return config.to_dict()
            else:
                # 如果没有配置，创建默认配置
                default_config = TDengineConfig.get_default_config()
                new_config = TDengineConfig(**default_config)
                db.add(new_config)
                db.commit()
                return new_config.to_dict()
                
        except Exception as e:
            print(f"获取TDengine配置失败: {e}")
            # 如果数据库操作失败，返回默认配置
            return TDengineConfig.get_default_config()
        finally:
            db.close()
    
    @staticmethod
    def update_tdengine_config(config_data: Dict[str, Any]) -> bool:
        """更新TDengine配置"""
        db = ConfigService._get_db()
        try:
            # 查询现有配置
            config = db.query(TDengineConfig).first()
            
            if config:
                # 更新现有配置
                config.host = config_data.get("host", config.host)
                config.port = config_data.get("port", config.port)
                config.user = config_data.get("user", config.user)
                config.password = config_data.get("password", config.password)
                config.database = config_data.get("database", config.database)
                config.enabled = config_data.get("enabled", config.enabled)
            else:
                # 创建新配置
                new_config = TDengineConfig(**config_data)
                db.add(new_config)
            
            db.commit()
            
            # 清除缓存
            ConfigService._config_cache = None
            
            return True
            
        except Exception as e:
            print(f"更新TDengine配置失败: {e}")
            db.rollback()
            return False
        finally:
            db.close()
    
    @staticmethod
    def is_tdengine_enabled() -> bool:
        """检查TDengine是否启用"""
        config = ConfigService.get_tdengine_config()
        return config.get("enabled", False)
    
    @staticmethod
    def get_tdengine_connection_params() -> Dict[str, Any]:
        """获取TDengine连接参数"""
        config = ConfigService.get_tdengine_config()
        return {
            "host": config.get("host", "localhost"),
            "port": config.get("port", 6030),
            "user": config.get("user", "root"),
            "password": config.get("password", "taosdata"),
            "database": config.get("database", "device_simulator")
        }

    @staticmethod
    def get_system_settings() -> Dict[str, Any]:
        """获取系统全局配置"""
        db = ConfigService._get_db()
        try:
            config = db.query(SystemSettings).first()
            if not config:
                config = SystemSettings()
                db.add(config)
                db.commit()
                db.refresh(config)
            return config.to_dict()
        except Exception as e:
            print(f"获取系统配置失败: {e}")
            return SystemSettings().to_dict() # Default
        finally:
            db.close()

    @staticmethod
    def update_system_settings(settings_data: Dict[str, Any]) -> bool:
        """更新系统全局配置"""
        db = ConfigService._get_db()
        try:
            config = db.query(SystemSettings).first()
            if not config:
                config = SystemSettings()
                db.add(config)
            
            # Update fields
            if "mqtt_enabled" in settings_data: config.mqtt_enabled = settings_data["mqtt_enabled"]
            if "mqtt_host" in settings_data: config.mqtt_host = settings_data["mqtt_host"]
            if "mqtt_port" in settings_data: config.mqtt_port = settings_data["mqtt_port"]
            if "mqtt_user" in settings_data: config.mqtt_user = settings_data["mqtt_user"]
            if "mqtt_password" in settings_data: config.mqtt_password = settings_data["mqtt_password"]
            if "mqtt_topic_template" in settings_data: config.mqtt_topic_template = settings_data["mqtt_topic_template"]
            
            if "modbus_enabled" in settings_data: config.modbus_enabled = settings_data["modbus_enabled"]
            if "modbus_port" in settings_data: config.modbus_port = settings_data["modbus_port"]
            
            if "opcua_enabled" in settings_data: config.opcua_enabled = settings_data["opcua_enabled"]
            if "opcua_endpoint" in settings_data: config.opcua_endpoint = settings_data["opcua_endpoint"]
            
            if "timezone" in settings_data: config.timezone = settings_data["timezone"]

            db.commit()
            return True
        except Exception as e:
            print(f"更新系统配置失败: {e}")
            db.rollback()
            return False
        finally:
            db.close()
