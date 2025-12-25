import sys
import os
# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Need to mock settings or env if config relies on it?
# backend/config/config.py uses pydantic BaseSettings, reads env.
# It should be fine if .env exists or defaults are used.

try:
    from backend.services.tdengine_service import tdengine_service
except ImportError:
    # Try adding current dir if running from root
    sys.path.append(os.getcwd())
    from backend.services.tdengine_service import tdengine_service

def debug():
    print("Connecting...")
    try:
        connected = tdengine_service.connect()
        print(f"Connected: {connected}")
        
        if connected:
            print("Getting Stables...")
            stables = tdengine_service.get_stables()
            print(f"Stables Type: {type(stables)}")
            print(f"Stables Len: {len(stables)}")
            if len(stables) > 0:
                print(f"First Stable: {stables[0]} (Type: {type(stables[0])})")
                
                # Pick a name
                s = stables[0]
                s_name = s.get('name') or s.get('stable_name') or s.get('TABLE_NAME')
                print(f"Using Stable Name: {s_name}")
                
                if s_name:
                    print(f"Getting Tables for {s_name}...")
                    tables = tdengine_service.get_tables(s_name)
                    print(f"Tables Len: {len(tables)}")
                    if len(tables) > 0:
                        print(f"First Table: {tables[0]}")
            else:
                print("No Stables found.")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug()
