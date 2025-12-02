import sqlite3
import json
import shutil
import os
from datetime import datetime

# 获取项目根目录 (DeviceSimulator/)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(PROJECT_ROOT, "device_simulator.db")
BACKUP_PATH = f"{DB_PATH}.backup_{datetime.now().strftime('%Y%m%d%H%M%S')}"

def migrate_db():
    # 1. Backup DB
    if os.path.exists(DB_PATH):
        shutil.copy2(DB_PATH, BACKUP_PATH)
        print(f"Database backed up to {BACKUP_PATH}")
    else:
        print("Database file not found!")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 2. Get all devices
        cursor.execute("SELECT id, status, parameters FROM devices")
        rows = cursor.fetchall()
        
        updated_count = 0
        
        for row in rows:
            device_id, status, parameters_json = row
            needs_update = False
            
            # Update status
            new_status = status
            if status == 'active':
                new_status = 'running'
                needs_update = True
            elif status not in ['running', 'stopped', 'error']:
                # Default to stopped if unknown
                new_status = 'stopped'
                needs_update = True
            
            # Update parameters
            try:
                params = json.loads(parameters_json)
                # Handle double encoding if necessary
                if isinstance(params, str):
                    try:
                        params = json.loads(params)
                    except json.JSONDecodeError:
                        pass
                
                # Ensure params is a list
                if not isinstance(params, list):
                    print(f"Warning: Parameters for device {device_id} is not a list: {type(params)}")
                    continue

                params_updated = False
                for p in params:
                    if not isinstance(p, dict):
                         print(f"Warning: Parameter item is not a dict: {p}")
                         continue
                         
                    p_type = p.get('type')
                    if p_type == 'number':
                        p['type'] = '数值'
                        params_updated = True
                    elif p_type == 'boolean':
                        p['type'] = '布尔'
                        params_updated = True
                    elif p_type == 'string':
                        p['type'] = '字符串'
                        params_updated = True
                
                if params_updated:
                    parameters_json = json.dumps(params, ensure_ascii=False)
                    needs_update = True
                    
            except Exception as e:
                print(f"Error parsing parameters for device {device_id}: {e}")
                continue
            
            if needs_update:
                cursor.execute(
                    "UPDATE devices SET status = ?, parameters = ? WHERE id = ?",
                    (new_status, parameters_json, device_id)
                )
                updated_count += 1
                print(f"Updated device {device_id}: status '{status}'->'{new_status}'")
        
        conn.commit()
        print(f"Migration completed. Updated {updated_count} devices.")
        
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_db()
