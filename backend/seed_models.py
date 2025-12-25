import uuid
import json
from services.database_service import SessionLocal, engine
from models.simulation_model import SimulationModelDB, Base

# Create tables if not exist
Base.metadata.create_all(bind=engine)

def seed_models():
    db = SessionLocal()
    try:
        models = [
            {
                "name": "Industrial Generator",
                "type": "Generator",
                "description": "Standard industrial diesel generator model with fan and engine block.",
                "parameters": [],
                "physics_config": {},
                "logic_rules": []
            },
            {
                "name": "Plasma Cutter",
                "type": "Cutter",
                "description": "CNC Plasma Cutter with 3-axis arm and cutting head.",
                "parameters": [],
                "physics_config": {},
                "logic_rules": []
            },
            {
                "name": "Generic Box",
                "type": "Generic",
                "description": "Generic placeholder model for undefined devices.",
                "parameters": [],
                "physics_config": {},
                "logic_rules": []
            }
        ]

        print("Checking existing models...")
        for m in models:
            existing = db.query(SimulationModelDB).filter(SimulationModelDB.type == m["type"]).first()
            if not existing:
                print(f"Creating model: {m['name']}")
                new_model = SimulationModelDB(
                    id=str(uuid.uuid4()),
                    name=m["name"],
                    type=m["type"],
                    description=m["description"],
                    parameters=json.dumps(m["parameters"]),
                    physics_config=m["physics_config"],
                    logic_rules=m["logic_rules"]
                )
                db.add(new_model)
            else:
                print(f"Model type {m['type']} already exists, skipping.")
        
        db.commit()
        print("Seeding completed.")
    except Exception as e:
        print(f"Error seeding models: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_models()
