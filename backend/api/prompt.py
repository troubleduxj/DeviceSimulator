from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from services.database_service import get_db
from models.prompt import Prompt, PromptVersion
from pydantic import BaseModel
from typing import Optional, List
import datetime

router = APIRouter()

class PromptUpdate(BaseModel):
    template: str
    description: Optional[str] = None
    comment: Optional[str] = None

class PromptVersionResponse(BaseModel):
    id: int
    version: int
    template: str
    description: Optional[str]
    created_at: str
    comment: Optional[str]

    class Config:
        orm_mode = True

class PromptResponse(BaseModel):
    key: str
    description: Optional[str]
    template: str
    updated_at: str
    versions: Optional[List[PromptVersionResponse]] = []

    class Config:
        orm_mode = True

# Initial Prompts (Seed Data)
# Note: Template strings use placeholders like {lang}, {device_name}, etc.
# But in the current frontend implementation, they are interpolated using JS template literals.
# To make this work, the frontend will need to fetch the template string and then replace placeholders.
# So I should store them with placeholders like {0}, {1} or {name}.
# Let's check how geminiService.ts uses them.
# It uses `${variable}`.
# So in the DB, I should store them as:
# "You are... ${device.name} ..."
# And on the frontend, I will use a simple replace function or `Function` constructor (risky) or a dedicated template engine.
# Or better, I'll stick to a simple custom replacement format like {{variable}} to be safe and clear.

