import time
from datetime import datetime
from typing import Any, Dict
from models.device import Parameter, ParameterType, GenerationMode
from services.simulation_engine import (
    StrategyFactory, 
    ErrorInjector, 
    PhysicsEngine, 
    LogicEngine,
    SimulationStateManager
)

class DataGenerator:
    @staticmethod
    def generate_device_data(device_id: str, parameters: list[Parameter], physics_config: Dict[str, Any] = None, logic_rules: list[Dict[str, Any]] = None, timestamp: datetime = None) -> Dict[str, Any]:
        """生成设备的所有参数数据"""
        
        # 1. Get Device State
        device_state = SimulationStateManager.get_state(device_id)
        
        # 2. Generate Basic Values
        generated_data = {}
        
        for param in parameters:
            # Get persistent state for this parameter
            if param.id not in device_state.parameter_states:
                # Initialize with default params from configuration
                # Ensure generation_params is not None
                device_state.parameter_states[param.id] = (param.generation_params or {}).copy()
            
            param_state = device_state.parameter_states[param.id]
            
            # Get Strategy
            strategy = StrategyFactory.get_strategy(param.generation_mode)
            
            # Generate Value
            value = strategy.generate(param, param_state)
            
            generated_data[param.name] = value # Use name for logic engine context, but id for result?
            # Result should use ID or Name? 
            # Original code: data["data"][param.id] = value
            
        # 3. Apply Physics (if configured)
        if physics_config:
            # Update physics state
            dt = 1.0 # Assumed 1 tick = 1 second (or derived from sampling rate)
            PhysicsEngine.update_state(device_state.physics_state, physics_config, dt)
            
            # Map physics state to parameters if needed?
            # For now, we just expose physics state in context for logic engine
            generated_data.update(device_state.physics_state)

        # 4. Apply Logic Rules
        if logic_rules:
            # Context includes generated values + physics state
            context = generated_data.copy()
            updates = LogicEngine.evaluate(context, logic_rules)
            
            # Apply updates back to generated_data
            for key, val in updates.items():
                generated_data[key] = val
                
        # 5. Apply Error Injection & Format Result
        final_data = {}
        for param in parameters:
            # Retrieve value (might have been updated by logic)
            value = generated_data.get(param.name)
            
            # Apply Error Injection
            if param.error_config:
                if param.id not in device_state.error_context:
                    device_state.error_context[param.id] = {}
                
                error_ctx = device_state.error_context[param.id]
                value = ErrorInjector.apply(value, param.error_config, error_ctx)
            
            final_data[param.id] = value
            
        ts = timestamp if timestamp else datetime.utcnow()
        return {
            "device_id": device_id,
            "timestamp": ts.isoformat() + 'Z',
            "data": final_data
        }

    # Compatibility methods (if called individually elsewhere, though unlikely)
    @staticmethod
    def generate_data(parameter: Parameter) -> Any:
        # Stateless generation (fallback)
        strategy = StrategyFactory.get_strategy(parameter.generation_mode)
        # Create a temporary state
        temp_state = parameter.generation_params.copy()
        return strategy.generate(parameter, temp_state)
