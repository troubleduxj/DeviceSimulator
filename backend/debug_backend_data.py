import requests
import time
import json

API_URL = "http://localhost:8000/api"

def debug_data():
    print("--- Debugging Backend Data ---")
    
    # 1. Check Devices
    try:
        devices = requests.get(f"{API_URL}/device/").json()
        print(f"Found {len(devices)} devices.")
        for d in devices:
            print(f" - {d['name']} (ID: {d['id']}, Status: {d['status']})")
            
        # Pick the Plasma Cutter or Welder
        target_device = next((d for d in devices if "Plasma" in d['name'] or "Welder" in d['name']), None)
        if not target_device:
            print("Target device (Plasma/Welder) not found!")
            target_device = devices[0] if devices else None

        if target_device:
            print(f"\nMonitoring device: {target_device['name']} ({target_device['id']})")
            
            # Ensure it's running
            if target_device['status'] != 'running':
                print("Device is stopped. Starting it...")
                requests.patch(f"{API_URL}/device/{target_device['id']}/status/running")
                time.sleep(1)
            
            # Poll data
            print("Polling data (5 times)...")
            for i in range(5):
                resp = requests.get(f"{API_URL}/data/devices/{target_device['id']}/data")
                data = resp.json()
                if data and len(data) > 0:
                    print(f"[{i}] Timestamp: {data[0]['ts']}, Data: {data[0]}")
                else:
                    print(f"[{i}] No data received.")
                time.sleep(1)
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_data()
