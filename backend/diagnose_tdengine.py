import taos
import os
from dotenv import load_dotenv

load_dotenv()

TDENGINE_HOST = os.getenv("TDENGINE_HOST", "localhost")
TDENGINE_PORT = int(os.getenv("TDENGINE_PORT", 6030))
TDENGINE_USER = os.getenv("TDENGINE_USER", "root")
TDENGINE_PASSWORD = os.getenv("TDENGINE_PASSWORD", "taosdata")
TDENGINE_DB = os.getenv("TDENGINE_DB", "iot_simulator")

def diagnose():
    print(f"Connecting to {TDENGINE_HOST}:{TDENGINE_PORT} user={TDENGINE_USER} db={TDENGINE_DB}...")
    try:
        conn = taos.connect(
            host=TDENGINE_HOST,
            user=TDENGINE_USER,
            password=TDENGINE_PASSWORD,
            # Do not specify database initially to check if it exists
        )
        print("Connected successfully.")
        cursor = conn.cursor()
        
        cursor.execute("SHOW DATABASES")
        dbs = cursor.fetchall()
        print("Databases:", dbs)
        
        db_exists = False
        for db in dbs:
            if db[0] == TDENGINE_DB:
                db_exists = True
                break
        
        if not db_exists:
            print(f"Database {TDENGINE_DB} does not exist!")
            return

        conn.select_db(TDENGINE_DB)
        print(f"Selected DB {TDENGINE_DB}")

        # List all stables
        print("--- Super Tables ---")
        cursor.execute("SHOW STABLES")
        stables = cursor.fetchall()
        if not stables:
            print("No Super Tables found.")
            
        for st in stables:
            st_name = st[0]
            print(f"STable: {st_name}")
            
            # Describe each stable
            cursor.execute(f"DESCRIBE {st_name}")
            cols = cursor.fetchall()
            for col in cols:
                print(f"  - {col[0]} ({col[1]})")
                
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    diagnose()
