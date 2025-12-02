import requests
import time

API_URL = "http://localhost:8000/api"

def manage_devices():
    print("--- Managing Devices ---")
    devices = requests.get(f"{API_URL}/device/").json()
    
    for d in devices:
        # Stop problematic old devices
        if d['name'] == "Plasma Cutter Arm":
            print(f"Stopping {d['name']}...")
            requests.patch(f"{API_URL}/device/{d['id']}/status/stopped")
            
        # Start new devices
        if d['name'] in ["Plasma Cutter 01", "Welder Bot 01"]:
            print(f"Starting {d['name']}...")
            requests.patch(f"{API_URL}/device/{d['id']}/status/running")

if __name__ == "__main__":
    manage_devices()
