from sqlalchemy import Column, String, JSON, DateTime
from datetime import datetime
import uuid
from models.base import Base
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from models.device import Parameter

class SimulationModelDB(Base):
    """数据模型（仿真模板）数据库实体"""
    __tablename__ = "simulation_models"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, unique=True, index=True)
    type = Column(String, default="custom") # 模型类型/设备类型
    description = Column(String, nullable=True)
    parameters = Column(JSON)  # 存储参数定义的列表
    physics_config = Column(JSON, default={}) # 物理仿真配置
    logic_rules = Column(JSON, default=[]) # 逻辑规则配置
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

class SimulationModel(BaseModel):
    """数据模型 Pydantic 模型"""
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str = "custom"
    description: Optional[str] = None
    parameters: List[Parameter] = Field(default_factory=list)
    physics_config: Dict[str, Any] = Field(default_factory=dict)
    logic_rules: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
