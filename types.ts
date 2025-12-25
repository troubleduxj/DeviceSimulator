export interface MetricConfig {
  id: string;
  name: string;
  unit: string;
  min: number;
  max: number;
  is_tag?: boolean;
  is_integer?: boolean;
}

export interface ScenarioConfig {
  name: string;
  description: string; // For AI Mode prompt
  parameter_updates?: {
    param_id: string;
    update_type: 'set' | 'offset' | 'drift' | 'noise';
    value?: number; // For set/offset
    drift_rate?: number;
    noise_std_dev?: number;
    anomaly_probability?: number;
  }[];
}

export interface Device {
  id: string;
  name: string;
  type: string;
  backendType?: string; // Store original backend type code (e.g. 'diesel_generator')
  description: string;
  visual_model?: string;
  visual_config?: any; // Add visual_config
  metrics: MetricConfig[];
  status: 'stopped' | 'running';
  currentScenario: string;
  scenarios: string[];
  scenario_configs?: Record<string, ScenarioConfig>;
  // Backend/Advanced fields
  parameters?: any[]; 
  physics_config?: Record<string, any>;
  logic_rules?: any[];
}

export interface SimulationStep {
  timestamp: number;
  metrics: Record<string, number>;
  logMessage: string;
  statusSeverity: 'info' | 'warning' | 'error' | 'critical';
}

export interface SimulationResponse {
  batch: {
    metrics: Record<string, number>;
    logMessage: string;
    statusSeverity: 'info' | 'warning' | 'error' | 'critical';
  }[];
}

export type SimulationMode = 'AI' | 'Local' | 'Backend';

export type Language = 'en' | 'zh';

export interface AppState {
  devices: Device[];
  activeDeviceId: string | null;
  simulationMode: SimulationMode;
  language: Language;
}
