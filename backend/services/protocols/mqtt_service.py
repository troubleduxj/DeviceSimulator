import paho.mqtt.client as mqtt
import json
import threading
import time
from typing import Dict, Any
from services.config_service import ConfigService

class MQTTService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MQTTService, cls).__new__(cls)
            cls._instance.client = None
            cls._instance.connected = False
            cls._instance.config = {}
            cls._instance._lock = threading.Lock()
        return cls._instance

    def start(self):
        """Start MQTT Client based on system settings"""
        with self._lock:
            settings = ConfigService.get_system_settings()
            
            if not settings.get("mqtt_enabled", False):
                if self.connected:
                    self.stop()
                return

            # Check if config changed or not connected
            new_config = {
                "host": settings.get("mqtt_host", "localhost"),
                "port": settings.get("mqtt_port", 1883),
                "user": settings.get("mqtt_user"),
                "password": settings.get("mqtt_password"),
            }
            
            if self.connected and self.config == new_config:
                return # Already running with same config

            if self.connected:
                self.stop()

            self.config = new_config
            
            try:
                self.client = mqtt.Client()
                
                if self.config["user"] and self.config["password"]:
                    self.client.username_pw_set(self.config["user"], self.config["password"])
                
                self.client.on_connect = self._on_connect
                self.client.on_disconnect = self._on_disconnect
                
                print(f"Connecting to MQTT Broker at {self.config['host']}:{self.config['port']}...")
                self.client.connect(self.config["host"], int(self.config["port"]), 60)
                self.client.loop_start()
                
            except Exception as e:
                print(f"Failed to start MQTT Service: {e}")
                self.client = None
                self.connected = False

    def stop(self):
        """Stop MQTT Client"""
        with self._lock:
            if self.client:
                self.client.loop_stop()
                self.client.disconnect()
                self.client = None
            self.connected = False
            print("MQTT Service stopped")

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            print("Connected to MQTT Broker!")
            self.connected = True
        else:
            print(f"Failed to connect to MQTT Broker, return code {rc}")
            self.connected = False

    def _on_disconnect(self, client, userdata, rc):
        print("Disconnected from MQTT Broker")
        self.connected = False

    def publish(self, device_id: str, data: Dict[str, Any]):
        """Publish data to MQTT"""
        if not self.connected or not self.client:
            return

        settings = ConfigService.get_system_settings()
        topic_template = settings.get("mqtt_topic_template", "devices/{device_id}/data")
        topic = topic_template.replace("{device_id}", device_id)
        
        try:
            payload = json.dumps(data)
            self.client.publish(topic, payload)
        except Exception as e:
            print(f"MQTT Publish failed: {e}")

mqtt_service = MQTTService()
