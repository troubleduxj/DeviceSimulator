import sys
import os
from services.device_service import DeviceService
from services.tdengine_service import tdengine_service
from services.config_service import ConfigService

# Add current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def sync_tdengine():
    print("Starting TDengine synchronization...")
    
    # Ensure TDengine is enabled
    if not ConfigService.is_tdengine_enabled():
        print("TDengine is disabled. Please enable it first.")
        return

    # Connect to TDengine
    if not tdengine_service.connect():
        print("Failed to connect to TDengine.")
        return

    # Get all devices
    devices = DeviceService.get_all_devices()
    print(f"Found {len(devices)} devices in database.")

    for device in devices:
        print(f"\nProcessing device: {device.name} (ID: {device.id}, Type: {device.type})")
        
        try:
            # 1. Create/Ensure Super Table
            st_name = device.type
            print(f"  Creating/Checking super table: {st_name}")
            if tdengine_service.create_super_table(st_name, device.parameters):
                print(f"  Super table {st_name} synced.")
            else:
                print(f"  Failed to sync super table {st_name}.")
            
            # 2. Create/Ensure Sub Table
            sub_table_name = f"`device_{device.id}`"
            tags = {
                "device_id": device.id,
                "device_name": device.name,
                "device_model": device.model or ""
            }
            print(f"  Creating/Checking sub table: {sub_table_name}")
            if tdengine_service.create_sub_table(st_name, sub_table_name, tags):
                 print(f"  Sub table {sub_table_name} synced.")
            else:
                 print(f"  Failed to sync sub table {sub_table_name}.")
                 
        except Exception as e:
            print(f"  Error syncing device {device.name}: {e}")

    print("\nSynchronization completed.")

if __name__ == "__main__":
    sync_tdengine()
