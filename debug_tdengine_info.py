import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.tdengine_service import tdengine_service

def test_info_and_data():
    print("Testing get_table_info and get_table_data...")
    if not tdengine_service.connect():
        print("Failed to connect to TDengine")
        return

    # 1. Find a table
    stables = tdengine_service.get_stables()
    if not stables:
        print("No stables found")
        return
    
    # Try to find a stable with tables
    target_stable = None
    target_table = None
    
    for s in stables:
        s_name = s.get('name') or s.get('stable_name') or s.get('TABLE_NAME')
        tables = tdengine_service.get_tables(s_name)
        if tables:
            target_stable = s_name
            target_table = tables[0]['table_name']
            break
            
    if not target_stable:
        print("No stable with tables found")
        return
        
    print(f"Target Stable: {target_stable}")
    print(f"Target Table: {target_table}")

    # 2. Test get_table_info
    print("\n--- Test get_table_info ---")
    try:
        info = tdengine_service.get_table_info(target_stable, target_table)
        print(f"Info: {info}")
    except Exception as e:
        print(f"Error in get_table_info: {e}")

    # 3. Test get_table_data
    print("\n--- Test get_table_data ---")
    try:
        data = tdengine_service.get_table_data(target_table, limit=5)
        print(f"Data count: {len(data)}")
        if data:
            print(f"First row: {data[0]}")
    except Exception as e:
        print(f"Error in get_table_data: {e}")

if __name__ == "__main__":
    test_info_and_data()
