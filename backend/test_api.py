import requests
import json
import time

# API基础URL
BASE_URL = "http://localhost:8000"

def test_system_status():
    """测试系统状态API"""
    print("测试系统状态API...")
    response = requests.get(f"{BASE_URL}/api/system/status")
    print(f"状态码: {response.status_code}")
    print(f"响应内容: {response.json()}")
    print()
    return response.status_code == 200

def test_tdengine_connection():
    """测试TDengine连接"""
    print("测试TDengine连接...")
    response = requests.post(f"{BASE_URL}/api/system/tdengine/test-connection")
    print(f"状态码: {response.status_code}")
    print(f"响应内容: {response.json()}")
    print()
    return response.status_code == 200

def test_create_device():
    """测试创建设备API"""
    print("测试创建设备API...")
    device_data = {
        "name": "测试设备",
        "type": "传感器",
        "model": "Test-001",
        "description": "用于测试的设备",
        "sampling_rate": 1000,
        "parameters": [
            {
                "name": "温度",
                "type": "数值",
                "unit": "°C",
                "min_value": 0,
                "max_value": 100,
                "default_value": 25,
                "generation_mode": "random"
            },
            {
                "name": "湿度",
                "type": "数值",
                "unit": "%",
                "min_value": 0,
                "max_value": 100,
                "default_value": 50,
                "generation_mode": "linear"
            }
        ]
    }
    
    response = requests.post(f"{BASE_URL}/api/device/", json=device_data)
    print(f"状态码: {response.status_code}")
    print(f"响应内容: {response.json()}")
    print()
    
    if response.status_code == 201:
        return response.json()["id"]
    return None

def test_get_devices():
    """测试获取设备列表API"""
    print("测试获取设备列表API...")
    response = requests.get(f"{BASE_URL}/api/device/")
    print(f"状态码: {response.status_code}")
    print(f"设备数量: {len(response.json())}")
    print()
    return response.status_code == 200

def test_start_data_generation():
    """测试启动数据生成API"""
    print("测试启动数据生成API...")
    response = requests.post(f"{BASE_URL}/api/data/start")
    print(f"状态码: {response.status_code}")
    print(f"响应内容: {response.json()}")
    print()
    return response.status_code == 200

def test_data_generation_status():
    """测试获取数据生成状态API"""
    print("测试获取数据生成状态API...")
    response = requests.get(f"{BASE_URL}/api/data/status")
    print(f"状态码: {response.status_code}")
    print(f"响应内容: {response.json()}")
    print()
    return response.status_code == 200

def test_get_device_data(device_id):
    """测试获取设备数据API"""
    print("测试获取设备数据API...")
    # 等待一段时间，让数据生成服务生成一些数据
    time.sleep(2)
    response = requests.get(f"{BASE_URL}/api/data/device/{device_id}")
    print(f"状态码: {response.status_code}")
    print(f"数据条数: {len(response.json())}")
    print()
    return response.status_code == 200

def test_stop_data_generation():
    """测试停止数据生成API"""
    print("测试停止数据生成API...")
    response = requests.post(f"{BASE_URL}/api/data/stop")
    print(f"状态码: {response.status_code}")
    print(f"响应内容: {response.json()}")
    print()
    return response.status_code == 200

def test_delete_device(device_id):
    """测试删除设备API"""
    print("测试删除设备API...")
    response = requests.delete(f"{BASE_URL}/api/device/{device_id}")
    print(f"状态码: {response.status_code}")
    print()
    return response.status_code == 204

def run_all_tests():
    """运行所有测试"""
    print("开始运行所有测试...")
    print("=" * 50)
    
    # 测试系统状态
    test_system_status()
    
    # 测试TDengine连接
    test_tdengine_connection()
    
    # 测试创建设备
    device_id = test_create_device()
    
    if device_id:
        # 测试获取设备列表
        test_get_devices()
        
        # 测试启动数据生成
        test_start_data_generation()
        
        # 测试获取数据生成状态
        test_data_generation_status()
        
        # 测试获取设备数据
        test_get_device_data(device_id)
        
        # 测试停止数据生成
        test_stop_data_generation()
        
        # 测试删除设备
        test_delete_device(device_id)
    
    print("=" * 50)
    print("所有测试完成!")

if __name__ == "__main__":
    run_all_tests()
