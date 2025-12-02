import requests
import json
import time
import random

BASE_URL = "http://localhost:8000"

def test_full_flow():
    print("=== 开始全流程测试: 分类 -> 设备 -> TDengine ===")
    
    # -1. 启用 TDengine
    print("\n-1. 配置并启用 TDengine")
    td_config = {
        "host": "localhost",
        "port": 6030,
        "user": "root",
        "password": "taosdata",
        "database": "device_simulator",
        "enabled": True
    }
    try:
        resp = requests.post(f"{BASE_URL}/api/system/tdengine/config", json=td_config)
        if resp.status_code == 200 and resp.json().get("success"):
            print("TDengine 配置更新成功并已启用")
        else:
            print(f"TDengine 配置更新失败: {resp.text}")
            # 继续尝试，也许已经启用
            
        # 测试连接
        resp = requests.post(f"{BASE_URL}/api/system/tdengine/test-connection")
        print(f"TDengine 连接测试: {resp.json()}")
        
    except Exception as e:
        print(f"配置 TDengine 失败: {e}")
        return

    # 1. 创建分类 (Category)
    # 使用时间戳确保名称唯一
    ts = int(time.time())
    cat_name = f"Sensor_Test_{ts}"
    print(f"\n1. 创建分类: {cat_name}")
    
    category_data = {
        "id": f"cat_{ts}",
        "name": cat_name,
        "description": "自动化测试分类",
        "parameters": [
            {
                "id": f"p1_{ts}",
                "name": "temperature",
                "type": "数值",
                "unit": "C",
                "min_value": -20,
                "max_value": 80,
                "default_value": 25,
                "generation_mode": "random"
            },
            {
                "id": f"p2_{ts}",
                "name": "status",
                "type": "布尔",
                "unit": "",
                "min_value": 0,
                "max_value": 1,
                "default_value": 0,
                "generation_mode": "random"
            }
        ]
    }
    
    try:
        # 0. 启动数据生成服务
        print(f"\n0. 启动数据生成服务")
        resp = requests.post(f"{BASE_URL}/api/data/start")
        print(f"数据生成服务状态: {resp.json()['message']}")

        resp = requests.post(f"{BASE_URL}/api/category/", json=category_data)
        if resp.status_code != 201:
            print(f"创建分类失败: {resp.status_code}, {resp.text}")
            return
        print("分类创建成功")
        
        # 2. 创建设备 (Device)
        # 关联到刚才创建的分类
        print(f"\n2. 创建设备 (关联分类 {cat_name})")
        device_data = {
            "name": f"Device_{cat_name}",
            "type": cat_name, # 这里关联分类名称
            "model": "TestModel-X",
            "description": "自动化测试设备",
            "sampling_rate": 1000,
            "parameters": category_data["parameters"]
        }
        
        resp = requests.post(f"{BASE_URL}/api/device/", json=device_data)
        if resp.status_code != 201:
            print(f"创建设备失败: {resp.status_code}, {resp.text}")
            return
        device_id = resp.json()["id"]
        print(f"设备创建成功, ID: {device_id}")
        
        # 3. 启动设备 (Start Device)
        print(f"\n3. 启动设备")
        resp = requests.patch(f"{BASE_URL}/api/device/{device_id}/status/running")
        if resp.status_code != 200:
            print(f"启动设备失败: {resp.status_code}, {resp.text}")
            return
        print("设备已启动")
        
        # 4. 等待数据生成
        print(f"\n4. 等待数据生成 (5秒)...")
        time.sleep(5)
        
        # 5. 停止设备
        print(f"\n5. 停止设备")
        resp = requests.patch(f"{BASE_URL}/api/device/{device_id}/status/stopped")
        if resp.status_code != 200:
            print(f"停止设备失败: {resp.status_code}, {resp.text}")
        print("设备已停止")
        
        # 6. 验证数据 (Check Data)
        print(f"\n6. 验证数据 (查询 TDengine)")
        # 查询 API: /api/data/devices/{device_id}/data
        resp = requests.get(f"{BASE_URL}/api/data/devices/{device_id}/data?limit=10")
        if resp.status_code != 200:
            print(f"查询数据失败: {resp.status_code}, {resp.text}")
            return
            
        data = resp.json()
        print(f"获取到 {len(data)} 条数据")
        if len(data) > 0:
            print("第一条数据示例:", data[0])
            # 验证是否包含我们定义的参数
            first_record = data[0]
            # 注意: TDengine 返回的字段名可能是小写，或者取决于配置
            # 我们检查 keys
            keys = first_record.keys()
            if "temperature" in keys and "status" in keys:
                 print("验证成功: 数据包含预期字段 temperature 和 status")
            else:
                 print(f"验证失败: 数据字段不匹配. 实际字段: {list(keys)}")
        else:
            print("验证失败: 未获取到数据")
            
    except requests.exceptions.ConnectionError:
        print("连接失败: 请确保后端服务已启动 (http://localhost:8000)")
    except Exception as e:
        print(f"测试过程中发生错误: {e}")

if __name__ == "__main__":
    test_full_flow()
