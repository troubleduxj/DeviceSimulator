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
}

export const SystemManager: React.FC<SystemManagerProps> = ({ onClose, dict }) => {
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
  const [activeTab, setActiveTab] = useState<'general' | 'tdengine' | 'mqtt' | 'modbus' | 'opcua'>('general');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [statusData, configData, settingsData] = await Promise.all([
        backendService.fetchSystemStatus(),
        backendService.fetchTDengineConfig(),
        backendService.fetchSystemSettings()
      ]);
      setStatus(statusData);
      setConfig(configData);
      setSystemSettings(settingsData);
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
    <div className="h-full flex flex-col bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Activity className="text-blue-500" />
          {dict.systemStatusTitle}
        </h2>
        <button 
            onClick={fetchData} 
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
            title={dict.refresh}
        >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/50">
          <button 
              className={`px-6 py-3 text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'general' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50' : 'text-slate-400 hover:text-white'}`}
              onClick={() => setActiveTab('general')}
          >
              <Activity size={16} /> {dict.general}
          </button>
          <button 
              className={`px-6 py-3 text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'tdengine' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50' : 'text-slate-400 hover:text-white'}`}
              onClick={() => setActiveTab('tdengine')}
          >
              <Database size={16} /> TDengine
          </button>
          <button 
              className={`px-6 py-3 text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'mqtt' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50' : 'text-slate-400 hover:text-white'}`}
              onClick={() => setActiveTab('mqtt')}
          >
              <Wifi size={16} /> {dict.mqtt}
          </button>
          <button 
              className={`px-6 py-3 text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'modbus' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50' : 'text-slate-400 hover:text-white'}`}
              onClick={() => setActiveTab('modbus')}
          >
              <Settings size={16} /> {dict.modbus}
          </button>
          <button 
              className={`px-6 py-3 text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'opcua' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50' : 'text-slate-400 hover:text-white'}`}
              onClick={() => setActiveTab('opcua')}
          >
              <Network size={16} /> OPC UA
          </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* General Tab */}
          {activeTab === 'general' && (
              <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <Server className="text-emerald-400" />
                          {dict.dataGenService}
                      </h3>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          status?.status === 'running' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-slate-400'
                      }`}>
                          {status?.status === 'running' ? dict.running : dict.stopped}
                      </div>
                  </div>
                  <p className="text-slate-400 mb-6 text-sm">
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
          )}

          {/* TDengine Tab */}
          {activeTab === 'tdengine' && (
              <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                  <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <Database className="text-blue-400" />
                          {dict.tdengineIntegration}
                      </h3>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs ${status?.tdengine_connected ? 'text-emerald-400' : 'text-red-400'}`}>
                            {status?.tdengine_connected ? dict.connected : dict.disconnected}
                        </span>
                        <div className={`w-3 h-3 rounded-full ${status?.tdengine_connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{dict.host}</label>
                              <input 
                                  type="text" 
                                  value={config.host || ''}
                                  onChange={e => setConfig({...config, host: e.target.value})}
                                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none font-mono"
                                  placeholder="127.0.0.1"
                              />
                          </div>
                          <div>
                              <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{dict.port}</label>
                              <input 
                                  type="number" 
                                  value={config.port || 6041}
                                  onChange={e => setConfig({...config, port: parseInt(e.target.value)})}
                                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none font-mono"
                              />
                          </div>
                          <div className="flex items-center gap-3 pt-4">
                              <input 
                                  type="checkbox" 
                                  id="td_enabled"
                                  checked={config.enabled}
                                  onChange={e => setConfig({...config, enabled: e.target.checked})}
                                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                              />
                              <label htmlFor="td_enabled" className="text-sm text-white font-medium cursor-pointer">{dict.enableTdengine}</label>
                          </div>
                      </div>
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{dict.username}</label>
                              <input 
                                  type="text" 
                                  value={config.user || ''}
                                  onChange={e => setConfig({...config, user: e.target.value})}
                                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none font-mono"
                                  placeholder="root"
                              />
                          </div>
                          <div>
                              <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{dict.password}</label>
                              <input 
                                  type="password" 
                                  value={config.password || ''}
                                  onChange={e => setConfig({...config, password: e.target.value})}
                                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none font-mono"
                                  placeholder="taosdata"
                              />
                          </div>
                          <div>
                              <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{dict.databaseName}</label>
                              <input 
                                  type="text" 
                                  value={config.database || ''}
                                  onChange={e => setConfig({...config, database: e.target.value})}
                                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none font-mono"
                                  placeholder="device_simulator"
                              />
                          </div>
                      </div>
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t border-slate-700">
                      <button 
                          onClick={handleSaveConfig}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition-colors"
                      >
                          <Save size={16} /> {dict.saveConfig}
                      </button>
                      <button 
                          onClick={handleTestConnection}
                          disabled={isTesting}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium transition-colors disabled:opacity-50"
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
          )}

          {/* MQTT Tab */}
          {activeTab === 'mqtt' && (
              <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                  <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <Wifi className="text-purple-400" />
                          {dict.mqttConfig}
                      </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{dict.brokerHost}</label>
                              <input 
                                  type="text" 
                                  value={systemSettings.mqtt_host || ''}
                                  onChange={e => setSystemSettings({...systemSettings, mqtt_host: e.target.value})}
                                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none font-mono"
                                  placeholder="localhost"
                              />
                          </div>
                          <div>
                              <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{dict.brokerPort}</label>
                              <input 
                                  type="number" 
                                  value={systemSettings.mqtt_port || 1883}
                                  onChange={e => setSystemSettings({...systemSettings, mqtt_port: parseInt(e.target.value)})}
                                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none font-mono"
                              />
                          </div>
                          <div className="flex items-center gap-3 pt-4">
                              <input 
                                  type="checkbox" 
                                  id="mqtt_enabled"
                                  checked={systemSettings.mqtt_enabled}
                                  onChange={e => setSystemSettings({...systemSettings, mqtt_enabled: e.target.checked})}
                                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                              />
                              <label htmlFor="mqtt_enabled" className="text-sm text-white font-medium cursor-pointer">{dict.enableMqttPush}</label>
                          </div>
                      </div>
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{dict.username}</label>
                              <input 
                                  type="text" 
                                  value={systemSettings.mqtt_user || ''}
                                  onChange={e => setSystemSettings({...systemSettings, mqtt_user: e.target.value})}
                                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none font-mono"
                              />
                          </div>
                          <div>
                              <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{dict.password}</label>
                              <input 
                                  type="password" 
                                  value={systemSettings.mqtt_password || ''}
                                  onChange={e => setSystemSettings({...systemSettings, mqtt_password: e.target.value})}
                                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none font-mono"
                              />
                          </div>
                          <div>
                              <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{dict.topicTemplate}</label>
                              <input 
                                  type="text" 
                                  value={systemSettings.mqtt_topic_template || 'devices/{device_id}/data'}
                                  onChange={e => setSystemSettings({...systemSettings, mqtt_topic_template: e.target.value})}
                                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none font-mono"
                                  placeholder="devices/{device_id}/data"
                              />
                              <p className="text-xs text-slate-500 mt-1">Use {"{device_id}"} as placeholder.</p>
                          </div>
                      </div>
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t border-slate-700">
                      <button 
                          onClick={handleSaveSettings}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition-colors"
                      >
                          <Save size={16} /> {dict.saveMqttSettings}
                      </button>
                  </div>
              </div>
          )}

          {/* Modbus Tab */}
          {activeTab === 'modbus' && (
              <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                  <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <Settings className="text-orange-400" />
                          {dict.modbusTcpServer}
                      </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{dict.tcpPort}</label>
                              <input 
                                  type="number" 
                                  value={systemSettings.modbus_port || 5020}
                                  onChange={e => setSystemSettings({...systemSettings, modbus_port: parseInt(e.target.value)})}
                                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none font-mono"
                              />
                          </div>
                          <div className="flex items-center gap-3 pt-4">
                              <input 
                                  type="checkbox" 
                                  id="modbus_enabled"
                                  checked={systemSettings.modbus_enabled}
                                  onChange={e => setSystemSettings({...systemSettings, modbus_enabled: e.target.checked})}
                                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                              />
                              <label htmlFor="modbus_enabled" className="text-sm text-white font-medium cursor-pointer">{dict.enableModbusServer}</label>
                          </div>
                      </div>
                      <div className="space-y-4">
                          <div className="bg-slate-900 p-4 rounded border border-slate-700">
                              <h4 className="text-sm font-bold text-slate-300 mb-2">{dict.mappingInfo}</h4>
                              <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                                  <li>Register 0-99: Reserved</li>
                                  <li>Register 100+: Device Parameters (16-bit Int)</li>
                                  <li>Parameters are mapped sequentially.</li>
                                  <li>Float values are truncated to Integers.</li>
                              </ul>
                          </div>
                      </div>
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t border-slate-700">
                      <button 
                          onClick={handleSaveSettings}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition-colors"
                      >
                          <Save size={16} /> {dict.saveModbusSettings}
                      </button>
                  </div>
              </div>
          )}

          {/* OPC UA Tab */}
          {activeTab === 'opcua' && (
              <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                  <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <Network className="text-indigo-400" />
                          OPC UA Server
                      </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Endpoint URL</label>
                              <input 
                                  type="text" 
                                  value={systemSettings.opcua_endpoint || 'opc.tcp://0.0.0.0:4840/freeopcua/server/'}
                                  onChange={e => setSystemSettings({...systemSettings, opcua_endpoint: e.target.value})}
                                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none font-mono"
                                  placeholder="opc.tcp://0.0.0.0:4840/freeopcua/server/"
                              />
                          </div>
                          <div className="flex items-center gap-3 pt-4">
                              <input 
                                  type="checkbox" 
                                  id="opcua_enabled"
                                  checked={systemSettings.opcua_enabled}
                                  onChange={e => setSystemSettings({...systemSettings, opcua_enabled: e.target.checked})}
                                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                              />
                              <label htmlFor="opcua_enabled" className="text-sm text-white font-medium cursor-pointer">Enable OPC UA Server</label>
                          </div>
                      </div>
                      <div className="space-y-4">
                          <div className="bg-slate-900 p-4 rounded border border-slate-700">
                              <h4 className="text-sm font-bold text-slate-300 mb-2">Information</h4>
                              <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                                  <li>Standard OPC UA binary protocol (opc.tcp).</li>
                                  <li>Anonymous authentication enabled by default.</li>
                                  <li>Exposes all devices and parameters under Root/Objects.</li>
                              </ul>
                          </div>
                      </div>
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t border-slate-700">
                      <button 
                          onClick={handleSaveSettings}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition-colors"
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
