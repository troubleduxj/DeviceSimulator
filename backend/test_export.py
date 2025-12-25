import requests
import sys

BASE_URL = "http://localhost:8000"

def test_export():
    print("Testing Export API...")
    # First, get a device ID (assuming some exist or we use a dummy one if mocked)
    # But better to list devices first
    try:
        resp = requests.get(f"{BASE_URL}/api/device/")
        if resp.status_code != 200:
            print("Failed to list devices")
            return
        
        devices = resp.json()
        if not devices:
            print("No devices found to export")
            return

        device_id = devices[0]['id']
        print(f"Exporting data for device: {device_id}")

        # Call Export
        export_resp = requests.get(f"{BASE_URL}/api/data/devices/{device_id}/export?format=csv")
        
        if export_resp.status_code == 200:
            print("Export successful!")
            content = export_resp.text
            print(f"Content preview (first 100 chars): {content[:100]}")
            if "Timestamp" in content or "," in content:
                print("Content looks like CSV.")
            else:
                print("Warning: Content does not look like CSV.")
        elif export_resp.status_code == 404:
             print("Export returned 404 (No data found), which is a valid response if DB is empty.")
        elif export_resp.status_code == 400 and "TDengine is disabled" in export_resp.text:
             print("Export skipped: TDengine is disabled.")
        else:
            print(f"Export failed with status {export_resp.status_code}: {export_resp.text}")

    except Exception as e:
        print(f"Test failed with exception: {e}")

if __name__ == "__main__":
    test_export()
