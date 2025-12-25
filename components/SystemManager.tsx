import React, { useState, useEffect } from 'react';
import { 
  backendService, SystemStatus, TDengineConfig, SystemSettings 
} from '../services/backendService';
import { 
  Activity, Database, Server, Save, RefreshCw, CheckCircle, XCircle, Power, Wifi, Settings, Network 
} from 'lucide-react';

interface SystemManagerProps {
  onClose: () => void;
  dict: any;
  theme?: 'dark' | 'light';
}

export const SystemManager: React.FC<SystemManagerProps> = ({ onClose, dict, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const bgMain = isDark ? 'bg-slate-900' : 'bg-gray-50';
  const bgCard = isDark ? 'bg-slate-800' : 'bg-white';
  const bgHeader = isDark ? 'bg-slate-900' : 'bg-gray-100';
  const bgSub = isDark ? 'bg-slate-900' : 'bg-gray-100';
  const borderMain = isDark ? 'border-slate-700' : 'border-gray-200';
  const borderCard = isDark ? 'border-slate-700' : 'border-gray-300';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-slate-400' : 'text-gray-500';
  const textSubDarker = isDark ? 'text-slate-500' : 'text-gray-400';
  const inputBg = isDark ? 'bg-slate-900' : 'bg-gray-50';
  const inputBorder = isDark ? 'border-slate-700' : 'border-gray-300';
  const tabActive = isDark ? 'text-purple-400 border-b-2 border-purple-400 bg-slate-800/50' : 'text-purple-600 border-b-2 border-purple-600 bg-purple-50';
  const tabInactive = isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900';

  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [config, setConfig] = useState<TDengineConfig>({ enabled: false });
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    mqtt_enabled: false,
    modbus_enabled: false,
    opcua_enabled: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [tdengineInfo, setTdengineInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'tdengine' | 'mqtt' | 'modbus' | 'opcua'>('general');

  useEffect(() => {
    console.log('SystemManager mounted, activeTab:', activeTab);
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [statusData, configData, settingsData, infoData] = await Promise.all([
        backendService.fetchSystemStatus(),
        backendService.fetchTDengineConfig(),
        backendService.fetchSystemSettings(),
        backendService.fetchTDengineInfo()
      ]);
      setStatus(statusData);
      setConfig(configData);
      setSystemSettings(settingsData);
      setTdengineInfo(infoData);
    } catch (error) {
      console.error("Failed to fetch system data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(async () => {
        try {
            const s = await backendService.fetchSystemStatus();
            setStatus(s);
        } catch (e) {}
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveConfig = async () => {
    try {
      await backendService.updateTDengineConfig(config);
      alert(dict.configSaved || 'Configuration saved successfully');
      fetchData();
    } catch (error) {
      alert(dict.saveFailed || 'Failed to save configuration');
    }
  };

  const handleSaveSettings = async () => {
    try {
      await backendService.updateSystemSettings(systemSettings);
      alert('System settings saved successfully');
      fetchData();
    } catch (error) {
      alert('Failed to save system settings');
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await backendService.testTDengineConnection();
      setTestResult({
        success: result.connected,
        message: result.message
      });
      fetchData();
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || dict.connectionTestFailed || 'Connection test failed'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const toggleSystem = async () => {
      if (!status) return;
      try {
          if (status.status === 'running') {
              await backendService.stopSystem();
          } else {
              await backendService.startSystem();
          }
          fetchData();
      } catch (e) {
          console.error("Failed to toggle system", e);
      }
  };

  if (isLoading && !status) {
      return <div className="p-8 text-center text-slate-500">Loading system status...</div>;
  }

  return (
    <div className={`h-full flex flex-col ${bgMain} rounded-lg border ${borderMain} overflow-hidden`}>
      {/* Header */}
      <div className={`p-4 border-b ${borderMain} flex justify-between items-center ${bgHeader}`}>
        <h2 className={`text-xl font-bold ${textMain} flex items-center gap-2`}>
          <Activity className="text-purple-500" />
          {dict.systemStatusTitle}
        </h2>
        <button 
            onClick={fetchData} 
            className={`p-2 ${textSub} ${isDark ? 'hover:text-white hover:bg-slate-800' : 'hover:text-gray-900 hover:bg-gray-200'} rounded`}
            title={dict.refresh}
        >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${borderMain} ${bgSub}`}>
          <button 
              className={`px-6 py-3 text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'general' ? tabActive : tabInactive}`}
              onClick={() => setActiveTab('general')}
          >
              <Activity size={16} /> {dict.general}
          </button>
          <button 
              className={`px-6 py-3 text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'tdengine' ? tabActive : tabInactive}`}
              onClick={() => setActiveTab('tdengine')}
          >
              <Database size={16} /> TDengine
          </button>
          <button 
              className={`px-6 py-3 text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'mqtt' ? tabActive : tabInactive}`}
              onClick={() => setActiveTab('mqtt')}
          >
              <Wifi size={16} /> {dict.mqtt}
          </button>
          <button 
              className={`px-6 py-3 text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'modbus' ? tabActive : tabInactive}`}
              onClick={() => setActiveTab('modbus')}
          >
              <Settings size={16} /> {dict.modbus}
          </button>
          <button 
              className={`px-6 py-3 text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'opcua' ? tabActive : tabInactive}`}
              onClick={() => setActiveTab('opcua')}
          >
              <Network size={16} /> OPC UA
          </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          
          {/* General Tab */}
          {activeTab === 'general' && (
              <div className="space-y-6">
                  <div className={`${bgCard} p-6 rounded-lg border ${borderCard}`}>
                      <div className="flex items-center justify-between mb-4">
                          <h3 className={`text-lg font-bold ${textMain} flex items-center gap-2`}>
                              <Server className="text-emerald-400" />
                              {dict.dataGenService}
                          </h3>
                          <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                              status?.status === 'running' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : `${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-500'}`
                          }`}>
                              {status?.status === 'running' ? dict.running : dict.stopped}
                          </div>
                      </div>
                      <p className={`${textSub} mb-6 text-sm`}>
                          {dict.dataGenDesc}
                      </p>

                      <button
                          onClick={toggleSystem}
                          className={`flex items-center justify-center gap-2 w-full py-3 rounded font-bold transition-all ${
                              status?.status === 'running' 
                              ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white' 
                              : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-900/20'
                          }`}
                      >
                          <Power size={18} />
                          {status?.status === 'running' ? dict.stopAllData : dict.startAllData}
                      </button>
                  </div>
              </div>
          )}

          {/* TDengine Tab */}
          {activeTab === 'tdengine' && (
              <>
              <div className={`${bgCard} p-6 rounded-lg border ${borderCard}`}>
                  <div className="flex items-center justify-between mb-6">
                      <h3 className={`text-lg font-bold ${textMain} flex items-center gap-2`}>
                          <Database className="text-purple-400" />
                          {dict.tdengineIntegration}
                      </h3>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs ${status?.tdengine_connected ? 'text-emerald-400' : 'text-red-400'}`}>
                            {status?.tdengine_connected ? dict.connected : dict.disconnected}
                        </span>
                        <div className={`w-3 h-3 rounded-full ${status?.tdengine_connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      </div>
                  </div>

                  {status?.tdengine_connected && tdengineInfo && (
                      <div className={`mb-6 ${bgSub} p-4 rounded border ${isDark ? 'border-slate-700/50' : 'border-gray-200'} grid grid-cols-2 md:grid-cols-4 gap-4`}>
                          <div>
                              <div className={`text-[10px] uppercase ${textSubDarker} font-bold`}>Version</div>
                              <div className={`${textMain} font-mono text-sm`}>{tdengineInfo.version}</div>
                          </div>
                          <div>
                              <div className={`text-[10px] uppercase ${textSubDarker} font-bold`}>Created At</div>
                              <div className={`${textMain} font-mono text-sm`}>{tdengineInfo.created_at || 'N/A'}</div>
                          </div>
                          <div>
                              <div className={`text-[10px] uppercase ${textSubDarker} font-bold`}>Tables</div>
                              <div className={`${textMain} font-mono text-sm`}>{tdengineInfo.tables_count}</div>
                          </div>
                          <div>
                              <div className={`text-[10px] uppercase ${textSubDarker} font-bold`}>Super Tables</div>
                              <div className={`${textMain} font-mono text-sm`}>{tdengineInfo.stables_count}</div>
                          </div>
                      </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-4">
                          <div>
                              <label className={`block text-xs uppercase ${textSubDarker} font-bold mb-1`}>{dict.host}</label>
                              <input 
                                  type="text" 
                                  value={config.host || ''}
                                  onChange={e => setConfig({...config, host: e.target.value})}
                                  className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain} focus:border-purple-500 outline-none font-mono`}
                                  placeholder="127.0.0.1"
                              />
                          </div>
                          <div>
                              <label className={`block text-xs uppercase ${textSubDarker} font-bold mb-1`}>{dict.port}</label>
                              <input 
                                  type="number" 
                                  value={config.port || 6041}
                                  onChange={e => setConfig({...config, port: parseInt(e.target.value)})}
                                  className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain} focus:border-purple-500 outline-none font-mono`}
                              />
                          </div>
                          <div className="flex items-center gap-3 pt-4">
                              <input 
                                  type="checkbox" 
                                  id="td_enabled"
                                  checked={config.enabled}
                                  onChange={e => setConfig({...config, enabled: e.target.checked})}
                                  className={`w-4 h-4 rounded ${inputBorder} ${inputBg} text-purple-600 focus:ring-purple-500`}
                              />
                              <label htmlFor="td_enabled" className={`text-sm ${textMain} font-medium cursor-pointer`}>{dict.enableTdengine}</label>
                          </div>
                      </div>
                      <div className="space-y-4">
                          <div>
                              <label className={`block text-xs uppercase ${textSubDarker} font-bold mb-1`}>{dict.username}</label>
                              <input 
                                  type="text" 
                                  value={config.user || ''}
                                  onChange={e => setConfig({...config, user: e.target.value})}
                                  className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain} focus:border-purple-500 outline-none font-mono`}
                                  placeholder="root"
                              />
                          </div>
                          <div>
                              <label className={`block text-xs uppercase ${textSubDarker} font-bold mb-1`}>{dict.password}</label>
                              <input 
                                  type="password" 
                                  value={config.password || ''}
                                  onChange={e => setConfig({...config, password: e.target.value})}
                                  className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain} focus:border-purple-500 outline-none font-mono`}
                                  placeholder="taosdata"
                              />
                          </div>
                          <div>
                              <label className={`block text-xs uppercase ${textSubDarker} font-bold mb-1`}>{dict.databaseName}</label>
                              <input 
                                  type="text" 
                                  value={config.database || ''}
                                  onChange={e => setConfig({...config, database: e.target.value})}
                                  className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain} focus:border-purple-500 outline-none font-mono`}
                                  placeholder="device_simulator"
                              />
                          </div>
                      </div>
                  </div>

                  <div className={`flex items-center gap-4 pt-4 border-t ${borderCard}`}>
                      <button 
                          onClick={handleSaveConfig}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold transition-colors"
                      >
                          <Save size={16} /> {dict.saveConfig}
                      </button>
                      <button 
                          onClick={handleTestConnection}
                          disabled={isTesting}
                          className={`flex items-center gap-2 px-4 py-2 ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'} ${textMain} rounded font-medium transition-colors disabled:opacity-50`}
                      >
                          {isTesting ? <RefreshCw size={16} className="animate-spin" /> : <Activity size={16} />} 
                          {dict.testConnection}
                      </button>
                      
                      {testResult && (
                          <div className={`flex items-center gap-2 text-sm ${testResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                              {testResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
                              {testResult.message}
                          </div>
                      )}
                  </div>
              </div>

              {/* Subtable Settings Card */}
              <div className={`${bgCard} p-6 rounded-lg border ${borderCard} mt-6`}>
                  <div className="flex items-center justify-between mb-6">
                      <h3 className={`text-lg font-bold ${textMain} flex items-center gap-2`}>
                          <Settings className="text-cyan-400" />
                          {dict.subtableSettings}
                      </h3>
                  </div>

                  <div className="space-y-4">
                      <div>
                          <label className={`block text-xs uppercase ${textSubDarker} font-bold mb-1`}>{dict.subtableNameTemplate}</label>
                          <input 
                              type="text" 
                              value={config.subtable_name_template || 'd_{device_id}'}
                              onChange={e => setConfig({...config, subtable_name_template: e.target.value})}
                              className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain} focus:border-purple-500 outline-none font-mono`}
                              placeholder="d_{device_id}"
                          />
                          <p className={`text-xs ${textSubDarker} mt-1`}>{dict.subtableNameHint}</p>
                          <p className={`text-xs ${textSub} mt-1`}>{dict.subtableNameExample}</p>
                      </div>
                  </div>

                  <div className={`flex items-center gap-4 pt-4 mt-4 border-t ${borderCard}`}>
                      <button 
                          onClick={handleSaveConfig}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold transition-colors"
                      >
                          <Save size={16} /> {dict.saveConfig}
                      </button>
                  </div>
              </div>
              </>
          )}

          {/* MQTT Tab */}
          {activeTab === 'mqtt' && (
              <div className={`${bgCard} p-6 rounded-lg border ${borderCard}`}>
                  <div className="flex items-center justify-between mb-6">
                      <h3 className={`text-lg font-bold ${textMain} flex items-center gap-2`}>
                          <Wifi className="text-purple-400" />
                          {dict.mqttConfig}
                      </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-4">
                          <div>
                              <label className={`block text-xs uppercase ${textSubDarker} font-bold mb-1`}>{dict.brokerHost}</label>
                              <input 
                                  type="text" 
                                  value={systemSettings.mqtt_host || ''}
                                  onChange={e => setSystemSettings({...systemSettings, mqtt_host: e.target.value})}
                                  className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain} focus:border-purple-500 outline-none font-mono`}
                                  placeholder="localhost"
                              />
                          </div>
                          <div>
                              <label className={`block text-xs uppercase ${textSubDarker} font-bold mb-1`}>{dict.brokerPort}</label>
                              <input 
                                  type="number" 
                                  value={systemSettings.mqtt_port || 1883}
                                  onChange={e => setSystemSettings({...systemSettings, mqtt_port: parseInt(e.target.value)})}
                                  className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain} focus:border-purple-500 outline-none font-mono`}
                              />
                          </div>
                          <div className="flex items-center gap-3 pt-4">
                              <input 
                                  type="checkbox" 
                                  id="mqtt_enabled"
                                  checked={systemSettings.mqtt_enabled}
                                  onChange={e => setSystemSettings({...systemSettings, mqtt_enabled: e.target.checked})}
                                  className={`w-4 h-4 rounded ${inputBorder} ${inputBg} text-purple-600 focus:ring-purple-500`}
                              />
                              <label htmlFor="mqtt_enabled" className={`text-sm ${textMain} font-medium cursor-pointer`}>{dict.enableMqttPush}</label>
                          </div>
                      </div>
                      <div className="space-y-4">
                          <div>
                              <label className={`block text-xs uppercase ${textSubDarker} font-bold mb-1`}>{dict.username}</label>
                              <input 
                                  type="text" 
                                  value={systemSettings.mqtt_user || ''}
                                  onChange={e => setSystemSettings({...systemSettings, mqtt_user: e.target.value})}
                                  className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain} focus:border-purple-500 outline-none font-mono`}
                              />
                          </div>
                          <div>
                              <label className={`block text-xs uppercase ${textSubDarker} font-bold mb-1`}>{dict.password}</label>
                              <input 
                                  type="password" 
                                  value={systemSettings.mqtt_password || ''}
                                  onChange={e => setSystemSettings({...systemSettings, mqtt_password: e.target.value})}
                                  className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain} focus:border-purple-500 outline-none font-mono`}
                              />
                          </div>
                          <div>
                              <label className={`block text-xs uppercase ${textSubDarker} font-bold mb-1`}>{dict.topicTemplate}</label>
                              <input 
                                  type="text" 
                                  value={systemSettings.mqtt_topic_template || 'devices/{device_id}/data'}
                                  onChange={e => setSystemSettings({...systemSettings, mqtt_topic_template: e.target.value})}
                                  className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain} focus:border-purple-500 outline-none font-mono`}
                                  placeholder="devices/{device_id}/data"
                              />
                              <p className={`text-xs ${textSubDarker} mt-1`}>Use {"{device_id}"} as placeholder.</p>
                          </div>
                      </div>
                  </div>

                  <div className={`flex items-center gap-4 pt-4 border-t ${borderCard}`}>
                      <button 
                          onClick={handleSaveSettings}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold transition-colors"
                      >
                          <Save size={16} /> {dict.saveMqttSettings}
                      </button>
                  </div>
              </div>
          )}

          {/* Modbus Tab */}
          {activeTab === 'modbus' && (
              <div className={`${bgCard} p-6 rounded-lg border ${borderCard}`}>
                  <div className="flex items-center justify-between mb-6">
                      <h3 className={`text-lg font-bold ${textMain} flex items-center gap-2`}>
                          <Settings className="text-orange-400" />
                          {dict.modbusTcpServer}
                      </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-4">
                          <div>
                              <label className={`block text-xs uppercase ${textSubDarker} font-bold mb-1`}>{dict.tcpPort}</label>
                              <input 
                                  type="number" 
                                  value={systemSettings.modbus_port || 5020}
                                  onChange={e => setSystemSettings({...systemSettings, modbus_port: parseInt(e.target.value)})}
                                  className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain} focus:border-purple-500 outline-none font-mono`}
                              />
                          </div>
                          <div className="flex items-center gap-3 pt-4">
                              <input 
                                  type="checkbox" 
                                  id="modbus_enabled"
                                  checked={systemSettings.modbus_enabled}
                                  onChange={e => setSystemSettings({...systemSettings, modbus_enabled: e.target.checked})}
                                  className={`w-4 h-4 rounded ${inputBorder} ${inputBg} text-purple-600 focus:ring-purple-500`}
                              />
                              <label htmlFor="modbus_enabled" className={`text-sm ${textMain} font-medium cursor-pointer`}>{dict.enableModbusServer}</label>
                          </div>
                      </div>
                      <div className="space-y-4">
                          <div className={`${isDark ? 'bg-slate-900' : 'bg-gray-100'} p-4 rounded border ${borderCard}`}>
                              <h4 className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-gray-700'} mb-2`}>{dict.mappingInfo}</h4>
                              <ul className={`text-xs ${textSub} space-y-1 list-disc list-inside`}>
                                  <li>Register 0-99: Reserved</li>
                                  <li>Register 100+: Device Parameters (16-bit Int)</li>
                                  <li>Parameters are mapped sequentially.</li>
                                  <li>Float values are truncated to Integers.</li>
                              </ul>
                          </div>
                      </div>
                  </div>

                  <div className={`flex items-center gap-4 pt-4 border-t ${borderCard}`}>
                      <button 
                          onClick={handleSaveSettings}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold transition-colors"
                      >
                          <Save size={16} /> {dict.saveModbusSettings}
                      </button>
                  </div>
              </div>
          )}

          {/* OPC UA Tab */}
          {activeTab === 'opcua' && (
              <div className={`${bgCard} p-6 rounded-lg border ${borderCard}`}>
                  <div className="flex items-center justify-between mb-6">
                      <h3 className={`text-lg font-bold ${textMain} flex items-center gap-2`}>
                          <Network className="text-indigo-400" />
                          OPC UA Server
                      </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-4">
                          <div>
                              <label className={`block text-xs uppercase ${textSubDarker} font-bold mb-1`}>Endpoint URL</label>
                              <input 
                                  type="text" 
                                  value={systemSettings.opcua_endpoint || 'opc.tcp://0.0.0.0:4840/freeopcua/server/'}
                                  onChange={e => setSystemSettings({...systemSettings, opcua_endpoint: e.target.value})}
                                  className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain} focus:border-purple-500 outline-none font-mono`}
                                  placeholder="opc.tcp://0.0.0.0:4840/freeopcua/server/"
                              />
                          </div>
                          <div className="flex items-center gap-3 pt-4">
                              <input 
                                  type="checkbox" 
                                  id="opcua_enabled"
                                  checked={systemSettings.opcua_enabled}
                                  onChange={e => setSystemSettings({...systemSettings, opcua_enabled: e.target.checked})}
                                  className={`w-4 h-4 rounded ${inputBorder} ${inputBg} text-purple-600 focus:ring-purple-500`}
                              />
                              <label htmlFor="opcua_enabled" className={`text-sm ${textMain} font-medium cursor-pointer`}>Enable OPC UA Server</label>
                          </div>
                      </div>
                      <div className="space-y-4">
                          <div className={`${isDark ? 'bg-slate-900' : 'bg-gray-100'} p-4 rounded border ${borderCard}`}>
                              <h4 className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-gray-700'} mb-2`}>Information</h4>
                              <ul className={`text-xs ${textSub} space-y-1 list-disc list-inside`}>
                                  <li>Standard OPC UA binary protocol (opc.tcp).</li>
                                  <li>Anonymous authentication enabled by default.</li>
                                  <li>Exposes all devices and parameters under Root/Objects.</li>
                              </ul>
                          </div>
                      </div>
                  </div>

                  <div className={`flex items-center gap-4 pt-4 border-t ${borderCard}`}>
                      <button 
                          onClick={handleSaveSettings}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold transition-colors"
                      >
                          <Save size={16} /> Save OPC UA Settings
                      </button>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};
