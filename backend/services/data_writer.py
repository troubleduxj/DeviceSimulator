import threading
import time
from typing import List, Dict
from models.device import Device
from services.device_service import DeviceService
from services.data_generator import DataGenerator
from services.tdengine_service import tdengine_service
from services.config_service import ConfigService
from config.config import settings

class DataWriter:
    def __init__(self):
        self.running = False
        self.thread = None
        self.batch_size = settings.max_batch_size
        self.device_service = DeviceService()
    
    def start(self):
        """启动数据写入服务"""
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self._write_data_loop)
            self.thread.daemon = True
            self.thread.start()
            return True
        return False
    
    def stop(self):
        """停止数据写入服务"""
        if self.running:
            self.running = False
            if self.thread:
                self.thread.join()
            return True
        return False
    
    def _write_data_loop(self):
        """数据写入循环"""
        while self.running:
            try:
                # 1. 获取所有运行中的设备
                devices = [d for d in self.device_service.get_all_devices() if d.status == "running"]
                
                if not devices:
                    if int(time.time()) % 5 == 0: # Log every 5 seconds if no devices
                        print("No running devices...")
                    time.sleep(1)
                    continue
                
                for device in devices:
                    # 生成数据
                    data = DataGenerator.generate_device_data(device.id, device.parameters)
                    
                    # 如果TDengine启用，写入TDengine
                    if ConfigService.is_tdengine_enabled():
                        try:
                            tdengine_service.insert_data(device.id, data)
                            # print(f"Data written for {device.name}") # Reduce noise
                        except Exception as e:
                            print(f"TDengine数据写入失败 ({device.name}): {e}")
                
                # 简单休眠 (Simple sleep)
                time.sleep(0.1) # 10Hz loop for now
                
            except Exception as e:
                print(f"DataWriter error: {e}")
                time.sleep(1)
    
    def write_batch_data(self, device_id: str, data_list: List[Dict[str, any]]) -> bool:
        """批量写入数据"""
        if ConfigService.is_tdengine_enabled():
            try:
                return tdengine_service.batch_insert_data(device_id, data_list)
            except Exception as e:
                print(f"TDengine批量写入失败: {e}")
                return False
        else:
            print("TDengine未启用，跳过批量数据写入")
            return True
    
    def write_single_data(self, device_id: str, data: Dict[str, any]) -> bool:
        """写入单条数据"""
        if ConfigService.is_tdengine_enabled():
            try:
                return tdengine_service.insert_data(device_id, data)
            except Exception as e:
                print(f"TDengine单条写入失败: {e}")
                return False
        else:
            print("TDengine未启用，跳过单条数据写入")
            return True

# 创建全局数据写入服务实例
data_writer = DataWriter()
