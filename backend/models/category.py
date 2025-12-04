from sqlalchemy import Column, String, JSON, DateTime
from models.base import Base
from pydantic import BaseModel, Field
from datetime import datetime
import uuid
from typing import List, Optional, Dict, Any
from models.device import Parameter

class CategoryDB(Base):
    __tablename__ = "categories"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)  # 显示名称
    code = Column(String, unique=True, index=True)  # 编码，作为超级表名
    description = Column(String, nullable=True)
    visual_model = Column(String, default="Generic") # 3D模型类型
    parameters = Column(JSON)  # 定义该分类下设备的参数模板
    physics_config = Column(JSON, default={}) # 物理仿真配置 (新增)
    logic_rules = Column(JSON, default=[]) # 逻辑规则配置 (新增)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str
    description: Optional[str] = None
    visual_model: str = "Generic" # 新增
    parameters: List[Parameter] = Field(default_factory=list) # 使用 Parameter 类型
    physics_config: Dict[str, Any] = Field(default_factory=dict) # 新增
    logic_rules: List[Dict[str, Any]] = Field(default_factory=list) # 新增
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True
