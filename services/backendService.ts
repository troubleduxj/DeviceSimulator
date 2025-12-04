import { Device, SimulationStep } from '../types';

const API_BASE = '/api';

// Backend Types
export enum ParameterType {
  NUMBER = "数值",
  BOOLEAN = "布尔",
  STRING = "字符串"
}

export enum GenerationMode {
  RANDOM = "random",
  LINEAR = "linear",
  PERIODIC = "periodic",
  RANDOM_WALK = "random_walk",
  CUSTOM = "custom"
}

export interface BackendParameter {
  id?: string;
  name: string;
  type: ParameterType;
  unit?: string;
  min_value?: number;
  max_value?: number;
  default_value?: any;
  generation_mode: GenerationMode;
  generation_params?: Record<string, any>;
  error_config?: Record<string, any>; // Added error_config
}

export interface BackendDevice {
  id: string;
  name: string;
  type: string;
  model?: string;
  description?: string;
  visual_model?: string;
  parameters: BackendParameter[];
  sampling_rate: number;
  status: 'running' | 'stopped' | 'error';
  physics_config?: Record<string, any>;
  logic_rules?: Array<{ condition: string; action: string }>;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  code: string;
  description?: string;
  visual_model?: string;
  parameters: BackendParameter[];
  physics_config?: Record<string, any>;
  logic_rules?: Array<{ condition: string; action: string }>;
  created_at?: string;
  updated_at?: string;
}

export interface SimulationModel {
  id: string;
  name: string;
  type: string;
  description?: string;
  parameters: BackendParameter[];
  physics_config?: Record<string, any>;
  logic_rules?: Array<{ condition: string; action: string }>;
  created_at?: string;
  updated_at?: string;
}

export interface TDengineConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  enabled: boolean;
}

export interface SystemStatus {
  status: string;
  tdengine_connected: boolean;
  tdengine_enabled: boolean;
  app_host: string;
  app_port: number;
  debug: boolean;
}

export interface SystemSettings {
  mqtt_enabled: boolean;
  mqtt_host?: string;
  mqtt_port?: number;
  mqtt_user?: string;
  mqtt_password?: string;
  mqtt_topic_template?: string;
  modbus_enabled: boolean;
  modbus_port?: number;
  opcua_enabled: boolean;
  opcua_endpoint?: string;
}

