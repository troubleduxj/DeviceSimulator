import React, { useState, useEffect } from 'react';
import { 
  Category, backendService, BackendParameter, ParameterType, GenerationMode 
} from '../services/backendService';
import { 
  Plus, Trash2, Edit, Save, X, Folder, Database, RefreshCw, AlertTriangle, Settings 
} from 'lucide-react';

interface CategoryManagerProps {
  onClose: () => void;
  dict: any;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ onClose, dict }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [deviceCounts, setDeviceCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [syncResult, setSyncResult] = useState<{success: string[], failed: string[]} | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [cats, devs] = await Promise.all([
        backendService.fetchCategories(),
        backendService.fetchBackendDevices()
      ]);
      setCategories(cats);
      
      // Calculate counts
      const counts: Record<string, number> = {};
      cats.forEach(c => counts[c.code] = 0); // Initialize
      devs.forEach(d => {
        if (counts[d.type] !== undefined) {
            counts[d.type]++;
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
    <div className="h-full flex flex-col bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Folder className="text-yellow-500" />
          {dict.categoryManagement}
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={handleSync} 
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded text-sm transition-colors"
            title={dict.syncSchema}
          >
            <Database size={16} />
            {dict.syncSchema}
          </button>
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
            {dict.newCategory}
          </button>
        </div>
      </div>

      {/* Sync Result Notification */}
      {syncResult && (
        <div className="bg-slate-800 border-b border-slate-700 p-2 flex items-center justify-between px-4 text-sm">
           <div className="flex gap-4">
             <span className="text-emerald-400">{dict.synced}: {syncResult.success.length}</span>
             <span className="text-red-400">{dict.failed}: {syncResult.failed.length}</span>
           </div>
           {syncResult.failed.length > 0 && (
             <span className="text-xs text-slate-500">{dict.checkConsole}</span>
           )}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => (
            <div key={cat.id} className="bg-slate-800 p-4 rounded border border-slate-700 hover:border-slate-600 transition-all group">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold text-lg text-white">{cat.name}</div>
                  <div className="text-xs text-slate-500 font-mono px-1.5 py-0.5 bg-slate-900 rounded inline-block mt-1">{cat.code}</div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(cat)} className="p-1.5 text-blue-400 hover:bg-blue-900/30 rounded">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-red-400 hover:bg-red-900/30 rounded">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-3 line-clamp-2">{cat.description || dict.noDescription}</p>
              <div className="text-xs text-slate-500 bg-slate-900/50 p-2 rounded space-y-1">
                <div className="flex justify-between">
                   <span>{dict.parameters}:</span>
                   <span className="text-slate-300 font-mono">{cat.parameters?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                   <span>{dict.deviceCount || 'Devices'}:</span>
                   <span className="text-blue-400 font-mono font-bold">{deviceCounts[cat.code] || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Form */}
      {isFormOpen && editingCategory && (
        <CategoryForm 
          category={editingCategory} 
          onSave={handleSave} 
          onCancel={() => setIsFormOpen(false)}
          dict={dict}
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
}

const CategoryForm: React.FC<CategoryFormProps> = ({ category: initialCategory, onSave, onCancel, dict }) => {
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
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">
            {category.id ? dict.editCategory : dict.createCategory}
          </h3>
          <button onClick={onCancel} className="text-slate-500 hover:text-white"><X size={20}/></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800">
            <button 
                className={`px-6 py-3 text-sm font-bold transition-colors ${activeTab === 'basic' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50' : 'text-slate-400 hover:text-white'}`}
                onClick={() => setActiveTab('basic')}
            >
                {dict.basicInfo || 'Basic Info'}
            </button>
            <button 
                className={`px-6 py-3 text-sm font-bold transition-colors ${activeTab === 'params' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50' : 'text-slate-400 hover:text-white'}`}
                onClick={() => setActiveTab('params')}
            >
                {dict.parameters} ({category.parameters?.length || 0})
            </button>
            <button 
                className={`px-6 py-3 text-sm font-bold transition-colors ${activeTab === 'advanced' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50' : 'text-slate-400 hover:text-white'}`}
                onClick={() => setActiveTab('advanced')}
            >
                {dict.advancedAndErrors || 'Advanced'}
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
            {activeTab === 'basic' && (
                <div className="space-y-4 max-w-lg mx-auto">
                   <div>
                     <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{dict.categoryName}</label>
                     <input 
                        type="text" 
                        value={category.name}
                        onChange={e => setCategory({...category, name: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none"
                     />
                   </div>
                   <div>
                     <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{dict.categoryCode}</label>
                     <input 
                        type="text" 
                        value={category.code}
                        onChange={e => setCategory({...category, code: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none font-mono"
                        placeholder="e.g., sensor_v1"
                     />
                   </div>
                   <div>
                     <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{dict.visualModel || 'Visual Model'}</label>
                     <select 
                        value={category.visual_model || 'Generic'}
                        onChange={e => setCategory({...category, visual_model: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none"
                     >
                        <option value="Generic">Generic (Server Rack)</option>
                        <option value="Generator">Generator</option>
                        <option value="Cutter">Cutter (CNC)</option>
                     </select>
                   </div>
                   <div>
                     <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{dict.description}</label>
                     <textarea 
                        value={category.description}
                        onChange={e => setCategory({...category, description: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none h-24"
                     />
                   </div>
                </div>
            )}

            {activeTab === 'params' && (
                <div>
                   <div className="flex justify-between items-center mb-4">
                     <div className="text-sm text-slate-400">{dict.defineMetrics || 'Define Parameters'}</div>
                     <button onClick={addParam} className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 px-3 py-1.5 rounded border border-slate-700">
                        <Plus size={14}/> {dict.addParameter || 'Add Parameter'}
                     </button>
                   </div>
                   
                   <div className="space-y-3">
                     {/* System Timestamp Parameter (Read-only) */}
                     <div className="p-3 rounded border border-slate-700 bg-slate-900/30 flex flex-wrap gap-3 items-end opacity-70">
                        <div className="w-[90px]">
                            <label className="block text-[10px] text-slate-500 mb-1">{dict.paramIsTag || 'Field'}</label>
                            <div className="w-full border border-slate-700 rounded px-2 py-1 text-sm font-bold bg-slate-800 text-slate-400">
                                {dict.tagColumn || 'Column'}
                            </div>
                        </div>
                        <div className="w-[120px]">
                            <label className="block text-[10px] text-slate-500 mb-1">{dict.paramId || 'ID'}</label>
                            <input type="text" value="ts" disabled className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-500 font-mono" />
                        </div>
                        <div className="w-[140px]">
                            <label className="block text-[10px] text-slate-500 mb-1">{dict.paramName || 'Name'}</label>
                            <input type="text" value={dict.startTime || "Timestamp"} disabled className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-500" />
                        </div>
                        <div className="w-[100px]">
                            <label className="block text-[10px] text-slate-500 mb-1">{dict.paramType || 'Data Type'}</label>
                            <div className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-500">
                                Timestamp
                            </div>
                        </div>
                        <div className="w-[70px]">
                            <label className="block text-[10px] text-slate-500 mb-1">{dict.paramUnit || 'Unit'}</label>
                            <input type="text" value="ms" disabled className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-500" />
                        </div>
                        <div className="flex-1"></div>
                        <div className="w-[30px] flex justify-center pb-2">
                            <Settings size={16} className="text-slate-600" />
                        </div>
                     </div>

                     {/* System Device Code Parameter (Read-only) */}
                     <div className="p-3 rounded border border-slate-700 bg-slate-900/30 flex flex-wrap gap-3 items-end opacity-70">
                        <div className="w-[90px]">
                            <label className="block text-[10px] text-slate-500 mb-1">{dict.paramIsTag || 'Field'}</label>
                            <div className="w-full border border-slate-700 rounded px-2 py-1 text-sm font-bold bg-slate-800 text-slate-400">
                                {dict.tagTag || 'Tag'}
                            </div>
                        </div>
                        <div className="w-[120px]">
                            <label className="block text-[10px] text-slate-500 mb-1">{dict.paramId || 'ID'}</label>
                            <input type="text" value="device_code" disabled className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-500 font-mono" />
                        </div>
                        <div className="w-[140px]">
                            <label className="block text-[10px] text-slate-500 mb-1">{dict.paramName || 'Name'}</label>
                            <input type="text" value="Device Code" disabled className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-500" />
                        </div>
                        <div className="w-[100px]">
                            <label className="block text-[10px] text-slate-500 mb-1">{dict.paramType || 'Data Type'}</label>
                            <div className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-500">
                                STRING
                            </div>
                        </div>
                         <div className="flex-1 min-w-[150px]">
                             <label className="block text-[10px] text-slate-500 mb-1">{dict.defaultValue || 'Default Value'}</label>
                             <input 
                               type="text" 
                               value="Auto-generated (UUID)" 
                               disabled
                               className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-500"
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
                        <div key={realIdx} className={`p-3 rounded border flex flex-wrap gap-3 items-end ${param.is_tag ? 'bg-amber-900/20 border-amber-700/50' : 'bg-slate-800/50 border-slate-700'}`}>
                           {/* 字段类型选择 - 放在最前面 */}
                           <div className="w-[90px]">
                              <label className="block text-[10px] text-slate-500 mb-1">{dict.paramIsTag || 'Field'}</label>
                              <select 
                                 value={param.is_tag ? 'tag' : 'column'}
                                 onChange={e => handleParamChange(idx, 'is_tag', e.target.value === 'tag')}
                                 className={`w-full border rounded px-2 py-1 text-sm font-bold ${param.is_tag ? 'bg-amber-900/50 border-amber-600 text-amber-300' : 'bg-blue-900/50 border-blue-600 text-blue-300'}`}
                              >
                                 <option value="column">{dict.tagColumn || 'Column'}</option>
                                 <option value="tag">{dict.tagTag || 'Tag'}</option>
                              </select>
                           </div>
                           {/* 通用字段：ID、名称、数据类型 */}
                           <div className="w-[120px]">
                              <label className="block text-[10px] text-slate-500 mb-1">{dict.paramId || 'ID'}</label>
                              <input 
                                type="text" 
                                value={param.id || ''} 
                                onChange={e => handleParamChange(realIdx, 'id', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white font-mono"
                                placeholder="e.g. voltage"
                              />
                           </div>
                           <div className="w-[140px]">
                              <label className="block text-[10px] text-slate-500 mb-1">{dict.paramName || 'Name'}</label>
                              <input 
                                type="text" 
                                value={param.name} 
                                onChange={e => handleParamChange(realIdx, 'name', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                              />
                           </div>
                           <div className="w-[100px]">
                              <label className="block text-[10px] text-slate-500 mb-1">{dict.paramType || 'Data Type'}</label>
                              <select 
                                 value={param.type}
                                 onChange={e => handleParamChange(realIdx, 'type', e.target.value)}
                                 className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
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
                                   className="w-full bg-slate-900 border border-amber-700/50 rounded px-2 py-1 text-sm text-white"
                                   placeholder={dict.tagDefaultHint || 'Tag value for subtable'}
                                 />
                              </div>
                           )}
                           
                           {/* Column 类型：显示单位、最小值、最大值、生成模式 */}
                           {!param.is_tag && (
                              <>
                                 <div className="w-[70px]">
                                    <label className="block text-[10px] text-slate-500 mb-1">{dict.paramUnit || 'Unit'}</label>
                                    <input 
                                      type="text" 
                                      value={param.unit || ''} 
                                      onChange={e => handleParamChange(realIdx, 'unit', e.target.value)}
                                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                                    />
                                 </div>
                                 <div className="w-[70px]">
                                    <label className="block text-[10px] text-slate-500 mb-1">{dict.paramMin || 'Min'}</label>
                                    <input 
                                      type="number" 
                                      value={param.min_value} 
                                      onChange={e => handleParamChange(realIdx, 'min_value', parseFloat(e.target.value))}
                                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                                    />
                                 </div>
                                 <div className="w-[70px]">
                                    <label className="block text-[10px] text-slate-500 mb-1">{dict.paramMax || 'Max'}</label>
                                    <input 
                                      type="number" 
                                      value={param.max_value} 
                                      onChange={e => handleParamChange(realIdx, 'max_value', parseFloat(e.target.value))}
                                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                                    />
                                 </div>
                                 <div className="w-[110px]">
                                    <label className="block text-[10px] text-slate-500 mb-1">{dict.paramGenMode || 'Mode'}</label>
                                    <select 
                                       value={param.generation_mode}
                                       onChange={e => handleParamChange(realIdx, 'generation_mode', e.target.value)}
                                       className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                                    >
                                       {Object.values(GenerationMode).map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                 </div>
                              </>
                           )}
                           
                           <button onClick={() => removeParam(realIdx)} className="p-1.5 text-slate-500 hover:text-red-400 mb-0.5">
                              <Trash2 size={16} />
                           </button>
                        </div>
                     )})}
                     {(!category.parameters || category.parameters.length === 0) && (
                        <div className="text-center py-8 text-slate-600 italic">{dict.noParams || 'No parameters defined'}</div>
                     )}
                   </div>
                </div>
            )}

            {activeTab === 'advanced' && (
            <div>
                <div className="mb-4 bg-slate-800/50 p-4 rounded border border-slate-700">
                    <h4 className="text-white font-bold mb-2">{dict.globalPhysicsConfig || 'Physics Config'}</h4>
                    <p className="text-xs text-slate-400 mb-4">Configure physical properties for kinematics simulation.</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] text-slate-500 mb-1">{dict.massKg || 'Mass (kg)'}</label>
                            <input 
                                type="number" 
                                value={category.physics_config?.mass || ''}
                                onChange={e => handlePhysicsChange('mass', parseFloat(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" 
                            />
                        </div>
                        <div>
                             <label className="block text-[10px] text-slate-500 mb-1">{dict.maxVelocity || 'Max Velocity'}</label>
                            <input 
                                type="number" 
                                value={category.physics_config?.max_velocity || ''}
                                onChange={e => handlePhysicsChange('max_velocity', parseFloat(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" 
                            />
                        </div>
                    </div>
                </div>

                <div className="mb-4 bg-slate-800/50 p-4 rounded border border-slate-700">
                    <h4 className="text-white font-bold mb-4">{dict.logicRules || 'Logic Rules'}</h4>
                    <div className="space-y-2 mb-4">
                        {category.logic_rules?.map((rule, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                                <input 
                                    type="text" 
                                    value={rule.condition}
                                    onChange={e => handleRuleChange(idx, 'condition', e.target.value)}
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                                    placeholder={dict.ruleHint || 'Condition'}
                                />
                                <span className="text-slate-500">→</span>
                                <input 
                                    type="text" 
                                    value={rule.action}
                                    onChange={e => handleRuleChange(idx, 'action', e.target.value)}
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                                    placeholder={dict.actionHint || 'Action'}
                                />
                                <button onClick={() => handleRemoveRule(idx)} className="p-1.5 text-slate-500 hover:text-red-400">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        {(!category.logic_rules || category.logic_rules.length === 0) && (
                            <div className="text-slate-500 italic text-sm mb-2">No rules defined.</div>
                        )}
                        <button onClick={handleAddRule} className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 px-3 py-1.5 rounded border border-slate-700">
                            <Plus size={14}/> {dict.addRule || 'Add Rule'}
                        </button>
                    </div>
                </div>

                <h4 className="text-white font-bold mb-4">{dict.paramErrorInjection || 'Error Injection'}</h4>
                <div className="space-y-4">
                    {(category.parameters as BackendParameter[])?.filter(p => p.type === ParameterType.NUMBER).map((param, idx) => (
                        <div key={idx} className="bg-slate-800/30 p-4 rounded border border-slate-700">
                            <div className="font-bold text-blue-400 mb-2">{param.name}</div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] text-slate-500 mb-1">{dict.driftRate || 'Drift Rate'}</label>
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
                                    <label className="block text-[10px] text-slate-500 mb-1">{dict.anomalyProb || 'Anomaly Prob'}</label>
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
                    {(category.parameters as BackendParameter[])?.filter(p => p.type === ParameterType.NUMBER).length === 0 && (
                        <div className="text-slate-500 italic text-sm">{dict.noNumericParams || 'No numeric parameters'}</div>
                    )}
                </div>
            </div>
            )}
        </div>

        <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50">
          <button onClick={onCancel} className="px-4 py-2 text-slate-400 hover:text-white font-semibold">{dict.cancel}</button>
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
