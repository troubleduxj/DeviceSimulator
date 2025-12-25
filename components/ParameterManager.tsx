import React, { useState } from 'react';
import { Sliders, Save, RefreshCw, AlertCircle, Info } from 'lucide-react';

interface ParameterManagerProps {
  onClose: () => void;
  dict: any;
  theme?: 'dark' | 'light';
}

export const ParameterManager: React.FC<ParameterManagerProps> = ({ onClose, dict, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  
  // Styling classes
  const bgMain = isDark ? 'bg-slate-900' : 'bg-slate-50';
  const bgCard = isDark ? 'bg-slate-800' : 'bg-white';
  const borderClass = isDark ? 'border-slate-700' : 'border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-slate-900' : 'bg-white';
  
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

  const handleSave = () => {
    // In a real app, this would call backendService to update config
    alert(dict.configSaved || 'Configuration saved successfully');
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
           <Sliders className="text-blue-500" />
           {dict.parameterSettings || 'Parameter Settings'}
         </h2>
         <div className="flex gap-2">
            <button 
                onClick={handleReset}
                className={`p-2 ${textSecondary} hover:${textPrimary} hover:${isDark ? 'bg-slate-800' : 'bg-slate-200'} rounded`}
                title={dict.resetDefaults || "Reset to Defaults"}
            >
                <RefreshCw size={18} />
            </button>
            <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2 font-medium transition-colors">
                <Save size={16} /> {dict.save || 'Save'}
            </button>
         </div>
       </div>

       {/* Content */}
       <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
              
              {/* Info Box */}
              <div className={`p-4 rounded-lg border ${isDark ? 'bg-blue-900/20 border-blue-800 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-800'} flex gap-3 items-start`}>
                  <Info className="shrink-0 mt-0.5" size={18} />
                  <div className="text-sm">
                      <p className="font-bold mb-1">{dict.globalConfigTitle || 'Global System Configuration'}</p>
                      <p className="opacity-80">{dict.globalConfigDesc || 'These settings affect the global behavior of the simulation engine and data storage.'}</p>
                  </div>
              </div>

              {/* General Settings */}
              <div className={`${bgCard} rounded-lg border ${borderClass} p-6`}>
                  <h3 className={`text-lg font-semibold ${textPrimary} mb-4 flex items-center gap-2`}>
                      {dict.generalSettings || 'General Settings'}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                          <label className={`block text-sm font-medium ${textSecondary}`}>{dict.defaultSamplingRate || 'Default Sampling Rate (ms)'}</label>
                          <input 
                            type="number" 
                            value={params.samplingRate}
                            onChange={e => setParams({...params, samplingRate: parseInt(e.target.value)})}
                            className={`w-full p-2 rounded border ${borderClass} ${inputBg} ${textPrimary} focus:border-blue-500 outline-none`}
                          />
                          <p className="text-xs text-slate-500">{dict.samplingRateDesc || 'Base frequency for data generation'}</p>
                      </div>

                      <div className="space-y-2">
                          <label className={`block text-sm font-medium ${textSecondary}`}>{dict.maxBatchSize || 'Max Batch Size'}</label>
                          <input 
                            type="number" 
                            value={params.maxBatchSize}
                            onChange={e => setParams({...params, maxBatchSize: parseInt(e.target.value)})}
                            className={`w-full p-2 rounded border ${borderClass} ${inputBg} ${textPrimary} focus:border-blue-500 outline-none`}
                          />
                          <p className="text-xs text-slate-500">{dict.batchSizeDesc || 'Maximum records per write operation'}</p>
                      </div>

                      <div className="space-y-2">
                          <label className={`block text-sm font-medium ${textSecondary}`}>{dict.maxConcurrentDevices || 'Max Concurrent Devices'}</label>
                          <input 
                            type="number" 
                            value={params.maxDevices}
                            onChange={e => setParams({...params, maxDevices: parseInt(e.target.value)})}
                            className={`w-full p-2 rounded border ${borderClass} ${inputBg} ${textPrimary} focus:border-blue-500 outline-none`}
                          />
                      </div>

                      <div className="space-y-2">
                          <label className={`block text-sm font-medium ${textSecondary}`}>{dict.logLevel || 'Log Level'}</label>
                          <select 
                            value={params.logLevel}
                            onChange={e => setParams({...params, logLevel: e.target.value})}
                            className={`w-full p-2 rounded border ${borderClass} ${inputBg} ${textPrimary} focus:border-blue-500 outline-none`}
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
       </div>
    </div>
  );
};