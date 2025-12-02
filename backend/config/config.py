import os
from pydantic_settings import BaseSettings
from typing import Optional

# 获取项目根目录 (DeviceSimulator/)
# __file__ = backend/config/config.py
# dirname(1) = backend/config
# dirname(2) = backend
# dirname(3) = DeviceSimulator (root)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(PROJECT_ROOT, "backend", "device_simulator.db")

class Settings(BaseSettings):
    # TDengine配置 - 现在作为默认值，实际配置从数据库读取
    tdengine_host: str = "localhost"
    tdengine_port: int = 6030
    tdengine_user: str = "root"
    tdengine_password: str = "taosdata"
    tdengine_database: str = "device_simulator"
    tdengine_enabled: bool = False  # TDengine开关，默认关闭
    
    # 数据库配置
    database_url: str = f"sqlite:///{DB_PATH}"  # 使用绝对路径，确保数据库文件位置固定
    
    # 系统配置
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    debug: bool = True
    
    # 数据生成配置
    default_sampling_rate: int = 1000  # 默认采样频率，单位：毫秒
    max_batch_size: int = 1000  # 批量写入最大条数
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
