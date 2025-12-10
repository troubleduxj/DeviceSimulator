import sys
import os
import requests
import json

# Add current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

API_URL = "http://localhost:8000/api"

def debug_device():
    print("=== Debugging Device Data Generation ===")
    
    # 1. Check Global System Status
    try:
        resp = requests.get(f"{API_URL}/data/status")
        status = resp.json()
        print(f"Global Data Generation Running: {status.get('running')}")
        if not status.get('running'):
            print("WARNING: Global data generation is STOPPED. No devices will generate data.")
    except Exception as e:
        print(f"Error checking system status: {e}")

    # 2. Find TestCutter03
    device_id = None
    try:
        resp = requests.get(f"{API_URL}/device/")
        devices = resp.json()
        target = next((d for d in devices if d['name'] == 'TestCutter03'), None)
        
        if not target:
            print("Error: Device 'TestCutter03' not found.")
            return
            
        device_id = target['id']
        print(f"Found Device: {target['name']} (ID: {target['id']})")
        print(f"Status: {target['status']}")
        print(f"Type: {target['type']}")
        print(f"Parameters: {len(target['parameters'])}")
        for p in target['parameters']:
            print(f"  - {p['name']} ({p.get('id', 'no-id')}): {p['type']} / {p.get('generation_mode')} [is_tag={p.get('is_tag')}]")
            
        if target['status'] != 'running':
            print("WARNING: Device is currently STOPPED.")

    except Exception as e:
        print(f"Error fetching device: {e}")
        return

    # 3. Test Data Generation (Simulate what DataWriter does)
    # We can't easily invoke DataWriter directly from here without importing backend modules,
    # which might have path issues if not careful. 
    # But we can try to fetch data from the API to see if any exists.
    
    try:
        resp = requests.get(f"{API_URL}/data/devices/{device_id}/data?limit=5")
        data = resp.json()
        print(f"\nRecent Data Records: {len(data)}")
        for d in data:
            print(f"  - {d}")
    except Exception as e:
        print(f"Error fetching data records: {e}")

if __name__ == "__main__":
    debug_device()
