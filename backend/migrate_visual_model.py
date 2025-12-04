import sqlite3
import os

DB_PATH = "device_simulator.db"

def migrate_visual_model():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    table = "categories"
    col_name = "visual_model"
    col_def = "TEXT DEFAULT 'Generic'"

    print(f"Checking table {table}...")
    try:
        cursor.execute(f"PRAGMA table_info({table})")
        columns = [info[1] for info in cursor.fetchall()]
        
        if col_name not in columns:
            print(f"Adding column {col_name} to {table}...")
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_def}")
            print(f"Added {col_name} successfully.")
        else:
            print(f"Column {col_name} already exists.")
            
        # Update existing known categories
        updates = [
            ("Generator", "Generator"),
            ("Cutter", "Cutter"),
            ("plasma_cutter_2025", "Cutter")
        ]
        
        for code, model in updates:
            print(f"Updating {code} -> {model}")
            cursor.execute("UPDATE categories SET visual_model = ? WHERE code = ?", (model, code))
            
    except Exception as e:
        print(f"Error: {e}")

    conn.commit()
    conn.close()
    print("Migration completed.")

if __name__ == "__main__":
    migrate_visual_model()
