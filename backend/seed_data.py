import sys
import os
from sqlalchemy.orm import Session
from services.database_service import SessionLocal
from models.category import CategoryDB
from models.simulation_model import SimulationModelDB
from models.device import DeviceDB, ParameterType, GenerationMode, DeviceStatus
import json
import uuid
from datetime import datetime

# Add current directory to sys.path to allow imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def seed():
    print("Starting data seeding...")
    session = SessionLocal()

    try:
        # 1. Seed Categories
        categories_data = [
            {
                "name": "Generator",
                "code": "generator",
                "description": "Industrial Power Generators",
                "parameters": [
                    {"id": "rpm", "name": "RPM", "type": "数值", "unit": "rpm", "min_value": 0, "max_value": 3000, "generation_mode": "random"},
                    {"id": "temp", "name": "Temperature", "type": "数值", "unit": "°C", "min_value": 20, "max_value": 120, "generation_mode": "random_walk", "generation_params": {"step": 2}},
                    {"id": "voltage", "name": "Output Voltage", "type": "数值", "unit": "V", "min_value": 0, "max_value": 480, "generation_mode": "random"},
                    {"id": "vibration", "name": "Vibration", "type": "数值", "unit": "mm/s", "min_value": 0, "max_value": 10, "generation_mode": "random"}
                ]
            },
            {
                "name": "Cutter",
                "code": "cutter",
                "description": "CNC Plasma Cutters",
                "parameters": [
                    {"id": "current", "name": "Arc Current", "type": "数值", "unit": "A", "min_value": 0, "max_value": 100, "generation_mode": "random"},
                    {"id": "gas_pressure", "name": "Gas Pressure", "type": "数值", "unit": "psi", "min_value": 0, "max_value": 120, "generation_mode": "random"},
                    {"id": "x_pos", "name": "X Position", "type": "数值", "unit": "mm", "min_value": 0, "max_value": 1000, "generation_mode": "linear", "generation_params": {"step": 10}},
                    {"id": "head_temp", "name": "Head Temp", "type": "数值", "unit": "°C", "min_value": 20, "max_value": 200, "generation_mode": "random_walk"}
                ]
            }
        ]

        for cat_data in categories_data:
            existing = session.query(CategoryDB).filter(CategoryDB.code == cat_data["code"]).first()
            if not existing:
                print(f"Creating category: {cat_data['name']}")
                new_cat = CategoryDB(
                    id=str(uuid.uuid4()),
                    name=cat_data["name"],
                    code=cat_data["code"],
                    description=cat_data["description"],
                    parameters=cat_data["parameters"]
                )
                session.add(new_cat)
            else:
                print(f"Category {cat_data['name']} already exists.")
        
        session.commit()

        # 2. Seed Devices
        # We use the category code as the type
        devices_data = [
            {
                "id": "dev_001", # Keep consistent ID if possible, though DB usually generates UUIDs. 
                                 # Since existing logic uses UUIDs, we might generate new ones or force these if string ID is allowed.
                                 # The frontend constants use 'dev_001', let's try to use that or a new UUID. 
                                 # Actually, backend DB schema for ID is String.
                "name": "Industrial Diesel Generator",
                "type": "generator", # Matches category code
                "description": "Main backup power unit for Sector 7.",
                "parameters": categories_data[0]["parameters"] # Inherit from category
            },
            {
                "id": "dev_002",
                "name": "Plasma Cutter Arm",
                "type": "cutter", # Matches category code
                "description": "Precision CNC plasma cutter.",
                "parameters": categories_data[1]["parameters"] # Inherit from category
            }
        ]

        for dev_data in devices_data:
            # Check by name since ID might be different in DB if not forced
            existing = session.query(DeviceDB).filter(DeviceDB.name == dev_data["name"]).first()
            if not existing:
                print(f"Creating device: {dev_data['name']}")
                new_dev = DeviceDB(
                    id=str(uuid.uuid4()), # Generate a real UUID to be safe with backend logic
                    name=dev_data["name"],
                    type=dev_data["type"],
                    description=dev_data["description"],
                    status=DeviceStatus.STOPPED,
                    parameters=dev_data["parameters"],
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                session.add(new_dev)
            else:
                print(f"Device {dev_data['name']} already exists.")

        session.commit()
        print("Seeding completed successfully.")

    except Exception as e:
        print(f"Error seeding data: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    from datetime import datetime
    seed()
