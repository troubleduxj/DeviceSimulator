import sys
import os
from services.database_service import SessionLocal
from models.config import TDengineConfig

# Add current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def enable_tdengine():
    print("Enabling TDengine...")
    session = SessionLocal()
    try:
        config = session.query(TDengineConfig).first()
        if config:
            config.enabled = True
            session.commit()
            print("TDengine enabled successfully.")
            print(f"Configuration: Host={config.host}, Port={config.port}, Database={config.database}")
        else:
            print("No configuration found. Creating default enabled configuration.")
            default_config = TDengineConfig.get_default_config()
            default_config['enabled'] = True
            new_config = TDengineConfig(**default_config)
            session.add(new_config)
            session.commit()
            print("Default configuration created and enabled.")
            
    except Exception as e:
        print(f"Error enabling TDengine: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    enable_tdengine()
