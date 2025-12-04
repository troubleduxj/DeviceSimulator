import random
import math
import time
from typing import Any, Dict, List, Optional
from models.device import Parameter, ParameterType, GenerationMode

# --- 1. Simulation Strategy (Generator) ---
class SimulationStrategy:
    """
    Base class for data generation strategies.
    """
    def generate(self, parameter: Parameter, params: Dict[str, Any]) -> Any:
        raise NotImplementedError

class RandomStrategy(SimulationStrategy):
    def generate(self, parameter: Parameter, params: Dict[str, Any]) -> Any:
        if parameter.type == ParameterType.NUMBER:
            min_val = parameter.min_value if parameter.min_value is not None else 0
            max_val = parameter.max_value if parameter.max_value is not None else 100
            return random.uniform(min_val, max_val)
        elif parameter.type == ParameterType.BOOLEAN:
            return random.choice([True, False])
        elif parameter.type == ParameterType.STRING:
            length = params.get("length", 10)
            chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
            return ''.join(random.choice(chars) for _ in range(length))
        return None

class LinearStrategy(SimulationStrategy):
    def generate(self, parameter: Parameter, params: Dict[str, Any]) -> Any:
        if "current_value" not in params:
            params["current_value"] = parameter.default_value if parameter.default_value is not None else (parameter.min_value or 0)
        
        step = params.get("step", 1)
        new_value = params["current_value"] + step
        
        min_val = parameter.min_value
        max_val = parameter.max_value
        
        if min_val is not None and max_val is not None:
            if new_value > max_val or new_value < min_val:
                params["step"] = -step # Reverse direction
                new_value = params["current_value"] + params["step"]
        
        params["current_value"] = new_value
        return new_value

class PeriodicStrategy(SimulationStrategy):
    def generate(self, parameter: Parameter, params: Dict[str, Any]) -> Any:
        if "time" not in params:
            params["time"] = 0
        
        period = params.get("period", 100)
        min_val = parameter.min_value if parameter.min_value is not None else 0
        max_val = parameter.max_value if parameter.max_value is not None else 100
        
        amplitude = params.get("amplitude", (max_val - min_val) / 2)
        offset = params.get("offset", (min_val + max_val) / 2)
        
        value = offset + amplitude * math.sin(2 * math.pi * params["time"] / period)
        params["time"] += 1
        return value

class RandomWalkStrategy(SimulationStrategy):
    def generate(self, parameter: Parameter, params: Dict[str, Any]) -> Any:
        if "current_value" not in params:
            params["current_value"] = parameter.default_value if parameter.default_value is not None else (parameter.min_value or 0)
        
        step_range = params.get("step_range")
        if step_range is None:
            min_val = parameter.min_value if parameter.min_value is not None else 0
            max_val = parameter.max_value if parameter.max_value is not None else 100
            step_range = (max_val - min_val) * 0.01 if max_val != min_val else 1.0
            
        change = random.uniform(-step_range, step_range)
        new_value = params["current_value"] + change
        
        if parameter.min_value is not None:
            new_value = max(parameter.min_value, new_value)
        if parameter.max_value is not None:
            new_value = min(parameter.max_value, new_value)
            
        params["current_value"] = new_value
        return new_value

# --- 2. Error Injector ---
class ErrorInjector:
    """
    Handles advanced error simulation: Anomaly, Drift, MCAR, Duplicate.
    """
    @staticmethod
    def apply(value: Any, error_config: Dict[str, Any], context: Dict[str, Any]) -> Any:
        if value is None:
            return None
            
        # MCAR (Missing Completely At Random)
        if "mcar_probability" in error_config:
            if random.random() < error_config["mcar_probability"]:
                return None

        # Only apply numerical errors to numbers
        if isinstance(value, (int, float)):
            # Drift
            if "drift_rate" in error_config:
                # Drift accumulates over time
                if "drift_accumulated" not in context:
                    context["drift_accumulated"] = 0.0
                
                drift_rate = error_config["drift_rate"] # units per second (approx per tick)
                context["drift_accumulated"] += drift_rate
                
                # Optional reset
                if "drift_reset_interval" in error_config:
                    if "drift_start_time" not in context:
                        context["drift_start_time"] = time.time()
                    if time.time() - context["drift_start_time"] > error_config["drift_reset_interval"]:
                        context["drift_accumulated"] = 0.0
                        context["drift_start_time"] = time.time()
                        
                value += context["drift_accumulated"]

            # Anomaly (Spike)
            if "anomaly_probability" in error_config:
                if random.random() < error_config["anomaly_probability"]:
                    multiplier = error_config.get("anomaly_multiplier", 1.5)
                    value *= multiplier
            
            # Noise (Gaussian)
            if "noise_std_dev" in error_config:
                std_dev = error_config["noise_std_dev"]
                if std_dev > 0:
                    noise = random.gauss(0, std_dev)
                    value += noise

        return value

