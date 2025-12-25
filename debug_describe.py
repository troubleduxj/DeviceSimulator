import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.tdengine_service import tdengine_service

def test_describe():
    print("Testing describe_table with plain name...")
    if not tdengine_service.connect():
        print("Failed to connect to TDengine")
        return

    # Use 'Cutter' as it is a known stable
    target = 'Cutter'
    print(f"Target: {target}")

    try:
        schema = tdengine_service.describe_table(target)
        print(f"Schema result count: {len(schema)}")
        if schema:
            print(f"First field: {schema[0]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_describe()
