import sys
import os

# Add backend directory to path so imports work
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from services.tdengine_service import tdengine_service

def check_show_tables():
    if tdengine_service.connect():
        print("\n--- STABLES (Super Tables) ---")
        stables = tdengine_service.execute_query("SHOW STABLES")
        if stables:
            print(f"Total Super Tables: {len(stables)}")
            print(f"Columns: {stables[0].keys()}")
            for row in stables:
                # Use correct key for super table name
                st_name = row.get('name') or row.get('stable_name') or row.get('table_name')
                created_time = row.get('created_time')
                print(f"STable: {st_name} | Created: {created_time}")
                
                # Query one super table to see tags
                if st_name:
                    print(f"\n   --- Sample Data from {st_name} ---")
                    try:
                        data = tdengine_service.execute_query(f"SELECT * FROM `{st_name}` ORDER BY ts DESC LIMIT 3")
                        if data:
                            print(f"   Columns: {data[0].keys()}")
                            for d in data:
                                print(f"   Row: {d}")
                        else:
                            print("   No data.")
                    except Exception as e:
                        print(f"   Error querying {st_name}: {e}")

        else:
            print("No Super Tables found.")

        print("\n--- TABLES (Sub Tables Sample) ---")
        # Remove LIMIT from SQL as it might not be supported in SHOW TABLES
        res = tdengine_service.execute_query("SHOW TABLES")
        if res:
            # Manually slice
            for i, row in enumerate(res[:5]):
                t_name = row.get('table_name')
                print(f"Table: {t_name}")
                # Describe one table
                if i == 0:
                    print(f"\n   --- Describe {t_name} ---")
                    try:
                        desc = tdengine_service.execute_query(f"DESCRIBE `{t_name}`")
                        for col in desc:
                            print(f"   {col}")
                    except Exception as e:
                        print(f"   Error describing {t_name}: {e}")

    else:
        print("Failed to connect.")

if __name__ == "__main__":
    check_show_tables()
