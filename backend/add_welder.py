import sys
import os
import uuid
import requests
import json

# Configuration
API_URL = "http://localhost:8000/api"

def add_welder():
    print("Adding Welder Device...")

    # 1. Create Category
    category_code = "welder"
    category_data = {
        "id": str(uuid.uuid4()),
        "name": "Robotic Welder",
        "code": category_code,
        "description": "Automated Arc Welding Robot",
        "parameters": [
            {"id": "welding_current", "name": "Welding Current", "type": "数值", "unit": "A", "min_value": 50, "max_value": 300, "generation_mode": "random"},
            {"id": "welding_voltage", "name": "Welding Voltage", "type": "数值", "unit": "V", "min_value": 15, "max_value": 40, "generation_mode": "random"},
            {"id": "wire_feed_speed", "name": "Wire Feed Speed", "type": "数值", "unit": "m/min", "min_value": 1, "max_value": 15, "generation_mode": "linear", "generation_params": {"step": 0.1}},
            {"id": "gas_flow", "name": "Shielding Gas Flow", "type": "数值", "unit": "L/min", "min_value": 10, "max_value": 25, "generation_mode": "random_walk"},
            {"id": "tip_temperature", "name": "Tip Temperature", "type": "数值", "unit": "°C", "min_value": 100, "max_value": 500, "generation_mode": "random_walk"}
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
        "name": "Welder Bot 01",
        "type": category_code,
        "description": "Spot welding unit for chassis assembly",
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
                new_device = resp.json()
                print(f"New Device ID: {new_device['id']}")
            else:
                print(f"Failed to create device: {resp.text}")
        else:
            print("Device already exists.")

    except Exception as e:
        print(f"Error managing device: {e}")

if __name__ == "__main__":
    add_welder()
