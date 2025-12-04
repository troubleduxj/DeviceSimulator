from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text
from sqlalchemy.sql import func
from services.database_service import Base

class TDengineConfig(Base):
    """TDengine配置模型"""
    __tablename__ = "tdengine_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    host = Column(String(255), default="localhost", nullable=False, comment="TDengine主机地址")
    port = Column(Integer, default=6030, nullable=False, comment="TDengine端口")
    user = Column(String(255), default="root", nullable=False, comment="TDengine用户名")
    password = Column(String(255), default="taosdata", nullable=False, comment="TDengine密码")
    database = Column(String(255), default="device_simulator", nullable=False, comment="TDengine数据库名")
    enabled = Column(Boolean, default=False, nullable=False, comment="是否启用TDengine")
    
    # 配置元数据
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), comment="更新时间")
    
    def to_dict(self):
        """转换为字典格式"""
        return {
            "id": self.id,
            "host": self.host,
            "port": self.port,
            "user": self.user,
            "password": self.password,
            "database": self.database,
            "enabled": self.enabled,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
    
    @classmethod
    def get_default_config(cls):
        """获取默认配置"""
        return {
            "host": "localhost",
            "port": 6030,
            "user": "root", 
            "password": "taosdata",
            "database": "device_simulator",
            "enabled": False
        }

class SystemSettings(Base):
    """系统全局配置"""
    __tablename__ = "system_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # MQTT Config
    mqtt_enabled = Column(Boolean, default=False, comment="启用MQTT推送")
    mqtt_host = Column(String(255), default="localhost", comment="MQTT Broker地址")
    mqtt_port = Column(Integer, default=1883, comment="MQTT Broker端口")
    mqtt_user = Column(String(255), nullable=True, comment="MQTT用户名")
    mqtt_password = Column(String(255), nullable=True, comment="MQTT密码")
    mqtt_topic_template = Column(String(255), default="devices/{device_id}/data", comment="Topic模板")
    
    # Modbus Config
    modbus_enabled = Column(Boolean, default=False, comment="启用Modbus Server")
    modbus_port = Column(Integer, default=5020, comment="Modbus TCP端口")

    # OPC UA Config
    opcua_enabled = Column(Boolean, default=False, comment="启用OPC UA Server")
    opcua_endpoint = Column(String(255), default="opc.tcp://0.0.0.0:4840/freeopcua/server/", comment="OPC UA Endpoint")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        return {
            "mqtt_enabled": self.mqtt_enabled,
            "mqtt_host": self.mqtt_host,
            "mqtt_port": self.mqtt_port,
            "mqtt_user": self.mqtt_user,
            "mqtt_topic_template": self.mqtt_topic_template,
            "modbus_enabled": self.modbus_enabled,
            "modbus_port": self.modbus_port,
            "opcua_enabled": self.opcua_enabled,
            "opcua_endpoint": self.opcua_endpoint
        }
