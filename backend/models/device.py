from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from sqlalchemy import Column, String, Integer, JSON, DateTime
from models.base import Base
from enum import Enum

class ParameterType(str, Enum):
    NUMBER = "数值"
    BOOLEAN = "布尔"
    STRING = "字符串"

class GenerationMode(str, Enum):
    RANDOM = "random"
    LINEAR = "linear"
    PERIODIC = "periodic"
    RANDOM_WALK = "random_walk"  # 随机游走
    CUSTOM = "custom"

class DeviceStatus(str, Enum):
    RUNNING = "running"
    STOPPED = "stopped"
    ERROR = "error"

class Parameter(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: ParameterType  # 使用 Enum
    unit: Optional[str] = None
    min_value: Optional[Any] = None
    max_value: Optional[Any] = None
    default_value: Optional[Any] = None
    generation_mode: GenerationMode = GenerationMode.RANDOM  # 使用 Enum
    generation_params: Dict[str, Any] = Field(default_factory=dict)
    error_config: Dict[str, Any] = Field(default_factory=dict)  # Add error_config

    @validator('max_value')
    def validate_max_value(cls, v, values):
        if v is not None and 'min_value' in values and values['min_value'] is not None:
            if v < values['min_value']:
                raise ValueError('max_value must be greater than or equal to min_value')
        return v

class Device(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str
    model: Optional[str] = None
    description: Optional[str] = None
    visual_model: Optional[str] = "Generic" # Add visual_model (transient field)
    parameters: List[Parameter] = Field(default_factory=list)
    sampling_rate: int = 1000  # 采样频率，单位：毫秒
    status: DeviceStatus = DeviceStatus.STOPPED  # 使用 Enum
    physics_config: Dict[str, Any] = Field(default_factory=dict) # Add physics_config
    logic_rules: List[Dict[str, Any]] = Field(default_factory=list) # Add logic_rules
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class DeviceInDB(Device):
    class Config:
        from_attributes = True

class DeviceDB(Base):
    """设备数据库模型"""
    __tablename__ = "devices"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    type = Column(String)
    model = Column(String, nullable=True)
    description = Column(String, nullable=True)
    parameters = Column(JSON)
    sampling_rate = Column(Integer, default=1000)
    status = Column(String, default="stopped")
    physics_config = Column(JSON, default={}) # Add physics_config
    logic_rules = Column(JSON, default=[]) # Add logic_rules
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
