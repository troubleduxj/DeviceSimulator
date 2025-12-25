import React, { useState, useEffect } from 'react';
import { Sparkles, Save, RefreshCw, AlertCircle, Check, Loader2 } from 'lucide-react';
import { testLlmConnection } from '../services/geminiService';

interface LlmManagerProps {
  onClose: () => void;
  dict: any;
  theme?: 'dark' | 'light';
}

export const LlmManager: React.FC<LlmManagerProps> = ({ onClose, dict, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  
  // Styling classes
  const bgMain = isDark ? 'bg-slate-900' : 'bg-slate-50';
  const bgCard = isDark ? 'bg-slate-800' : 'bg-white';
  const borderClass = isDark ? 'border-slate-700' : 'border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-slate-900' : 'bg-white';
  
  const [config, setConfig] = useState({
    provider: 'gemini',
    gemini: { 
        apiKey: '', 
        model: 'gemini-2.5-flash' 
    },
    deepseek: { 
        apiKey: '', 
        model: 'deepseek-chat', 
        baseUrl: 'https://api.deepseek.com' 
    },
    proxyUrl: '' // Add proxyUrl
  });

  const [activeProvider, setActiveProvider] = useState('gemini');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
      const provider = localStorage.getItem('llm_provider') || 'gemini';
      setActiveProvider(provider);
      
      const geminiKey = localStorage.getItem('gemini_api_key') || '';
      const geminiModel = localStorage.getItem('gemini_model') || 'gemini-2.5-flash';
      
      const deepseekKey = localStorage.getItem('deepseek_api_key') || '';
      const deepseekModel = localStorage.getItem('deepseek_model') || 'deepseek-chat';
      const deepseekBaseUrl = localStorage.getItem('deepseek_base_url') || 'https://api.deepseek.com';
      const proxyUrl = localStorage.getItem('llm_proxy_url') || '';
      
      setConfig({
          provider,
          gemini: { apiKey: geminiKey, model: geminiModel },
          deepseek: { apiKey: deepseekKey, model: deepseekModel, baseUrl: deepseekBaseUrl },
          proxyUrl
      });
  }, []);

  const handleSave = () => {
    localStorage.setItem('llm_provider', config.provider);
    setActiveProvider(config.provider);
    
    localStorage.setItem('gemini_api_key', config.gemini.apiKey);
    localStorage.setItem('gemini_model', config.gemini.model);
    
    localStorage.setItem('deepseek_api_key', config.deepseek.apiKey);
    localStorage.setItem('deepseek_model', config.deepseek.model);
    localStorage.setItem('deepseek_base_url', config.deepseek.baseUrl);
    
    localStorage.setItem('llm_proxy_url', config.proxyUrl);

    alert(dict.configSaved || 'Configuration saved successfully');
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      // Pass current config state to test function
      const result = await testLlmConnection(config);
      setTestResult(result);
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || 'Unknown error occurred' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className={`h-full flex flex-col ${bgMain} rounded-lg border ${borderClass} overflow-hidden`}>
       {/* Header */}
       <div className={`p-4 border-b ${borderClass} flex justify-between items-center bg-inherit`}>
         <h2 className={`text-xl font-bold ${textPrimary} flex items-center gap-2`}>
           <Sparkles className="text-purple-500" />
           {dict.llmSettings || 'LLM Settings'}
         </h2>
         <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2 font-medium transition-colors">
            <Save size={16} /> {dict.save || 'Save'}
         </button>
       </div>

       {/* Content */}
       <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
              
              {/* Provider Selection */}
              <div className={`${bgCard} rounded-lg border ${borderClass} p-6`}>
                  <div className="flex justify-between items-center mb-4">
                      <h3 className={`text-lg font-semibold ${textPrimary}`}>
                          {dict.provider || 'Provider'}
                      </h3>
                      <span className={`text-sm px-3 py-1 rounded-full ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                          {dict.currentActive || 'Current System Default'}: <span className="font-bold text-blue-500">{activeProvider === 'gemini' ? 'Google Gemini' : 'DeepSeek'}</span>
                      </span>
                  </div>
                  <div className="flex gap-4">
                      <button 
                          onClick={() => setConfig({ ...config, provider: 'gemini' })}
                          className={`relative flex-1 p-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                              config.provider === 'gemini' 
                              ? 'border-blue-500 bg-blue-500/10 text-blue-500' 
                              : `${borderClass} ${textSecondary} hover:border-slate-400`
                          }`}
                      >
                          <span className="font-bold text-lg">Google Gemini</span>
                          {config.provider === 'gemini' && <Check size={18} />}
                          {activeProvider === 'gemini' && (
                              <span className="absolute top-2 right-2 text-[10px] font-bold bg-green-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  Active
                              </span>
                          )}
                      </button>
                      
                      <button 
                          onClick={() => setConfig({ ...config, provider: 'deepseek' })}
                          className={`relative flex-1 p-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                              config.provider === 'deepseek' 
                              ? 'border-blue-500 bg-blue-500/10 text-blue-500' 
                              : `${borderClass} ${textSecondary} hover:border-slate-400`
                          }`}
                      >
                          <span className="font-bold text-lg">DeepSeek</span>
                          {config.provider === 'deepseek' && <Check size={18} />}
                          {activeProvider === 'deepseek' && (
                              <span className="absolute top-2 right-2 text-[10px] font-bold bg-green-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  Active
                              </span>
                          )}
                      </button>
                  </div>
              </div>

              {/* Common Config (Proxy) */}
              <div className={`${bgCard} rounded-lg border ${borderClass} p-6`}>
                  <h3 className={`text-lg font-semibold ${textPrimary} mb-4 flex items-center gap-2`}>
                      Network Settings
                  </h3>
                  <div className="space-y-2">
                      <label className={`block text-sm font-medium ${textSecondary}`}>{dict.proxyUrl || 'Proxy URL (Optional)'}</label>
                      <input 
                        type="text" 
                        value={config.proxyUrl}
                        onChange={e => setConfig({ ...config, proxyUrl: e.target.value })}
                        placeholder="http://127.0.0.1:7890"
                        className={`w-full p-2 rounded border ${borderClass} ${inputBg} ${textPrimary} focus:border-blue-500 outline-none`}
                      />
                      <p className="text-xs text-slate-500">Required if you are in a region where Google API is blocked. Format: http://host:port</p>
                  </div>
              </div>

              {/* Gemini Config */}
              {config.provider === 'gemini' && (
                  <div className={`${bgCard} rounded-lg border ${borderClass} p-6 animate-in fade-in duration-300`}>
                      <h3 className={`text-lg font-semibold ${textPrimary} mb-4 flex items-center gap-2`}>
                          Google Gemini Configuration
                      </h3>
                      
                      <div className="space-y-4">
                          <div className="space-y-2">
                              <label className={`block text-sm font-medium ${textSecondary}`}>{dict.apiKey || 'API Key'}</label>
                              <input 
                                type="password" 
                                value={config.gemini.apiKey}
                                onChange={e => setConfig({ ...config, gemini: { ...config.gemini, apiKey: e.target.value } })}
                                placeholder="sk-..."
                                className={`w-full p-2 rounded border ${borderClass} ${inputBg} ${textPrimary} focus:border-blue-500 outline-none`}
                              />
                              <p className="text-xs text-slate-500">Google AI Studio API Key</p>
                          </div>

                          <div className="space-y-2">
                              <label className={`block text-sm font-medium ${textSecondary}`}>{dict.modelName || 'Model Name'}</label>
                              <select 
                                 value={config.gemini.model}
                                 onChange={e => setConfig({ ...config, gemini: { ...config.gemini, model: e.target.value } })}
                                 className={`w-full p-2 rounded border ${borderClass} ${inputBg} ${textPrimary} focus:border-blue-500 outline-none`}
                              >
                                 <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                                 <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                                 <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                                 <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                              </select>
                          </div>
                      </div>

                      {/* Test Connection Section */}
                      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-between">
                              <button
                                  onClick={handleTestConnection}
                                  disabled={isTesting || !config.gemini.apiKey}
                                  className={`flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors ${
                                      !config.gemini.apiKey 
                                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
                                      : 'bg-green-600 hover:bg-green-500 text-white'
                                  }`}
                              >
                                  {isTesting ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                                  {dict.testConnection || 'Test Connection'}
                              </button>
                              
                              {testResult && (
                                  <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded ${
                                      testResult.success 
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  }`}>
                                      {testResult.success ? <Check size={14} /> : <AlertCircle size={14} />}
                                      {testResult.message}
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              )}

              {/* DeepSeek Config */}
              {config.provider === 'deepseek' && (
                  <div className={`${bgCard} rounded-lg border ${borderClass} p-6 animate-in fade-in duration-300`}>
                      <h3 className={`text-lg font-semibold ${textPrimary} mb-4 flex items-center gap-2`}>
                          DeepSeek Configuration
                      </h3>
                      
                      <div className="space-y-4">
                          <div className="space-y-2">
                              <label className={`block text-sm font-medium ${textSecondary}`}>{dict.apiKey || 'API Key'}</label>
                              <input 
                                type="password" 
                                value={config.deepseek.apiKey}
                                onChange={e => setConfig({ ...config, deepseek: { ...config.deepseek, apiKey: e.target.value } })}
                                placeholder="sk-..."
                                className={`w-full p-2 rounded border ${borderClass} ${inputBg} ${textPrimary} focus:border-blue-500 outline-none`}
                              />
                          </div>

                          <div className="space-y-2">
                              <label className={`block text-sm font-medium ${textSecondary}`}>{dict.baseUrl || 'Base URL'}</label>
                              <input 
                                type="text" 
                                value={config.deepseek.baseUrl}
                                onChange={e => setConfig({ ...config, deepseek: { ...config.deepseek, baseUrl: e.target.value } })}
                                placeholder="https://api.deepseek.com"
                                className={`w-full p-2 rounded border ${borderClass} ${inputBg} ${textPrimary} focus:border-blue-500 outline-none`}
                              />
                          </div>

                          <div className="space-y-2">
                              <label className={`block text-sm font-medium ${textSecondary}`}>{dict.modelName || 'Model Name'}</label>
                              <input 
                                type="text" 
                                value={config.deepseek.model}
                                onChange={e => setConfig({ ...config, deepseek: { ...config.deepseek, model: e.target.value } })}
                                placeholder="deepseek-chat"
                                className={`w-full p-2 rounded border ${borderClass} ${inputBg} ${textPrimary} focus:border-blue-500 outline-none`}
                              />
                              <p className="text-xs text-slate-500">e.g. deepseek-chat, deepseek-coder</p>
                          </div>
                      </div>

                      {/* Test Connection Section */}
                      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-between">
                              <button
                                  onClick={handleTestConnection}
                                  disabled={isTesting || !config.deepseek.apiKey}
                                  className={`flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors ${
                                      !config.deepseek.apiKey 
                                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
                                      : 'bg-green-600 hover:bg-green-500 text-white'
                                  }`}
                              >
                                  {isTesting ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                                  {dict.testConnection || 'Test Connection'}
                              </button>
                              
                              {testResult && (
                                  <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded ${
                                      testResult.success 
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  }`}>
                                      {testResult.success ? <Check size={14} /> : <AlertCircle size={14} />}
                                      {testResult.message}
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              )}
          </div>
       </div>
    </div>
  );
};