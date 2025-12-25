import sys
import os
import multiprocessing
import uvicorn
import argparse
import shutil

# Ensure backend directory is in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

def setup_environment():
    """Setup environment for frozen app"""
    if getattr(sys, 'frozen', False):
        # We are running in a bundle
        app_data_dir = os.path.join(os.environ.get('APPDATA', os.getcwd()), 'IoTDeviceSimulator')
        if not os.path.exists(app_data_dir):
            try:
                os.makedirs(app_data_dir)
            except Exception as e:
                print(f"Failed to create app data dir: {e}")
        
        # Determine source DB path (bundled)
        # In PyInstaller, bundled files are in sys._MEIPASS
        # We assume the db is put into the root of the bundle or 'backend' folder in bundle
        bundle_dir = sys._MEIPASS
        # Based on .spec file, we will put db in 'backend' folder inside bundle if we keep structure
        source_db = os.path.join(bundle_dir, 'backend', 'device_simulator.db')
        
        # If source not there, try root (depends on how we pack it)
        if not os.path.exists(source_db):
            source_db = os.path.join(bundle_dir, 'device_simulator.db')

        target_db = os.path.join(app_data_dir, 'device_simulator.db')
        
        # If DB doesn't exist in AppData, copy it from bundle (if exists)
        if not os.path.exists(target_db):
            if os.path.exists(source_db):
                print(f"Copying default database from {source_db} to {target_db}")
                try:
                    shutil.copy2(source_db, target_db)
                except Exception as e:
                    print(f"Failed to copy database: {e}")
            else:
                print(f"No default database found at {source_db}, a new one will be created.")

        # Set environment variable for config.py to pick up
        os.environ['IOT_SIMULATOR_DB_PATH'] = target_db
        os.environ['IOT_SIMULATOR_LOG_DIR'] = os.path.join(app_data_dir, 'logs')
        
        print(f"Environment setup complete. DB Path: {target_db}")

if __name__ == "__main__":
    # PyInstaller multiprocessing fix for Windows
    multiprocessing.freeze_support()
    
    setup_environment()
    
    parser = argparse.ArgumentParser(description="IoT Device Simulator Backend")
    parser.add_argument("--port", type=int, default=8000, help="Port to run the server on")
    args = parser.parse_args()
    
    # Import app AFTER setting up environment so config.py reads the env vars
    try:
        from main import app
    except ImportError as e:
        print(f"Failed to import app: {e}")
        sys.exit(1)
    
    print(f"Starting server on port {args.port}...")
    # Cannot use reload=True in frozen app
    uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="info")
