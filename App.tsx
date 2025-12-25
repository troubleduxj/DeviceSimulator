import React, { useState, useEffect, useRef } from 'react';
import { 
  Device, SimulationStep, SimulationMode 
} from './types';
import { INITIAL_DEVICES, DICTIONARY } from './constants';
import { fetchAiSimulationBatch } from './services/geminiService';
import { generateLocalData } from './services/physicsService';
import { backendService, initApiBase } from './services/backendService';
import { formatCSVTimestamp } from './utils/timeUtils';

// Icons & UI
import { 
  Play, Square, Plus, Activity, Cpu, Database, 
  Settings, LayoutDashboard, 
  Zap, Globe, Server, Fan, Box, List, LayoutGrid, Layers,
  Sun, Moon, X, Sliders, Sparkles
} from 'lucide-react';
import { TelemetryChart } from './components/TelemetryChart';
import { DigitalTwin } from './components/DigitalTwin';
import { LogViewer } from './components/LogViewer';
import { AddDeviceModal } from './components/AddDeviceModal';
import { DeviceManager } from './components/DeviceManager';
import { SystemManager } from './components/SystemManager';
import { CategoryManager } from './components/CategoryManager';
import { ParameterManager } from './components/ParameterManager';
import { ScenarioManager } from './components/ScenarioManager';
import { VisualModelManager } from './components/VisualModelManager';
import { LlmManager } from './components/LlmManager';
import { Dashboard } from './components/Dashboard';
import { Playback } from './components/Playback';
import { RealtimeMonitor } from './components/RealtimeMonitor';
import { DeviceMonitorView } from './components/DeviceMonitorView';
import { ErrorBoundary } from './components/ErrorBoundary';

const MAX_HISTORY = 60; // Keep 60 seconds of history

