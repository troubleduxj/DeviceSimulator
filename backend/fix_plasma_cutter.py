import sqlite3
import json
import re
import taos
import os
from dotenv import load_dotenv

load_dotenv()

def slugify(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '_', text)
    text = text.strip('_')
    return text

def fix_category():
    # 1. Update SQLite
    conn = sqlite3.connect('device_simulator.db')
    cursor = conn.cursor()
    
    try:
        # Find the category
        cursor.execute("SELECT id, parameters FROM categories WHERE code = 'plasma_cutter_2025'")
        row = cursor.fetchone()
        
        if not row:
            print("Category 'plasma_cutter_2025' not found.")
            return
            
        cat_id, params_json = row
        parameters = json.loads(params_json)
        
        print("Updating parameters...")
        for param in parameters:
            old_id = param.get('id')
            # Use name as basis for ID, fallback to existing ID if name is empty
            new_id = slugify(param.get('name')) if param.get('name') else old_id
            
            if new_id:
                print(f"  - {param.get('name')}: {old_id} -> {new_id}")
                param['id'] = new_id
        
        # Update DB
        new_params_json = json.dumps(parameters)
        cursor.execute("UPDATE categories SET parameters = ? WHERE id = ?", (new_params_json, cat_id))
        conn.commit()
        print("SQLite updated.")
        
    except Exception as e:
        print(f"SQLite Error: {e}")
    finally:
        conn.close()

    # 2. Drop TDengine STABLE (so it can be recreated with new columns)
    try:
        TDENGINE_HOST = os.getenv("TDENGINE_HOST", "localhost")
        TDENGINE_USER = os.getenv("TDENGINE_USER", "root")
        TDENGINE_PASSWORD = os.getenv("TDENGINE_PASSWORD", "taosdata")
        TDENGINE_DB = os.getenv("TDENGINE_DB", "iot_simulator") # Should match config
        
        print(f"Connecting to TDengine at {TDENGINE_HOST}...")
        conn = taos.connect(
            host=TDENGINE_HOST,
            user=TDENGINE_USER,
            password=TDENGINE_PASSWORD,
            database=TDENGINE_DB
        )
        cursor = conn.cursor()
        
        st_name = "plasma_cutter_2025"
        print(f"Dropping STABLE {st_name}...")
        cursor.execute(f"DROP STABLE IF EXISTS {st_name}")
        print("STABLE dropped. It will be recreated on next sync or device creation.")
        
        conn.close()
        
    except Exception as e:
        print(f"TDengine Error (Ignore if not running): {e}")

if __name__ == "__main__":
    fix_category()
