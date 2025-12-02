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