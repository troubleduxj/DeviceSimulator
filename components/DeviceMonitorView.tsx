import React, { useState } from 'react';
import { Device, SimulationStep, SimulationMode } from '../types';
import { 
  Play, Square, Box, LayoutGrid, List, Zap, Fan, Sparkles, X, Loader2
} from 'lucide-react';
import { generateScenarioConfig } from '../services/geminiService';
import { backendService } from '../services/backendService';
import { DigitalTwin } from './DigitalTwin';
import { TelemetryChart } from './TelemetryChart';
import { LogViewer } from './LogViewer';

interface DeviceMonitorViewProps {
  activeDevice: Device;
  latestData: SimulationStep | null;
  history: SimulationStep[];
  logs: SimulationStep[];
  dict: any;
  theme: 'dark' | 'light';
  simulationMode: SimulationMode;
  devices: Device[];
  metricsViewMode: 'grid' | 'list';
  setMetricsViewMode: (mode: 'grid' | 'list') => void;
  handleScenarioChange: (scenario: string) => void;
  toggleDeviceStatus: () => void;
  handleExportHistory: () => void;
  lang?: string;
  onUpdateDevice?: (device: Device) => void;
}

export const DeviceMonitorView: React.FC<DeviceMonitorViewProps> = ({
  activeDevice,
  latestData,
  history,
  logs,
  dict,
  theme,
  simulationMode,
  devices,
  metricsViewMode,
  setMetricsViewMode,
  handleScenarioChange,
  toggleDeviceStatus,
  handleExportHistory,
  lang = 'zh',
  onUpdateDevice
}) => {
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'bg-black border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const headerClass = isDark ? 'bg-black/50 border-slate-800' : 'bg-white/80 border-slate-200 shadow-sm';
  const itemClass = isDark ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-50 border-slate-200';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';
  const textPrimary = isDark ? 'text-white' : 'text-slate-800';
  const barBg = isDark ? 'bg-slate-800' : 'bg-slate-200';

  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);
  const [scenarioDescription, setScenarioDescription] = useState('');
  const [isGeneratingScenario, setIsGeneratingScenario] = useState(false);

  const handleCreateScenario = async () => {
      if (!scenarioDescription) return;
      if (!onUpdateDevice) {
          console.error("onUpdateDevice is missing");
          return;
      }
      
      setIsGeneratingScenario(true);
      try {
          const params = (activeDevice.metrics || [])
            .filter(m => !m.is_tag) // Filter out TAG type parameters
            .map(m => ({ id: m.id, name: m.name }));
          const config = await generateScenarioConfig(scenarioDescription, activeDevice.name, params, lang);
          
          const newDevice = { ...activeDevice };
          if (!newDevice.scenarios.includes(config.name)) {
              newDevice.scenarios = [...newDevice.scenarios, config.name];
          }
          newDevice.scenario_configs = {
              ...(newDevice.scenario_configs || {}),
              [config.name]: config
          };
          newDevice.currentScenario = config.name;
          
          // 1. Persist to backend first
          if (simulationMode === 'Backend') {
             try {
                  // Backend API requires full object for PUT
                  const payload: any = { ...newDevice };
                  // Restore original backend type if available to avoid breaking category link
                  if (newDevice.backendType) {
                      payload.type = newDevice.backendType;
                  }
                  // Ensure parameters are present (critical for backend)
                  if (!payload.parameters) payload.parameters = [];
                 // Remove frontend-only fields to avoid potential issues (though backend ignores extras)
                 delete payload.metrics;
                 delete payload.backendType;
                 delete payload.currentScenario;
                 
                 await backendService.updateDevice(newDevice.id, payload);
             } catch (e) {
                 console.error("Failed to persist scenario to backend:", e);
                 // We continue anyway to update UI
             }
          }

          // 2. Update local state
          onUpdateDevice(newDevice);
          
          // 3. Trigger activation logic
          handleScenarioChange(config.name); 
          
          setIsScenarioModalOpen(false);
          setScenarioDescription('');
          const msg = lang === 'zh' 
            ? `场景 "${config.name}" 创建成功并已激活！\n请观察图表变化或检查参数设置。` 
            : `Scenario "${config.name}" created and activated!\nWatch the charts or check parameter settings.`;
          alert(msg);
      } catch (error: any) {
          console.error("Scenario generation failed:", error);
          alert("Failed to generate scenario: " + (error.message || "Unknown error"));
      } finally {
          setIsGeneratingScenario(false);
      }
  };

  const getDeviceIcon = (type: Device['type']) => {
    switch (type) {
        case 'Generator': return <Fan size={18} />;
        case 'Cutter': return <Zap size={18} />;
        default: return <Box size={18} />;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden gap-3">
        {/* --- Header Section --- */}
        <header className={`shrink-0 ${headerClass} rounded-lg p-3 flex items-center justify-between backdrop-blur-md border`}>
            {/* Left: Device Info */}
            <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-400">
                    {getDeviceIcon(activeDevice.type)}
                </div>
                <div>
                    <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'} leading-none`}>{activeDevice.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs text-slate-500 font-mono px-1.5 py-0.5 rounded border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>{activeDevice.type}</span>
                        <span className="text-xs text-slate-500">{activeDevice.description}</span>
                    </div>
                </div>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-3">
                {/* Scenario Selector */}
                <div className={`flex items-center gap-2 px-2 py-1.5 rounded border ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-white border-slate-200'} relative`}>
                    <span className="text-xs text-slate-500 uppercase font-bold">{dict.scenario}:</span>
                    <select 
                        value={activeDevice.currentScenario}
                        onChange={(e) => {
                            const newScenario = e.target.value;
                            handleScenarioChange(newScenario);
                        }}
                        className={`bg-transparent text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'} outline-none font-medium cursor-pointer appearance-none pr-6 min-w-[100px]`}
                    >
                        {activeDevice.scenarios.map(s => (
                            <option key={s} value={s} className={isDark ? 'bg-slate-900' : 'bg-white'}>{s}</option>
                        ))}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                </div>

                {/* AI Scenario Button */}
                <button 
                    onClick={() => setIsScenarioModalOpen(true)}
                    className={`p-1.5 rounded border ${isDark ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600'} hover:bg-indigo-500 hover:text-white transition-colors`}
                    title="AI Create Scenario"
                >
                    <Sparkles size={16} />
                </button>

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

        {/* --- Dynamic View Content --- */}
        <div className="flex-1 min-h-0 flex gap-3 overflow-hidden">
            
            {/* Left Column: 3D View & Telemetry */}
            <div className="flex-[2] flex flex-col gap-3 min-w-0">
                {/* 3D Digital Twin */}
                <div className={`flex-[3] ${cardClass} rounded-lg border overflow-hidden relative group`}>
                    <div className="absolute top-3 left-3 z-10 bg-black/40 backdrop-blur px-2 py-1 rounded text-xs font-bold text-slate-300 flex items-center gap-2 border border-white/10">
                        <Box size={14} className="text-blue-400" /> {dict.digitalTwin}
                    </div>
                    <DigitalTwin 
                        device={activeDevice}
                        latestData={latestData}
                        dict={dict}
                        theme={theme}
                    />
                </div>

                {/* Telemetry Charts */}
                <div className="flex-[2] min-h-0">
                        <TelemetryChart 
                            device={activeDevice}
                            data={history}
                            dict={dict}
                            onExport={handleExportHistory}
                            theme={theme}
                        />
                </div>
            </div>

            {/* Right Column: Metrics Cards & Logs */}
            <div className="flex-1 min-w-[300px] flex flex-col gap-3">
                
                {/* Metrics Cards (Restored & Visible) */}
                <div className={`flex-1 ${cardClass} rounded-lg border p-3 flex flex-col min-h-0`}>
                    <div className="flex justify-between items-center mb-2 shrink-0">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <LayoutGrid size={14} /> {dict.metrics || 'Metrics'}
                        </div>
                        <div className={`flex ${isDark ? 'bg-slate-800' : 'bg-slate-100'} rounded p-0.5`}>
                            <button 
                                onClick={() => setMetricsViewMode('grid')}
                                className={`p-1 rounded ${metricsViewMode === 'grid' ? (isDark ? 'bg-slate-700 text-white' : 'bg-white text-slate-800 shadow-sm') : 'text-slate-500 hover:text-slate-300'}`}
                                title="Grid View"
                            >
                                <LayoutGrid size={12} />
                            </button>
                            <button 
                                onClick={() => setMetricsViewMode('list')}
                                className={`p-1 rounded ${metricsViewMode === 'list' ? (isDark ? 'bg-slate-700 text-white' : 'bg-white text-slate-800 shadow-sm') : 'text-slate-500 hover:text-slate-300'}`}
                                title="List View"
                            >
                                <List size={12} />
                            </button>
                        </div>
                    </div>
                    
                    <div className={`overflow-y-auto pr-1 custom-scrollbar ${metricsViewMode === 'grid' ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-1'}`}>
                        {activeDevice.metrics
                            .filter(metric => !metric.is_tag) // Filter out TAG type parameters
                            .map(metric => {
                            // Fix: metrics is a Record<string, number>, keyed by metric.id
                            const currentVal = latestData?.metrics ? (latestData.metrics[metric.id] ?? 0) : 0;
                            
                            if (metricsViewMode === 'list') {
                                return (
                                    <div key={metric.id} className={`${itemClass} rounded px-3 py-2 border flex items-center justify-between`}>
                                        <div className={`text-xs ${textMuted} truncate w-24`} title={metric.name}>{metric.name}</div>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-16 h-1 ${barBg} rounded overflow-hidden`}>
                                                <div 
                                                    className="h-full bg-blue-500/50 transition-all duration-500"
                                                    style={{ width: `${Math.min(100, (currentVal / metric.max) * 100)}%` }}
                                                />
                                            </div>
                                            <div className={`text-sm font-mono font-bold ${textPrimary} w-16 text-right`}>
                                                {metric.is_integer ? currentVal.toFixed(0) : currentVal.toFixed(2)} <span className={`text-[10px] ${textMuted} font-sans`}>{metric.unit}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={metric.id} className={`${itemClass} rounded p-2 border flex flex-col`}>
                                    <div className={`text-xs ${textMuted} mb-1 truncate`} title={metric.name}>{metric.name}</div>
                                    <div className={`text-lg font-mono font-bold ${textPrimary} mb-1`}>
                                        {metric.is_integer ? currentVal.toFixed(0) : currentVal.toFixed(2)} <span className={`text-xs ${textMuted} font-sans`}>{metric.unit}</span>
                                    </div>
                                    <div className={`w-full h-1 ${barBg} rounded overflow-hidden mt-auto`}>
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
                        <LogViewer logs={logs} dict={dict} theme={theme} lang={lang} />
                </div>
                
                {/* System Info Card */}
                <div className={`${cardClass} rounded-lg border p-4 h-auto shrink-0`}>
                    <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider">{dict.systemStatusTitle}</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-400">{dict.simulationMode}:</span>
                            <span className="text-blue-400 font-bold">{simulationMode}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">{dict.activeDevices}:</span>
                            <span className={`${isDark ? 'text-white' : 'text-slate-800'} font-mono`}>{devices.filter(d => d.status === 'running').length} / {devices.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">{dict.uptime}:</span>
                            <span className="text-emerald-400 font-mono">00:12:45</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Scenario Modal */}
        {isScenarioModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className={`w-full max-w-md ${cardClass} rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className={`text-lg font-bold ${textPrimary} flex items-center gap-2`}>
                            <Sparkles className="text-indigo-500" size={20} />
                            {dict.createScenario || 'Create AI Scenario'}
                        </h3>
                        <button onClick={() => setIsScenarioModalOpen(false)} className={`${textMuted} hover:${textPrimary}`}>
                            <X size={20} />
                        </button>
                    </div>
                    
                    <p className={`text-sm ${textMuted} mb-4`}>
                        {dict.scenarioPrompt || "Describe the simulation scenario (e.g., 'Coolant leak causing temp spike after 10s'). AI will generate the configuration."}
                    </p>
                    
                    <textarea
                        value={scenarioDescription}
                        onChange={e => setScenarioDescription(e.target.value)}
                        className={`w-full h-32 p-3 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'} ${textPrimary} text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none mb-4`}
                        placeholder={dict.scenarioPlaceholder || "Enter description..."}
                    />
                    
                    <div className="flex justify-end gap-3">
                        <button 
                            onClick={() => setIsScenarioModalOpen(false)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} ${textMuted}`}
                        >
                            {dict.cancel || 'Cancel'}
                        </button>
                        <button 
                            onClick={handleCreateScenario}
                            disabled={isGeneratingScenario || !scenarioDescription}
                            className="px-4 py-2 rounded-lg text-sm font-bold bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isGeneratingScenario ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            {dict.generate || 'Generate'}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};