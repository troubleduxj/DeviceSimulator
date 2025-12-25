import threading
import time
from typing import List, Dict, Any
from models.device import Device
from services.device_service import DeviceService
from services.tdengine_service import tdengine_service
from services.data_generator import DataGenerator
from services.config_service import ConfigService
from services.protocols.mqtt_service import mqtt_service
from services.protocols.modbus_service import modbus_service
from services.protocols.opcua_service import opcua_service
from utils.logger import logger

class DataWriter:
    def __init__(self):
        self.running = False
        self.thread = None
        self.device_service = DeviceService()
        self.interval = 1.0 # Default 1s
        self._device_cache = []
        self._last_cache_update = 0
        self._cache_ttl = 5.0 # Update cache every 5 seconds
    
    def start(self):
        """启动数据写入服务"""
        if not self.running:
            # Services are now managed by main application lifecycle
            logger.info("Starting DataWriter service...")
            self.running = True
            self.thread = threading.Thread(target=self._write_data_loop)
            self.thread.daemon = True
            self.thread.start()
            return True
        return False
    
    def stop(self):
        """停止数据写入服务"""
        if self.running:
            logger.info("Stopping DataWriter service...")
            self.running = False
            if self.thread:
                self.thread.join()
            return True
        return False

    def _write_data_loop(self):
        """数据写入循环"""
        logger.info("DataWriter loop started")
        while self.running:
            loop_start = time.time()
            try:
                # 1. 获取所有运行中的设备 (with caching)
                current_time = time.time()
                if current_time - self._last_cache_update > self._cache_ttl:
                    # Refresh cache
                    try:
                        all_devices = self.device_service.get_all_devices()
                        self._device_cache = [d for d in all_devices if d.status == "running"]
                        self._last_cache_update = current_time
                    except Exception as e:
                        logger.error(f"Error updating device cache: {e}")
                
                if not self._device_cache:
                    time.sleep(1)
                    continue
                
                self.process_devices(self._device_cache)
                
                # Maintain loop frequency
                elapsed = time.time() - loop_start
                sleep_time = max(0.1, self.interval - elapsed)
                time.sleep(sleep_time)
                
            except Exception as e:
                logger.error(f"DataWriter loop error: {e}")
                time.sleep(1)

    def process_devices(self, devices: List[Device]):
        """
        生成并写入数据的主入口
        """
        try:
            # 检查TDengine连接（如果启用）
            tdengine_connected = False
            if ConfigService.is_tdengine_enabled():
                if tdengine_service.check_connection():
                    tdengine_connected = True
                else:
                    # logger.warning("TDengine connection failed, skipping write") 
                    pass

            for device in devices:
                # 生成数据
                data = DataGenerator.generate_device_data(
                    device.id, 
                    device.parameters, 
                    device.physics_config if hasattr(device, 'physics_config') else None,
                    device.logic_rules if hasattr(device, 'logic_rules') else None
                )
                
                # 1. 如果TDengine启用且连接成功，写入TDengine
                if tdengine_connected:
                    try:
                        # Filter out TAGS from data payload for TDengine insertion
                        td_data = data.copy()
                        td_data["data"] = {}
                        
                        tag_ids = set()
                        for p in device.parameters:
                            # Check is_tag (Pydantic model or dict)
                            is_tag = False
                            if isinstance(p, dict):
                                is_tag = p.get('is_tag', False)
                            elif hasattr(p, 'is_tag'):
                                is_tag = p.is_tag
                            
                            if is_tag:
                                p_id = p.get('id') if isinstance(p, dict) else p.id
                                if p_id: tag_ids.add(p_id)
                        
                        # Also add standard tags to exclusion list
                        tag_ids.add('device_id')
                        tag_ids.add('device_name')
                        tag_ids.add('device_model')

                        for k, v in data["data"].items():
                            if k not in tag_ids:
                                td_data["data"][k] = v
                        
                        # Only insert if there are metrics (columns) to insert
                        if td_data["data"]:
                            tdengine_service.insert_data(device.id, td_data)
                    except Exception as e:
                        logger.error(f"Device {device.name} TDengine write failed: {e}")
                
                # 2. 推送 MQTT
                mqtt_service.publish(device.id, data)
                
                # 3. 更新 Modbus
                modbus_service.update(device.id, data["data"], device.parameters)

                # 4. 更新 OPC UA
                opcua_service.update(device.id, data["data"], device.parameters)

        except Exception as e:
            logger.error(f"DataWriter process exception: {e}")

# 创建全局数据写入服务实例
data_writer = DataWriter()
