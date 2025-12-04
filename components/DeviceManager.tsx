import React, { useState, useEffect } from 'react';
import { 
  BackendDevice, BackendParameter, ParameterType, GenerationMode, backendService, Category 
} from '../services/backendService';
import { 
  Plus, Trash2, Edit, Save, X, Settings, RefreshCw 
} from 'lucide-react';

interface DeviceManagerProps {
  onClose: () => void;
  dict: any;
}

export const DeviceManager: React.FC<DeviceManagerProps> = ({ onClose, dict }) => {
  const [devices, setDevices] = useState<BackendDevice[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Partial<BackendDevice> | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [devicesData, categoriesData] = await Promise.all([
        backendService.fetchBackendDevices(),
        backendService.fetchCategories()
      ]);
      setDevices(devicesData);
      setCategories(categoriesData);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm(dict.deleteDeviceConfirm)) return;
    try {
      await backendService.deleteDevice(id);
      fetchData();
    } catch (error) {
      alert(dict.deleteFailed);
    }
  };

  const handleSave = async (device: Partial<BackendDevice>) => {
    try {
      if (device.id) {
        await backendService.updateDevice(device.id, device);
      } else {
        await backendService.createDevice(device);
      }
      setIsFormOpen(false);
      setEditingDevice(null);
      fetchData();
    } catch (error: any) {
      alert(error.message || dict.saveFailed);
    }
  };

  const openCreate = () => {
    setEditingDevice({
      name: '',
      type: categories.length > 0 ? categories[0].code : 'Generator',
      description: '',
      sampling_rate: 1000,
      status: 'stopped',
      parameters: [],
      physics_config: {},
      logic_rules: []
    });
    setIsFormOpen(true);
  };

  const openEdit = (device: BackendDevice) => {
    setEditingDevice(JSON.parse(JSON.stringify(device))); // Deep copy
    setIsFormOpen(true);
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="text-blue-500" />
          {dict.deviceManagement}
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={fetchData} 
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
            title={dict.refresh}
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-bold transition-colors"
          >
            <Plus size={16} />
            {dict.newDevice}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map(device => (
            <div key={device.id} className="bg-slate-800 p-4 rounded border border-slate-700 hover:border-slate-600 transition-all group">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold text-lg text-white">{device.name}</div>
                  <div className="text-xs text-slate-500 font-mono">{device.type}</div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(device)} className="p-1.5 text-blue-400 hover:bg-blue-900/30 rounded">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(device.id)} className="p-1.5 text-red-400 hover:bg-red-900/30 rounded">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-3 line-clamp-2">{device.description || dict.noDescription}</p>
              <div className="text-xs text-slate-500 bg-slate-900/50 p-2 rounded">
                <div className="flex justify-between mb-1">
                   <span>{dict.samplingRate}:</span>
                   <span className="text-slate-300">{device.sampling_rate}</span>
                </div>
                <div className="flex justify-between">
                   <span>{dict.parameters}:</span>
                   <span className="text-slate-300">{device.parameters.length}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Form */}
      {isFormOpen && editingDevice && (
        <DeviceForm 
          device={editingDevice} 
          categories={categories}
          onSave={handleSave} 
          onCancel={() => setIsFormOpen(false)} 
          dict={dict}
        />
      )}
    </div>
  );
};

// --- Device Form Component ---

interface DeviceFormProps {
  device: Partial<BackendDevice>;
  categories: Category[];
  onSave: (device: Partial<BackendDevice>) => void;
  onCancel: () => void;
  dict: any;
}

