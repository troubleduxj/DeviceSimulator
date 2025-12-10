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

class DataWriter:
    def __init__(self):
        self.running = False
        self.thread = None
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
                # 注意：这里需要一个新的Session来获取设备，因为DeviceService内部可能会用不同的session
                # 或者我们依赖 DeviceService.get_all_devices() 内部处理
                devices = [d for d in self.device_service.get_all_devices() if d.status == "running"]
                
                if not devices:
                    time.sleep(1)
                    continue
                
                self.process_devices(devices)
                
                time.sleep(1.0) # 1Hz loop (adjustable)
                
            except Exception as e:
                print(f"DataWriter loop error: {e}")
                time.sleep(1)

    def process_devices(self, devices: List[Device]):
        """
        生成并写入数据的主入口
        """
        try:
            # 确保服务已根据最新配置启动
            mqtt_service.start()
            modbus_service.start()
            opcua_service.start()
            
            # 检查TDengine连接（如果启用）
            tdengine_connected = False
            if ConfigService.is_tdengine_enabled():
                if tdengine_service.check_connection():
                    tdengine_connected = True
                else:
                    print("TDengine连接失败，将跳过TDengine写入")

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
                        # TDengine does not allow inserting values for TAGS via INSERT
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
                            # 确保表存在 (仅在必要时，且应由DeviceService管理)
                            # tdengine_service.create_table_for_device(device) 
                            # Commented out: Table creation should be handled by DeviceService to support Super Tables correctly.
                            # Calling create_table_for_device here might try to create a normal table with Tags as Columns, which is wrong.
                            
                            # 写入数据
                            tdengine_service.insert_data(device.id, td_data)
                    except Exception as e:
                        print(f"设备 {device.name} 数据写入TDengine失败: {e}")
                
                # 2. 推送 MQTT
                mqtt_service.publish(device.id, data)
                
                # 3. 更新 Modbus
                modbus_service.update(device.id, data["data"], device.parameters)

                # 4. 更新 OPC UA
                opcua_service.update(device.id, data["data"], device.parameters)

        except Exception as e:
            print(f"数据写入流程异常: {e}")

# 创建全局数据写入服务实例
data_writer = DataWriter()
