import requests
import json
import sys
import os

BASE_URL = "http://localhost:8000"

def check_devices_and_tables():
    print("Checking devices...")
    try:
        # 1. Get Devices
        resp = requests.get(f"{BASE_URL}/api/device/")
        if resp.status_code != 200:
            print(f"Failed to get devices: {resp.status_code}")
            return
        
        devices = resp.json()
        print(f"Found {len(devices)} devices.")
        
        if len(devices) == 0:
            print("No devices found. Please create a device first.")
            return

        # 2. Get Stables
        resp = requests.get(f"{BASE_URL}/api/system/tdengine/stables")
        if resp.status_code != 200:
            print(f"Failed to get stables: {resp.status_code}")
            return
        
        stables = resp.json()
        # Parse stable names
        stable_names = []
        for s in stables:
            name = s.get('name') or s.get('stable_name') or s.get('TABLE_NAME')
            if name: stable_names.append(name)
            
        print(f"Found {len(stable_names)} stables: {stable_names}")
        
        # 3. Check Tables for each Stable
        for s_name in stable_names:
            print(f"Checking tables for stable '{s_name}'...")
            resp = requests.get(f"{BASE_URL}/api/system/tdengine/tables?stable={s_name}")
            tables = resp.json()
            print(f"  - Found {len(tables)} tables: {tables}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_devices_and_tables()
