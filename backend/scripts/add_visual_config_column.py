import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "device_simulator.db")

def add_visual_config_column():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(simulation_models)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'visual_config' not in columns:
            print("Adding 'visual_config' column to 'simulation_models' table...")
            cursor.execute("ALTER TABLE simulation_models ADD COLUMN visual_config JSON DEFAULT '{}'")
            conn.commit()
            print("Column added successfully.")
        else:
            print("'visual_config' column already exists.")
            
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_visual_config_column()