const App: React.FC = () => {
  // --- Global State ---
  const [isApiReady, setIsApiReady] = useState(false);
  const [localDevices, setLocalDevices] = useState<Device[]>(INITIAL_DEVICES);
  const [devices, setDevices] = useState<Device[]>(INITIAL_DEVICES);
  const [activeDeviceId, setActiveDeviceId] = useState<string>(INITIAL_DEVICES[0].id);
  const [simulationMode, setSimulationMode] = useState<SimulationMode>('Backend');
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [metricsViewMode, setMetricsViewMode] = useState<'grid' | 'list'>('grid');
  const [currentView, setCurrentView] = useState<'monitor' | 'devices' | 'categories' | 'scenarios' | 'visual_models' | 'models' | 'system' | 'parameters' | 'llm' | 'dashboard' | 'playback' | 'realtime'>('dashboard');
  
  // --- Simulation State ---
  const [history, setHistory] = useState<SimulationStep[]>([]);
  const [logs, setLogs] = useState<SimulationStep[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // --- Refs for Loop Control ---
  const bufferRef = useRef<SimulationStep[]>([]);
  const activeDeviceRef = useRef<Device>(INITIAL_DEVICES[0]);
  const isFetchingRef = useRef(false);
  
  // Helpers
  const activeDevice = devices.find(d => d.id === activeDeviceId) || devices[0];
  const dict = DICTIONARY[language];

  // Initialize API
  useEffect(() => {
    initApiBase().then(() => setIsApiReady(true));
  }, []);

  // Keep ref in sync
  useEffect(() => {
    if (activeDevice) {
      activeDeviceRef.current = activeDevice;
    }
  }, [activeDevice]);

  // Handle Mode Switching & Device List
  const fetchDevs = React.useCallback(async () => {
    if (simulationMode === 'Backend') {
      try {
        console.log('Fetching backend devices...');
        const backendDevices = await backendService.fetchDevices();
        console.log('Backend devices fetched:', backendDevices);
        setDevices(backendDevices);
        
        // Use ref to avoid stale closure in setInterval
        const currentActive = activeDeviceRef.current;
        
        // If current active device is not in list, pick first one
        if (currentActive && !backendDevices.find(d => d.id === currentActive.id)) {
           if (backendDevices.length > 0) {
              setActiveDeviceId(backendDevices[0].id);
           }
        }
      } catch (error) {
        console.error('Failed to fetch devices:', error);
      }
    } else {
      setDevices(localDevices);
    }
  }, [simulationMode, localDevices]);

  useEffect(() => {
    if (!isApiReady) return;
    
    fetchDevs();
    
    // Poll for device list changes every 5 seconds
    const interval = setInterval(fetchDevs, 5000);
    return () => clearInterval(interval);

  }, [fetchDevs, isApiReady]);

  // Reset history when switching devices
  useEffect(() => {
    setHistory([]);
    setLogs([]);
    bufferRef.current = [];
  }, [activeDeviceId]);

  // --- AI Data Fetching ---
  const fetchBatch = React.useCallback(async (device: Device) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    
    try {
      // Get the last known metric state
      const lastMetric = history.length > 0 ? history[history.length - 1].metrics : null;
      
      const response = await fetchAiSimulationBatch(device, lastMetric);
      
      if (response && response.batch) {
        const steps: SimulationStep[] = response.batch.map((item, index) => ({
           timestamp: Date.now() + (index * 1000), // Future timestamps
           metrics: item.metrics,
           logMessage: item.logMessage,
           statusSeverity: item.statusSeverity as any
        }));
        
        bufferRef.current = [...bufferRef.current, ...steps];
      }
    } catch (err) {
      console.error("AI Fetch Failed, falling back to local physics temporarily.", err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [history]);

  // --- Simulation Loop (The "Tick") ---
  useEffect(() => {
    const tickRate = 1000; // 1 second per tick
    
    const tick = () => {
      const device = activeDeviceRef.current;
      if (!device) return;
      
      // Backend Mode
      if (simulationMode === 'Backend') {
        if (device.status === 'running') {
          backendService.fetchDeviceData(device.id).then(step => {
            if (step) {
              // console.log('Backend Data Received:', step); // Debug log
              
              // Deduplicate based on timestamp to avoid adding same data point
              setHistory(prev => {
                if (prev.length > 0 && prev[prev.length - 1].timestamp === step.timestamp) {
                   // If timestamp matches, check if values changed (maybe backend time is stuck but values update?)
                   // Ideally backend time should tick. We'll assume strictly time-based for now.
                   return prev;
                }
                const newHistory = [...prev, step];
                if (newHistory.length > MAX_HISTORY) return newHistory.slice(newHistory.length - MAX_HISTORY);
                return newHistory;
              });

              // Add to logs if it's significant or periodically
              if (step.logMessage && (step.statusSeverity !== 'info' || Math.random() > 0.8)) {
                setLogs(prev => [...prev, step]);
              }
            } else {
               // console.warn('No data received from backend');
            }
          }).catch(err => console.error('Fetch error:', err));
        }
        return;
      }

      let nextStep: SimulationStep | null = null;

      // 1. Try to pop from buffer (AI Mode)
      if (simulationMode === 'AI' && device.status === 'running') {
        if (bufferRef.current.length > 0) {
           nextStep = bufferRef.current.shift()!;
           // Fix timestamp to be "now" when consumed
           nextStep.timestamp = Date.now();
        } else {
           // Buffer empty? Fallback to local to avoid stutter
           const prevMetrics = history.length > 0 ? history[history.length - 1].metrics : null;
           nextStep = generateLocalData(device, prevMetrics);
        }

        // Prefetch if buffer is low
        if (bufferRef.current.length < 5 && !isFetchingRef.current) {
           fetchBatch(device);
        }
      } 
      // 2. Local Mode or Stopped
      else {
        const prevMetrics = history.length > 0 ? history[history.length - 1].metrics : null;
        nextStep = generateLocalData(device, prevMetrics);
      }

      // Update State
      if (nextStep) {
        setHistory(prev => {
          const newHistory = [...prev, nextStep!];
          if (newHistory.length > MAX_HISTORY) return newHistory.slice(newHistory.length - MAX_HISTORY);
          return newHistory;
        });

        // Add to logs if it's significant or periodically
        if (nextStep.logMessage && (nextStep.statusSeverity !== 'info' || Math.random() > 0.8)) {
          setLogs(prev => [...prev, nextStep!]);
        }
      }
    };

    const interval = setInterval(tick, tickRate);
    return () => clearInterval(interval);
  }, [simulationMode, history, fetchBatch]);

  // --- Handlers ---
  const toggleDeviceStatus = async () => {
    const newStatus = activeDevice.status === 'running' ? 'stopped' : 'running';
    updateDevice({ ...activeDevice, status: newStatus });

    if (simulationMode === 'Backend') {
      try {
        await backendService.updateDeviceStatus(activeDevice.id, newStatus);
        if (newStatus === 'running') {
          await backendService.startSystem();
        }
      } catch (e) {
        console.error("Failed to update backend status", e);
      }
    }
  };

  const updateDevice = (updated: Device) => {
    setDevices(prev => prev.map(d => d.id === updated.id ? updated : d));
    if (simulationMode !== 'Backend') {
      setLocalDevices(prev => prev.map(d => d.id === updated.id ? updated : d));
    }
  };

  const handleScenarioChange = async (scenario: string) => {
    const updatedDevice = { ...activeDevice, currentScenario: scenario };
    updateDevice(updatedDevice);
    
    // Clear buffer to force AI to react to new scenario immediately
    bufferRef.current = [];

    // Backend Mode: Apply Scenario Logic via Parameter Updates
    if (simulationMode === 'Backend' && activeDevice.parameters) {
        try {
            // Deep copy parameters
            const newParams = JSON.parse(JSON.stringify(activeDevice.parameters));
            
            // Check if there is a custom AI config for this scenario
            if (activeDevice.scenario_configs && activeDevice.scenario_configs[scenario]) {
                 const config = activeDevice.scenario_configs[scenario];
                 if (config.parameter_updates) {
                     config.parameter_updates.forEach((update: any) => {
                         const param = newParams.find((p: any) => p.id === update.param_id);
                         if (param) {
                             if (!param.error_config) param.error_config = {};
                             
                             if (update.update_type === 'drift') {
                                 param.error_config.drift_rate = update.drift_rate;
                             }
                             if (update.noise_std_dev) {
                                 param.error_config.noise_std_dev = update.noise_std_dev;
                             }
                             if (update.anomaly_probability) {
                                 param.error_config.anomaly_probability = update.anomaly_probability;
                             }
                             if (update.update_type === 'set' && update.value !== undefined) {
                                 param.min_value = update.value;
                                 param.max_value = update.value;
                             }
                         }
                     });
                 }
            } else if (scenario === 'High Load') {
                newParams.forEach((p: any) => {
                    if (p.type === '数值') { // ParameterType.NUMBER
                        p.min_value = (p.min_value || 0) * 1.2;
                        p.max_value = (p.max_value || 100) * 1.2;
                        if (!p.error_config) p.error_config = {};
                        p.error_config.anomaly_probability = 0.05;
                    }
                });
            } else if (scenario === 'Unstable Output' || scenario === 'Error State') {
                newParams.forEach((p: any) => {
                    if (p.type === '数值') {
                        if (!p.error_config) p.error_config = {};
                        p.error_config.anomaly_probability = 0.2;
                        p.error_config.drift_rate = 5.0;
                    }
                });
            } else if (scenario === 'Idle') {
                newParams.forEach((p: any) => {
                    if (p.type === '数值') {
                        p.min_value = 0;
                        p.max_value = 10; // Low value
                    }
                });
            } else if (scenario === 'Normal Operation' || scenario === 'Precision Cutting') {
                // Reset logic would require storing original values, 
                // but for now we assume 'Normal' is just 'Not Modified' relative to base?
                // Or we just reset error config.
                newParams.forEach((p: any) => {
                    if (p.error_config) {
                        p.error_config = {}; // Clear errors
                    }
                });
            }

            // Send update to backend (Must send full object for PUT)
            // CRITICAL: Ensure we send the UPDATED currentScenario, otherwise it reverts
            const payload: any = { 
                ...activeDevice, 
                current_scenario: scenario, // Backend expects snake_case
                parameters: newParams 
            };
            
            if (activeDevice.backendType) {
                payload.type = activeDevice.backendType;
            }
            // Remove frontend-only fields
            if (payload.metrics) delete payload.metrics;
            if (payload.currentScenario) delete payload.currentScenario; // Remove frontend key
            
            await backendService.updateDevice(activeDevice.id, payload);
            
            // Refresh device list to reflect changes
            const backendDevices = await backendService.fetchDevices();
            setDevices(backendDevices);
            
        } catch (e) {
            console.error("Failed to apply scenario", e);
        }
    }
  };

  const handleAddDevice = (newDevice: Device) => {
    if (simulationMode !== 'Backend') {
      const newSet = [...localDevices, newDevice];
      setLocalDevices(newSet);
      setDevices(newSet);
      setActiveDeviceId(newDevice.id);
    }
  };

  const handleExportHistory = () => {
    if (history.length === 0) return;
    
    // 1. Collect all possible keys from metrics
    const allKeys = new Set<string>();
    history.forEach(step => {
        if (step.metrics) {
            Object.keys(step.metrics).forEach(k => allKeys.add(k));
        }
    });
    const keysArray = Array.from(allKeys);

    // 2. Build Header Row
    const header = ['Timestamp', ...keysArray].join(',');

    // 3. Build Data Rows
    const rows = history.map(step => {
        const ts = formatCSVTimestamp(step.timestamp);
        const metricValues = keysArray.map(key => {
            return step.metrics && step.metrics[key] !== undefined ? step.metrics[key] : '';
        });
        return [ts, ...metricValues].join(',');
    });

    // 4. Create Blob and Download
    const csvContent = [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeDevice.name}_history_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const latestData = history.length > 0 ? history[history.length - 1] : null;

  const getDeviceIcon = (type: Device['type']) => {
    switch (type) {
        case 'Generator': return <Fan size={18} />;
        case 'Cutter': return <Zap size={18} />;
        default: return <Box size={18} />;
    }
  };

  // --- Theme Classes ---
  const isDark = theme === 'dark';
  const bgClass = isDark ? 'bg-black text-slate-200' : 'bg-slate-50 text-slate-800';
  const sidebarClass = isDark ? 'bg-black border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const mainClass = isDark ? 'bg-black' : 'bg-slate-50';
  const headerClass = isDark ? 'bg-black/50 border-slate-800' : 'bg-white/80 border-slate-200 shadow-sm';
  const cardClass = isDark ? 'bg-black border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const buttonClass = isDark ? 'text-slate-400 hover:bg-slate-900 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-blue-600';
  const activeBtnClass = 'bg-blue-600 text-white shadow-lg shadow-blue-900/20';
  
  // Helper for sub-components (metrics items, etc.)
  const itemClass = isDark ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-50 border-slate-200';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';
  const textPrimary = isDark ? 'text-white' : 'text-slate-800';
  const barBg = isDark ? 'bg-slate-800' : 'bg-slate-200';

  return (
    <div className={`w-screen h-screen ${bgClass} overflow-hidden font-sans flex transition-colors duration-300`}>
      
      {/* --- Sidebar --- */}
      <aside 
        className={`${sidebarClass} border-r flex flex-col transition-all duration-300 ${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Sidebar Header */}
        <div 
            className={`h-14 flex items-center justify-between px-4 border-b ${isDark ? 'border-slate-800 hover:bg-slate-800/50' : 'border-slate-200 hover:bg-slate-50'} shrink-0 cursor-pointer transition-colors`}
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title="Toggle Sidebar"
        >
            <div className={`flex items-center gap-2 overflow-hidden whitespace-nowrap ${isSidebarCollapsed ? 'justify-center w-full' : ''}`}>
                <Activity className="text-blue-500 shrink-0" />
                {!isSidebarCollapsed && <span className="font-bold tracking-tight">{dict.title}</span>}
            </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex flex-col gap-1 px-2 mt-2">
            <button
                onClick={() => setCurrentView('dashboard')}
                className={`flex items-center gap-3 p-2 rounded-md transition-colors text-sm ${
                    currentView === 'dashboard' 
                    ? activeBtnClass
                    : buttonClass
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title={dict.dashboard}
            >
                <LayoutDashboard size={18} />
                {!isSidebarCollapsed && <span>{dict.dashboard}</span>}
            </button>

            <button
                onClick={() => setCurrentView('realtime')}
                className={`flex items-center gap-3 p-2 rounded-md transition-colors text-sm ${
                    currentView === 'realtime' 
                    ? activeBtnClass
                    : buttonClass
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title={dict.monitorTitle || 'Real-time Monitor'}
            >
                <Activity size={18} />
                {!isSidebarCollapsed && <span>{dict.monitorTitle || 'Monitor'}</span>}
            </button>

            <button
                onClick={() => setCurrentView('playback')}
                className={`flex items-center gap-3 p-2 rounded-md transition-colors text-sm ${
                    currentView === 'playback' 
                    ? activeBtnClass
                    : buttonClass
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title={dict.playbackTitle || 'Historical Playback'}
            >
                <Play size={18} />
                {!isSidebarCollapsed && <span>{dict.playbackTitle || 'Playback'}</span>}
            </button>

            <button
                onClick={() => setCurrentView('monitor')}
                className={`flex items-center gap-3 p-2 rounded-md transition-colors text-sm ${
                    currentView === 'monitor' 
                    ? activeBtnClass
                    : buttonClass
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title={dict.simulationTitle || 'Simulation'}
            >
                <Box size={18} />
                {!isSidebarCollapsed && <span>{dict.simulationTitle || 'Simulation'}</span>}
            </button>
            
            <div className={`h-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'} my-2 mx-2`} />
            
            {/* Basic Settings Group */}
            {!isSidebarCollapsed && <div className="text-xs font-bold text-slate-500 px-3 mb-1 uppercase tracking-wider">{dict.basicSettingsGroup}</div>}

            <button
                onClick={() => {
                    setCurrentView('devices');
                    if (simulationMode !== 'Backend') setSimulationMode('Backend');
                }}
                className={`flex items-center gap-3 p-2 rounded-md transition-colors text-sm ${
                    currentView === 'devices' 
                    ? activeBtnClass
                    : buttonClass
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title={dict.deviceConfig}
            >
                <Settings size={18} />
                {!isSidebarCollapsed && <span>{dict.deviceConfig}</span>}
            </button>
            <button
                onClick={() => {
                    setCurrentView('categories');
                    if (simulationMode !== 'Backend') setSimulationMode('Backend');
                }}
                className={`flex items-center gap-3 p-2 rounded-md transition-colors text-sm ${
                    currentView === 'categories' 
                    ? activeBtnClass
                    : buttonClass
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title={dict.categoryConfig}
            >
                <Layers size={18} />
                {!isSidebarCollapsed && <span>{dict.categoryConfig}</span>}
            </button>

            <button
                onClick={() => {
                    setCurrentView('scenarios');
                    if (simulationMode !== 'Backend') setSimulationMode('Backend');
                }}
                className={`flex items-center gap-3 p-2 rounded-md transition-colors text-sm ${
                    currentView === 'scenarios' 
                    ? activeBtnClass
                    : buttonClass
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title={dict.scenarioConfig || 'Scenario Config'}
            >
                <Sliders size={18} />
                {!isSidebarCollapsed && <span>{dict.scenarioConfig || 'Scenario Config'}</span>}
            </button>

            <button
                onClick={() => {
                    setCurrentView('visual_models');
                    if (simulationMode !== 'Backend') setSimulationMode('Backend');
                }}
                className={`flex items-center gap-3 p-2 rounded-md transition-colors text-sm ${
                    currentView === 'visual_models' 
                    ? activeBtnClass
                    : buttonClass
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title={dict.visualModelConfig || 'Visual Model Config'}
            >
                <Box size={18} />
                {!isSidebarCollapsed && <span>{dict.visualModelConfig || 'Visual Model Config'}</span>}
            </button>
            
            <div className="h-2" />

            {/* System Settings Group */}
            {!isSidebarCollapsed && <div className="text-xs font-bold text-slate-500 px-3 mb-1 uppercase tracking-wider">{dict.systemSettingsGroup}</div>}
            
            <button
                onClick={() => {
                    setCurrentView('parameters');
                    if (simulationMode !== 'Backend') setSimulationMode('Backend');
                }}
                className={`flex items-center gap-3 p-2 rounded-md transition-colors text-sm ${
                    currentView === 'parameters' 
                    ? activeBtnClass
                    : buttonClass
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title={dict.parameterSettings}
            >
                <Sliders size={18} />
                {!isSidebarCollapsed && <span>{dict.parameterSettings}</span>}
            </button>

            <button
                onClick={() => {
                    setCurrentView('llm');
                    if (simulationMode !== 'Backend') setSimulationMode('Backend');
                }}
                className={`flex items-center gap-3 p-2 rounded-md transition-colors text-sm ${
                    currentView === 'llm' 
                    ? activeBtnClass
                    : buttonClass
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title={dict.llmSettings}
            >
                <Sparkles size={18} />
                {!isSidebarCollapsed && <span>{dict.llmSettings}</span>}
            </button>

            <button
                onClick={() => {
                    setCurrentView('system');
                    if (simulationMode !== 'Backend') setSimulationMode('Backend');
                }}
                className={`flex items-center gap-3 p-2 rounded-md transition-colors text-sm ${
                    currentView === 'system' 
                    ? activeBtnClass
                    : buttonClass
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title="Connect Settings"
            >
                <Server size={18} />
                {!isSidebarCollapsed && <span>{dict.connectSettings}</span>}
            </button>
        </div>

        {/* Spacer to push footer to bottom */}
        <div className="flex-1" />

        {/* Settings Footer */}
        <div className={`p-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} space-y-2`}>
            {!isSidebarCollapsed && <div className="text-xs font-bold text-slate-500 px-2 mb-1 uppercase tracking-wider">{dict.simulationMode}</div>}
            
            <button
                onClick={() => {
                  if (simulationMode === 'AI') setSimulationMode('Local');
                  else if (simulationMode === 'Local') setSimulationMode('Backend');
                  else setSimulationMode('AI');
                }}
                className={`w-full flex items-center gap-3 p-2 rounded-md transition-colors text-sm ${
                    isSidebarCollapsed ? 'justify-center' : (isDark ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-slate-100 hover:bg-slate-200')
                }`}
                title={`Current Mode: ${simulationMode}`}
            >
                {simulationMode === 'AI' && <Cpu size={18} className="text-blue-400" />}
                {simulationMode === 'Local' && <Database size={18} className="text-emerald-400" />}
                {simulationMode === 'Backend' && <Server size={18} className="text-orange-400" />}
                
                {!isSidebarCollapsed && (
                    <div className="flex flex-col items-start leading-none">
                        <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>
                            {simulationMode === 'AI' ? dict.modeAI.split(' ')[0] : 
                             simulationMode === 'Local' ? dict.modeLocal.split(' ')[0] : 'Backend'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                            {simulationMode === 'AI' ? 'Gemini 2.5' : 
                             simulationMode === 'Local' ? 'Physics Engine' : 'DeviceSimulator'}
                        </span>
                    </div>
                )}
            </button>

            {/* Language & Theme Toggles */}
            <div className={`flex ${isSidebarCollapsed ? 'flex-col gap-2' : 'gap-2'}`}>
                <button
                    onClick={() => setLanguage(l => l === 'en' ? 'zh' : 'en')}
                    className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-md ${isDark ? 'bg-slate-800/30 hover:bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'} transition-colors text-xs font-medium`}
                    title="Switch Language"
                >
                    {language === 'en' ? 'EN' : '中'}
                </button>
                <button
                    onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                    className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-md ${isDark ? 'bg-slate-800/30 hover:bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'} transition-colors`}
                    title="Toggle Theme"
                >
                    {isDark ? <Moon size={14} /> : <Sun size={14} />}
                </button>
            </div>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <main className={`flex-1 h-full overflow-hidden p-3 flex flex-col gap-3 ${mainClass} relative`}>
        
        {/* Background Decoration */}
         {isDark && (
             <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-500/5 to-transparent" />
                <div className="absolute -top-[200px] -right-[200px] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
             </div>
         )}
         
        {/* --- Header & Dynamic View Content for Monitor --- */}
        {currentView === 'monitor' && (
            <DeviceMonitorView 
                activeDevice={activeDevice}
                latestData={latestData}
                history={history}
                logs={logs}
                dict={dict}
                theme={theme}
                simulationMode={simulationMode}
                devices={devices}
                metricsViewMode={metricsViewMode}
                setMetricsViewMode={setMetricsViewMode}
                handleScenarioChange={handleScenarioChange}
                toggleDeviceStatus={toggleDeviceStatus}
                handleExportHistory={handleExportHistory}
                lang={language}
                onUpdateDevice={updateDevice}
            />
        )}

        {/* --- Container for Other Views --- */}
        {currentView !== 'monitor' && (
        <div className="flex-1 min-h-0 flex gap-3 overflow-hidden">
            
            {/* Case 2: Dashboard View */}
            {currentView === 'dashboard' && (
                <div className="flex-1 min-w-0">
                    <Dashboard 
                        devices={devices} 
                        onSelectDevice={(id) => {
                            setActiveDeviceId(id);
                            setCurrentView('monitor');
                        }}
                        dict={dict}
                        theme={theme}
                        lang={language}
                    />
                </div>
            )}

            {currentView === 'playback' && (
                <div className="flex-1 min-w-0">
                    <Playback 
                        devices={devices} 
                        activeDeviceId={activeDeviceId}
                        onDeviceChange={setActiveDeviceId}
                        dict={dict} 
                        theme={theme}
                    />
                </div>
            )}

            {currentView === 'realtime' && (
                <div className="flex-1 min-w-0">
                    <RealtimeMonitor 
                        devices={devices} 
                        activeDeviceId={activeDeviceId}
                        onDeviceChange={setActiveDeviceId}
                        history={history}
                        dict={dict} 
                        theme={theme}
                    />
                </div>
            )}

            {/* Case 3: Manager Views */}
            {currentView === 'devices' && (
                <div className="flex-1">
                    <DeviceManager 
                        onClose={() => setCurrentView('dashboard')} 
                        onNavigateToMonitor={(deviceId) => {
                            setActiveDeviceId(deviceId);
                            setCurrentView('realtime');
                        }}
                        onPreview={(deviceId) => {
                            setActiveDeviceId(deviceId);
                            setCurrentView('monitor');
                        }}
                        dict={dict} 
                        theme={theme} 
                        lang={language}
                    />
                </div>
            )}

            {currentView === 'categories' && (
                <div className="flex-1">
                    <CategoryManager onClose={() => setCurrentView('dashboard')} dict={dict} theme={theme} lang={language} />
                </div>
            )}

            {currentView === 'scenarios' && (
                <div className="flex-1">
                    <ScenarioManager 
                        onClose={() => setCurrentView('dashboard')} 
                        dict={dict} 
                        theme={theme} 
                        lang={language}
                        onDevicesUpdate={fetchDevs}
                    />
                </div>
            )}

            {currentView === 'visual_models' && (
                <div className="flex-1">
                    <VisualModelManager onClose={() => setCurrentView('dashboard')} dict={dict} theme={theme} lang={language} />
                </div>
            )}

            {currentView === 'system' && (
                <div className="flex-1">
                    <SystemManager onClose={() => setCurrentView('dashboard')} dict={dict} theme={theme} />
                </div>
            )}

            {currentView === 'parameters' && (
                <div className="flex-1">
                    <ParameterManager onClose={() => setCurrentView('dashboard')} dict={dict} theme={theme} />
                </div>
            )}

            {currentView === 'llm' && (
                <div className="flex-1">
                    <LlmManager onClose={() => setCurrentView('dashboard')} dict={dict} theme={theme} />
                </div>
            )}

        </div>
        )}
      </main>

      {/* --- Modals --- */}
      <AddDeviceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleAddDevice}
        dict={dict}
        theme={theme}
      />

    </div>
  );
};

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
