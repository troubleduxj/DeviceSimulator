import { Device, SimulationStep } from '../types';

let API_BASE = '/api';

// Define global for TS
declare global {
  interface Window {
    electronAPI?: {
      getServerConfig: () => Promise<{ port: number; baseUrl: string }>;
    };
  }
}

export const initApiBase = async () => {
  if (window.electronAPI) {
    try {
      const config = await window.electronAPI.getServerConfig();
      API_BASE = `${config.baseUrl}/api`;
      console.log('Electron environment detected. API Base URL:', API_BASE);
    } catch (e) {
      console.error('Failed to get server config from Electron:', e);
    }
  }
};

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
  error_config?: Record<string, any>;
  is_tag?: boolean; // TDengine: true for TAG, false for COLUMN
  is_integer?: boolean;
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
  scenarios?: string[];
  scenario_configs?: Record<string, any>;
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
  scenarios?: string[];
  scenario_configs?: Record<string, any>;
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
  visual_config?: Record<string, any>; // Add visual_config
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
  subtable_name_template?: string;
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

  async fetchTDengineInfo(): Promise<any> {
      try {
        const response = await fetch(`${API_BASE}/system/tdengine/info`);
        if (!response.ok) return null;
        return await response.json();
      } catch (e) {
          return null;
      }
  },

  // Fetch all devices and map to frontend Device type
  async fetchDevices(): Promise<Device[]> {
    try {
      const backendDevices = await this.fetchBackendDevices();
      
      return backendDevices.map(bd => {
        const type = mapBackendTypeToFrontend(bd.type);
        let scenarios = bd.scenarios || [];
        
        // Inject default scenarios if none exist
        if (scenarios.length === 0) {
            scenarios = ['Normal Operation'];
            if (type === 'Generator') {
                scenarios = ['Normal Operation', 'High Load', 'Unstable Output'];
            } else if (type === 'Cutter') {
                scenarios = ['Precision Cutting', 'Idle', 'Error State'];
            }
        }

        return {
            id: bd.id,
            name: bd.name,
            type: type,
            backendType: bd.type, // Store original type
            description: bd.description || '',
            status: bd.status === 'running' ? 'running' : 'stopped',
            currentScenario: (bd as any).current_scenario || scenarios[0], // Use saved scenario or default
            scenarios: scenarios,
            scenario_configs: bd.scenario_configs,
            parameters: bd.parameters, // Keep raw parameters for updates
            physics_config: bd.physics_config,
            logic_rules: bd.logic_rules,
            metrics: bd.parameters.map(p => ({
            id: p.id || p.name, 
            name: p.name,
            unit: p.unit || '',
            min: p.min_value ?? 0,
            max: p.max_value ?? 100,
            is_tag: p.is_tag,
            is_integer: p.is_integer
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

  async deleteDeviceData(deviceId: string, start_time?: string, end_time?: string): Promise<void> {
    let url = `${API_BASE}/data/devices/${deviceId}/data`;
    const params = new URLSearchParams();
    if (start_time) params.append('start_time', start_time);
    if (end_time) params.append('end_time', end_time);
    
    if (params.toString()) {
        url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      method: 'DELETE'
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to delete device data');
    }
  },

  async getDeviceDataRange(deviceId: string): Promise<{start_time: string, end_time: string} | null> {
    try {
        const response = await fetch(`${API_BASE}/data/devices/${deviceId}/range`);
        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        return null;
    }
  },

  async generateHistoryData(deviceId: string, startTime: string, endTime: string, intervalMs?: number, cleanExisting?: boolean): Promise<any> {
    const response = await fetch(`${API_BASE}/data/devices/${deviceId}/generate-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_time: startTime,
        end_time: endTime,
        interval_ms: intervalMs,
        clean_existing: cleanExisting
      })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to generate history data');
    }
    return await response.json();
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
          logMessage: `Telemetry data received from backend. Active parameters: ${Object.keys(metrics).length}`,
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