const DeviceForm: React.FC<DeviceFormProps> = ({ device: initialDevice, categories, onSave, onCancel, dict }) => {
  const [device, setDevice] = useState(initialDevice);
  const [activeTab, setActiveTab] = useState<'basic' | 'params' | 'advanced'>('basic');

  const handleTypeChange = (newType: string) => {
      setDevice({ ...device, type: newType });
      // Optional: Ask to load parameters from category
      if (confirm(dict.loadParamsConfirm)) {
          const category = categories.find(c => c.code === newType);
          if (category) {
              // Deep copy parameters to avoid reference issues
              const newParams = JSON.parse(JSON.stringify(category.parameters || []));
              const newPhysics = JSON.parse(JSON.stringify(category.physics_config || {}));
              const newRules = JSON.parse(JSON.stringify(category.logic_rules || []));
              
              setDevice(prev => ({ 
                  ...prev, 
                  type: newType, 
                  parameters: newParams,
                  physics_config: newPhysics,
                  logic_rules: newRules
              }));
          }
      }
  };

  const handleParamChange = (index: number, field: keyof BackendParameter, value: any) => {
    const newParams = [...(device.parameters || [])];
    newParams[index] = { ...newParams[index], [field]: value };
    setDevice({ ...device, parameters: newParams });
  };

  // Handle advanced configuration updates (errorConfig)
  const handleParamConfigChange = (index: number, configType: 'error_config', key: string, value: any) => {
    const newParams = [...(device.parameters || [])];
    const currentConfig = newParams[index][configType] || {};
    
    if (value === '' || value === null) {
        delete currentConfig[key];
    } else {
        currentConfig[key] = value;
    }
    
    newParams[index] = { ...newParams[index], [configType]: { ...currentConfig } };
    setDevice({ ...device, parameters: newParams });
  };

  // Handle Physics Config
  const handlePhysicsChange = (key: string, value: number) => {
      setDevice({ 
          ...device, 
          physics_config: { ...(device.physics_config || {}), [key]: value } 
      });
  };

  // Handle Logic Rules
  const handleAddRule = () => {
      const newRules = [...(device.logic_rules || []), { condition: '', action: '' }];
      setDevice({ ...device, logic_rules: newRules });
  };

  const handleRuleChange = (index: number, field: 'condition' | 'action', value: string) => {
      const newRules = [...(device.logic_rules || [])];
      newRules[index] = { ...newRules[index], [field]: value };
      setDevice({ ...device, logic_rules: newRules });
  };

  const handleRemoveRule = (index: number) => {
      const newRules = [...(device.logic_rules || [])];
      newRules.splice(index, 1);
      setDevice({ ...device, logic_rules: newRules });
  };

  const addParam = () => {
    const id = 'param_' + Math.random().toString(36).substr(2, 9);
    setDevice({
      ...device,
      parameters: [
        ...(device.parameters || []),
        {
          id: id,
          name: 'New Param',
          type: ParameterType.NUMBER,
          unit: '',
          min_value: 0,
          max_value: 100,
          generation_mode: GenerationMode.RANDOM,
          generation_params: {},
          error_config: {}
        }
      ]
    });
  };

  const removeParam = (index: number) => {
    const newParams = [...(device.parameters || [])];
    newParams.splice(index, 1);
    setDevice({ ...device, parameters: newParams });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">
            {device.id ? dict.editDevice : dict.createDevice}
          </h3>
          <button onClick={onCancel} className="text-slate-500 hover:text-white"><X size={20}/></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800">
            <button 
                className={`px-6 py-3 text-sm font-bold transition-colors ${activeTab === 'basic' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50' : 'text-slate-400 hover:text-white'}`}
                onClick={() => setActiveTab('basic')}
            >
                {dict.basicInfo}
            </button>
            <button 
                className={`px-6 py-3 text-sm font-bold transition-colors ${activeTab === 'params' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50' : 'text-slate-400 hover:text-white'}`}
                onClick={() => setActiveTab('params')}
            >
                {dict.parameters} ({device.parameters?.length || 0})
            </button>
            <button 
                className={`px-6 py-3 text-sm font-bold transition-colors ${activeTab === 'advanced' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50' : 'text-slate-400 hover:text-white'}`}
                onClick={() => setActiveTab('advanced')}
            >
                {dict.advancedAndErrors}
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'basic' && (
            <div className="space-y-4 max-w-lg mx-auto">
               <div>
                 <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{dict.deviceName}</label>
                 <input 
                    type="text" 
                    value={device.name}
                    onChange={e => setDevice({...device, name: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none"
                 />
               </div>
               <div>
                 <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{dict.type}</label>
                 <select 
                    value={device.type}
                    onChange={e => handleTypeChange(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none"
                 >
                    {categories.length > 0 ? (
                      categories.map(c => <option key={c.id} value={c.code}>{c.name} ({c.code})</option>)
                    ) : (
                      <>
                        <option value="Generator">Generator</option>
                        <option value="Cutter">Cutter</option>
                        <option value="Motor">Motor</option>
                        <option value="Sensor">Sensor</option>
                        <option value="Other">Other</option>
                      </>
                    )}
                 </select>
               </div>
               <div>
                 <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{dict.description}</label>
                 <textarea 
                    value={device.description}
                    onChange={e => setDevice({...device, description: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none h-24"
                 />
               </div>
               <div>
                 <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{dict.samplingRate}</label>
                 <input 
                    type="number" 
                    value={device.sampling_rate}
                    onChange={e => setDevice({...device, sampling_rate: parseInt(e.target.value)})}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none"
                 />
               </div>
            </div>
          )}
          
          {activeTab === 'params' && (
            <div className="space-y-3">
                 <div className="flex justify-between items-center mb-4">
                     <div className="text-sm text-slate-400">{dict.defineMetrics}</div>
                     <button onClick={addParam} className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 px-3 py-1.5 rounded border border-slate-700">
                        <Plus size={14}/> {dict.addParameter}
                     </button>
                 </div>

                 {device.parameters?.map((param, idx) => (
                    <div key={idx} className="bg-slate-800/50 p-3 rounded border border-slate-700 flex flex-wrap gap-3 items-end">
                       <div className="w-[120px]">
                          <label className="block text-[10px] text-slate-500 mb-1">{dict.paramId || 'ID (Column)'}</label>
                          <input 
                            type="text" 
                            value={param.id || ''} 
                            onChange={e => handleParamChange(idx, 'id', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white font-mono"
                            placeholder="e.g. voltage"
                          />
                       </div>
                       <div className="flex-1 min-w-[150px]">
                          <label className="block text-[10px] text-slate-500 mb-1">{dict.paramName}</label>
                          <input 
                            type="text" 
                            value={param.name} 
                            onChange={e => handleParamChange(idx, 'name', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                          />
                       </div>
                       <div className="w-[100px]">
                          <label className="block text-[10px] text-slate-500 mb-1">{dict.paramType}</label>
                          <select 
                             value={param.type}
                             onChange={e => handleParamChange(idx, 'type', e.target.value)}
                             className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                          >
                             {Object.values(ParameterType).map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                       </div>
                       <div className="w-[80px]">
                          <label className="block text-[10px] text-slate-500 mb-1">{dict.paramUnit}</label>
                          <input 
                            type="text" 
                            value={param.unit || ''} 
                            onChange={e => handleParamChange(idx, 'unit', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                          />
                       </div>
                       <div className="w-[80px]">
                          <label className="block text-[10px] text-slate-500 mb-1">{dict.paramMin}</label>
                          <input 
                            type="number" 
                            value={param.min_value} 
                            onChange={e => handleParamChange(idx, 'min_value', parseFloat(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                          />
                       </div>
                       <div className="w-[80px]">
                          <label className="block text-[10px] text-slate-500 mb-1">{dict.paramMax}</label>
                          <input 
                            type="number" 
                            value={param.max_value} 
                            onChange={e => handleParamChange(idx, 'max_value', parseFloat(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                          />
                       </div>
                       <div className="w-[120px]">
                          <label className="block text-[10px] text-slate-500 mb-1">{dict.paramGenMode}</label>
                          <select 
                             value={param.generation_mode}
                             onChange={e => handleParamChange(idx, 'generation_mode', e.target.value)}
                             className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                          >
                             {Object.values(GenerationMode).map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                       </div>
                       <button onClick={() => removeParam(idx)} className="p-1.5 text-slate-500 hover:text-red-400 mb-0.5">
                          <Trash2 size={16} />
                       </button>
                    </div>
                 ))}
                 {device.parameters?.length === 0 && (
                    <div className="text-center py-8 text-slate-600 italic">{dict.noParams}</div>
                 )}
            </div>
          )}

          {activeTab === 'advanced' && (
            <div>
                <div className="mb-4 bg-slate-800/50 p-4 rounded border border-slate-700">
                    <h4 className="text-white font-bold mb-2">{dict.globalPhysicsConfig}</h4>
                    <p className="text-xs text-slate-400 mb-4">Configure physical properties for kinematics simulation.</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] text-slate-500 mb-1">{dict.massKg}</label>
                            <input 
                                type="number" 
                                value={device.physics_config?.mass || ''}
                                onChange={e => handlePhysicsChange('mass', parseFloat(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" 
                            />
                        </div>
                        <div>
                             <label className="block text-[10px] text-slate-500 mb-1">{dict.maxVelocity}</label>
                            <input 
                                type="number" 
                                value={device.physics_config?.max_velocity || ''}
                                onChange={e => handlePhysicsChange('max_velocity', parseFloat(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" 
                            />
                        </div>
                    </div>
                </div>

                <div className="mb-4 bg-slate-800/50 p-4 rounded border border-slate-700">
                    <h4 className="text-white font-bold mb-4">{dict.logicRules}</h4>
                    <div className="space-y-2 mb-4">
                        {device.logic_rules?.map((rule, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                                <input 
                                    type="text" 
                                    value={rule.condition}
                                    onChange={e => handleRuleChange(idx, 'condition', e.target.value)}
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                                    placeholder={dict.ruleHint}
                                />
                                <span className="text-slate-500">→</span>
                                <input 
                                    type="text" 
                                    value={rule.action}
                                    onChange={e => handleRuleChange(idx, 'action', e.target.value)}
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                                    placeholder={dict.actionHint}
                                />
                                <button onClick={() => handleRemoveRule(idx)} className="p-1.5 text-slate-500 hover:text-red-400">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        {(!device.logic_rules || device.logic_rules.length === 0) && (
                            <div className="text-slate-500 italic text-sm mb-2">No rules defined.</div>
                        )}
                        <button onClick={handleAddRule} className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 px-3 py-1.5 rounded border border-slate-700">
                            <Plus size={14}/> {dict.addRule}
                        </button>
                    </div>
                </div>

                <h4 className="text-white font-bold mb-4">{dict.paramErrorInjection}</h4>
                <div className="space-y-4">
                    {device.parameters?.filter(p => p.type === ParameterType.NUMBER).map((param, idx) => (
                        <div key={idx} className="bg-slate-800/30 p-4 rounded border border-slate-700">
                            <div className="font-bold text-blue-400 mb-2">{param.name}</div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] text-slate-500 mb-1">{dict.driftRate}</label>
                                    <input 
                                        type="number" 
                                        step="0.1"
                                        value={param.error_config?.drift_rate || ''}
                                        onChange={e => handleParamConfigChange(idx, 'error_config', 'drift_rate', parseFloat(e.target.value))}
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" 
                                        placeholder="0.0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-slate-500 mb-1">{dict.anomalyProb}</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        min="0" max="1"
                                        value={param.error_config?.anomaly_probability || ''}
                                        onChange={e => handleParamConfigChange(idx, 'error_config', 'anomaly_probability', parseFloat(e.target.value))}
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" 
                                        placeholder="0.05"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-slate-500 mb-1">{dict.dropProb || 'Drop Prob'}</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        min="0" max="1"
                                        value={param.error_config?.mcar_probability || ''}
                                        onChange={e => handleParamConfigChange(idx, 'error_config', 'mcar_probability', parseFloat(e.target.value))}
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" 
                                        placeholder="0.01"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-slate-500 mb-1">{dict.noiseStdDev || 'Noise (StdDev)'}</label>
                                    <input 
                                        type="number" 
                                        step="0.1"
                                        min="0"
                                        value={param.error_config?.noise_std_dev || ''}
                                        onChange={e => handleParamConfigChange(idx, 'error_config', 'noise_std_dev', parseFloat(e.target.value))}
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" 
                                        placeholder="0.5"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                    {device.parameters?.filter(p => p.type === ParameterType.NUMBER).length === 0 && (
                        <div className="text-slate-500 italic text-sm">{dict.noNumericParams}</div>
                    )}
                </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50">
          <button onClick={onCancel} className="px-4 py-2 text-slate-400 hover:text-white font-semibold">{dict.cancel}</button>
          <button 
            onClick={() => onSave(device)}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition-colors shadow-lg shadow-blue-900/20"
          >
            <Save size={16} /> {dict.saveDevice}
          </button>
        </div>
      </div>
    </div>
  );
};
