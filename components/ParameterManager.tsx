import React, { useState, useEffect } from 'react';
import { Sliders, Save, RefreshCw, AlertCircle, Info, Clock, Sparkles, MessageSquare } from 'lucide-react';
import { backendService, SystemSettings } from '../services/backendService';
import { LlmManager } from './LlmManager';
import { PromptManager } from './PromptManager';

interface ParameterManagerProps {
  onClose: () => void;
  dict: any;
  theme?: 'dark' | 'light';
}

export const ParameterManager: React.FC<ParameterManagerProps> = ({ onClose, dict, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<'general' | 'llm' | 'prompts'>('general');
  
  // Styling classes
  const bgMain = isDark ? 'bg-slate-900' : 'bg-slate-50';
  const bgCard = isDark ? 'bg-slate-800' : 'bg-white';
  const borderClass = isDark ? 'border-slate-700' : 'border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-slate-900' : 'bg-white';
  const tabActive = isDark ? 'text-purple-400 border-b-2 border-purple-400 bg-slate-800/50' : 'text-purple-600 border-b-2 border-purple-600 bg-purple-50';
  const tabInactive = isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900';
  
  // Real system settings from backend
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);

  // Mock state for global parameters
  const [params, setParams] = useState({
    samplingRate: 1000,
    retentionDays: 30,
    maxDevices: 100,
    logLevel: 'INFO',
    enablePhysics: true,
    enableAI: true,
    maxBatchSize: 500
  });

  useEffect(() => {
    if (activeTab === 'general') {
        fetchSystemSettings();
    }
  }, [activeTab]);

  const fetchSystemSettings = async () => {
    try {
      const settings = await backendService.fetchSystemSettings();
      setSystemSettings(settings);
    } catch (error) {
      console.error("Failed to fetch system settings", error);
    }
  };

  const handleSave = async () => {
    try {
      // Save real system settings (Timezone)
      if (systemSettings) {
        await backendService.updateSystemSettings(systemSettings);
      }
      
      // In a real app, this would call backendService to update config for other params
      alert(dict.configSaved || 'Configuration saved successfully');
    } catch (error) {
      console.error("Failed to save settings", error);
      alert('Failed to save settings');
    }
  };

  const handleReset = () => {
      setParams({
        samplingRate: 1000,
        retentionDays: 30,
        maxDevices: 100,
        logLevel: 'INFO',
        enablePhysics: true,
        enableAI: true,
        maxBatchSize: 500
      });
  };

  return (
    <div className={`h-full flex flex-col ${bgMain} rounded-lg border ${borderClass} overflow-hidden`}>
       {/* Header */}
       <div className={`p-4 border-b ${borderClass} flex justify-between items-center bg-inherit`}>
         <h2 className={`text-xl font-bold ${textPrimary} flex items-center gap-2`}>
           <Sliders className="text-purple-500" />
           {dict.parameterSettings || 'Parameter Settings'}
         </h2>
       </div>

        {/* Tabs */}
        <div className={`flex border-b ${borderClass} bg-inherit`}>
            <button 
                className={`px-6 py-3 text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'general' ? tabActive : tabInactive}`}
                onClick={() => setActiveTab('general')}
            >
                <Sliders size={16} /> {dict.generalSettings || 'General'}
            </button>
            <button 
                className={`px-6 py-3 text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'llm' ? tabActive : tabInactive}`}
                onClick={() => setActiveTab('llm')}
            >
                <Sparkles size={16} /> {dict.llmSettings || 'LLM Settings'}
            </button>
            <button 
                className={`px-6 py-3 text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'prompts' ? tabActive : tabInactive}`}
                onClick={() => setActiveTab('prompts')}
            >
                <MessageSquare size={16} /> {dict.aiPrompts || 'AI Prompts'}
            </button>
        </div>

       {/* Content */}
       <div className="flex-1 overflow-y-auto p-6 relative">
          {activeTab === 'general' && (
            <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Info Box */}
                <div className={`p-4 rounded-lg border ${isDark ? 'bg-purple-900/20 border-purple-800 text-purple-200' : 'bg-purple-50 border-purple-200 text-purple-800'} flex gap-3 items-start`}>
                    <Info className="shrink-0 mt-0.5" size={18} />
                    <div className="text-sm">
                        <p className="font-bold mb-1">{dict.globalConfigTitle || 'Global System Configuration'}</p>
                        <p className="opacity-80">{dict.globalConfigDesc || 'These settings affect the global behavior of the simulation engine and data storage.'}</p>
                    </div>
                </div>

                {/* General Settings */}
                <div className={`${bgCard} rounded-lg border ${borderClass} p-6`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className={`text-lg font-semibold ${textPrimary} flex items-center gap-2`}>
                            {dict.generalSettings || 'General Settings'}
                        </h3>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleReset}
                                className={`p-2 ${textSecondary} hover:${textPrimary} hover:${isDark ? 'bg-slate-800' : 'bg-slate-200'} rounded`}
                                title={dict.resetDefaults || "Reset to Defaults"}
                            >
                                <RefreshCw size={18} />
                            </button>
                            <button onClick={handleSave} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded flex items-center gap-2 font-medium transition-colors">
                                <Save size={16} /> {dict.save || 'Save'}
                            </button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Timezone Setting */}
                        <div className="space-y-2 col-span-1 md:col-span-2 border-b border-dashed border-gray-700 pb-4 mb-2">
                            <label className={`block text-sm font-medium ${textSecondary} flex items-center gap-2`}>
                                <Clock size={16} className="text-purple-500" />
                                System Timezone
                            </label>
                            <div className="flex gap-2">
                            <select 
                                value={systemSettings?.timezone || 'UTC'}
                                onChange={(e) => setSystemSettings(prev => prev ? {...prev, timezone: e.target.value} : {timezone: e.target.value, mqtt_enabled: false, modbus_enabled: false, opcua_enabled: false})}
                                className={`flex-1 p-2 rounded border ${borderClass} ${inputBg} ${textPrimary} focus:border-purple-500 outline-none font-mono`}
                            >
                                <option value="UTC">UTC (Coordinated Universal Time)</option>
                                <option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</option>
                                <option value="America/New_York">America/New_York (UTC-5)</option>
                                <option value="Europe/London">Europe/London (UTC+0)</option>
                                <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                            </select>
                            </div>
                            <p className="text-xs text-slate-500">
                                This timezone setting affects how timestamps are displayed in the application (e.g. in TDengine View).
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className={`block text-sm font-medium ${textSecondary}`}>{dict.defaultSamplingRate || 'Default Sampling Rate (ms)'}</label>
                            <input 
                            type="number" 
                            value={params.samplingRate}
                            onChange={e => setParams({...params, samplingRate: parseInt(e.target.value)})}
                            className={`w-full p-2 rounded border ${borderClass} ${inputBg} ${textPrimary} focus:border-purple-500 outline-none`}
                            />
                            <p className="text-xs text-slate-500">{dict.samplingRateDesc || 'Base frequency for data generation'}</p>
                        </div>

                        <div className="space-y-2">
                            <label className={`block text-sm font-medium ${textSecondary}`}>{dict.maxBatchSize || 'Max Batch Size'}</label>
                            <input 
                            type="number" 
                            value={params.maxBatchSize}
                            onChange={e => setParams({...params, maxBatchSize: parseInt(e.target.value)})}
                            className={`w-full p-2 rounded border ${borderClass} ${inputBg} ${textPrimary} focus:border-purple-500 outline-none`}
                            />
                            <p className="text-xs text-slate-500">{dict.batchSizeDesc || 'Maximum records per write operation'}</p>
                        </div>

                        <div className="space-y-2">
                            <label className={`block text-sm font-medium ${textSecondary}`}>{dict.maxConcurrentDevices || 'Max Concurrent Devices'}</label>
                            <input 
                            type="number" 
                            value={params.maxDevices}
                            onChange={e => setParams({...params, maxDevices: parseInt(e.target.value)})}
                            className={`w-full p-2 rounded border ${borderClass} ${inputBg} ${textPrimary} focus:border-purple-500 outline-none`}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className={`block text-sm font-medium ${textSecondary}`}>{dict.logLevel || 'Log Level'}</label>
                            <select 
                            value={params.logLevel}
                            onChange={e => setParams({...params, logLevel: e.target.value})}
                            className={`w-full p-2 rounded border ${borderClass} ${inputBg} ${textPrimary} focus:border-purple-500 outline-none`}
                            >
                                <option value="DEBUG">DEBUG</option>
                                <option value="INFO">INFO</option>
                                <option value="WARN">WARN</option>
                                <option value="ERROR">ERROR</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Advanced Settings */}
                <div className={`${bgCard} rounded-lg border ${borderClass} p-6`}>
                    <h3 className={`text-lg font-semibold ${textPrimary} mb-4 flex items-center gap-2`}>
                        {dict.advancedFeatures || 'Advanced Features'}
                    </h3>
                    
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className={`font-medium ${textPrimary}`}>{dict.enablePhysics || 'Enable Physics Engine'}</div>
                                <div className={`text-sm ${textSecondary}`}>{dict.physicsDesc || 'Use local physics calculation for simulation'}</div>
                            </div>
                            <div className={`relative inline-block w-12 h-6 transition-colors duration-200 ease-in-out border-2 rounded-full cursor-pointer ${params.enablePhysics ? 'bg-green-500 border-green-500' : 'bg-slate-700 border-slate-700'}`} onClick={() => setParams({...params, enablePhysics: !params.enablePhysics})}>
                                <span className={`inline-block w-5 h-5 transition duration-200 ease-in-out transform bg-white rounded-full ${params.enablePhysics ? 'translate-x-6' : 'translate-x-0'}`} />
                            </div>
                        </div>

                        <div className={`h-px ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />

                        <div className="flex items-center justify-between">
                            <div>
                                <div className={`font-medium ${textPrimary}`}>{dict.enableAI || 'Enable AI Generation'}</div>
                                <div className={`text-sm ${textSecondary}`}>{dict.aiDesc || 'Allow Gemini AI to generate simulation data'}</div>
                            </div>
                            <div className={`relative inline-block w-12 h-6 transition-colors duration-200 ease-in-out border-2 rounded-full cursor-pointer ${params.enableAI ? 'bg-green-500 border-green-500' : 'bg-slate-700 border-slate-700'}`} onClick={() => setParams({...params, enableAI: !params.enableAI})}>
                                <span className={`inline-block w-5 h-5 transition duration-200 ease-in-out transform bg-white rounded-full ${params.enableAI ? 'translate-x-6' : 'translate-x-0'}`} />
                            </div>
                        </div>
                        
                        <div className={`h-px ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />

                        <div className="space-y-2">
                            <label className={`block text-sm font-medium ${textSecondary}`}>{dict.dataRetention || 'Data Retention Policy (Days)'}</label>
                            <input 
                            type="range" 
                            min="1" 
                            max="365" 
                            value={params.retentionDays}
                            onChange={e => setParams({...params, retentionDays: parseInt(e.target.value)})}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-blue-600"
                            />
                            <div className={`flex justify-between text-xs ${textSecondary}`}>
                                <span>1 {dict.day || 'Day'}</span>
                                <span className={`font-mono font-bold ${textPrimary}`}>{params.retentionDays} {dict.days || 'Days'}</span>
                                <span>365 {dict.days || 'Days'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'llm' && (
              <LlmManager onClose={onClose} dict={dict} theme={theme} />
          )}

          {activeTab === 'prompts' && (
              <PromptManager dict={dict} theme={theme} />
          )}
       </div>
    </div>
  );
};