import sys
import os

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from services.device_service import DeviceService
from services.database_service import SessionLocal

def check_running_devices():
    print("Checking for running devices...")
    try:
        service = DeviceService()
        # The service uses its own session, but let's be explicit if needed.
        # implementation of get_all_devices usually opens a session.
        devices = service.get_all_devices()
        
        running_devices = [d for d in devices if d.status == "running"]
        
        print(f"Total devices: {len(devices)}")
        print(f"Running devices: {len(running_devices)}")
        
        for d in running_devices:
            print(f" - ID: {d.id}")
            print(f"   Name: {d.name}")
            print(f"   Type: {d.type}")
            print(f"   Status: {d.status}")
            print("---")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_running_devices()
