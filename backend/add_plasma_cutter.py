import sys
import os
import uuid
import requests
import json

# Configuration
API_URL = "http://localhost:8000/api"

def add_plasma_cutter():
    print("Adding Single Head Plasma Cutter...")

    # 1. Create Category
    category_code = "single_head_cutter"
    category_data = {
        "id": str(uuid.uuid4()),
        "name": "Single Head Plasma Cutter",
        "code": category_code,
        "description": "High-precision single head plasma cutting machine",
        "parameters": [
            {"id": "arc_voltage", "name": "Arc Voltage", "type": "数值", "unit": "V", "min_value": 80, "max_value": 200, "generation_mode": "random"},
            {"id": "gas_pressure", "name": "Gas Pressure", "type": "数值", "unit": "psi", "min_value": 40, "max_value": 120, "generation_mode": "random"},
            {"id": "cutting_speed", "name": "Cutting Speed", "type": "数值", "unit": "mm/min", "min_value": 0, "max_value": 5000, "generation_mode": "linear", "generation_params": {"step": 50}},
            {"id": "torch_height", "name": "Torch Height", "type": "数值", "unit": "mm", "min_value": 1, "max_value": 10, "generation_mode": "random_walk"},
            {"id": "pierce_count", "name": "Pierce Count", "type": "数值", "unit": "", "min_value": 0, "max_value": 1000, "generation_mode": "custom"}
        ]
    }

    # Check if category exists
    try:
        cats = requests.get(f"{API_URL}/category/").json()
        exists = any(c['code'] == category_code for c in cats)
        if not exists:
            print(f"Creating category: {category_data['name']}")
            resp = requests.post(f"{API_URL}/category/", json=category_data)
            if resp.status_code == 201:
                print("Category created successfully.")
            else:
                print(f"Failed to create category: {resp.text}")
        else:
            print("Category already exists.")
            
        # Sync TDengine for category (create super table)
        print("Syncing TDengine schema...")
        resp = requests.post(f"{API_URL}/category/sync-tdengine")
        print(f"Sync result: {resp.json()}")

    except Exception as e:
        print(f"Error managing category: {e}")
        return

    # 2. Create Device
    device_data = {
        "name": "Plasma Cutter 01",
        "type": category_code,
        "description": "Unit 01 - Production Line A",
        "sampling_rate": 1000,
        "status": "stopped",
        "parameters": category_data["parameters"] # Inherit parameters
    }

    try:
        devs = requests.get(f"{API_URL}/device/").json()
        exists = any(d['name'] == device_data['name'] for d in devs)
        if not exists:
            print(f"Creating device: {device_data['name']}")
            resp = requests.post(f"{API_URL}/device/", json=device_data)
            if resp.status_code == 200 or resp.status_code == 201:
                print("Device created successfully.")
                # Get the new device ID
                new_device = resp.json()
                print(f"New Device ID: {new_device['id']}")
            else:
                print(f"Failed to create device: {resp.text}")
        else:
            print("Device already exists.")

    except Exception as e:
        print(f"Error managing device: {e}")

if __name__ == "__main__":
    add_plasma_cutter()
