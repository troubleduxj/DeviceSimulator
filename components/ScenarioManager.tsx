import React, { useState, useEffect } from 'react';
import { 
  Category, backendService, BackendParameter 
} from '../services/backendService';
import { generateScenarioConfig } from '../services/geminiService';
import { 
  Plus, Trash2, Save, X, Settings, RefreshCw, Layers, ArrowRight, Zap, PlayCircle, CheckCircle, AlertTriangle, Sparkles, Loader2, Star
} from 'lucide-react';

interface ScenarioManagerProps {
  onClose: () => void;
  dict: any;
  theme?: 'dark' | 'light';
  lang?: string;
  onDevicesUpdate?: () => void;
}

export const ScenarioManager: React.FC<ScenarioManagerProps> = ({ onClose, dict, theme = 'dark', lang = 'zh', onDevicesUpdate }) => {
  const isDark = theme === 'dark';
  const bgMain = isDark ? 'bg-slate-900' : 'bg-gray-50';
  const bgCard = isDark ? 'bg-slate-800' : 'bg-white';
  const bgHeader = isDark ? 'bg-slate-900' : 'bg-gray-100';
  const borderMain = isDark ? 'border-slate-700' : 'border-gray-200';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-slate-400' : 'text-gray-500';
  const inputBg = isDark ? 'bg-slate-900' : 'bg-white';
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [deviceCounts, setDeviceCounts] = useState<Record<string, number>>({});

  // Local state for editing
  const [scenarios, setScenarios] = useState<string[]>([]);
  const [configs, setConfigs] = useState<Record<string, any>>({});

  const [isAddingScenario, setIsAddingScenario] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');

  // AI State
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [cats, devs] = await Promise.all([
          backendService.fetchCategories(),
          backendService.fetchBackendDevices()
      ]);

      // Calculate counts
      const counts: Record<string, number> = {};
      devs.forEach(d => {
          counts[d.type] = (counts[d.type] || 0) + 1;
      });
      setDeviceCounts(counts);

      setCategories(cats);
      if (selectedCategory) {
        // Refresh selected category data
        const updated = cats.find(c => c.id === selectedCategory.id);
        if (updated) handleSelectCategory(updated);
      } else if (cats.length > 0) {
        handleSelectCategory(cats[0]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCategory = (cat: Category) => {
    setSelectedCategory(cat);
    setScenarios(cat.scenarios || []);
    setConfigs(cat.scenario_configs || {});
    // Select first scenario if available and none selected
    if (cat.scenarios && cat.scenarios.length > 0) {
        setSelectedScenario(cat.scenarios[0]);
    } else {
        setSelectedScenario(null);
    }
  };

  const handleAddScenario = () => {
    if (!newScenarioName.trim()) return;
    if (scenarios.includes(newScenarioName)) {
        alert(dict.scenarioExists || "Scenario already exists");
        return;
    }
    
    const newScenarios = [...scenarios, newScenarioName];
    setScenarios(newScenarios);
    setConfigs(prev => ({
        ...prev,
        [newScenarioName]: {
            name: newScenarioName,
            description: "",
            parameter_updates: []
        }
    }));
    setSelectedScenario(newScenarioName);
    setIsAddingScenario(false);
    setNewScenarioName('');
  };

  const handleSetDefault = (name: string) => {
    if (!selectedCategory) return;
    
    // Set default logic: move selected scenario to first index
    const newScenarios = [...scenarios];
    const index = newScenarios.indexOf(name);
    if (index > -1) {
        newScenarios.splice(index, 1);
        newScenarios.unshift(name);
    }
    
    setScenarios(newScenarios);
    
    // Update backend immediately
    backendService.updateCategory(selectedCategory.id, {
        ...selectedCategory,
        scenarios: newScenarios,
        scenario_configs: configs
    }).then(() => {
        alert(dict.setDefaultSuccess || "Default scenario updated");
    }).catch(e => {
        console.error(e);
        alert(dict.saveFailed || "Failed to save");
    });
  };

  const handleDeleteScenario = (name: string) => {
    if (!confirm(dict.deleteConfirm || "Are you sure?")) return;
    const newScenarios = scenarios.filter(s => s !== name);
    setScenarios(newScenarios);
    const newConfigs = { ...configs };
    delete newConfigs[name];
    setConfigs(newConfigs);
    if (selectedScenario === name) setSelectedScenario(null);
  };

  const handleGenerateAiScenario = async () => {
    if (!selectedCategory || !aiDescription.trim()) return;
    
    const params = selectedCategory.parameters
        .filter(p => !p.is_tag) // Filter out TAG parameters
        .map(p => ({ id: p.id || p.name, name: p.name }));

    if (params.length === 0) {
        alert("Cannot generate scenario: No numeric/simulation parameters found in this category (TAGs are excluded). Please add parameters in Category Manager.");
        return;
    }

    setIsGeneratingAi(true);
    try {
        const result = await generateScenarioConfig(
            aiDescription, 
            selectedCategory.name, 
            params,
            lang
        );
        
        // Check if name exists
        let finalName = result.name;
        if (scenarios.includes(finalName)) {
            finalName = `${finalName} (AI ${Date.now().toString().slice(-4)})`;
        }

        const newScenarios = [...scenarios, finalName];
        setScenarios(newScenarios);
        setConfigs(prev => ({
            ...prev,
            [finalName]: {
                name: finalName,
                description: result.description,
                parameter_updates: result.parameter_updates
            }
        }));
        setSelectedScenario(finalName);
        setIsAiOpen(false);
        setAiDescription('');
        alert(dict.aiSuccess || "AI Scenario Generated Successfully");
    } catch (error: any) {
        console.error("AI Gen Error", error);
        alert(dict.aiFailed || "AI Generation Failed: " + error.message);
    } finally {
        setIsGeneratingAi(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!selectedCategory) return;
    try {
        await backendService.updateCategory(selectedCategory.id, {
            ...selectedCategory,
            scenarios: scenarios,
            scenario_configs: configs
        });
        alert(dict.saveSuccess || "Saved successfully");
        fetchData();
    } catch (error) {
        alert(dict.saveFailed || "Save failed");
    }
  };

  const handleSyncToDevices = async () => {
    if (!selectedCategory) return;
    if (!confirm(dict.syncConfirm || "This will overwrite scenarios for ALL devices in this category. Continue?")) return;
    
    setIsSyncing(true);
    try {
        // 1. Fetch all devices
        const allDevices = await backendService.fetchBackendDevices();
        const targetDevices = allDevices.filter(d => d.type === selectedCategory.code);
        
        let success = 0;
        // 2. Update each device
        await Promise.all(targetDevices.map(async (dev) => {
            try {
                // Construct update payload
                // We need to merge parameters? Or just scenarios?
                // The requirement is to sync scenario TEMPLATES.
                // So we update dev.scenarios and dev.scenario_configs
                
                // Keep existing parameters, just update scenario logic
                const payload: any = {
                    ...dev,
                    scenarios: scenarios,
                    scenario_configs: configs,
                    // Restore backendType for compatibility
                    backendType: dev.type 
                };
                // Ensure type field is correct (backend expects 'type')
                payload.type = dev.type;

                await backendService.updateDevice(dev.id, payload);
                success++;
            } catch (e) {
                console.error(`Failed to sync device ${dev.id}`, e);
            }
        }));
        
        alert(`${dict.syncSuccess || "Sync Completed"}: ${success} / ${targetDevices.length}`);
        
        // Refresh global device list
        if (onDevicesUpdate) {
            onDevicesUpdate();
        }
    } catch (error) {
        alert(dict.syncFailed || "Sync Failed");
    } finally {
        setIsSyncing(false);
    }
  };

  // Helper to update a specific rule for a parameter in the current scenario
  const updateParamRule = (paramId: string, field: string, value: any) => {
    if (!selectedScenario) return;
    
    const currentConfig = configs[selectedScenario] || { name: selectedScenario, parameter_updates: [] };
    let updates = [...(currentConfig.parameter_updates || [])];
    
    let ruleIndex = updates.findIndex((u: any) => u.param_id === paramId);
    let rule = ruleIndex >= 0 ? updates[ruleIndex] : { param_id: paramId };
    
    if (value === '' || value === null) {
        delete rule[field];
    } else {
        rule[field] = value;
    }
    
    // Clean up empty rules? No, we might want to keep the record
    if (ruleIndex >= 0) {
        updates[ruleIndex] = rule;
    } else {
        updates.push(rule);
    }
    
    setConfigs({
        ...configs,
        [selectedScenario]: { ...currentConfig, parameter_updates: updates }
    });
  };

  const getRule = (paramId: string) => {
      if (!selectedScenario || !configs[selectedScenario]) return {};
      const updates = configs[selectedScenario].parameter_updates || [];
      return updates.find((u: any) => u.param_id === paramId) || {};
  };

  return (
    <div className={`h-full flex flex-col rounded-lg border overflow-hidden ${bgMain} ${borderMain}`}>
      {/* Header */}
      <div className={`p-4 border-b flex justify-between items-center ${bgHeader} ${borderMain}`}>
        <h2 className={`text-xl font-bold flex items-center gap-2 ${textMain}`}>
          <Layers className="text-purple-500" />
          {dict.scenarioConfig || 'Scenario Configuration'}
        </h2>
        <div className="flex gap-2">
            <button onClick={fetchData} className={`p-2 rounded ${textSub} hover:text-white`}>
                <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Categories */}
        <div className={`w-64 border-r ${borderMain} flex flex-col ${isDark ? 'bg-slate-900/50' : 'bg-white'}`}>
            <div className={`p-3 text-xs font-bold ${textSub} uppercase tracking-wider`}>{dict.categories || 'Categories'}</div>
            <div className="flex-1 overflow-y-auto">
                {categories.map(cat => (
                    <div 
                        key={cat.id}
                        onClick={() => handleSelectCategory(cat)}
                        className={`p-3 cursor-pointer border-l-4 transition-colors ${
                            selectedCategory?.id === cat.id 
                            ? 'border-purple-500 bg-purple-500/10 text-purple-400' 
                            : 'border-transparent hover:bg-slate-800 text-slate-400'
                        }`}
                    >
                        <div className="flex justify-between items-center">
                            <div className="font-bold">{cat.name}</div>
                            <div className="text-xs bg-slate-700 px-1.5 py-0.5 rounded text-slate-300" title={dict.deviceCount || "Device Count"}>
                                {deviceCounts[cat.code] || 0}
                            </div>
                        </div>
                        <div className="text-xs opacity-70">{cat.code}</div>
                    </div>
                ))}
            </div>
        </div>

        {/* Middle: Scenarios List */}
        <div className={`w-64 border-r ${borderMain} flex flex-col ${isDark ? 'bg-slate-900/30' : 'bg-gray-50'} relative`}>
            <div className={`p-3 border-b ${borderMain} flex justify-between items-center`}>
                <span className={`text-xs font-bold ${textSub} uppercase tracking-wider`}>{dict.scenarios || 'Scenarios'}</span>
                <div className="flex gap-1">
                    <button 
                        onClick={() => setIsAiOpen(true)} 
                        disabled={!selectedCategory} 
                        className="text-blue-400 hover:text-blue-300 p-1"
                        title="AI Generate"
                    >
                        <Sparkles size={16} />
                    </button>
                    <button onClick={() => setIsAddingScenario(true)} disabled={!selectedCategory} className="text-purple-400 hover:text-purple-300 p-1">
                        <Plus size={16} />
                    </button>
                </div>
            </div>
            
            {/* AI Modal Overlay */}
            {isAiOpen && (
                <div className="absolute inset-0 z-10 bg-black/80 backdrop-blur-sm p-4 flex flex-col animate-in fade-in">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                            <Sparkles size={14} /> AI Generator
                        </h3>
                        <button onClick={() => setIsAiOpen(false)} className="text-slate-500 hover:text-white">
                            <X size={14} />
                        </button>
                    </div>
                    <textarea 
                        className={`flex-1 w-full ${inputBg} border ${borderMain} rounded p-2 text-xs ${textMain} mb-2 resize-none focus:border-blue-500 outline-none`}
                        placeholder={dict.aiPromptPlaceholder || "Describe scenario (e.g. 'Overheating due to fan failure')..."}
                        value={aiDescription}
                        onChange={e => setAiDescription(e.target.value)}
                        autoFocus
                    />
                    <button 
                        onClick={handleGenerateAiScenario}
                        disabled={isGeneratingAi || !aiDescription.trim()}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs py-2 rounded flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGeneratingAi ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        {dict.generate || "Generate"}
                    </button>
                </div>
            )}

            {/* Inline Add Form */}
            {isAddingScenario && (
                <div className={`p-2 border-b ${borderMain} animate-in slide-in-from-top-2`}>
                    <input 
                        type="text" 
                        value={newScenarioName}
                        onChange={e => setNewScenarioName(e.target.value)}
                        placeholder={dict.enterScenarioName || "Scenario Name"}
                        className={`w-full ${inputBg} border ${borderMain} rounded px-2 py-1 text-sm ${textMain} mb-2 outline-none focus:border-purple-500`}
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleAddScenario()}
                    />
                    <div className="flex gap-2">
                        <button onClick={handleAddScenario} className="flex-1 bg-purple-600 text-white text-xs py-1 rounded hover:bg-purple-500">
                            {dict.create || "Create"}
                        </button>
                        <button onClick={() => setIsAddingScenario(false)} className={`flex-1 border ${borderMain} text-xs py-1 rounded ${textSub} hover:${textMain}`}>
                            {dict.cancel || "Cancel"}
                        </button>
                    </div>
                </div>
            )}

            {!selectedCategory ? (
                <div className="p-4 text-center text-sm text-slate-500 italic">Select a category</div>
            ) : (
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {scenarios.map(sc => (
                        <div 
                            key={sc}
                            onClick={() => setSelectedScenario(sc)}
                            className={`p-3 rounded border cursor-pointer flex justify-between items-center group ${
                                selectedScenario === sc
                                ? 'border-purple-500 bg-purple-500/20 text-white'
                                : `border-transparent ${bgCard} text-slate-400 hover:border-slate-600`
                            }`}
                        >
                            <span>{sc}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleSetDefault(sc); }}
                                    className={`p-1 hover:text-yellow-400 ${scenarios[0] === sc ? 'text-yellow-400' : 'text-slate-500'}`}
                                    title={dict.setDefault || "Set as Default"}
                                >
                                    <Star size={14} fill={scenarios[0] === sc ? "currentColor" : "none"} />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteScenario(sc); }}
                                    className="text-red-400 hover:text-red-300"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {scenarios.length === 0 && (
                        <div className="text-center text-xs text-slate-500 mt-4">No scenarios defined</div>
                    )}
                </div>
            )}
        </div>

        {/* Right: Editor */}
        <div className="flex-1 flex flex-col bg-slate-950">
            {selectedScenario ? (
                <>
                    <div className={`p-4 border-b ${borderMain} flex justify-between items-center ${bgHeader}`}>
                        <div>
                            <h3 className={`text-lg font-bold ${textMain}`}>{selectedScenario}</h3>
                            <p className={`text-xs ${textSub}`}>Configure parameter behaviors for this scenario</p>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleSyncToDevices}
                                disabled={isSyncing}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm border ${isDark ? 'border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 text-blue-600'}`}
                            >
                                {isSyncing ? <RefreshCw className="animate-spin" size={14}/> : <Zap size={14} />}
                                {dict.syncToDevices || "Sync to Devices"}
                            </button>
                            <button 
                                onClick={handleSaveCategory}
                                className="flex items-center gap-2 px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm font-bold"
                            >
                                <Save size={16} />
                                {dict.save || "Save"}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="grid grid-cols-1 gap-4">
                            {selectedCategory?.parameters
                                .filter(p => !p.is_tag) // Filter out TAG parameters
                                .map(param => {
                                const rule = getRule(param.id);
                                return (
                                    <div key={param.id} className={`p-4 rounded border ${borderMain} ${bgCard}`}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="font-mono text-sm font-bold text-purple-400">{param.name}</div>
                                            <div className="text-xs text-slate-500">({param.id})</div>
                                            <div className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">{param.type}</div>
                                        </div>
                                        
                                        <div className="grid grid-cols-3 gap-4">
                                            {/* Drift Rate */}
                                            <div>
                                                <label className={`block text-xs ${textSub} mb-1`}>Drift Rate (+/- per tick)</label>
                                                <input 
                                                    type="number" 
                                                    step="0.1"
                                                    value={rule.drift_rate || ''}
                                                    onChange={e => updateParamRule(param.id, 'drift_rate', parseFloat(e.target.value))}
                                                    className={`w-full ${inputBg} border ${borderMain} rounded px-2 py-1 text-sm ${textMain}`}
                                                    placeholder="0.0"
                                                />
                                            </div>
                                            {/* Noise */}
                                            <div>
                                                <label className={`block text-xs ${textSub} mb-1`}>Noise (Std Dev)</label>
                                                <input 
                                                    type="number" 
                                                    step="0.1"
                                                    value={rule.noise_std_dev || ''}
                                                    onChange={e => updateParamRule(param.id, 'noise_std_dev', parseFloat(e.target.value))}
                                                    className={`w-full ${inputBg} border ${borderMain} rounded px-2 py-1 text-sm ${textMain}`}
                                                    placeholder="0.0"
                                                />
                                            </div>
                                            {/* Anomaly Probability */}
                                            <div>
                                                <label className={`block text-xs ${textSub} mb-1`}>Anomaly Prob (0-1)</label>
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    min="0" max="1"
                                                    value={rule.anomaly_probability || ''}
                                                    onChange={e => updateParamRule(param.id, 'anomaly_probability', parseFloat(e.target.value))}
                                                    className={`w-full ${inputBg} border ${borderMain} rounded px-2 py-1 text-sm ${textMain}`}
                                                    placeholder="0.0"
                                                />
                                            </div>
                                            
                                            {/* Fixed Value Override */}
                                            <div className="col-span-3 pt-2 border-t border-slate-700/50 mt-2">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={rule.update_type === 'set'}
                                                            onChange={e => updateParamRule(param.id, 'update_type', e.target.checked ? 'set' : null)}
                                                            id={`override_${param.id}`}
                                                        />
                                                        <label htmlFor={`override_${param.id}`} className={`text-xs ${textSub}`}>Force Fixed Value</label>
                                                    </div>
                                                    {rule.update_type === 'set' && (
                                                        <input 
                                                            type="number" 
                                                            value={rule.value || ''}
                                                            onChange={e => updateParamRule(param.id, 'value', parseFloat(e.target.value))}
                                                            className={`w-32 ${inputBg} border ${borderMain} rounded px-2 py-1 text-sm ${textMain}`}
                                                            placeholder="Fixed Value"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500 flex-col gap-4">
                    <Layers size={48} className="opacity-20" />
                    <p>Select a scenario to configure</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
