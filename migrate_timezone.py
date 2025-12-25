import sqlite3
import os

# Project root
PROJECT_ROOT = os.getcwd()
DB_PATH = os.path.join(PROJECT_ROOT, "backend", "device_simulator.db")

def migrate():
    print(f"Migrating database: {DB_PATH}")
    if not os.path.exists(DB_PATH):
        print("Database not found!")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(system_settings)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if "timezone" not in columns:
            print("Adding 'timezone' column to system_settings...")
            # Add column
            cursor.execute("ALTER TABLE system_settings ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC'")
            conn.commit()
            print("Migration successful.")
        else:
            print("'timezone' column already exists.")
            
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
