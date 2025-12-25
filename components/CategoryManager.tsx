import React, { useState, useEffect } from 'react';
import { 
  Category, backendService, BackendParameter, ParameterType, GenerationMode, BackendDevice, SimulationModel 
} from '../services/backendService';
import { 
  Plus, Trash2, Edit, Save, X, Folder, Database, RefreshCw, AlertTriangle, Settings, Sparkles, Loader2, Play, Square 
} from 'lucide-react';
import { generateCategorySchema } from '../services/geminiService';

interface CategoryManagerProps {
  onClose: () => void;
  dict: any;
  theme?: 'dark' | 'light';
  lang?: string;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ onClose, dict, theme = 'dark', lang = 'zh' }) => {
  const isDark = theme === 'dark';
  const bgMain = isDark ? 'bg-slate-900' : 'bg-gray-50';
  const bgCard = isDark ? 'bg-slate-800' : 'bg-white';
  const bgHeader = isDark ? 'bg-slate-900' : 'bg-gray-100';
  const borderMain = isDark ? 'border-slate-700' : 'border-gray-200';
  const borderCard = isDark ? 'border-slate-700' : 'border-gray-300';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-slate-400' : 'text-gray-500';
  const textSubDarker = isDark ? 'text-slate-500' : 'text-gray-400';
  const hoverBg = isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-200';
  const buttonBg = isDark ? 'bg-slate-800' : 'bg-white';
  const tagBg = isDark ? 'bg-slate-900' : 'bg-gray-100';

  const [categories, setCategories] = useState<Category[]>([]);
  const [devices, setDevices] = useState<BackendDevice[]>([]);
  const [models, setModels] = useState<SimulationModel[]>([]);
  const [deviceCounts, setDeviceCounts] = useState<Record<string, { total: number, running: number }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [syncResult, setSyncResult] = useState<{success: string[], failed: string[]} | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [cats, devs, mods] = await Promise.all([
        backendService.fetchCategories(),
        backendService.fetchBackendDevices(),
        backendService.fetchSimulationModels()
      ]);
      setCategories(cats);
      setDevices(devs);
      setModels(mods);
      
      // Calculate counts
      const counts: Record<string, { total: number, running: number }> = {};
      cats.forEach(c => counts[c.code] = { total: 0, running: 0 }); // Initialize
      devs.forEach(d => {
        if (counts[d.type]) {
            counts[d.type].total++;
            if (d.status === 'running') {
                counts[d.type].running++;
            }
        }
      });
      setDeviceCounts(counts);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm(dict.deleteCategoryConfirm)) return;
    try {
      await backendService.deleteCategory(id);
      fetchData();
    } catch (error) {
      alert(dict.deleteFailed || 'Failed to delete category');
    }
  };

  const handleSave = async (category: Partial<Category>) => {
    try {
      // Ensure parameters is valid JSON if it's a string
      let payload = { ...category };
      if (typeof payload.parameters === 'string') {
        try {
          payload.parameters = JSON.parse(payload.parameters);
        } catch (e) {
          alert(dict.invalidJson || 'Invalid JSON for parameters');
          return;
        }
      }

      if (category.id) {
        await backendService.updateCategory(category.id, payload);
      } else {
        await backendService.createCategory(payload);
      }
      setIsFormOpen(false);
      setEditingCategory(null);
      fetchData();
    } catch (error: any) {
      alert(error.message || dict.saveFailed || 'Failed to save category');
    }
  };

  const handleSync = async () => {
    if(!confirm(dict.syncConfirm)) return;
    try {
      const result = await backendService.syncCategoriesToTDengine();
      setSyncResult(result);
      setTimeout(() => setSyncResult(null), 5000);
    } catch (error: any) {
      alert((dict.syncFailed || 'Sync failed') + ': ' + error.message);
    }
  };

  const handleToggleCategory = async (categoryCode: string) => {
    const catDevices = devices.filter(d => d.type === categoryCode);
    if (catDevices.length === 0) return;

    // Logic: If ANY stopped -> Start All Stopped. If ALL Running -> Stop All.
    const hasStopped = catDevices.some(d => d.status !== 'running');
    const isStartingAction = hasStopped;

    const targetDevices = isStartingAction 
        ? catDevices.filter(d => d.status !== 'running')
        : catDevices.filter(d => d.status === 'running');

    if (targetDevices.length === 0) return;

    const actionName = isStartingAction ? (dict.start || 'Start') : (dict.stop || 'Stop');
    const confirmMsg = isStartingAction
        ? (dict.startCategoryConfirm?.replace('{count}', targetDevices.length) || `Start ${targetDevices.length} devices in this category?`)
        : (dict.stopCategoryConfirm?.replace('{count}', targetDevices.length) || `Stop ${targetDevices.length} devices in this category?`);

    if (!confirm(confirmMsg)) return;

    setIsStarting(true);
    let successCount = 0;
    try {
      await Promise.all(targetDevices.map(async (device) => {
        try {
           await backendService.updateDeviceStatus(device.id, isStartingAction ? 'running' : 'stopped');
           successCount++;
        } catch (e) {
           console.error(`Failed to ${actionName} device ${device.id}`, e);
        }
      }));
      
      const successMsg = isStartingAction
        ? (dict.categoryStartSuccess?.replace('{count}', successCount) || `Successfully started ${successCount} devices`)
        : (dict.categoryStopSuccess?.replace('{count}', successCount) || `Successfully stopped ${successCount} devices`);

      alert(successMsg);
      fetchData(); // Refresh
    } catch (error) {
      alert(`${actionName} failed`);
    } finally {
      setIsStarting(false);
    }
  };

  const handleSyncParamsToDevices = async (cat: Category) => {
    if (!confirm(dict.syncParamsConfirm || "Sync parameters to all devices in this category? This will overwrite individual device configurations.")) return;
    
    setIsLoading(true);
    try {
        const allDevices = await backendService.fetchBackendDevices();
        const targetDevices = allDevices.filter(d => d.type === cat.code);
        
        if (targetDevices.length === 0) {
            alert("No devices to sync.");
            return;
        }

        let success = 0;
        await Promise.all(targetDevices.map(async (dev) => {
            try {
                // Update only parameters
                const payload = {
                    ...dev,
                    parameters: cat.parameters,
                    type: dev.type 
                };
                await backendService.updateDevice(dev.id, payload);
                success++;
            } catch (e) {
                console.error(`Failed to sync device ${dev.id}`, e);
            }
        }));
        
        alert(`${dict.syncSuccess || "Sync Completed"}: ${success} / ${targetDevices.length}`);
        fetchData();
    } catch (error: any) {
        alert("Sync Failed: " + error.message);
    } finally {
        setIsLoading(false);
    }
  };

  const openCreate = () => {
    setEditingCategory({
      name: '',
      code: '',
      description: '',
      parameters: [],
      physics_config: {},
      logic_rules: []
    });
    setIsFormOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditingCategory(JSON.parse(JSON.stringify(category)));
    setIsFormOpen(true);
  };

  return (
    <div className={`h-full flex flex-col rounded-lg border overflow-hidden ${bgMain} ${borderMain}`}>
      {/* Header */}
      <div className={`p-4 border-b flex justify-between items-center ${bgHeader} ${borderMain}`}>
        <h2 className={`text-xl font-bold flex items-center gap-2 ${textMain}`}>
          <Folder className="text-yellow-500" />
          {dict.categoryManagement}
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={handleSync} 
            className={`flex items-center gap-2 px-3 py-2 border rounded text-sm transition-colors ${buttonBg} ${isDark ? 'hover:bg-slate-700 text-emerald-400 border-slate-700' : 'hover:bg-gray-50 text-emerald-600 border-gray-300'}`}
            title={dict.syncSchema}
          >
            <Database size={16} />
            {dict.syncSchema}
          </button>
          <button 
            onClick={fetchData} 
            className={`p-2 rounded ${textSub} ${isDark ? 'hover:text-white hover:bg-slate-800' : 'hover:text-gray-900 hover:bg-gray-200'}`}
            title={dict.refresh}
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-bold transition-colors"
          >
            <Plus size={16} />
            {dict.newCategory}
          </button>
        </div>
      </div>

      {/* Sync Result Notification */}
      {syncResult && (
        <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border-b p-2 flex items-center justify-between px-4 text-sm`}>
           <div className="flex gap-4">
             <span className="text-emerald-400">{dict.synced}: {syncResult.success.length}</span>
             <span className="text-red-400">{dict.failed}: {syncResult.failed.length}</span>
           </div>
           {syncResult.failed.length > 0 && (
             <span className={`text-xs ${textSubDarker}`}>{dict.checkConsole}</span>
           )}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => {
            const catDevices = devices.filter(d => d.type === cat.code);
            const hasStopped = catDevices.some(d => d.status !== 'running');
            const isActionStart = hasStopped;

            return (
            <div key={cat.id} className={`${bgCard} p-4 rounded border ${borderCard} ${isDark ? 'hover:border-slate-600' : 'hover:border-gray-400'} transition-all group`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className={`font-bold text-lg ${textMain}`}>{cat.name}</div>
                  <div className={`text-xs ${textSubDarker} font-mono px-1.5 py-0.5 ${tagBg} rounded inline-block mt-1`}>{cat.code}</div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleToggleCategory(cat.code)}
                    disabled={isStarting || catDevices.length === 0}
                    className={`p-1.5 rounded disabled:opacity-50 ${
                        isActionStart 
                        ? `text-emerald-500 ${isDark ? 'hover:bg-emerald-900/30' : 'hover:bg-emerald-100'}`
                        : `text-red-500 ${isDark ? 'hover:bg-red-900/30' : 'hover:bg-red-100'}`
                    }`}
                    title={isActionStart ? (dict.startAllDevices || "Start All Devices") : (dict.stopAllDevices || "Stop All Devices")}
                  >
                    {isStarting ? <Loader2 size={16} className="animate-spin" /> : (
                        isActionStart ? <Play size={16} fill="currentColor" /> : <Square size={16} fill="currentColor" />
                    )}
                  </button>
                  <button 
                    onClick={() => handleSyncParamsToDevices(cat)}
                    className={`p-1.5 text-orange-400 rounded ${isDark ? 'hover:bg-orange-900/30' : 'hover:bg-orange-100'}`}
                    title={dict.syncParamsToDevices || "Sync Parameters to Devices"}
                  >
                    <RefreshCw size={16} />
                  </button>
                  <button onClick={() => openEdit(cat)} className={`p-1.5 text-blue-400 rounded ${isDark ? 'hover:bg-blue-900/30' : 'hover:bg-blue-100'}`}>
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(cat.id)} className={`p-1.5 text-red-400 rounded ${isDark ? 'hover:bg-red-900/30' : 'hover:bg-red-100'}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p className={`text-sm ${textSub} mb-3 line-clamp-2`}>{cat.description || dict.noDescription}</p>
              <div className={`text-xs ${textSubDarker} ${isDark ? 'bg-slate-900/50' : 'bg-gray-100'} p-2 rounded space-y-1`}>
                <div className="flex justify-between">
                   <span>{dict.parameters}:</span>
                   <span className={`${isDark ? 'text-slate-300' : 'text-gray-700'} font-mono`}>{cat.parameters?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                   <span>{dict.deviceCount || 'Devices'}:</span>
                   <div className="flex items-center gap-2">
                       {deviceCounts[cat.code]?.running > 0 && (
                           <span className="text-emerald-500 font-mono font-bold flex items-center gap-1">
                               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                               {deviceCounts[cat.code]?.running}
                           </span>
                       )}
                       <span className={`${isDark ? 'text-slate-500' : 'text-slate-400'} font-mono`}>
                           / {deviceCounts[cat.code]?.total || 0}
                       </span>
                   </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* Modal Form */}
      {isFormOpen && editingCategory && (
        <CategoryForm 
          category={editingCategory} 
          onSave={handleSave} 
          onCancel={() => setIsFormOpen(false)}
          dict={dict}
          theme={theme}
          lang={lang}
          availableModels={models}
        />
      )}
    </div>
  );
};

// --- Category Form Component ---

interface CategoryFormProps {
  category: Partial<Category>;
  onSave: (category: Partial<Category>) => void;
  onCancel: () => void;
  dict: any;
  theme?: 'dark' | 'light';
  lang?: string;
  availableModels: SimulationModel[];
}

const CategoryForm: React.FC<CategoryFormProps> = ({ category: initialCategory, onSave, onCancel, dict, theme = 'dark', lang = 'zh', availableModels }) => {
  const isDark = theme === 'dark';
  const bgModal = isDark ? 'bg-slate-900' : 'bg-white';
  const bgHeader = isDark ? 'border-slate-800' : 'border-gray-200';
  const borderMain = isDark ? 'border-slate-700' : 'border-gray-300';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-slate-400' : 'text-gray-500';
  const textSubDarker = isDark ? 'text-slate-500' : 'text-gray-400';
  const inputBg = isDark ? 'bg-slate-800' : 'bg-gray-50';
  const inputBorder = isDark ? 'border-slate-700' : 'border-gray-300';
  const tabActive = isDark ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50' : 'text-blue-600 border-b-2 border-blue-600 bg-blue-50';
  const tabInactive = isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900';

  // Initialize with proper parameters array
  const getInitialCategory = () => {
    let params = initialCategory.parameters;
    if (!params) {
      params = [];
    } else if (typeof params === 'string') {
      try {
        const parsed = JSON.parse(params);
        params = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        params = [];
      }
    }
    return { ...initialCategory, parameters: params };
  };

  const [category, setCategory] = useState(getInitialCategory);
  const [activeTab, setActiveTab] = useState<'basic' | 'params' | 'advanced'>('basic');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAiGenerate = async () => {
    if (!category.description) {
        alert("Please enter a description first to generate schema.");
        return;
    }
    
    setIsGenerating(true);
    try {
        const generated = await generateCategorySchema(category.description, lang);
        console.log("AI Generated Schema:", generated);

        if (!generated || Object.keys(generated).length === 0) {
            throw new Error("Received empty response from AI");
        }
        
        // Map AI response to BackendParameter structure
        const mappedParams = (generated.parameters || [])
            .filter((p: any) => {
                const id = (p.id || '').toLowerCase();
                return id !== 'ts' && id !== 'timestamp' && id !== 'device_code';
            })
            .map((p: any) => {
            let type = ParameterType.STRING;
            const t = (p.type || '').toUpperCase();
            if (t === 'INT' || t === 'FLOAT' || t === 'NUMBER' || t === 'DOUBLE') type = ParameterType.NUMBER;
            else if (t === 'BOOL' || t === 'BOOLEAN') type = ParameterType.BOOLEAN;
            
            return {
                id: p.id || p.name?.toLowerCase().replace(/\s+/g, '_'),
                name: p.name,
                type,
                unit: p.unit || '',
                min_value: p.min_value,
                max_value: p.max_value,
                generation_mode: GenerationMode.RANDOM,
                generation_params: {},
                is_tag: !!p.is_tag
            } as BackendParameter;
        });

        if (mappedParams.length === 0) {
            console.warn("No parameters generated");
        }

        // Merge generated data
        setCategory(prev => ({
            ...prev,
            name: generated.name || prev.name,
            code: generated.code || prev.code,
            parameters: mappedParams,
            physics_config: generated.physics_config || prev.physics_config || {},
            logic_rules: generated.logic_rules || prev.logic_rules || []
        }));
        
        // Switch to params tab to show result
        setActiveTab('params');
    } catch (error: any) {
        console.error("AI Generation Failed:", error);
        alert("AI Generation Failed: " + error.message);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleParamChange = (index: number, field: keyof BackendParameter, value: any) => {
    const newParams = [...(category.parameters as BackendParameter[] || [])];
    newParams[index] = { ...newParams[index], [field]: value };
    setCategory({ ...category, parameters: newParams });
  };

  const handleParamConfigChange = (index: number, configType: 'error_config', key: string, value: any) => {
    const newParams = [...(category.parameters as BackendParameter[] || [])];
    const currentConfig = newParams[index][configType] || {};
    
    if (value === '' || value === null) {
        delete currentConfig[key];
    } else {
        currentConfig[key] = value;
    }
    
    newParams[index] = { ...newParams[index], [configType]: { ...currentConfig } };
    setCategory({ ...category, parameters: newParams });
  };

  const handlePhysicsChange = (key: string, value: number) => {
      setCategory({ 
          ...category, 
          physics_config: { ...(category.physics_config || {}), [key]: value } 
      });
  };

  const handleAddRule = () => {
      const newRules = [...(category.logic_rules || []), { condition: '', action: '' }];
      setCategory({ ...category, logic_rules: newRules });
  };

  const handleRuleChange = (index: number, field: 'condition' | 'action', value: string) => {
      const newRules = [...(category.logic_rules || [])];
      newRules[index] = { ...newRules[index], [field]: value };
      setCategory({ ...category, logic_rules: newRules });
  };

  const handleRemoveRule = (index: number) => {
      const newRules = [...(category.logic_rules || [])];
      newRules.splice(index, 1);
      setCategory({ ...category, logic_rules: newRules });
  };

  const addParam = () => {
    const id = 'param_' + Math.random().toString(36).substr(2, 9);
    setCategory({
      ...category,
      parameters: [
        ...(category.parameters as BackendParameter[] || []),
        {
          id: id,
          name: 'New Param',
          type: ParameterType.NUMBER,
          unit: '',
          min_value: 0,
          max_value: 100,
          generation_mode: GenerationMode.RANDOM,
          generation_params: {},
          is_tag: false
        }
      ]
    });
  };

  const removeParam = (index: number) => {
    const newParams = [...(category.parameters as BackendParameter[] || [])];
    newParams.splice(index, 1);
    setCategory({ ...category, parameters: newParams });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className={`${bgModal} border ${borderMain} rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl`}>
        <div className={`p-4 border-b ${bgHeader} flex justify-between items-center`}>
          <h3 className={`text-lg font-bold ${textMain}`}>
            {category.id ? dict.editCategory : dict.createCategory}
          </h3>
          <button onClick={onCancel} className={`${textSubDarker} ${isDark ? 'hover:text-white' : 'hover:text-gray-900'}`}><X size={20}/></button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${bgHeader}`}>
            <button 
                className={`px-6 py-3 text-sm font-bold transition-colors ${activeTab === 'basic' ? tabActive : tabInactive}`}
                onClick={() => setActiveTab('basic')}
            >
                {dict.basicInfo || 'Basic Info'}
            </button>
            <button 
                className={`px-6 py-3 text-sm font-bold transition-colors ${activeTab === 'params' ? tabActive : tabInactive}`}
                onClick={() => setActiveTab('params')}
            >
                {dict.parameters} ({category.parameters?.length || 0})
            </button>
            <button 
                className={`px-6 py-3 text-sm font-bold transition-colors ${activeTab === 'advanced' ? tabActive : tabInactive}`}
                onClick={() => setActiveTab('advanced')}
            >
                {dict.advancedAndErrors || 'Advanced'}
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
            {activeTab === 'basic' && (
                <div className="space-y-4 max-w-lg mx-auto">
                   <div>
                     <label className={`block text-xs uppercase ${textSubDarker} font-bold mb-1`}>{dict.categoryName}</label>
                     <input 
                        type="text" 
                        value={category.name}
                        onChange={e => setCategory({...category, name: e.target.value})}
                        className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain} focus:border-blue-500 outline-none`}
                     />
                   </div>
                   <div>
                     <label className={`block text-xs uppercase ${textSubDarker} font-bold mb-1`}>{dict.categoryCode}</label>
                     <input 
                        type="text" 
                        value={category.code}
                        onChange={e => setCategory({...category, code: e.target.value})}
                        className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain} focus:border-blue-500 outline-none font-mono`}
                        placeholder="e.g., sensor_v1"
                     />
                   </div>
                   <div>
                     <label className={`block text-xs uppercase ${textSubDarker} font-bold mb-1`}>{dict.visualModel || 'Visual Model'}</label>
                     <select 
                        value={category.visual_model || 'Generic'}
                        onChange={e => setCategory({...category, visual_model: e.target.value})}
                        className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain} focus:border-blue-500 outline-none`}
                     >
                        <option value="Generic">Generic (Server Rack)</option>
                        {availableModels
                            .filter(m => m.type !== 'Generic') // Avoid duplicates if Generic is already hardcoded or handled
                            .map(model => (
                                <option key={model.id} value={model.type}>
                                    {model.name}
                                </option>
                        ))}
                     </select>
                     <p className={`text-[10px] ${textSubDarker} mt-1`}>
                        {dict.visualModelHint || "Selects the 3D model used in the Digital Twin view. Models are managed in Visual Model Config."}
                     </p>
                   </div>
                   <div>
                     <label className={`block text-xs uppercase ${textSubDarker} font-bold mb-1`}>{dict.description}</label>
                     <textarea 
                        value={category.description}
                        onChange={e => setCategory({...category, description: e.target.value})}
                        className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain} focus:border-blue-500 outline-none h-24`}
                        placeholder="Describe the device to auto-generate parameters..."
                     />
                     <div className="mt-2 flex justify-end">
                        <button 
                            onClick={handleAiGenerate}
                            disabled={isGenerating || !category.description}
                            className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-bold transition-colors ${
                                !category.description 
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
                                 : 'bg-purple-600 hover:bg-purple-500 text-white'
                             }`}
                         >
                             {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                             {dict.aiAutoFill || 'AI Auto-Fill Schema'}
                         </button>
                      </div>
                   </div>
                </div>
            )}

            {activeTab === 'params' && (
                <div>
                   <div className="flex justify-between items-center mb-4">
                     <div className={`text-sm ${textSub}`}>{dict.defineMetrics || 'Define Parameters'}</div>
                     <button onClick={addParam} className={`flex items-center gap-1 text-xs ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-gray-100'} text-blue-400 px-3 py-1.5 rounded border ${borderMain}`}>
                        <Plus size={14}/> {dict.addParameter || 'Add Parameter'}
                     </button>
                   </div>
                   
                   <div className="space-y-3">
                     {/* System Timestamp Parameter (Read-only) */}
                     <div className={`p-3 rounded border ${borderMain} ${isDark ? 'bg-slate-900/30' : 'bg-gray-50'} flex flex-wrap gap-3 items-end opacity-70`}>
                        <div className="w-[90px]">
                            <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramIsTag || 'Field'}</label>
                            <div className={`w-full border ${inputBorder} rounded px-2 py-1 text-sm font-bold ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
                                {dict.tagColumn || 'Column'}
                            </div>
                        </div>
                        <div className="w-[120px]">
                            <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramId || 'ID'}</label>
                            <input type="text" value="ts" disabled className={`w-full ${isDark ? 'bg-slate-900' : 'bg-gray-50'} border ${inputBorder} rounded px-2 py-1 text-sm ${textSubDarker} font-mono`} />
                        </div>
                        <div className="w-[140px]">
                            <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramName || 'Name'}</label>
                            <input type="text" value={dict.startTime || "Timestamp"} disabled className={`w-full ${isDark ? 'bg-slate-900' : 'bg-gray-50'} border ${inputBorder} rounded px-2 py-1 text-sm ${textSubDarker}`} />
                        </div>
                        <div className="w-[100px]">
                            <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramType || 'Data Type'}</label>
                            <div className={`w-full ${isDark ? 'bg-slate-900' : 'bg-gray-50'} border ${inputBorder} rounded px-2 py-1 text-sm ${textSubDarker}`}>
                                Timestamp
                            </div>
                        </div>
                        <div className="w-[70px]">
                            <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramUnit || 'Unit'}</label>
                            <input type="text" value="ms" disabled className={`w-full ${isDark ? 'bg-slate-900' : 'bg-gray-50'} border ${inputBorder} rounded px-2 py-1 text-sm ${textSubDarker}`} />
                        </div>
                        <div className="flex-1"></div>
                        <div className="w-[30px] flex justify-center pb-2">
                            <Settings size={16} className="text-slate-600" />
                        </div>
                     </div>

                     {/* System Device Code Parameter (Read-only) */}
                     <div className={`p-3 rounded border ${borderMain} ${isDark ? 'bg-slate-900/30' : 'bg-gray-50'} flex flex-wrap gap-3 items-end opacity-70`}>
                        <div className="w-[90px]">
                            <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramIsTag || 'Field'}</label>
                            <div className={`w-full border ${inputBorder} rounded px-2 py-1 text-sm font-bold ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
                                {dict.tagTag || 'Tag'}
                            </div>
                        </div>
                        <div className="w-[120px]">
                            <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramId || 'ID'}</label>
                            <input type="text" value="device_code" disabled className={`w-full ${isDark ? 'bg-slate-900' : 'bg-gray-50'} border ${inputBorder} rounded px-2 py-1 text-sm ${textSubDarker} font-mono`} />
                        </div>
                        <div className="w-[140px]">
                            <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramName || 'Name'}</label>
                            <input type="text" value="Device Code" disabled className={`w-full ${isDark ? 'bg-slate-900' : 'bg-gray-50'} border ${inputBorder} rounded px-2 py-1 text-sm ${textSubDarker}`} />
                        </div>
                        <div className="w-[100px]">
                            <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramType || 'Data Type'}</label>
                            <div className={`w-full ${isDark ? 'bg-slate-900' : 'bg-gray-50'} border ${inputBorder} rounded px-2 py-1 text-sm ${textSubDarker}`}>
                                STRING
                            </div>
                        </div>
                         <div className="flex-1 min-w-[150px]">
                             <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.defaultValue || 'Default Value'}</label>
                             <input 
                               type="text" 
                               value="Auto-generated (UUID)" 
                               disabled
                               className={`w-full ${isDark ? 'bg-slate-900' : 'bg-gray-50'} border ${inputBorder} rounded px-2 py-1 text-sm ${textSubDarker}`}
                             />
                          </div>
                        <div className="w-[30px] flex justify-center pb-2">
                            <Settings size={16} className="text-slate-600" />
                        </div>
                     </div>

                     {(category.parameters as BackendParameter[])?.filter(p => p.id !== 'device_code').map((param, idx) => {
                        // Adjust index because we filtered
                        const realIdx = (category.parameters as BackendParameter[]).findIndex(p => p === param);
                        
                        return (
                        <div key={realIdx} className={`p-3 rounded border flex flex-wrap gap-3 items-end ${param.is_tag ? (isDark ? 'bg-amber-900/20 border-amber-700/50' : 'bg-amber-50 border-amber-200') : (isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50 border-gray-200')}`}>
                           {/* 字段类型选择 - 放在最前面 */}
                           <div className="w-[90px]">
                              <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramIsTag || 'Field'}</label>
                              <select 
                                 value={param.is_tag ? 'tag' : 'column'}
                                 onChange={e => handleParamChange(idx, 'is_tag', e.target.value === 'tag')}
                                 className={`w-full border rounded px-2 py-1 text-sm font-bold ${param.is_tag ? (isDark ? 'bg-amber-900/50 border-amber-600 text-amber-300' : 'bg-amber-100 border-amber-300 text-amber-700') : (isDark ? 'bg-blue-900/50 border-blue-600 text-blue-300' : 'bg-blue-100 border-blue-300 text-blue-700')}`}
                              >
                                 <option value="column">{dict.tagColumn || 'Column'}</option>
                                 <option value="tag">{dict.tagTag || 'Tag'}</option>
                              </select>
                           </div>
                           {/* 通用字段：ID、名称、数据类型 */}
                           <div className="w-[120px]">
                              <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramId || 'ID'}</label>
                              <input 
                                type="text" 
                                value={param.id || ''} 
                                onChange={e => handleParamChange(realIdx, 'id', e.target.value)}
                                className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textMain} font-mono`}
                                placeholder="e.g. voltage"
                              />
                           </div>
                           <div className="w-[140px]">
                              <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramName || 'Name'}</label>
                              <input 
                                type="text" 
                                value={param.name} 
                                onChange={e => handleParamChange(realIdx, 'name', e.target.value)}
                                className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textMain}`}
                              />
                           </div>
                           <div className="w-[100px]">
                              <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramType || 'Data Type'}</label>
                              <select 
                                 value={param.type}
                                 onChange={e => handleParamChange(realIdx, 'type', e.target.value)}
                                 className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textMain}`}
                              >
                                 {Object.values(ParameterType).map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                           </div>
                           
                           {/* Tag 类型：只显示默认值 */}
                           {param.is_tag && (
                              <div className="flex-1 min-w-[150px]">
                                 <label className="block text-[10px] text-amber-400 mb-1">{dict.defaultValue || 'Default Value'}</label>
                                 <input 
                                   type="text" 
                                   value={param.default_value || ''} 
                                   onChange={e => handleParamChange(realIdx, 'default_value', e.target.value)}
                                   className={`w-full ${inputBg} border ${isDark ? 'border-amber-700/50' : 'border-amber-200'} rounded px-2 py-1 text-sm ${textMain}`}
                                   placeholder={dict.tagDefaultHint || 'Tag value for subtable'}
                                 />
                              </div>
                           )}
                           
                           {/* Column 类型：显示单位、最小值、最大值、生成模式 */}
                           {!param.is_tag && (
                              <>
                                 <div className="w-[70px]">
                                    <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramUnit || 'Unit'}</label>
                                    <input 
                                      type="text" 
                                      value={param.unit || ''} 
                                      onChange={e => handleParamChange(realIdx, 'unit', e.target.value)}
                                      className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textMain}`}
                                    />
                                 </div>
                                 <div className="w-[70px]">
                                    <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramMin || 'Min'}</label>
                                    <input 
                                      type="number" 
                                      value={param.min_value} 
                                      onChange={e => handleParamChange(realIdx, 'min_value', parseFloat(e.target.value))}
                                      className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textMain}`}
                                    />
                                 </div>
                                 <div className="w-[70px]">
                                    <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramMax || 'Max'}</label>
                                    <input 
                                      type="number" 
                                      value={param.max_value} 
                                      onChange={e => handleParamChange(realIdx, 'max_value', parseFloat(e.target.value))}
                                      className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textMain}`}
                                    />
                                 </div>
                                 <div className="w-[110px]">
                                    <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramGenMode || 'Mode'}</label>
                                    <select 
                                       value={param.generation_mode}
                                       onChange={e => handleParamChange(realIdx, 'generation_mode', e.target.value)}
                                       className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textMain}`}
                                    >
                                       {Object.values(GenerationMode).map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                 </div>
                                 
                                 {/* Integer Checkbox for Number Type */}
                                 {param.type === ParameterType.NUMBER && (
                                     <div className="flex flex-col items-center justify-end pb-2 px-1">
                                        <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramIsInt || 'Int'}</label>
                                        <input 
                                            type="checkbox"
                                            checked={param.is_integer || false}
                                            onChange={e => handleParamChange(realIdx, 'is_integer', e.target.checked)}
                                            className="h-4 w-4"
                                            title="Integer Only"
                                        />
                                     </div>
                                 )}
                              </>
                           )}
                           
                           <button onClick={() => removeParam(realIdx)} className="p-1.5 text-slate-500 hover:text-red-400 mb-0.5">
                              <Trash2 size={16} />
                           </button>
                        </div>
                     )})}
                     {(!category.parameters || category.parameters.length === 0) && (
                        <div className={`text-center py-8 ${textSubDarker} italic`}>{dict.noParams || 'No parameters defined'}</div>
                     )}
                   </div>
                </div>
            )}

            {activeTab === 'advanced' && (
            <div>
                <div className={`mb-4 ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'} p-4 rounded border ${borderMain}`}>
                    <h4 className={`${textMain} font-bold mb-2`}>{dict.globalPhysicsConfig || 'Physics Config'}</h4>
                    <p className={`text-xs ${textSub} mb-4`}>Configure physical properties for kinematics simulation.</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.massKg || 'Mass (kg)'}</label>
                            <input 
                                type="number" 
                                value={category.physics_config?.mass || ''}
                                onChange={e => handlePhysicsChange('mass', parseFloat(e.target.value))}
                                className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textMain}`} 
                            />
                        </div>
                        <div>
                             <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.maxVelocity || 'Max Velocity'}</label>
                            <input 
                                type="number" 
                                value={category.physics_config?.max_velocity || ''}
                                onChange={e => handlePhysicsChange('max_velocity', parseFloat(e.target.value))}
                                className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textMain}`} 
                            />
                        </div>
                    </div>
                </div>

                <div className={`mb-4 ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'} p-4 rounded border ${borderMain}`}>
                    <h4 className={`${textMain} font-bold mb-4`}>{dict.logicRules || 'Logic Rules'}</h4>
                    <div className="space-y-2 mb-4">
                        {category.logic_rules?.map((rule, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                                <input 
                                    type="text" 
                                    value={rule.condition}
                                    onChange={e => handleRuleChange(idx, 'condition', e.target.value)}
                                    className={`flex-1 ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textMain}`}
                                    placeholder={dict.ruleHint || 'Condition'}
                                />
                                <span className={textSubDarker}>→</span>
                                <input 
                                    type="text" 
                                    value={rule.action}
                                    onChange={e => handleRuleChange(idx, 'action', e.target.value)}
                                    className={`flex-1 ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textMain}`}
                                    placeholder={dict.actionHint || 'Action'}
                                />
                                <button onClick={() => handleRemoveRule(idx)} className="p-1.5 text-slate-500 hover:text-red-400">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        {(!category.logic_rules || category.logic_rules.length === 0) && (
                            <div className={`${textSubDarker} italic text-sm mb-2`}>No rules defined.</div>
                        )}
                        <button onClick={handleAddRule} className={`flex items-center gap-1 text-xs ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-gray-100'} text-blue-400 px-3 py-1.5 rounded border ${borderMain}`}>
                            <Plus size={14}/> {dict.addRule || 'Add Rule'}
                        </button>
                    </div>
                </div>

                <h4 className={`${textMain} font-bold mb-4`}>{dict.paramErrorInjection || 'Error Injection'}</h4>
                <div className="space-y-4">
                    {(category.parameters as BackendParameter[])?.filter(p => p.type === ParameterType.NUMBER).map((param, idx) => (
                        <div key={idx} className={`${isDark ? 'bg-slate-800/30' : 'bg-gray-50'} p-4 rounded border ${borderMain}`}>
                            <div className="font-bold text-blue-400 mb-2">{param.name}</div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.driftRate || 'Drift Rate'}</label>
                                    <input 
                                        type="number" 
                                        step="0.1"
                                        value={param.error_config?.drift_rate || ''}
                                        onChange={e => handleParamConfigChange(idx, 'error_config', 'drift_rate', parseFloat(e.target.value))}
                                        className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textMain}`} 
                                        placeholder="0.0"
                                    />
                                </div>
                                <div>
                                    <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.anomalyProb || 'Anomaly Prob'}</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        min="0" max="1"
                                        value={param.error_config?.anomaly_probability || ''}
                                        onChange={e => handleParamConfigChange(idx, 'error_config', 'anomaly_probability', parseFloat(e.target.value))}
                                        className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textMain}`} 
                                        placeholder="0.05"
                                    />
                                </div>
                                <div>
                                    <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.dropProb || 'Drop Prob'}</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        min="0" max="1"
                                        value={param.error_config?.mcar_probability || ''}
                                        onChange={e => handleParamConfigChange(idx, 'error_config', 'mcar_probability', parseFloat(e.target.value))}
                                        className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textMain}`} 
                                        placeholder="0.01"
                                    />
                                </div>
                                <div>
                                    <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.noiseStdDev || 'Noise (StdDev)'}</label>
                                    <input 
                                        type="number" 
                                        step="0.1"
                                        min="0"
                                        value={param.error_config?.noise_std_dev || ''}
                                        onChange={e => handleParamConfigChange(idx, 'error_config', 'noise_std_dev', parseFloat(e.target.value))}
                                        className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textMain}`} 
                                        placeholder="0.5"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                    {(category.parameters as BackendParameter[])?.filter(p => p.type === ParameterType.NUMBER).length === 0 && (
                        <div className={`${textSubDarker} italic text-sm`}>{dict.noNumericParams || 'No numeric parameters'}</div>
                    )}
                </div>
            </div>
            )}
        </div>

        <div className={`p-4 border-t ${borderMain} flex justify-end gap-3 ${isDark ? 'bg-slate-900/50' : 'bg-gray-100'}`}>
          <button onClick={onCancel} className={`px-4 py-2 ${textSub} ${isDark ? 'hover:text-white' : 'hover:text-gray-900'} font-semibold`}>{dict.cancel}</button>
          <button 
            onClick={() => onSave(category)}
            disabled={!category.name || !category.code}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} /> {dict.saveCategory}
          </button>
        </div>
      </div>
    </div>
  );
};