DEFAULT_PROMPTS = {
    "simulation_batch": {
        "description": "Generate batch of simulation data",
        "template": """
    You are a high-fidelity Industrial IoT Physics Engine.
    Simulate the behavior of a device: "{{device_name}}" (Type: {{device_type}}).
    Description: {{device_description}}
    
    Current State: {{device_status}}
    Active Scenario: "{{active_scenario}}"
    
    Defined Metrics (and limits):
    {{metrics_info}}

    Last Known Metrics: {{last_metrics}}

    Task:
    Generate a BATCH of 5 sequential time steps (representing 1 second each) of telemetry data.
    The data must follow physics laws (inertia, thermodynamics). 
    - If status is STOPPED, values should decay to minimums.
    - If RUNNING, values should reflect the "{{active_scenario}}".
    - Example: If "Coolant Leak", temp should rise over the 5 steps, pressure might drop.
    - Add realistic noise/fluctuation.
    - IMPORTANT: If a metric is marked (INTEGER ONLY), you MUST output an integer value.
    
    Output strictly in JSON format matching the schema.
    """
    },
    "category_schema": {
        "description": "Generate device category schema",
        "template": """
      You are an IoT System Architect.
      Create a detailed Device Category Schema based on this description: "{{user_description}}".
      
      Requirements:
      1. 'code' should be snake_case (e.g., diesel_generator).
      2. 'parameters' should include both Tags (metadata, is_tag=true) and Columns (time-series, is_tag=false).
      3. Parameter types must be one of: INT, FLOAT, BOOL, STRING, TIMESTAMP.
      4. Include reasonable min/max values for numeric metrics.
      5. DO NOT include 'ts' (timestamp) or 'device_code' as they are system auto-generated fields.
      6. Include 'physics_config' with relevant physical constants (e.g., mass_kg, max_velocity, thermal_capacity).
      7. Include 'logic_rules' for basic monitoring (e.g., "temp > 100" -> "status = 'error'").
      8. The 'name' and 'description' fields in the output should be in {{lang_name}}.
      
      Output strictly JSON matching this format example:
      {
        "name": "Diesel Generator",
        "code": "diesel_gen",
        "description": "...",
        "parameters": [
          { "id": "model_id", "name": "Model ID", "type": "STRING", "is_tag": true },
          { "id": "rpm", "name": "RPM", "type": "INT", "unit": "rpm", "min_value": 0, "max_value": 3000, "is_tag": false }
        ],
        "physics_config": {
           "mass_kg": 500,
           "max_rpm": 3000
        },
        "logic_rules": [
           { "condition": "rpm > 2800", "action": "status = 'warning'" }
        ]
      }
    """
    },
    "system_report": {
        "description": "Generate system health report",
        "template": """
      You are an IoT System Administrator.
      Analyze the following system state and generate a concise health report (in {{lang_name}}).
      
      System Stats: {{stats}}
      Active Devices: {{device_summary}}
      
      Requirements:
      1. Summarize overall health.
      2. Highlight any devices in 'running' state and their scenarios.
      3. Point out potential risks based on scenarios (e.g. "High Load", "Failure").
      4. Keep it professional and under 100 words.
    """
    },
    "batch_devices": {
        "description": "Generate batch of devices",
        "template": """
      You are an IoT System Architect.
      Generate a batch of IoT Devices based on this request: "{{user_description}}".
      
      Requirements:
      1. Output a JSON Array of Device objects.
      2. 'id' should be unique (e.g., dev_timestamp_index).
      3. 'name' should be sequential if multiple (e.g., "Temp Sensor 01", "Temp Sensor 02") and in {{lang_name}} if appropriate.
      4. 'type' should be consistent.
      5. 'metrics' should be appropriate for the device type.
      6. 'status' should default to 'stopped'.
      
      Output strictly JSON matching this structure:
      [
        {
          "id": "dev_123_1",
          "name": "Sensor 01",
          "type": "Sensor",
          "description": "...",
          "status": "stopped",
          "currentScenario": "Normal",
          "scenarios": ["Normal", "High"],
          "metrics": [
             {"id": "temp", "name": "Temperature", "unit": "C", "min": 0, "max": 100}
          ]
        }
      ]
    """
    },
    "visual_model": {
        "description": "Generate visual model config",
        "template": """
      You are an IoT 3D Model Expert.
      Create a Visual Model configuration based on this description: "{{description}}".
      
      Requirements:
      1. 'name': A technical name for the model (e.g., "6-Axis Robot Arm").
      2. 'type': Choose the most appropriate type from [Generator, Cutter, Custom, GLB, GLTF, OBJ, FBX]. 
         - If the description matches a standard industrial generator, use 'Generator'.
         - If it matches a plasma cutter or CNC machine, use 'Cutter'.
         - If you are generating a custom 'visual_config' (Requirement #5), use 'Custom'.
         - Otherwise, if it implies a specific 3D file format, use that. 
         - Default to 'Generic' if unsure.
      3. 'description': A concise description of the model's appearance and function.
      4. 'parameters': Suggest relevant parameters (metrics) that this model would display or be controlled by (e.g., joint angles, RPM, temperature).
         - 'type' should be one of [NUMBER, BOOLEAN, STRING].
      5. 'visual_config': Generate a JSON structure defining a 3D visual representation using simple primitives (Box, Cylinder, Sphere, Cone).
         - Format: { "components": [ { "type": "box"|"cylinder"|"sphere"|"cone", "position": [x,y,z], "size": [x,y,z], "color": "hex", "rotation": [x,y,z] } ] }
         - ALWAYS generate this for 'Custom' type.
         - Try to approximate the shape of the described device using 2-6 primitives.
         - Be creative! Use combinations to make it look like the description.
      
      Output strictly JSON matching this schema:
      {
        "name": string,
        "type": string,
        "description": string,
        "parameters": [ { "id": string, "name": string, "type": string, "unit": string, "min_value": number, "max_value": number, "is_tag": boolean } ],
        "visual_config": { "components": [ ... ] }
      }
    """
    },
    "log_analysis": {
        "description": "Analyze system logs",
        "template": """
      You are an IoT System Expert.
      Analyze the following simulation logs and provide a Root Cause Analysis (in {{lang_name}}).
      
      Logs:
      {{recent_logs}}
      
      Requirements:
      1. Identify any critical errors or warnings.
      2. Detect patterns (e.g., repeated timeouts, metric spikes).
      3. Suggest potential root causes (e.g., "Network congestion", "Sensor malfunction").
      4. Provide actionable recommendations.
      5. If no errors, confirm system stability.
      6. Output format: Markdown (bullet points).
    """
    },
    "scenario_config": {
        "description": "Generate scenario configuration",
        "template": """
      You are an IoT Simulation Expert.
      Create a detailed Simulation Scenario Configuration based on this description: "{{user_description}}".
      Target Device: {{device_name}}
      Available Parameters: {{available_params}}

      Requirements:
      1. 'name': Short, descriptive name (e.g., "Coolant Leak").
      2. 'description': A detailed narrative description for an AI Simulator to follow. It should describe how metrics change over time.
      3. 'parameter_updates': Array of parameter modifications for a physics-based engine.
         - Match 'param_id' to Available Parameters.
         - 'update_type': One of 'set' (fixed value), 'offset' (add value), 'drift' (gradual change), 'noise' (random fluctuation).
         - 'drift_rate': Rate of change per second (positive or negative).
         - 'noise_std_dev': Standard deviation for noise.
         - 'anomaly_probability': Chance of spikes (0-1).
         - If user describes a complex behavior like "exponential rise", approximate it with a high 'drift_rate'.
      4. The 'name' and 'description' fields in the output should be in {{lang_name}}.
      
      Output strictly JSON matching this structure:
      {
        "name": "Coolant Leak",
        "description": "The coolant pressure drops linearly...",
        "parameter_updates": [
           { "param_id": "pressure", "update_type": "drift", "drift_rate": -0.5 },
           { "param_id": "temp", "update_type": "drift", "drift_rate": 0.2, "noise_std_dev": 1.0 }
        ]
      }
    """
    }
}

