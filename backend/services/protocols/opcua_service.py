import logging
import asyncio
import threading
from typing import Dict, Any
from services.config_service import ConfigService
from utils.logger import logger

# Try to import asyncua, handle failure gracefully
try:
    from asyncua import Server, ua
    ASYNCUA_AVAILABLE = True
except ImportError as e:
    ASYNCUA_AVAILABLE = False
    logger.warning(f"Warning: asyncua import failed: {e}. OPC UA service will be disabled.")

class OPCUAService:
    def __init__(self):
        self.server = None
        self.running = False
        self.loop = None
        self.thread = None
        self.nodes = {} # device_id -> { 'object': obj_node, 'vars': { param_name: var_node } }
        self.idx = 0
        
    def start(self):
        """Start the OPC UA Server in a separate thread"""
        if not ASYNCUA_AVAILABLE:
            return False
            
        # Check if enabled in config
        settings = ConfigService.get_system_settings()
        if not settings.get("opcua_enabled", False):
            logger.info("OPC UA Service disabled in settings.")
            return False

        if self.running:
            return True
            
        self.running = True
        self.thread = threading.Thread(target=self._run_server_loop)
        self.thread.daemon = True
        self.thread.start()
        return True

    def stop(self):
        """Stop the OPC UA Server"""
        if not self.running:
            return
            
        self.running = False
        # We need to stop the server in the loop
        if self.loop and self.server:
            asyncio.run_coroutine_threadsafe(self.server.stop(), self.loop)
        
        if self.thread:
            self.thread.join(timeout=2)

    def _run_server_loop(self):
        """Thread target to run asyncio loop"""
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        
        self.loop.run_until_complete(self._init_server())
        self.loop.run_forever()

    async def _init_server(self):
        """Initialize and start AsyncUA server"""
        self.server = Server()
        await self.server.init()
        
        # Configuration
        settings = ConfigService.get_system_settings()
        endpoint = settings.get("opcua_endpoint", "opc.tcp://0.0.0.0:4840/freeopcua/server/")
        self.server.set_endpoint(endpoint)
        self.server.set_server_name("IoT Digital Twin Simulator")
        
        # Register Namespace
        uri = "http://iot-simulator.org"
        self.idx = await self.server.register_namespace(uri)
        
        # Start
        async with self.server:
            logger.info(f"OPC UA Server started at {self.server.endpoint}")
            while self.running:
                await asyncio.sleep(1)

    def update(self, device_id: str, data: Dict[str, Any], parameters: list = None):
        """Update device data in OPC UA address space"""
        if not self.running or not self.loop:
            return

        asyncio.run_coroutine_threadsafe(
            self._async_update(device_id, data, parameters), 
            self.loop
        )

    async def _async_update(self, device_id: str, data: Dict[str, Any], parameters: list):
        if not self.server:
            return

        # Check if device node exists
        if device_id not in self.nodes:
            await self._create_device_node(device_id, parameters)
        
        node_info = self.nodes.get(device_id)
        if not node_info:
            return

        # Update variables
        for key, value in data.items():
            if key in node_info['vars']:
                var_node = node_info['vars'][key]
                # Determine variant type based on value?
                # For now, just write value. Asyncua handles type inference usually.
                try:
                    # ua.VariantType...
                    await var_node.write_value(value)
                except Exception as e:
                    logger.error(f"OPC UA write error for {device_id}.{key}: {e}")

    async def _create_device_node(self, device_id: str, parameters: list):
        """Create Object Node for device"""
        try:
            objects = self.server.nodes.objects
            
            # Create Object
            dev_obj = await objects.add_object(self.idx, f"Device_{device_id}")
            
            self.nodes[device_id] = {
                'object': dev_obj,
                'vars': {}
            }
            
            # Create Variables
            if parameters:
                for param in parameters:
                    p_name = param.name # Or id?
                    p_id = param.id if hasattr(param, 'id') else param.get('id')
                    
                    # Default value
                    init_val = 0.0
                    
                    var_node = await dev_obj.add_variable(self.idx, p_id, init_val)
                    await var_node.set_writable() # Set client writable?
                    self.nodes[device_id]['vars'][p_id] = var_node
                    
        except Exception as e:
            logger.error(f"Error creating OPC UA node for {device_id}: {e}")

# Global instance
opcua_service = OPCUAService()
