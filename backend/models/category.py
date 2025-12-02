from sqlalchemy import Column, String, JSON, DateTime
from models.base import Base
from pydantic import BaseModel, Field
from datetime import datetime
import uuid
from typing import List, Optional

class CategoryDB(Base):
    __tablename__ = "categories"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)  # 显示名称，允许重复（或者也可以保持唯一，看需求，通常显示名也最好唯一）
    code = Column(String, unique=True, index=True)  # 编码，作为超级表名，必须唯一
    description = Column(String, nullable=True)
    parameters = Column(JSON)  # 定义该分类下设备的参数模板
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str
    description: Optional[str] = None
    parameters: List[dict] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True
