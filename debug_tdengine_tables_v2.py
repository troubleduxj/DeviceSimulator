import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.tdengine_service import tdengine_service

def test_get_tables():
    print("Testing get_tables...")
    if not tdengine_service.connect():
        print("Failed to connect to TDengine")
        return

    # Check Version
    print("\n--- VERSION ---")
    try:
        res = tdengine_service.execute_query("SELECT SERVER_VERSION()")
        print(f"Version: {res}")
    except Exception as e:
        print(f"Error getting version: {e}")

    # 1. Get Stables
    print("\n--- STABLES ---")
    stables = tdengine_service.get_stables()
    print(f"Stables: {stables}")
    
    if not stables:
        print("No stables found. Cannot test get_tables.")
        return

    # Pick a stable that we know has tables
    target_stable = 'Cutter' 
    print(f"\nTesting with stable: {target_stable}")

    # 2. Get Child Tables
    print("\n--- Get Child Tables ---")
    tables = tdengine_service.get_tables(target_stable)
    print(f"Child tables count: {len(tables)}")
    
    if not tables:
        return

    target_table = tables[0]['table_name']
    print(f"Target Child Table: {target_table}")

    # 3. Describe Stable (to find tags)
    print("\n--- Describe Stable ---")
    # Wrap in backticks
    schema = tdengine_service.describe_table(f"`{target_stable}`")
    print(f"Schema: {schema}")
    
    # Identify tags
    # TDengine describe returns: Field, Type, Length, Note
    # Note == 'TAG'
    tags = [col['Field'] for col in schema if col.get('Note') == 'TAG']
    print(f"Tags: {tags}")

    # 4. Get Tag Values for Child Table
    print("\n--- Get Tag Values ---")
    if tags:
        # Use TBNAME in where clause
        cols = ", ".join([f"`{t}`" for t in tags])
        # Note: target_table needs to be quoted string for comparison, not backticks
        sql = f"SELECT {cols} FROM `{target_stable}` WHERE tbname = '{target_table}' LIMIT 1"
        print(f"SQL: {sql}")
        try:
            res = tdengine_service.execute_query(sql)
            print(f"Tag Values: {res}")
        except Exception as e:
            print(f"Error getting tags: {e}")
    else:
        print("No tags found.")

    # 5. Get Data
    print("\n--- Get Data (Latest 10) ---")
    try:
        sql = f"SELECT * FROM `{target_table}` ORDER BY ts DESC LIMIT 10"
        res = tdengine_service.execute_query(sql)
        print(f"Data count: {len(res)}")
        if res:
            print(f"First row: {res[0]}")
    except Exception as e:
        print(f"Error getting data: {e}")


if __name__ == "__main__":
    test_get_tables()
