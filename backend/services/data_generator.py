import random
import math
from datetime import datetime
from typing import Any, Dict
from models.device import Parameter, ParameterType, GenerationMode

class DataGenerator:
    @staticmethod
    def generate_data(parameter: Parameter) -> Any:
        """根据参数配置生成数据"""
        mode = parameter.generation_mode
        params = parameter.generation_params
        
        value = None
        if mode == GenerationMode.RANDOM:
            value = DataGenerator._generate_random(parameter, params)
        elif mode == GenerationMode.LINEAR:
            value = DataGenerator._generate_linear(parameter, params)
        elif mode == GenerationMode.PERIODIC:
            value = DataGenerator._generate_periodic(parameter, params)
        elif mode == GenerationMode.RANDOM_WALK:
            value = DataGenerator._generate_random_walk(parameter, params)
        elif mode == GenerationMode.CUSTOM:
            value = DataGenerator._generate_custom(parameter, params)
        else:
            raise ValueError(f"不支持的数据生成模式: {mode}")
            
        # 仅对数值类型应用高级特性（噪声、异常）
        if parameter.type == ParameterType.NUMBER and isinstance(value, (int, float)):
            value = DataGenerator._apply_noise(value, params)
            value = DataGenerator._apply_anomaly(value, params, parameter)
            
        return value

    @staticmethod
    def _generate_random_walk(parameter: Parameter, params: Dict[str, Any]) -> Any:
        """生成随机游走数据"""
        # 初始化
        if "current_value" not in params:
            params["current_value"] = parameter.default_value or parameter.min_value or 0
            
        # 步长范围 (默认为最大最小差值的1%或1)
        step_range = params.get("step_range")
        if step_range is None:
            if parameter.max_value is not None and parameter.min_value is not None:
                step_range = (parameter.max_value - parameter.min_value) * 0.01
            else:
                step_range = 1.0
        
        # 随机变动
        change = random.uniform(-step_range, step_range)
        new_value = params["current_value"] + change
        
        # 边界检查
        min_val = parameter.min_value
        max_val = parameter.max_value
        
        if min_val is not None:
            new_value = max(min_val, new_value)
        if max_val is not None:
            new_value = min(max_val, new_value)
            
        params["current_value"] = new_value
        return new_value

    @staticmethod
    def _apply_noise(value: float, params: Dict[str, Any]) -> float:
        """应用高斯噪声"""
        noise_sigma = params.get("noise_sigma", 0)
        if noise_sigma > 0:
            return value + random.gauss(0, noise_sigma)
        return value

    @staticmethod
    def _apply_anomaly(value: float, params: Dict[str, Any], parameter: Parameter) -> Any:
        """应用异常模拟"""
        anomaly_rate = params.get("anomaly_rate", 0) # 0.0 - 1.0
        if anomaly_rate > 0 and random.random() < anomaly_rate:
            anomaly_type = params.get("anomaly_type", "spike") # spike, drop, null, min, max
            
            if anomaly_type == "spike":
                multiplier = params.get("anomaly_multiplier", 1.5)
                return value * multiplier
            elif anomaly_type == "drop":
                return 0
            elif anomaly_type == "null":
                return None
            elif anomaly_type == "min":
                return parameter.min_value if parameter.min_value is not None else 0
            elif anomaly_type == "max":
                return parameter.max_value if parameter.max_value is not None else value * 2
                
        return value
    
    @staticmethod
    def _generate_random(parameter: Parameter, params: Dict[str, Any]) -> Any:
        """生成随机数据"""
        param_type = parameter.type
        min_val = parameter.min_value
        max_val = parameter.max_value
        
        if param_type == ParameterType.NUMBER:
            return random.uniform(min_val or 0, max_val or 100)
        elif param_type == ParameterType.BOOLEAN:
            return random.choice([True, False])
        elif param_type == ParameterType.STRING:
            # 生成随机字符串
            length = params.get("length", 10)
            chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
            return ''.join(random.choice(chars) for _ in range(length))
        else:
            raise ValueError(f"不支持的参数类型: {param_type}")
    
    @staticmethod
    def _generate_linear(parameter: Parameter, params: Dict[str, Any]) -> Any:
        """生成线性变化数据"""
        # 初始化或获取当前值
        if "current_value" not in params:
            params["current_value"] = parameter.default_value or parameter.min_value or 0
        
        # 获取步长，默认1
        step = params.get("step", 1)
        
        # 计算新值
        new_value = params["current_value"] + step
        
        # 检查边界
        min_val = parameter.min_value
        max_val = parameter.max_value
        
        if min_val is not None and max_val is not None:
            if new_value > max_val or new_value < min_val:
                # 反向
                params["step"] = -step
                new_value = params["current_value"] + params["step"]
        
        # 更新当前值
        params["current_value"] = new_value
        return new_value
    
    @staticmethod
    def _generate_periodic(parameter: Parameter, params: Dict[str, Any]) -> Any:
        """生成周期性变化数据"""
        # 使用正弦函数生成周期性数据
        if "time" not in params:
            params["time"] = 0
        
        # 周期，默认100
        period = params.get("period", 100)
        # 振幅，默认(max - min) / 2
        amplitude = params.get("amplitude")
        if amplitude is None:
            min_val = parameter.min_value or 0
            max_val = parameter.max_value or 100
            amplitude = (max_val - min_val) / 2
        
        # 偏移量，默认(min + max) / 2
        offset = params.get("offset")
        if offset is None:
            min_val = parameter.min_value or 0
            max_val = parameter.max_value or 100
            offset = (min_val + max_val) / 2
        
        # 计算值
        value = offset + amplitude * math.sin(2 * math.pi * params["time"] / period)
        
        # 更新时间
        params["time"] += 1
        
        return value
    
    @staticmethod
    def _generate_custom(parameter: Parameter, params: Dict[str, Any]) -> Any:
        """生成自定义函数数据"""
        # 这里可以扩展支持自定义函数，例如通过eval或预定义函数
        # 目前返回默认值
        return parameter.default_value or parameter.min_value or 0
    
    @staticmethod
    def generate_device_data(device_id: str, parameters: list[Parameter]) -> Dict[str, Any]:
        """生成设备的所有参数数据"""
        data = {
            "device_id": device_id,
            "timestamp": datetime.utcnow().isoformat() + 'Z', # Use UTC and ensure changing
            "data": {}
        }
        
        for param in parameters:
            data["data"][param.id] = DataGenerator.generate_data(param)
        
        return data
