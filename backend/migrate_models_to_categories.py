import sqlite3
import json
import uuid
import re

def slugify(text):
    # Convert to lowercase and replace non-alphanumeric with underscores
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '_', text)
    text = text.strip('_')
    return text

def migrate_models():
    conn = sqlite3.connect('device_simulator.db')
    cursor = conn.cursor()
    
    try:
        # 1. Get all simulation models
        cursor.execute("SELECT id, name, type, description, parameters, physics_config, logic_rules FROM simulation_models")
        models = cursor.fetchall()
        
        print(f"Found {len(models)} simulation models to migrate.")
        
        migrated_count = 0
        
        for model in models:
            m_id, m_name, m_type, m_desc, m_params, m_physics, m_logic = model
            
            # Generate a unique code for the category
            # If the model name is "Plasma Cutter 2025", code will be "plasma_cutter_2025"
            cat_code = slugify(m_name)
            
            # Check if this code already exists
            cursor.execute("SELECT id FROM categories WHERE code = ?", (cat_code,))
            existing = cursor.fetchone()
            
            if existing:
                print(f"Category with code '{cat_code}' already exists. Skipping or updating...")
                # Optional: Update existing category? For now, let's skip to avoid overwriting if manual changes exist.
                # Or maybe append a suffix?
                # Let's try to update the existing category with the rich data if it lacks it?
                # No, safer to create a new one with suffix if needed.
                cat_code = f"{cat_code}_migrated"
            
            print(f"Migrating model '{m_name}' to Category '{m_name}' (Code: {cat_code})...")
            
            new_id = str(uuid.uuid4())
            
            # Insert into categories
            # physics_config and logic_rules columns were added in previous migration
            cursor.execute("""
                INSERT INTO categories (id, name, code, description, parameters, physics_config, logic_rules, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            """, (new_id, m_name, cat_code, m_desc, m_params, m_physics, m_logic))
            
            migrated_count += 1
            
        conn.commit()
        print(f"Successfully migrated {migrated_count} models to categories.")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_models()
