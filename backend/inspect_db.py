import sqlite3
import json

def inspect():
    conn = sqlite3.connect('device_simulator.db')
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT name, type, parameters, physics_config, logic_rules FROM simulation_models")
        rows = cursor.fetchall()
        print(f"Found {len(rows)} simulation models:")
        for row in rows:
            print(f"Name: {row[0]}, Type: {row[1]}")
            # print(f"Params: {row[2]}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    inspect()
