from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config.config import settings

# 创建SQLAlchemy引擎
engine = create_engine(
    settings.database_url, connect_args={"check_same_thread": False}
)

# 创建SessionLocal类，每个实例将是一个数据库会话
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建Base类，所有模型类都将继承自这个类
from models.base import Base

# 依赖项，用于获取数据库会话
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
