import sqlite3
import json

def migrate_category_scenarios():
    db_path = 'device_simulator.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if columns exist
        cursor.execute("PRAGMA table_info(categories)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'scenarios' not in columns:
            print("Adding 'scenarios' column to categories table...")
            cursor.execute("ALTER TABLE categories ADD COLUMN scenarios JSON DEFAULT '[]'")
        else:
            print("'scenarios' column already exists.")
            
        if 'scenario_configs' not in columns:
            print("Adding 'scenario_configs' column to categories table...")
            cursor.execute("ALTER TABLE categories ADD COLUMN scenario_configs JSON DEFAULT '{}'")
        else:
            print("'scenario_configs' column already exists.")
            
        conn.commit()
        print("Migration completed successfully.")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_category_scenarios()