export const backendService = {
  // ... existing methods ...

  // --- System Settings ---
  async fetchSystemSettings(): Promise<SystemSettings> {
    const response = await fetch(`${API_BASE}/system/settings`);
    if (!response.ok) throw new Error('Failed to fetch system settings');
    return await response.json();
  },

  async updateSystemSettings(settings: SystemSettings): Promise<any> {
    const response = await fetch(`${API_BASE}/system/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!response.ok) throw new Error('Failed to update system settings');
    return await response.json();
  },

  // Fetch all devices (Raw Backend Format)
  async fetchBackendDevices(): Promise<BackendDevice[]> {
      const response = await fetch(`${API_BASE}/device/`);
      if (!response.ok) throw new Error('Failed to fetch devices');
      return await response.json();
  },

  // --- Category Operations ---
  async fetchCategories(): Promise<Category[]> {
    const response = await fetch(`${API_BASE}/category/`);
    if (!response.ok) throw new Error('Failed to fetch categories');
    return await response.json();
  },

  async createCategory(category: Partial<Category>): Promise<Category> {
    const response = await fetch(`${API_BASE}/category/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category)
    });
    if (!response.ok) throw new Error('Failed to create category');
    return await response.json();
  },

  async updateCategory(id: string, category: Partial<Category>): Promise<Category> {
    const response = await fetch(`${API_BASE}/category/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category)
    });
    if (!response.ok) throw new Error('Failed to update category');
    return await response.json();
  },

  async deleteCategory(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/category/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete category');
  },

  async syncCategoriesToTDengine(): Promise<any> {
    const response = await fetch(`${API_BASE}/category/sync-tdengine`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to sync to TDengine');
    return await response.json();
  },

  // --- Simulation Model Operations ---
  async fetchSimulationModels(): Promise<SimulationModel[]> {
    const response = await fetch(`${API_BASE}/simulation-model/`);
    if (!response.ok) throw new Error('Failed to fetch simulation models');
    return await response.json();
  },

  async createSimulationModel(model: Partial<SimulationModel>): Promise<SimulationModel> {
    const response = await fetch(`${API_BASE}/simulation-model/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(model)
    });
    if (!response.ok) throw new Error('Failed to create simulation model');
    return await response.json();
  },

  async updateSimulationModel(id: string, model: Partial<SimulationModel>): Promise<SimulationModel> {
    const response = await fetch(`${API_BASE}/simulation-model/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(model)
    });
    if (!response.ok) throw new Error('Failed to update simulation model');
    return await response.json();
  },

  async deleteSimulationModel(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/simulation-model/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete simulation model');
  },

  // --- System Operations ---
  async fetchSystemStatus(): Promise<SystemStatus> {
    const response = await fetch(`${API_BASE}/system/status`);
    if (!response.ok) throw new Error('Failed to fetch system status');
    return await response.json();
  },

  async fetchTDengineConfig(): Promise<TDengineConfig> {
    const response = await fetch(`${API_BASE}/system/tdengine/config`);
    if (!response.ok) throw new Error('Failed to fetch TDengine config');
    return await response.json();
  },

  async updateTDengineConfig(config: TDengineConfig): Promise<any> {
    const response = await fetch(`${API_BASE}/system/tdengine/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    if (!response.ok) throw new Error('Failed to update TDengine config');
    return await response.json();
  },

  async testTDengineConnection(): Promise<any> {
    const response = await fetch(`${API_BASE}/system/tdengine/test-connection`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to test TDengine connection');
    return await response.json();
  },

  // Fetch all devices and map to frontend Device type
  async fetchDevices(): Promise<Device[]> {
    try {
      const backendDevices = await this.fetchBackendDevices();
      
      return backendDevices.map(bd => {
        const type = mapBackendTypeToFrontend(bd.type);
        let scenarios = ['Normal Operation'];
        
        // Inject scenarios based on type
        if (type === 'Generator') {
            scenarios = ['Normal Operation', 'High Load', 'Unstable Output'];
        } else if (type === 'Cutter') {
            scenarios = ['Precision Cutting', 'Idle', 'Error State'];
        }

        return {
            id: bd.id,
            name: bd.name,
            type: type,
            description: bd.description || '',
            status: bd.status === 'running' ? 'running' : 'stopped',
            currentScenario: scenarios[0], 
            scenarios: scenarios,
            parameters: bd.parameters, // Keep raw parameters for updates
            physics_config: bd.physics_config,
            logic_rules: bd.logic_rules,
            metrics: bd.parameters.map(p => ({
            id: p.id || p.name, 
            name: p.name,
            unit: p.unit || '',
            min: p.min_value ?? 0,
            max: p.max_value ?? 100
            }))
        } as any; // Use any to bypass strict type check for extra fields if needed
      });
    } catch (error) {
      console.error('Backend Fetch Error:', error);
      throw error;
    }
  },

  // CRUD Operations
  async createDevice(device: Partial<BackendDevice>): Promise<BackendDevice> {
    const response = await fetch(`${API_BASE}/device/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(device)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create device');
    }
    return await response.json();
  },

  async updateDevice(id: string, device: Partial<BackendDevice>): Promise<BackendDevice> {
    const response = await fetch(`${API_BASE}/device/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(device)
    });
    if (!response.ok) throw new Error('Failed to update device');
    return await response.json();
  },

  async deleteDevice(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/device/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete device');
  },

  // Check if global data generation is running
  async getSystemStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/data/status`);
      const data = await response.json();
      return data.running;
    } catch (e) {
      return false;
    }
  },

  // Start global data generation
  async startSystem(): Promise<void> {
    await fetch(`${API_BASE}/data/start`, { method: 'POST' });
  },

  // Stop global data generation
  async stopSystem(): Promise<void> {
    await fetch(`${API_BASE}/data/stop`, { method: 'POST' });
  },

  // Update device status
  async updateDeviceStatus(deviceId: string, status: 'running' | 'stopped'): Promise<void> {
    await fetch(`${API_BASE}/device/${deviceId}/status/${status}`, {
      method: 'PATCH'
    });
  },

  // Fetch latest data for a device
  async fetchDeviceData(deviceId: string): Promise<SimulationStep | null> {
    try {
      // Fetch last 1 record
      const response = await fetch(`${API_BASE}/data/devices/${deviceId}/data?limit=1`);
      if (!response.ok) return null;
      
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const latest = data[0];
        // backend returns { ts: string, param1: val, param2: val ... }
        // We need to convert to { timestamp, metrics: { param1: val ... } }
        
        const metrics: Record<string, number> = {};
        Object.keys(latest).forEach(key => {
          if (key !== 'ts') {
            metrics[key] = typeof latest[key] === 'number' ? latest[key] : parseFloat(latest[key]);
          }
        });

        return {
          timestamp: new Date(latest.ts).getTime(), // Ensure this timestamp is changing
          metrics,
          logMessage: '',
          statusSeverity: 'info'
        };
      }
      return null;
    } catch (error) {
      console.error('Fetch Data Error:', error);
      return null;
    }
  }
};

function mapBackendTypeToFrontend(type: string): 'Generator' | 'Cutter' | 'Generic' {
  const lower = type.toLowerCase();
  if (lower.includes('generator') || lower.includes('motor')) return 'Generator';
  if (lower.includes('cutter') || lower.includes('cnc')) return 'Cutter';
  return 'Generic';
}
