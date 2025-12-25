from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from services.database_service import Base

class PromptVersion(Base):
    __tablename__ = "prompt_versions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    prompt_key = Column(String, ForeignKey("prompts.key"))
    version = Column(Integer)
    template = Column(Text)
    description = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    comment = Column(String, nullable=True)

    prompt = relationship("Prompt", back_populates="versions")

class Prompt(Base):
    __tablename__ = "prompts"

    key = Column(String, primary_key=True, index=True)
    description = Column(String)
    template = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    versions = relationship("PromptVersion", back_populates="prompt", cascade="all, delete-orphan", order_by="desc(PromptVersion.version)")