@router.get("/", response_model=list[PromptResponse])
def get_prompts(db: Session = Depends(get_db)):
    prompts = db.query(Prompt).all()
    
    # Check if we need to seed
    if len(prompts) < len(DEFAULT_PROMPTS):
        existing_keys = {p.key for p in prompts}
        for key, data in DEFAULT_PROMPTS.items():
            if key not in existing_keys:
                db_prompt = Prompt(key=key, description=data["description"], template=data["template"])
                db.add(db_prompt)
        db.commit()
        prompts = db.query(Prompt).all()
        
    return [
        PromptResponse(
            key=p.key,
            description=p.description,
            template=p.template,
            updated_at=p.updated_at.isoformat() if p.updated_at else ""
        ) for p in prompts
    ]

@router.get("/{key}", response_model=PromptResponse)
def get_prompt(key: str, db: Session = Depends(get_db)):
    prompt = db.query(Prompt).filter(Prompt.key == key).first()
    if not prompt:
        # Check defaults
        if key in DEFAULT_PROMPTS:
             data = DEFAULT_PROMPTS[key]
             prompt = Prompt(key=key, description=data["description"], template=data["template"])
             db.add(prompt)
             db.commit()
             db.refresh(prompt)
             return PromptResponse(
                key=prompt.key,
                description=prompt.description,
                template=prompt.template,
                updated_at=prompt.updated_at.isoformat() if prompt.updated_at else ""
            )
        raise HTTPException(status_code=404, detail="Prompt not found")
    
    return PromptResponse(
        key=prompt.key,
        description=prompt.description,
        template=prompt.template,
        updated_at=prompt.updated_at.isoformat() if prompt.updated_at else ""
    )

@router.put("/{key}", response_model=PromptResponse)
def update_prompt(key: str, update: PromptUpdate, db: Session = Depends(get_db)):
    prompt = db.query(Prompt).filter(Prompt.key == key).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    
    prompt.template = update.template
    if update.description:
        prompt.description = update.description
    
    db.commit()
    db.refresh(prompt)
    return PromptResponse(
        key=prompt.key,
        description=prompt.description,
        template=prompt.template,
        updated_at=prompt.updated_at.isoformat() if prompt.updated_at else ""
    )

@router.post("/reset", response_model=list[PromptResponse])
def reset_prompts(db: Session = Depends(get_db)):
    # Delete all
    db.query(Prompt).delete()
    # Re-seed
    for key, data in DEFAULT_PROMPTS.items():
        db_prompt = Prompt(key=key, description=data["description"], template=data["template"])
        db.add(db_prompt)
    db.commit()
    prompts = db.query(Prompt).all()
    return [
        PromptResponse(
            key=p.key,
            description=p.description,
            template=p.template,
            updated_at=p.updated_at.isoformat() if p.updated_at else ""
        ) for p in prompts
    ]
