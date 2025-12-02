from sqlalchemy import Column, String, JSON, DateTime
from datetime import datetime
import uuid
from models.base import Base
from pydantic import BaseModel, Field
from typing import List, Optional, Any
from models.device import Parameter

class SimulationModelDB(Base):
    """数据模型（仿真模板）数据库实体"""
    __tablename__ = "simulation_models"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)
    parameters = Column(JSON)  # 存储参数定义的列表
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

class SimulationModel(BaseModel):
    """数据模型 Pydantic 模型"""
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    parameters: List[Parameter] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
