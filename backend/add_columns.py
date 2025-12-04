import sqlite3
import os

# 获取项目根目录
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(PROJECT_ROOT, "backend", "device_simulator.db")

def add_columns():
    if not os.path.exists(DB_PATH):
        print("Database file not found!")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if columns exist
        cursor.execute("PRAGMA table_info(devices)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "physics_config" not in columns:
            print("Adding physics_config column...")
            cursor.execute("ALTER TABLE devices ADD COLUMN physics_config JSON DEFAULT '{}'")
        else:
            print("physics_config column already exists.")
            
        if "logic_rules" not in columns:
            print("Adding logic_rules column...")
            cursor.execute("ALTER TABLE devices ADD COLUMN logic_rules JSON DEFAULT '[]'")
        else:
            print("logic_rules column already exists.")
            
        conn.commit()
        print("Migration completed successfully.")
        
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    add_columns()