# --- 3. Physics Engine ---
class PhysicsEngine:
    """
    Basic kinematics simulation.
    """
    @staticmethod
    def update_state(state: Dict[str, float], physics_config: Dict[str, float], dt: float = 1.0):
        """
        Update position based on velocity and acceleration.
        state: {'position': 0, 'velocity': 0}
        physics_config: {'mass': 10, 'max_velocity': 5, 'acceleration': 1, 'target_position': 100}
        """
        pos = state.get("position", 0.0)
        vel = state.get("velocity", 0.0)
        
        acc = physics_config.get("acceleration", 0.0)
        max_vel = physics_config.get("max_velocity", float('inf'))
        
        # Simple logic: accelerate towards target if defined, else just drift
        target = physics_config.get("target_position")
        if target is not None:
            if pos < target:
                vel += acc * dt
            elif pos > target:
                vel -= acc * dt
        
        # Clamp velocity
        vel = max(-max_vel, min(max_vel, vel))
        
        # Update position
        pos += vel * dt
        
        state["position"] = pos
        state["velocity"] = vel
        return state

from simpleeval import simple_eval

# --- 4. Logic Engine ---
class LogicEngine:
    """
    Evaluates user-defined rules.
    """
    @staticmethod
    def evaluate(context: Dict[str, Any], rules: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        context: Dictionary of current parameter values.
        rules: List of dicts like {'condition': 'temp > 100', 'action': 'status = "alarm"'}
        """
        updates = {}
        
        # Safe evaluation environment
        safe_dict = context.copy()
        safe_dict.update({"math": math, "max": max, "min": min, "abs": abs})
        
        for rule in rules:
            condition = rule.get("condition")
            action = rule.get("action")
            
            if not condition or not action:
                continue
                
            try:
                # Evaluate condition using simpleeval
                if simple_eval(condition, names=safe_dict):
                    # Execute action
                    # Action is expected to be assignment-like, e.g., "status = 'alarm'"
                    # We'll parse it simply: key = value
                    if "=" in action:
                        key, val_expr = action.split("=", 1)
                        key = key.strip()
                        val_expr = val_expr.strip()
                        
                        val = simple_eval(val_expr, names=safe_dict)
                        updates[key] = val
                        safe_dict[key] = val # Update context for subsequent rules
            except Exception as e:
                print(f"Logic evaluation error: {e}")
                
        return updates

# --- Factory ---
class StrategyFactory:
    _strategies = {
        GenerationMode.RANDOM: RandomStrategy(),
        GenerationMode.LINEAR: LinearStrategy(),
        GenerationMode.PERIODIC: PeriodicStrategy(),
        GenerationMode.RANDOM_WALK: RandomWalkStrategy(),
    }
    
    @staticmethod
    def get_strategy(mode: GenerationMode) -> SimulationStrategy:
        return StrategyFactory._strategies.get(mode, RandomStrategy())

# --- 5. State Management ---
class DeviceState:
    def __init__(self):
        self.parameter_states: Dict[str, Dict[str, Any]] = {} # param_id -> params
        self.physics_state: Dict[str, float] = {"position": 0.0, "velocity": 0.0}
        self.error_context: Dict[str, Dict[str, Any]] = {} # param_id -> context

class SimulationStateManager:
    _states: Dict[str, DeviceState] = {} # device_id -> DeviceState
    
    @staticmethod
    def get_state(device_id: str) -> DeviceState:
        if device_id not in SimulationStateManager._states:
            SimulationStateManager._states[device_id] = DeviceState()
        return SimulationStateManager._states[device_id]
        
    @staticmethod
    def clear_state(device_id: str):
        if device_id in SimulationStateManager._states:
            del SimulationStateManager._states[device_id]
