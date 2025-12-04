import sqlite3
import os

DB_PATH = "device_simulator.db"

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found. Skipping migration (will be created on startup).")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    tables = ["simulation_models", "devices"]
    columns_to_add = {
        "physics_config": "JSON DEFAULT '{}'",
        "logic_rules": "JSON DEFAULT '[]'",
        "type": "TEXT DEFAULT 'custom'"
    }

    for table in tables:
        print(f"Checking table {table}...")
        try:
            cursor.execute(f"PRAGMA table_info({table})")
            columns = [info[1] for info in cursor.fetchall()]
            
            if not columns:
                print(f"Table {table} does not exist.")
                continue

            for col_name, col_def in columns_to_add.items():
                if col_name not in columns:
                    print(f"Adding column {col_name} to {table}...")
                    try:
                        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_def}")
                        print(f"Added {col_name} successfully.")
                    except Exception as e:
                        print(f"Failed to add {col_name}: {e}")
                else:
                    print(f"Column {col_name} already exists in {table}.")
        except Exception as e:
            print(f"Error checking table {table}: {e}")

    conn.commit()
    conn.close()
    print("Migration check completed.")

if __name__ == "__main__":
    migrate()
