import { Device, MetricConfig, SimulationStep } from '../types';

interface PhysicsState {
  [deviceId: string]: Record<string, number>;
}

const stateCache: PhysicsState = {};

/**
 * Generates data locally using basic physics (inertia, target seeking, noise).
 */
export const generateLocalData = (
  device: Device,
  prevMetrics: Record<string, number> | null
): SimulationStep => {
  // Initialize state if not exists or if device was stopped
  if (!stateCache[device.id] || !prevMetrics) {
    stateCache[device.id] = {};
    device.metrics.forEach((m) => {
      stateCache[device.id][m.id] = m.min; // Start at min
    });
  }

  const currentMetrics = { ...stateCache[device.id] };
  const nextMetrics: Record<string, number> = {};
  const isRunning = device.status === 'running';

  device.metrics.forEach((metric) => {
    let target = metric.min;
    let noiseFactor = 0.02; // 2% noise
    let inertia = 0.1; // 10% move towards target per tick

    if (isRunning) {
      // Determine target based on scenario keywords
      const scenario = device.currentScenario.toLowerCase();
      const isFault = scenario.includes('leak') || scenario.includes('fail') || scenario.includes('clog') || scenario.includes('loss');
      const isHighLoad = scenario.includes('high') || scenario.includes('fast');

      // Base target logic
      if (metric.id === 'rpm' || metric.id.includes('current')) {
        target = isHighLoad ? metric.max * 0.9 : metric.max * 0.7;
        if (scenario.includes('leak') || scenario.includes('clog')) target *= 0.5; // Performance drop
      } else if (metric.id === 'temp' || metric.id.includes('heat')) {
        target = (metric.max + metric.min) / 2;
        if (isHighLoad) target = metric.max * 0.8;
        if (scenario.includes('overheat') || scenario.includes('fire')) target = metric.max;
        inertia = 0.05; // Temp changes slower
      } else if (metric.id === 'x_pos') {
        // Oscillation for position
        const time = Date.now() / 1000;
        target = (Math.sin(time) + 1) / 2 * metric.max;
        inertia = 0.2; // Move fast
      } else {
        target = (metric.max + metric.min) / 2;
      }

      if (isFault && Math.random() > 0.8) {
        noiseFactor = 0.1; // High noise during faults
      }
    } else {
      // Stopped: target is min (usually 0)
      target = metric.min;
      inertia = 0.05; // Spin down slowly
    }

    // Physics Formula: Next = Current + (Target - Current) * Inertia + Noise
    const current = currentMetrics[metric.id] || metric.min;
    const rawNext = current + (target - current) * inertia;
    const noise = (Math.random() - 0.5) * (metric.max - metric.min) * noiseFactor;
    
    // Clamp values
    nextMetrics[metric.id] = Math.max(metric.min, Math.min(metric.max, rawNext + noise));
  });

  // Update Cache
  stateCache[device.id] = nextMetrics;

  // Generate Log
  let logMessage = isRunning ? `Device operating under ${device.currentScenario}.` : 'Device stopped.';
  let severity: SimulationStep['statusSeverity'] = 'info';

  if (isRunning) {
    const scenario = device.currentScenario.toLowerCase();
    if (scenario.includes('leak') || scenario.includes('fail')) {
      logMessage = `CRITICAL: Detected anomaly consistent with ${device.currentScenario}`;
      severity = 'critical';
    } else if (scenario.includes('warn') || scenario.includes('high')) {
      logMessage = `WARNING: Load parameters elevated.`;
      severity = 'warning';
    }
  }

  return {
    timestamp: Date.now(),
    metrics: nextMetrics,
    logMessage,
    statusSeverity: severity,
  };
};
