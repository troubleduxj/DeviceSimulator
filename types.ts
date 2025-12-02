export interface MetricConfig {
  id: string;
  name: string;
  unit: string;
  min: number;
  max: number;
}

export interface Device {
  id: string;
  name: string;
  type: string;
  description: string;
  metrics: MetricConfig[];
  status: 'stopped' | 'running';
  currentScenario: string;
  scenarios: string[];
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
