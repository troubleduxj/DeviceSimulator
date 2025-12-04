import requests
import json
import uuid

API_URL = "http://localhost:8000/api/simulation-model/"

def create_cutter_model():
    model_data = {
        "name": "Plasma Cutter 2025",
        "type": "Cutter",
        "description": "High-precision plasma cutter simulation with advanced error injection and logic rules.",
        "parameters": [
            {
                "name": "cutting_speed",
                "type": "数值",
                "unit": "mm/min",
                "min_value": 0,
                "max_value": 5000,
                "default_value": 2500,
                "generation_mode": "random_walk",
                "generation_params": {
                    "step_range": 50
                },
                "error_config": {}
            },
            {
                "name": "arc_voltage",
                "type": "数值",
                "unit": "V",
                "min_value": 0,
                "max_value": 200,
                "default_value": 120,
                "generation_mode": "random",
                "generation_params": {
                    "min": 110,
                    "max": 130
                },
                "error_config": {
                    "anomaly_probability": 0.05,
                    "anomaly_multiplier": 1.5
                }
            },
            {
                "name": "gas_pressure",
                "type": "数值",
                "unit": "bar",
                "min_value": 0,
                "max_value": 10,
                "default_value": 5.0,
                "generation_mode": "linear",
                "generation_params": {
                    "step": 0
                },
                "error_config": {
                    "drift_rate": -0.05,
                    "drift_reset_interval": 100
                }
            },
            {
                "name": "nozzle_temperature",
                "type": "数值",
                "unit": "°C",
                "min_value": 20,
                "max_value": 300,
                "default_value": 25,
                "generation_mode": "linear",
                "generation_params": {
                    "step": 0.5
                },
                "error_config": {}
            },
            {
                "name": "status",
                "type": "字符串",
                "generation_mode": "custom",
                "default_value": "IDLE"
            }
        ],
        "physics_config": {
            "mass": 50.0,
            "max_velocity": 10.0,
            "acceleration": 2.0
        },
        "logic_rules": [
            {
                "condition": "nozzle_temperature > 150",
                "action": "status = 'WARNING'"
            },
            {
                "condition": "nozzle_temperature > 250",
                "action": "status = 'OVERHEAT'"
            },
            {
                "condition": "gas_pressure < 4.0",
                "action": "status = 'PRESSURE_LOW'"
            },
            {
                "condition": "arc_voltage > 180",
                "action": "status = 'VOLTAGE_SPIKE'"
            }
        ]
    }

    # First, check if model exists and delete it
    try:
        existing_models = requests.get(API_URL).json()
        for model in existing_models:
            if model["name"] == model_data["name"]:
                print(f"Model '{model_data['name']}' already exists. Deleting...")
                requests.delete(f"{API_URL}{model['id']}")
                print("Deleted.")
                break
    except Exception as e:
        print(f"Error checking existing models: {e}")

    print(f"Creating model: {model_data['name']}...")
    try:
        response = requests.post(API_URL, json=model_data)
        if response.status_code == 200 or response.status_code == 201:
            print("Success! Model created.")
            print(json.dumps(response.json(), indent=2, ensure_ascii=False))
        else:
            print(f"Failed to create model. Status: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_cutter_model()
