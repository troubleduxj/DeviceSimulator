import requests
import time

BASE_URL = "http://localhost:8000"

def test_category_crud():
    print("=== 开始测试分类 CRUD ===")
    
    ts = int(time.time())
    cat_name = f"CRUD_Test_{ts}"
    cat_id = f"crud_{ts}"
    
    # 1. 创建 (Create)
    print(f"\n1. 创建分类: {cat_name}")
    category_data = {
        "id": cat_id,
        "name": cat_name,
        "code": cat_id,
        "description": "初始描述",
        "parameters": [
            {"id": "p1", "name": "temp", "type": "数值", "unit": "C"}
        ]
    }
    
    resp = requests.post(f"{BASE_URL}/api/category/", json=category_data)
    if resp.status_code != 201:
        print(f"创建失败: {resp.status_code}, {resp.text}")
        return
    created_cat = resp.json()
    print(f"创建成功: ID={created_cat['id']}")
    
    # 2. 读取 (Read)
    print(f"\n2. 读取分类列表")
    resp = requests.get(f"{BASE_URL}/api/category/")
    categories = resp.json()
    found = False
    for cat in categories:
        if cat['id'] == created_cat['id']:
            found = True
            print(f"找到分类: {cat['name']}, 描述: {cat['description']}")
            break
    if not found:
        print("未找到创建的分类")
        return

    # 3. 更新 (Update)
    print(f"\n3. 更新分类")
    update_data = {
        "id": created_cat['id'],
        "name": f"{cat_name}_Updated",
        "code": cat_id, # Keep same code
        "description": "更新后的描述",
        "parameters": [
            {"id": "p1", "name": "temp", "type": "数值", "unit": "C"},
            {"id": "p2", "name": "hum", "type": "数值", "unit": "%"}
        ]
    }
    
    resp = requests.put(f"{BASE_URL}/api/category/{created_cat['id']}", json=update_data)
    if resp.status_code != 200:
        print(f"更新失败: {resp.status_code}, {resp.text}")
        return
    updated_cat = resp.json()
    print(f"更新成功: Name={updated_cat['name']}, Desc={updated_cat['description']}, Params Count={len(updated_cat['parameters'])}")
    
    if updated_cat['name'] != update_data['name'] or len(updated_cat['parameters']) != 2:
        print("更新验证失败: 数据不匹配")
        return

    # 3.1 验证级联更新 (Cascade Update)
    print(f"\n3.1 验证级联更新")
    # 创建一个设备使用该分类
    device_data = {
        "name": f"Dev_Casc_{ts}",
        "type": updated_cat['code'], # Use code
        "model": "M1",
        "parameters": []
    }
    resp = requests.post(f"{BASE_URL}/api/device/", json=device_data)
    if resp.status_code == 201:
        device_id = resp.json()['id']
        print(f"创建测试设备 {device_data['name']} 成功，类型为 {device_data['type']}")
        
        # 再次更新分类名称和编码
        new_cat_name = f"{cat_name}_Renamed"
        new_cat_code = f"{cat_id}_Renamed"
        update_data['name'] = new_cat_name
        update_data['code'] = new_cat_code
        
        resp = requests.put(f"{BASE_URL}/api/category/{created_cat['id']}", json=update_data)
        if resp.status_code == 200:
            print(f"分类重命名为 {new_cat_name}, 编码为 {new_cat_code}")
            
            # 检查设备类型是否更新
            resp = requests.get(f"{BASE_URL}/api/device/")
            devices = resp.json()
            target_device = next((d for d in devices if d['id'] == device_id), None)
            if target_device and target_device['type'] == new_cat_code:
                print("级联更新验证成功: 设备类型已自动更新")
            else:
                print(f"级联更新验证失败: 设备类型为 {target_device['type'] if target_device else 'None'} (期望: {new_cat_code})")
                
        # 清理设备
        requests.delete(f"{BASE_URL}/api/device/{device_id}")
    else:
        print(f"创建测试设备失败: {resp.text}")


    # 4. 删除 (Delete)
    print(f"\n4. 删除分类")
    resp = requests.delete(f"{BASE_URL}/api/category/{created_cat['id']}")
    if resp.status_code != 204:
        print(f"删除失败: {resp.status_code}, {resp.text}")
        return
    print("删除成功")
    
    # 验证删除
    resp = requests.get(f"{BASE_URL}/api/category/")
    categories = resp.json()
    found = False
    for cat in categories:
        if cat['id'] == created_cat['id']:
            found = True
            break
    if found:
        print("删除验证失败: 分类仍然存在")
    else:
        print("删除验证成功: 分类已消失")

if __name__ == "__main__":
    test_category_crud()
