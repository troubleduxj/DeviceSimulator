import React, { useState, useEffect, useRef } from 'react';
import { 
  Device, SimulationStep, SimulationMode 
} from './types';
import { INITIAL_DEVICES, DICTIONARY } from './constants';
import { fetchAiSimulationBatch } from './services/geminiService';
import { generateLocalData } from './services/physicsService';
import { backendService } from './services/backendService';
import { formatCSVTimestamp } from './utils/timeUtils';

// Icons & UI
import { 
  Play, Square, Plus, Activity, Cpu, Database, 
  Settings, LayoutDashboard, 
  Zap, Globe, Server, Fan, Box, List, LayoutGrid, Layers
} from 'lucide-react';
import { TelemetryChart } from './components/TelemetryChart';
import { DigitalTwin } from './components/DigitalTwin';
import { LogViewer } from './components/LogViewer';
import { AddDeviceModal } from './components/AddDeviceModal';
import { DeviceManager } from './components/DeviceManager';
import { SystemManager } from './components/SystemManager';
import { CategoryManager } from './components/CategoryManager';
import { Dashboard } from './components/Dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';

const MAX_HISTORY = 60; // Keep 60 seconds of history

const App: React.FC = () => {
  // --- Global State ---
  const [localDevices, setLocalDevices] = useState<Device[]>(INITIAL_DEVICES);
  const [devices, setDevices] = useState<Device[]>(INITIAL_DEVICES);
  const [activeDeviceId, setActiveDeviceId] = useState<string>(INITIAL_DEVICES[0].id);
  const [simulationMode, setSimulationMode] = useState<SimulationMode>('Backend');
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [metricsViewMode, setMetricsViewMode] = useState<'grid' | 'list'>('grid');
  const [currentView, setCurrentView] = useState<'monitor' | 'devices' | 'categories' | 'models' | 'system' | 'dashboard'>('dashboard');
  
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

  // Keep ref in sync
  useEffect(() => {
    if (activeDevice) {
      activeDeviceRef.current = activeDevice;
    }
  }, [activeDevice]);

  // Handle Mode Switching & Device List
  useEffect(() => {
    const fetchDevs = async () => {
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
    };

    fetchDevs();
    
    // Poll for device list changes every 5 seconds
    const interval = setInterval(fetchDevs, 5000);
    return () => clearInterval(interval);

  }, [simulationMode, localDevices]);

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
            
            // Apply logic based on scenario
            if (scenario === 'High Load') {
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

            // Send update to backend
            await backendService.updateDevice(activeDevice.id, { parameters: newParams });
            
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

  return (
    <div className="w-screen h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans flex">
      
      {/* --- Sidebar --- */}
      <aside 
        className={`bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 ${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Sidebar Header */}
        <div 
            className="h-14 flex items-center justify-between px-4 border-b border-slate-800 shrink-0 cursor-pointer hover:bg-slate-800/50 transition-colors"
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
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title={dict.dashboard}
            >
                <LayoutDashboard size={18} />
                {!isSidebarCollapsed && <span>{dict.dashboard}</span>}
            </button>
            
            <div className="h-px bg-slate-800 my-2 mx-2" />
            {!isSidebarCollapsed && <div className="text-xs font-bold text-slate-500 px-3 mb-1 uppercase tracking-wider">{dict.systemSettingsGroup}</div>}

            <button
                onClick={() => {
                    setCurrentView('devices');
                    if (simulationMode !== 'Backend') setSimulationMode('Backend');
                }}
                className={`flex items-center gap-3 p-2 rounded-md transition-colors text-sm ${
                    currentView === 'devices' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
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
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title={dict.categoryConfig}
            >
                <Layers size={18} />
                {!isSidebarCollapsed && <span>{dict.categoryConfig}</span>}
            </button>
            <button
                onClick={() => {
                    setCurrentView('system');
                    if (simulationMode !== 'Backend') setSimulationMode('Backend');
                }}
                className={`flex items-center gap-3 p-2 rounded-md transition-colors text-sm ${
                    currentView === 'system' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title="Connect Settings"
            >
                <Server size={18} />
                {!isSidebarCollapsed && <span>{dict.connectSettings}</span>}
            </button>
        </div>

        {/* Device List */}
        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
            {!isSidebarCollapsed && <div className="text-xs font-bold text-slate-500 px-3 mb-2 uppercase tracking-wider">{dict.devices}</div>}
            
            {devices.map(device => (
                <button
                    key={device.id}
                    onClick={() => {
                        setActiveDeviceId(device.id);
                        setCurrentView('monitor');
                    }}
                    className={`w-full flex items-center gap-3 p-2 rounded-md transition-colors text-sm whitespace-nowrap overflow-hidden ${
                        activeDeviceId === device.id && currentView === 'monitor'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    title={isSidebarCollapsed ? device.name : ''}
                >
                    <span className="shrink-0">{getDeviceIcon(device.type)}</span>
                    {!isSidebarCollapsed && <span className="truncate">{device.name}</span>}
                    
                    {/* Status Indicator */}
                    {!isSidebarCollapsed && (
                        <span 
                            className={`w-2 h-2 rounded-full ml-auto ${
                                device.status === 'running' 
                                ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' 
                                : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                            }`} 
                            title={device.status === 'running' ? 'Running' : 'Stopped'}
                        />
                    )}
                </button>
            ))}

            <button 
                onClick={() => setIsModalOpen(true)}
                className={`w-full flex items-center gap-3 p-2 mt-4 rounded-md border border-dashed border-slate-700 text-slate-500 hover:text-blue-400 hover:border-blue-500/50 transition-colors text-sm ${
                    isSidebarCollapsed ? 'justify-center' : ''
                }`}
                title={dict.addDevice}
            >
                <Plus size={18} />
                {!isSidebarCollapsed && <span>{dict.addDevice}</span>}
            </button>
        </div>

        {/* Settings Footer */}
        <div className="p-2 border-t border-slate-800 space-y-2">
            {!isSidebarCollapsed && <div className="text-xs font-bold text-slate-500 px-2 mb-1 uppercase tracking-wider">{dict.simulationMode}</div>}
            
            <button
                onClick={() => {
                  if (simulationMode === 'AI') setSimulationMode('Local');
                  else if (simulationMode === 'Local') setSimulationMode('Backend');
                  else setSimulationMode('AI');
                }}
                className={`w-full flex items-center gap-3 p-2 rounded-md transition-colors text-sm ${
                    isSidebarCollapsed ? 'justify-center' : 'bg-slate-800/50 hover:bg-slate-800'
                }`}
                title={`Current Mode: ${simulationMode}`}
            >
                {simulationMode === 'AI' && <Cpu size={18} className="text-blue-400" />}
                {simulationMode === 'Local' && <Database size={18} className="text-emerald-400" />}
                {simulationMode === 'Backend' && <Server size={18} className="text-orange-400" />}
                
                {!isSidebarCollapsed && (
                    <div className="flex flex-col items-start leading-none">
                        <span className="text-slate-200">
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

            <button 
                 onClick={() => setLanguage(l => l === 'en' ? 'zh' : 'en')}
                 className={`w-full flex items-center gap-3 p-2 rounded-md hover:bg-slate-800 transition-colors text-sm text-slate-400 ${
                    isSidebarCollapsed ? 'justify-center' : ''
                 }`}
                 title="Switch Language"
            >
                 <Globe size={18} />
                 {!isSidebarCollapsed && <span>{language === 'en' ? 'English' : '中文'}</span>}
            </button>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <main className="flex-1 h-full overflow-hidden p-3 flex flex-col gap-3">
        
        {/* --- Header Section --- */}
        {currentView === 'monitor' && (
        <header className="shrink-0 bg-slate-900/50 border border-slate-800 rounded-lg p-3 flex items-center justify-between">
            {/* Left: Device Info */}
            <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-400">
                    {getDeviceIcon(activeDevice.type)}
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white leading-none">{activeDevice.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500 font-mono px-1.5 py-0.5 bg-slate-950 rounded border border-slate-800">{activeDevice.type}</span>
                        <span className="text-xs text-slate-500">{activeDevice.description}</span>
                    </div>
                </div>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-3">
                {/* Scenario Selector */}
                <div className="flex items-center gap-2 bg-slate-950/50 px-2 py-1.5 rounded border border-slate-800">
                    <span className="text-xs text-slate-500 uppercase font-bold">{dict.scenario}:</span>
                    <select 
                        value={activeDevice.currentScenario}
                        onChange={e => handleScenarioChange(e.target.value)}
                        className="bg-transparent text-sm text-slate-300 outline-none font-medium cursor-pointer"
                    >
                        {activeDevice.scenarios.map(s => (
                            <option key={s} value={s} className="bg-slate-900">{s}</option>
                        ))}
                    </select>
                </div>

                {/* Start/Stop Button */}
                <button 
                    onClick={toggleDeviceStatus}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-md font-bold transition-all shadow-lg ${
                        activeDevice.status === 'running' 
                        ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white' 
                        : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
                    }`}
                >
                    {activeDevice.status === 'running' ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                    {activeDevice.status === 'running' ? dict.stop : dict.start}
                </button>
            </div>
        </header>
        )}

        {/* --- Dynamic View Content --- */}
        <div className="flex-1 min-h-0 flex gap-3 overflow-hidden">
            
            {/* Case 1: Monitor View (Digital Twin + Charts + Logs) */}
            {currentView === 'monitor' && (
                <>
                    {/* Left Column: 3D View & Telemetry */}
                    <div className="flex-[2] flex flex-col gap-3 min-w-0">
                        {/* 3D Digital Twin */}
                        <div className="flex-[3] bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden relative group">
                            <div className="absolute top-3 left-3 z-10 bg-black/40 backdrop-blur px-2 py-1 rounded text-xs font-bold text-slate-300 flex items-center gap-2 border border-white/10">
                                <Box size={14} className="text-blue-400" /> {dict.digitalTwin}
                            </div>
                            <DigitalTwin 
                                device={activeDevice}
                                latestData={latestData}
                                dict={dict}
                            />
                        </div>

                        {/* Telemetry Charts */}
                        <div className="flex-[2] min-h-0">
                             <TelemetryChart 
                                 device={activeDevice}
                                 data={history}
                                 dict={dict}
                                 onExport={handleExportHistory}
                             />
                        </div>
                    </div>

                    {/* Right Column: Metrics Cards & Logs */}
                    <div className="flex-1 min-w-[300px] flex flex-col gap-3">
                        
                        {/* Metrics Cards (Restored & Visible) */}
                        <div className="flex-1 bg-slate-900/50 rounded-lg border border-slate-800 p-3 flex flex-col min-h-0">
                            <div className="flex justify-between items-center mb-2 shrink-0">
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                    <LayoutGrid size={14} /> {dict.metrics || 'Metrics'}
                                </div>
                                <div className="flex bg-slate-800 rounded p-0.5">
                                    <button 
                                        onClick={() => setMetricsViewMode('grid')}
                                        className={`p-1 rounded ${metricsViewMode === 'grid' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                        title="Grid View"
                                    >
                                        <LayoutGrid size={12} />
                                    </button>
                                    <button 
                                        onClick={() => setMetricsViewMode('list')}
                                        className={`p-1 rounded ${metricsViewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                        title="List View"
                                    >
                                        <List size={12} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className={`overflow-y-auto pr-1 custom-scrollbar ${metricsViewMode === 'grid' ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-1'}`}>
                                {activeDevice.metrics.map(metric => {
                                    // Fix: metrics is a Record<string, number>, keyed by metric.id
                                    const currentVal = latestData?.metrics ? (latestData.metrics[metric.id] ?? 0) : 0;
                                    
                                    if (metricsViewMode === 'list') {
                                        return (
                                            <div key={metric.id} className="bg-slate-950/50 rounded px-3 py-2 border border-slate-800/50 flex items-center justify-between">
                                                <div className="text-xs text-slate-400 truncate w-24" title={metric.name}>{metric.name}</div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-1 bg-slate-900 rounded overflow-hidden">
                                                        <div 
                                                            className="h-full bg-blue-500/50 transition-all duration-500"
                                                            style={{ width: `${Math.min(100, (currentVal / metric.max) * 100)}%` }}
                                                        />
                                                    </div>
                                                    <div className="text-sm font-mono font-bold text-white w-16 text-right">
                                                        {currentVal.toFixed(1)} <span className="text-[10px] text-slate-500 font-sans">{metric.unit}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={metric.id} className="bg-slate-950/50 rounded p-2 border border-slate-800/50 flex flex-col">
                                            <div className="text-xs text-slate-500 mb-1 truncate" title={metric.name}>{metric.name}</div>
                                            <div className="text-lg font-mono font-bold text-white mb-1">
                                                {currentVal.toFixed(1)} <span className="text-xs text-slate-500 font-sans">{metric.unit}</span>
                                            </div>
                                            <div className="w-full h-1 bg-slate-900 rounded overflow-hidden mt-auto">
                                                <div 
                                                    className="h-full bg-blue-500/50 transition-all duration-500"
                                                    style={{ width: `${Math.min(100, (currentVal / metric.max) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Logs */}
                        <div className="flex-1 min-h-0">
                             <LogViewer logs={logs} dict={dict} />
                        </div>
                        
                        {/* System Info Card */}
                        <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-4 h-auto shrink-0">
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider">{dict.systemStatusTitle}</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">{dict.simulationMode}:</span>
                                    <span className="text-blue-400 font-bold">{simulationMode}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">{dict.activeDevices}:</span>
                                    <span className="text-white font-mono">{devices.filter(d => d.status === 'running').length} / {devices.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">{dict.uptime}:</span>
                                    <span className="text-emerald-400 font-mono">00:12:45</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Case 2: Dashboard View */}
            {currentView === 'dashboard' && (
                <Dashboard 
                    devices={devices} 
                    onSelectDevice={(id) => {
                        setActiveDeviceId(id);
                        setCurrentView('monitor');
                    }}
                    dict={dict}
                />
            )}

            {/* Case 3: Manager Views */}
            {currentView === 'devices' && (
                <div className="flex-1">
                    <DeviceManager onClose={() => setCurrentView('dashboard')} dict={dict} />
                </div>
            )}

            {currentView === 'categories' && (
                <div className="flex-1">
                    <CategoryManager onClose={() => setCurrentView('dashboard')} dict={dict} />
                </div>
            )}

            {currentView === 'system' && (
                <div className="flex-1">
                    <SystemManager onClose={() => setCurrentView('dashboard')} dict={dict} />
                </div>
            )}

        </div>
      </main>

      {/* --- Modals --- */}
      <AddDeviceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleAddDevice}
        dict={dict}
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
