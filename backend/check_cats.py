import sqlite3

def check_categories():
    conn = sqlite3.connect('device_simulator.db')
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT name, code FROM categories")
        rows = cursor.fetchall()
        print(f"Found {len(rows)} categories:")
        for row in rows:
            print(f"Name: {row[0]}, Code: {row[1]}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_categories()
