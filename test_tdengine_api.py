import requests
import json

BASE_URL = "http://localhost:8000"

def test_tdengine_view():
    print("Testing TDengine View APIs...")
    
    # 1. Get Stables
    try:
        url = f"{BASE_URL}/api/system/tdengine/stables"
        print(f"GET {url}")
        resp = requests.get(url)
        print(f"Stables Status: {resp.status_code}")
        
        if resp.status_code == 200:
            stables = resp.json()
            print(f"Stables Type: {type(stables)}")
            print(f"Stables Sample: {stables[:2] if stables else 'Empty'}")
            
            if stables:
                s = stables[0]
                # Try to find name
                s_name = s.get('name') or s.get('stable_name')
                print(f"Stable Name: {s_name}")
        else:
            print(f"Error: {resp.text}")

    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_tdengine_view()
