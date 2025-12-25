import threading
import time
from typing import Dict, Any, List
from pymodbus.server import StartTcpServer
try:
    # Pymodbus 3.x
    from pymodbus.datastore import ModbusServerContext
    from pymodbus.datastore import ModbusSequentialDataBlock
    from pymodbus.datastore import ModbusSlaveContext
except ImportError:
    # Fallback or alternative paths
    try:
        from pymodbus.datastore import ModbusServerContext
        from pymodbus.datastore import ModbusSequentialDataBlock
        from pymodbus.datastore import ModbusDeviceContext as ModbusSlaveContext
    except ImportError:
         # Direct module import
        from pymodbus.datastore import ModbusServerContext
        from pymodbus.datastore.context import ModbusSequentialDataBlock, ModbusDeviceContext as ModbusSlaveContext

from services.config_service import ConfigService
from models.device import Parameter, ParameterType
from utils.logger import logger

class ModbusService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModbusService, cls).__new__(cls)
            cls._instance.server_thread = None
            cls._instance.running = False
            cls._instance.context = None
            cls._instance.config = {}
            cls._instance.device_mappings = {} # device_id -> register_offset
            cls._instance._lock = threading.Lock()
        return cls._instance

    def start(self):
        """Start Modbus TCP Server"""
        with self._lock:
            settings = ConfigService.get_system_settings()
            
            if not settings.get("modbus_enabled", False):
                if self.running:
                    self.stop()
                return

            port = settings.get("modbus_port", 5020)
            
            if self.running and self.config.get("port") == port:
                return

            if self.running:
                self.stop()

            self.config = {"port": port}
            
            # Initialize Data Store
            # 0-99: System/Status
            # 100+: Device Data
            store = ModbusSlaveContext(
                di=ModbusSequentialDataBlock(0, [0]*10000),
                co=ModbusSequentialDataBlock(0, [0]*10000),
                hr=ModbusSequentialDataBlock(0, [0]*10000),
                ir=ModbusSequentialDataBlock(0, [0]*10000)
            )
            self.context = ModbusServerContext(slaves=store, single=True)
            
            # identity = ModbusDeviceIdentification()
            # identity.VendorName = 'DeviceSimulator'
            # identity.ProductCode = 'DS-Sim'
            # identity.VendorUrl = 'http://github.com/troubleduxj/DeviceSimulator'
            # identity.ProductName = 'Device Simulator Modbus Server'
            # identity.ModelName = 'Device Simulator Server'
            # identity.MajorMinorRevision = '1.0.0'

            logger.info(f"Starting Modbus TCP Server on port {port}...")
            self.server_thread = threading.Thread(
                target=StartTcpServer,
                kwargs={"context": self.context, "address": ("0.0.0.0", port)}
            )
            self.server_thread.daemon = True
            self.server_thread.start()
            self.running = True

    def stop(self):
        """Stop Modbus Server (Not easily stoppable in pymodbus w/o server object access, but we can ignore updates)"""
        # pymodbus StartTcpServer blocks, so we run it in a thread. 
        # Stopping it gracefully requires accessing the server instance which StartTcpServer wraps.
        # For now, we just set running=False to stop updating registers.
        self.running = False
        logger.info("Modbus Service stopped (updates paused)")

    def update(self, device_id: str, data: Dict[str, Any], parameters: List[Parameter]):
        """Update Modbus registers based on generated data"""
        if not self.running or not self.context:
            return

        # Simple mapping strategy:
        # We hash device_id to get a stable "slot" or just use a sequential allocator?
        # For simplicity in this version: 
        # We need a stable mapping. Let's assume we only simulate a few devices or 
        # we map based on numeric ID if available. 
        # Better approach: Store a mapping in memory.
        
        if device_id not in self.device_mappings:
            # Allocate a new block of 100 registers per device
            # Starting from 100
            offset = 100 + len(self.device_mappings) * 100
            self.device_mappings[device_id] = offset
            
        start_register = self.device_mappings[device_id]
        
        slave_id = 0x00 # Unit ID
        values = []
        
        # Flatten parameters to registers
        # Only support Numbers/Booleans
        # 1 Register = 16 bits. 
        # Floats need 2 registers (32 bits) usually, but let's scale to int for simplicity first or use ints
        # For MVP: Round floats to integers
        
        for param in parameters:
            val = data.get(param.id)
            
            if isinstance(val, (int, float)):
                # Convert to 16-bit int (simple scaling or truncation)
                # Handling floats properly in Modbus is complex (IEEE 754).
                # Here we cast to int for simplicity.
                int_val = int(val) & 0xFFFF 
                values.append(int_val)
            elif isinstance(val, bool):
                values.append(1 if val else 0)
            else:
                values.append(0) # Skip strings
                
        if values:
            register = 3 # Holding Registers
            self.context[slave_id].setValues(register, start_register, values)

modbus_service = ModbusService()
