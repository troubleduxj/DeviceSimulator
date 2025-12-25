import React, { useState, useEffect } from 'react';
import { 
  BackendDevice, BackendParameter, ParameterType, GenerationMode, backendService, Category 
} from '../services/backendService';
import { 
  Plus, Trash2, Edit, Save, X, Settings, RefreshCw, Search, Filter, Upload, Download, Play, Square, Activity, Eraser, Database, Clock, Eye, Sparkles, Loader2 
} from 'lucide-react';
import { SimulationStep } from '../types';
import { generateBatchDevices } from '../services/geminiService';

interface DeviceManagerProps {
  onClose: () => void;
  onNavigateToMonitor?: (deviceId: string) => void;
  onPreview?: (deviceId: string) => void;
  dict: any;
  theme?: 'dark' | 'light';
  lang?: string;
}

export const DeviceManager: React.FC<DeviceManagerProps> = ({ onClose, onNavigateToMonitor, onPreview, dict, theme = 'dark', lang = 'zh' }) => {
  const [devices, setDevices] = useState<BackendDevice[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Partial<BackendDevice> | null>(null);
  const [cleaningDevice, setCleaningDevice] = useState<BackendDevice | null>(null);
  const [generatingDevice, setGeneratingDevice] = useState<BackendDevice | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [deviceData, setDeviceData] = useState<Record<string, SimulationStep>>({});
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isAiBatchOpen, setIsAiBatchOpen] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);

  const isDark = theme === 'dark';
  const bgClass = isDark ? 'bg-slate-900' : 'bg-white';
  const bgSubClass = isDark ? 'bg-slate-900' : 'bg-slate-50';
  const borderClass = isDark ? 'border-slate-700' : 'border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';
  const inputBgClass = isDark ? 'bg-slate-900' : 'bg-white';
  const cardClass = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm';
  const hoverClass = isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100';
  const headerBgClass = isDark ? 'bg-slate-900' : 'bg-slate-50';
  const selectedClass = isDark ? 'bg-blue-900/20 border-blue-500' : 'bg-blue-50 border-blue-500';

  // Compute unique types from devices to ensure all are filterable
  const uniqueTypes = Array.from(new Set(devices.map(d => d.type))).sort();
  // Merge known categories with unique types found in devices
  const allCategoryCodes = new Set(categories.map(c => c.code));
  const unknownTypes = uniqueTypes.filter(t => !allCategoryCodes.has(t));

  const filteredDevices = devices.filter(d => {
      const matchesName = d.name.toLowerCase().includes(filterName.toLowerCase());
      const matchesCategory = filterCategory ? d.type === filterCategory : true;
      return matchesName && matchesCategory;
  });

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

  // Poll for running devices data
  useEffect(() => {
    const runningDeviceIds = devices.filter(d => d.status === 'running').map(d => d.id);
    if (runningDeviceIds.length === 0) return;

    const pollData = async () => {
        const newData: Record<string, SimulationStep> = {};
        await Promise.all(runningDeviceIds.map(async (id) => {
            const data = await backendService.fetchDeviceData(id);
            if (data) newData[id] = data;
        }));
        setDeviceData(prev => ({ ...prev, ...newData }));
    };

    pollData(); // Initial fetch
    const interval = setInterval(pollData, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, [devices]); // Re-run when devices list changes (status updates)

  const handleToggleStatus = async (device: BackendDevice) => {
    const newStatus = device.status === 'running' ? 'stopped' : 'running';
    try {
        await backendService.updateDeviceStatus(device.id, newStatus);
        // Optimistic update
        setDevices(prev => prev.map(d => d.id === device.id ? { ...d, status: newStatus } : d));
    } catch (error) {
        console.error('Failed to toggle status', error);
        alert(dict.statusUpdateFailed || 'Failed to update status');
        fetchData(); // Revert on error
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const toggleSelectDevice = (id: string) => {
    const newSet = new Set(selectedDeviceIds);
    if (newSet.has(id)) {
        newSet.delete(id);
    } else {
        newSet.add(id);
    }
    setSelectedDeviceIds(newSet);
  };

  const handleSelectAll = () => {
    if (selectedDeviceIds.size === filteredDevices.length) {
        setSelectedDeviceIds(new Set());
    } else {
        setSelectedDeviceIds(new Set(filteredDevices.map(d => d.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedDeviceIds.size === 0) return;
    
    const confirmMsg = dict.confirmBatchDelete 
        ? dict.confirmBatchDelete.replace('{count}', selectedDeviceIds.size) 
        : `Are you sure you want to delete ${selectedDeviceIds.size} selected devices?`;

    if (!confirm(confirmMsg)) return;

    setIsLoading(true);
    try {
        const ids = Array.from(selectedDeviceIds);
        let successCount = 0;
        
        // Parallel delete requests
        await Promise.all(ids.map(async (id) => {
            try {
                await backendService.deleteDevice(id);
                successCount++;
            } catch (e) {
                console.error(`Failed to delete device ${id}`, e);
            }
        }));

        alert(`${dict.success || 'Success'}: ${successCount} / ${ids.length}`);
        setSelectedDeviceIds(new Set());
        setIsSelectMode(false);
        fetchData();
    } catch (error) {
        alert(dict.deleteFailed || 'Batch delete failed');
    } finally {
        setIsLoading(false);
    }
  };

  const handleAiBatchGenerate = async () => {
    if (!aiDescription) return;
    setIsGeneratingBatch(true);
    try {
        const generatedDevices = await generateBatchDevices(aiDescription, lang);
        
        let successCount = 0;
        for (const device of generatedDevices) {
             const parameters = (device.metrics || []).map((m: any) => ({
                 name: m.name,
                 id: m.id,
                 type: ParameterType.NUMBER,
                 unit: m.unit,
                 min_value: m.min,
                 max_value: m.max,
                 generation_mode: GenerationMode.RANDOM,
                 is_tag: false
             }));
             
             // Ensure at least one parameter
             if (parameters.length === 0) {
                 parameters.push({
                     name: 'Value',
                     id: 'val',
                     type: ParameterType.NUMBER,
                     min_value: 0,
                     max_value: 100,
                     generation_mode: GenerationMode.RANDOM,
                     is_tag: false
                 });
             }

             const newDevice: any = {
                 ...device,
                 parameters,
                 sampling_rate: 1000,
                 status: 'stopped'
             };
             
             await backendService.createDevice(newDevice);
             successCount++;
        }
        
        alert(`AI Generated ${successCount} devices successfully.`);
        setIsAiBatchOpen(false);
        setAiDescription('');
        fetchData();
    } catch (error: any) {
        alert("AI Batch Generation Failed: " + error.message);
    } finally {
        setIsGeneratingBatch(false);
    }
  };

  const handleExportClick = () => {
    const devicesToExport = filteredDevices;
    if (devicesToExport.length === 0) {
      alert(dict.noDevicesToExport || "No devices to export");
      return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(devicesToExport, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    const fileName = filterCategory 
        ? `devices_export_${filterCategory}_${new Date().toISOString().slice(0,10)}.json`
        : `devices_export_all_${new Date().toISOString().slice(0,10)}.json`;
    downloadAnchorNode.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const devices = JSON.parse(content);
        
        if (!Array.isArray(devices)) {
          alert(dict.invalidImportFormat || "Invalid format: Expected a JSON array of devices");
          return;
        }

        setIsLoading(true);
        let success = 0;
        let failed = 0;

        for (const device of devices) {
          try {
            await backendService.createDevice(device);
            success++;
          } catch (err) {
            console.error(err);
            failed++;
          }
        }

        alert(`${dict.importCompleted || 'Import completed'}: ${success} ${dict.success || 'success'}, ${failed} ${dict.failed || 'failed'}`);
        fetchData();
      } catch (error) {
        alert(dict.importError || "Error importing file");
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(dict.deleteDeviceConfirm)) return;
    try {
      await backendService.deleteDevice(id);
      fetchData();
    } catch (error) {
      alert(dict.deleteFailed);
    }
  };

  const handleCleanData = async (deviceId: string, startTime?: string, endTime?: string) => {
    try {
        await backendService.deleteDeviceData(deviceId, startTime, endTime);
        alert(dict.dataCleaned || 'Data cleaned successfully');
        setCleaningDevice(null);
    } catch (error: any) {
        alert(error.message || dict.cleanFailed || 'Failed to clean data');
    }
  };

  const handleGenerateData = async (deviceId: string, startTime: string, endTime: string, intervalMs?: number, cleanExisting?: boolean) => {
    try {
        const result = await backendService.generateHistoryData(deviceId, startTime, endTime, intervalMs, cleanExisting);
        alert(`${dict.dataGenerated || 'Data generated successfully'}. Count: ${result.count}`);
        setGeneratingDevice(null);
    } catch (error: any) {
        alert(error.message || dict.generateFailed || 'Failed to generate data');
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
    const defaultCategory = categories.length > 0 ? categories[0] : null;
    
    // Deep copy initial params from default category if available
    const initialParams = defaultCategory ? JSON.parse(JSON.stringify(defaultCategory.parameters || [])) : [];
    const initialPhysics = defaultCategory ? JSON.parse(JSON.stringify(defaultCategory.physics_config || {})) : {};
    const initialRules = defaultCategory ? JSON.parse(JSON.stringify(defaultCategory.logic_rules || [])) : [];

    setEditingDevice({
      name: '',
      type: defaultCategory ? defaultCategory.code : 'Generator',
      description: '',
      sampling_rate: 1000,
      status: 'stopped',
      parameters: initialParams,
      physics_config: initialPhysics,
      logic_rules: initialRules
    });
    setIsFormOpen(true);
  };

  const openEdit = (device: BackendDevice) => {
    setEditingDevice(JSON.parse(JSON.stringify(device))); // Deep copy
    setIsFormOpen(true);
  };

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-slate-900' : 'bg-slate-50'} rounded-lg border ${borderClass} overflow-hidden`}>
      {/* Header */}
      <div className={`p-4 border-b ${borderClass} flex justify-between items-center ${headerBgClass}`}>
        <h2 className={`text-xl font-bold ${textPrimary} flex items-center gap-2`}>
          <Settings className="text-blue-500" />
          {dict.deviceManagement}
          <span className={`text-sm font-normal ${textSecondary} ml-2`}>
            ({filteredDevices.length} / {devices.length})
          </span>
        </h2>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsAiBatchOpen(true)}
              className={`flex items-center gap-2 px-3 py-2 border rounded text-sm transition-colors ${
                  isDark 
                  ? 'bg-purple-900/30 hover:bg-purple-900/50 text-purple-400 border-purple-800' 
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-600 border-purple-200'
              }`}
              title={dict.aiBatchGeneration || "AI Batch Generation"}
            >
              <Sparkles size={16} />
              {dict.aiBatchButton || "AI Batch"}
            </button>
            {isSelectMode ? (
              <div className="flex gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                  <button 
                    onClick={handleBatchDelete}
                    disabled={selectedDeviceIds.size === 0}
                    className={`flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:${isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-400'} text-white px-3 py-2 rounded text-sm transition-colors font-bold`}
                  >
                    <Trash2 size={16} />
                    {dict.deleteSelected || 'Delete Selected'} ({selectedDeviceIds.size})
                  </button>
                  <button 
                    onClick={() => { setIsSelectMode(false); setSelectedDeviceIds(new Set()); }}
                    className={`px-3 py-2 ${textSecondary} hover:${textPrimary} ${bgSubClass} ${hoverClass} rounded text-sm`}
                  >
                    {dict.cancel}
                  </button>
              </div>
          ) : (
              <button 
                onClick={() => setIsSelectMode(true)}
                className={`flex items-center gap-2 ${bgSubClass} ${hoverClass} ${textSecondary} hover:${textPrimary} px-3 py-2 rounded text-sm transition-colors border ${borderClass}`}
                title={dict.batchDelete || "Batch Delete"}
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">{dict.batchDelete || "Batch Delete"}</span>
              </button>
          )}

          <button 
            onClick={fetchData} 
            className={`p-2 ${textSecondary} hover:${textPrimary} ${hoverClass} rounded`}
            title={dict.refresh}
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
          
          <input 
             type="file" 
             ref={fileInputRef} 
             className="hidden" 
             accept=".json"
             onChange={handleFileChange}
          />
          <button 
            onClick={handleImportClick}
            className={`flex items-center gap-2 ${bgSubClass} ${hoverClass} ${isDark ? 'text-white' : 'text-slate-700'} px-3 py-2 rounded text-sm transition-colors border ${borderClass}`}
            title={dict.importDevices || "Batch Import Devices"}
          >
            <Upload size={16} />
            {dict.importDevices || "Import"}
          </button>

          <button 
            onClick={handleExportClick}
            className={`flex items-center gap-2 ${bgSubClass} ${hoverClass} ${isDark ? 'text-white' : 'text-slate-700'} px-3 py-2 rounded text-sm transition-colors border ${borderClass}`}
            title={dict.exportDevices || "Batch Export Devices"}
          >
            <Download size={16} />
            {dict.exportDevices || "Export"}
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

      {/* Filters */}
      <div className={`p-4 border-b ${borderClass} ${isDark ? 'bg-slate-900' : 'bg-slate-100'} flex flex-wrap gap-4 items-center`}>
        {isSelectMode && (
             <div className={`flex items-center gap-3 ${isDark ? 'bg-slate-900' : 'bg-white'} px-3 py-2 rounded-full border border-blue-500/30`}>
                <input 
                    type="checkbox" 
                    checked={selectedDeviceIds.size === filteredDevices.length && filteredDevices.length > 0}
                    onChange={handleSelectAll}
                    className={`w-4 h-4 rounded ${isDark ? 'border-slate-600 bg-slate-800' : 'border-slate-300 bg-white'} text-blue-600 focus:ring-blue-500 cursor-pointer`}
                />
                <span className={`text-sm ${textPrimary} font-medium`}>
                    {selectedDeviceIds.size === filteredDevices.length ? (dict.deselectAll || 'Deselect All') : (dict.selectAll || 'Select All')}
                </span>
             </div>
        )}
        <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
                type="text" 
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
                placeholder={dict.searchDevice || "Search devices..."}
                className={`w-full ${inputBgClass} border ${borderClass} rounded-full pl-10 pr-4 py-2 text-sm ${textPrimary} focus:border-blue-500 outline-none`}
            />
        </div>
        <div className="relative min-w-[200px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <select 
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className={`w-full ${inputBgClass} border ${borderClass} rounded-full pl-10 pr-8 py-2 text-sm ${textPrimary} focus:border-blue-500 outline-none appearance-none`}
            >
                <option value="">{dict.allCategories || "All Categories"}</option>
                {categories.map(c => (
                    <option key={c.id} value={c.code}>{c.name} ({c.code})</option>
                ))}
                {unknownTypes.length > 0 && (
                    <optgroup label="Other Types">
                        {unknownTypes.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </optgroup>
                )}
            </select>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDevices.map(device => (
            <div 
                key={device.id} 
                className={`
                    relative p-4 rounded border transition-all group flex flex-col h-full
                    ${selectedDeviceIds.has(device.id) ? selectedClass : `${cardClass} ${hoverClass}`}
                `}
                onClick={() => isSelectMode && toggleSelectDevice(device.id)}
            >
              {isSelectMode && (
                  <div className="absolute top-4 right-4 z-10">
                      <input 
                        type="checkbox" 
                        checked={selectedDeviceIds.has(device.id)}
                        onChange={() => toggleSelectDevice(device.id)}
                        className={`w-5 h-5 rounded ${isDark ? 'border-slate-600 bg-slate-900' : 'border-slate-300 bg-white'} text-blue-600 focus:ring-blue-500 cursor-pointer`}
                        onClick={(e) => e.stopPropagation()}
                      />
                  </div>
              )}

              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2">
                     <div className={`font-bold text-lg ${textPrimary}`}>{device.name}</div>
                     <div className={`w-2 h-2 rounded-full ${device.status === 'running' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
                  </div>
                  <div className={`text-xs ${textMuted} font-mono flex items-center gap-2`}>
                      {device.type}
                      {device.status === 'running' && (
                          <span className="text-[10px] text-emerald-400 bg-emerald-900/30 px-1.5 rounded flex items-center gap-1">
                              <Activity size={10} /> Running
                          </span>
                      )}
                  </div>
                </div>
              </div>
              
              <p className={`text-sm ${textSecondary} mb-3 line-clamp-2 flex-1`}>{device.description || dict.noDescription}</p>
              
              <div className={`text-xs ${textMuted} ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'} p-2 rounded space-y-2`}>
                <div className={`flex justify-between items-center border-b ${isDark ? 'border-white/5' : 'border-slate-200'} pb-1`}>
                   <span>{dict.samplingRate}:</span>
                   <span className={`${isDark ? 'text-slate-300' : 'text-slate-700'} font-mono`}>{device.sampling_rate}ms</span>
                </div>
                <div className="flex justify-between items-center">
                   <span>{dict.parameters}:</span>
                   <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{device.parameters.length}</span>
                </div>
                
                {/* Real-time Data Preview */}
                {device.status === 'running' && deviceData[device.id] && (
                    <div className={`mt-2 pt-2 border-t ${isDark ? 'border-white/5' : 'border-slate-200'} animate-in fade-in duration-300`}>
                        <div className="flex justify-between items-center mb-1">
                             <span className={`text-[10px] uppercase ${textMuted} font-bold`}>Live Preview</span>
                             <span className={`text-[10px] font-mono ${textSecondary}`}>
                                 {new Date(deviceData[device.id].timestamp).toLocaleTimeString()}
                             </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                             {Object.entries(deviceData[device.id].metrics).slice(0, 4).map(([key, val]) => (
                                 <div key={key} className="flex justify-between items-center text-[10px]">
                                     <span className={`${textSecondary} truncate max-w-[60px]`} title={key}>{key}</span>
                                     <span className="font-mono text-emerald-400">{typeof val === 'number' ? val.toFixed(2) : val}</span>
                                 </div>
                             ))}
                        </div>
                    </div>
                )}
                {device.status === 'running' && !deviceData[device.id] && (
                    <div className={`mt-2 pt-2 border-t ${isDark ? 'border-white/5' : 'border-slate-200'} text-[10px] ${textSecondary} italic text-center`}>
                        Waiting for data...
                    </div>
                )}
              </div>
              
              <div className={`mt-auto pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'} flex justify-end gap-2`}>
                  <button 
                      onClick={(e) => { e.stopPropagation(); handleToggleStatus(device); }} 
                      className={`p-1.5 rounded transition-colors ${device.status === 'running' ? 'text-emerald-400 hover:bg-emerald-900/30' : `${textSecondary} hover:${textPrimary} ${hoverClass}`}`}
                      title={device.status === 'running' ? dict.stop || 'Stop' : dict.start || 'Start'}
                  >
                    {device.status === 'running' ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                  </button>
                  
                  {/* Preview Button */}
                  {onPreview && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onPreview(device.id); }} 
                        className={`p-1.5 text-sky-400 hover:bg-sky-900/30 rounded ${hoverClass}`}
                        title={dict.preview || "Preview"}
                    >
                        <Eye size={16} />
                    </button>
                  )}

                  {/* Monitor Button */}
                  {onNavigateToMonitor && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onNavigateToMonitor(device.id); }} 
                        className={`p-1.5 text-purple-400 hover:bg-purple-900/30 rounded ${hoverClass}`}
                        title={dict.monitorTitle || "Real-time Monitor"}
                    >
                        <Activity size={16} />
                    </button>
                  )}

                  <button onClick={(e) => { e.stopPropagation(); openEdit(device); }} className={`p-1.5 text-blue-400 hover:bg-blue-900/30 rounded ${hoverClass}`}>
                    <Edit size={16} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setGeneratingDevice(device); }} className={`p-1.5 text-purple-400 hover:bg-purple-900/30 rounded ${hoverClass}`} title={dict.generateData || 'Generate History'}>
                    <Database size={16} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setCleaningDevice(device); }} className={`p-1.5 text-amber-400 hover:bg-amber-900/30 rounded ${hoverClass}`} title={dict.cleanData || 'Clean Data'}>
                    <Eraser size={16} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(device.id); }} className={`p-1.5 text-red-400 hover:bg-red-900/30 rounded ${hoverClass}`}>
                    <Trash2 size={16} />
                  </button>
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
          theme={theme}
        />
      )}

      {/* Cleanup Modal */}
      {cleaningDevice && (
        <CleanupModal 
            device={cleaningDevice}
            onConfirm={handleCleanData}
            onCancel={() => setCleaningDevice(null)}
            dict={dict}
            theme={theme}
        />
      )}

      {/* Generate Modal */}
      {generatingDevice && (
        <GenerateModal 
            device={generatingDevice}
            onConfirm={handleGenerateData}
            onCancel={() => setGeneratingDevice(null)}
            dict={dict}
            theme={theme}
        />
      )}

      {/* AI Batch Modal */}
      {isAiBatchOpen && (
        <AiBatchModal 
            onConfirm={handleAiBatchGenerate}
            onCancel={() => setIsAiBatchOpen(false)}
            description={aiDescription}
            setDescription={setAiDescription}
            isGenerating={isGeneratingBatch}
            dict={dict}
            theme={theme}
        />
      )}
    </div>
  );
};

// --- Cleanup Modal Component ---

interface CleanupModalProps {
    device: BackendDevice;
    onConfirm: (deviceId: string, startTime?: string, endTime?: string) => void;
    onCancel: () => void;
    dict: any;
    theme?: 'dark' | 'light';
}

const CleanupModal: React.FC<CleanupModalProps> = ({ device, onConfirm, onCancel, dict, theme = 'dark' }) => {
    const [mode, setMode] = useState<'all' | 'range'>('all');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [isCleaning, setIsCleaning] = useState(false);
    const [dataRange, setDataRange] = useState<{start_time: string, end_time: string} | null>(null);

    const isDark = theme === 'dark';
    const bgModal = isDark ? 'bg-slate-900' : 'bg-white';
    const borderMain = isDark ? 'border-slate-700' : 'border-gray-200';
    const borderSub = isDark ? 'border-slate-800' : 'border-gray-100';
    const textMain = isDark ? 'text-white' : 'text-gray-900';
    const textSub = isDark ? 'text-slate-400' : 'text-gray-500';
    const inputBg = isDark ? 'bg-slate-800' : 'bg-gray-50';
    const inputBorder = isDark ? 'border-slate-700' : 'border-gray-300';
    const cardBg = isDark ? 'bg-slate-800/50' : 'bg-gray-50';
    const itemBorder = isDark ? 'border-slate-700' : 'border-gray-200';

    useEffect(() => {
        const fetchRange = async () => {
            try {
                const range = await backendService.getDeviceDataRange(device.id);
                if (range) {
                    setDataRange(range);
                }
            } catch (e) {
                console.error("Failed to fetch data range", e);
            }
        };
        fetchRange();
    }, [device.id]);

    const handleConfirm = async () => {
        setIsCleaning(true);
        if (mode === 'all') {
            await onConfirm(device.id);
        } else {
            const start = startTime ? new Date(startTime).toISOString() : undefined;
            const end = endTime ? new Date(endTime).toISOString() : undefined;
            await onConfirm(device.id, start, end);
        }
        setIsCleaning(false);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className={`${bgModal} border ${borderMain} rounded-lg w-full max-w-md shadow-2xl`}>
                <div className={`p-4 border-b ${borderSub} flex justify-between items-center`}>
                    <h3 className={`text-lg font-bold ${textMain} flex items-center gap-2`}>
                        <Eraser className="text-amber-500" size={20} />
                        {dict.cleanDataTitle || 'Clean Device Data'}
                    </h3>
                    <button onClick={onCancel} className={`${textSub} hover:${textMain}`}><X size={20}/></button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div className={`text-sm ${textSub} mb-4`}>
                        Cleaning data for device: <span className={`${textMain} font-bold`}>{device.name}</span>
                        {dataRange && (
                            <div className={`mt-2 text-xs ${isDark ? 'bg-blue-900/30 border-blue-900/50 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-800'} border p-2 rounded`}>
                                <div className="font-bold opacity-70 mb-1">Available Data Range (Server Time):</div>
                                <div className="font-mono">
                                    {new Date(dataRange.start_time).toLocaleString()} <br/>
                                    ↓ <br/>
                                    {new Date(dataRange.end_time).toLocaleString()}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className={`flex items-center gap-3 p-3 rounded border ${itemBorder} ${cardBg} cursor-pointer hover:border-blue-500 transition-colors`}>
                            <input 
                                type="radio" 
                                name="cleanupMode" 
                                value="all" 
                                checked={mode === 'all'} 
                                onChange={() => setMode('all')}
                                className={`w-4 h-4 text-blue-500 focus:ring-blue-500 ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-300'}`}
                            />
                            <span className={`${textMain} font-medium`}>{dict.cleanAll || 'Clean All History'}</span>
                        </label>

                        <label className={`flex items-center gap-3 p-3 rounded border ${itemBorder} ${cardBg} cursor-pointer hover:border-blue-500 transition-colors`}>
                            <input 
                                type="radio" 
                                name="cleanupMode" 
                                value="range" 
                                checked={mode === 'range'} 
                                onChange={() => setMode('range')}
                                className={`w-4 h-4 text-blue-500 focus:ring-blue-500 ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-300'}`}
                            />
                            <span className={`${textMain} font-medium`}>{dict.cleanRange || 'Clean Time Range'}</span>
                        </label>
                    </div>

                    {mode === 'range' && (
                        <div className="space-y-3 pl-7 animate-in slide-in-from-top-2 fade-in duration-200">
                            <div>
                                <label className={`block text-xs uppercase ${textSub} font-bold mb-1`}>{dict.startTime || 'Start Time'}</label>
                                <input 
                                    type="datetime-local" 
                                    value={startTime}
                                    onChange={e => setStartTime(e.target.value)}
                                    className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain} focus:border-blue-500 outline-none text-sm`}
                                />
                            </div>
                            <div>
                                <label className={`block text-xs uppercase ${textSub} font-bold mb-1`}>{dict.endTime || 'End Time'}</label>
                                <input 
                                    type="datetime-local" 
                                    value={endTime}
                                    onChange={e => setEndTime(e.target.value)}
                                    className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain} focus:border-blue-500 outline-none text-sm`}
                                />
                            </div>
                        </div>
                    )}

                    <div className={`border p-3 rounded text-xs flex items-start gap-2 ${isDark ? 'bg-amber-900/20 border-amber-900/50 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                        <Trash2 size={14} className="mt-0.5 shrink-0" />
                        This action cannot be undone. Data will be permanently removed from TDengine.
                    </div>
                </div>

                <div className={`p-4 border-t ${borderSub} flex justify-end gap-3 ${isDark ? 'bg-slate-900/50' : 'bg-gray-50'}`}>
                    <button onClick={onCancel} className={`px-4 py-2 ${textSub} hover:${textMain} font-semibold text-sm`}>
                        {dict.cancel}
                    </button>
                    <button 
                        onClick={handleConfirm}
                        disabled={isCleaning || (mode === 'range' && (!startTime || !endTime))}
                        className={`flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-bold transition-colors text-sm`}
                    >
                        {isCleaning ? (
                            <RefreshCw size={14} className="animate-spin" />
                        ) : (
                            <Eraser size={14} />
                        )}
                        {isCleaning ? (dict.cleaning || 'Cleaning...') : (dict.cleanData || 'Clean Data')}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Generate Modal Component ---

interface GenerateModalProps {
    device: BackendDevice;
    onConfirm: (deviceId: string, startTime: string, endTime: string, intervalMs?: number, cleanExisting?: boolean) => void;
    onCancel: () => void;
    dict: any;
    theme?: 'dark' | 'light';
}

const GenerateModal: React.FC<GenerateModalProps> = ({ device, onConfirm, onCancel, dict, theme = 'dark' }) => {
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [interval, setInterval] = useState<number | ''>('');
    const [cleanExisting, setCleanExisting] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    const isDark = theme === 'dark';
    const bgModal = isDark ? 'bg-slate-900' : 'bg-white';
    const borderMain = isDark ? 'border-slate-700' : 'border-gray-200';
    const borderSub = isDark ? 'border-slate-800' : 'border-gray-100';
    const textMain = isDark ? 'text-white' : 'text-gray-900';
    const textSub = isDark ? 'text-slate-400' : 'text-gray-500';
    const inputBg = isDark ? 'bg-slate-800' : 'bg-gray-50';
    const inputBorder = isDark ? 'border-slate-700' : 'border-gray-300';

    const handleConfirm = async () => {
        if (!startTime || !endTime) return;
        
        setIsGenerating(true);
        const start = new Date(startTime).toISOString();
        const end = new Date(endTime).toISOString();
        const intervalMs = interval === '' ? undefined : Number(interval);
        
        await onConfirm(device.id, start, end, intervalMs, cleanExisting);
        setIsGenerating(false);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className={`${bgModal} border ${borderMain} rounded-lg w-full max-w-md shadow-2xl`}>
                <div className={`p-4 border-b ${borderSub} flex justify-between items-center`}>
                    <h3 className={`text-lg font-bold ${textMain} flex items-center gap-2`}>
                        <Database className="text-purple-500" size={20} />
                        {dict.generateDataTitle || 'Generate Historical Data'}
                    </h3>
                    <button onClick={onCancel} className={`${textSub} hover:${textMain}`}><X size={20}/></button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div className={`text-sm ${textSub} mb-4`}>
                        Generating data for device: <span className={`${textMain} font-bold`}>{device.name}</span>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className={`block text-xs uppercase ${textSub} font-bold mb-1`}>{dict.startTime || 'Start Time'}</label>
                            <input 
                                type="datetime-local" 
                                value={startTime}
                                onChange={e => setStartTime(e.target.value)}
                                className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain} focus:border-blue-500 outline-none text-sm`}
                            />
                        </div>
                        <div>
                            <label className={`block text-xs uppercase ${textSub} font-bold mb-1`}>{dict.endTime || 'End Time'}</label>
                            <input 
                                type="datetime-local" 
                                value={endTime}
                                onChange={e => setEndTime(e.target.value)}
                                className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain} focus:border-blue-500 outline-none text-sm`}
                            />
                        </div>
                        <div>
                            <label className={`block text-xs uppercase ${textSub} font-bold mb-1`}>{dict.intervalMs || 'Interval (ms)'}</label>
                            <input 
                                type="number" 
                                value={interval}
                                onChange={e => setInterval(e.target.value === '' ? '' : parseInt(e.target.value))}
                                placeholder={device.sampling_rate.toString()}
                                className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain} focus:border-blue-500 outline-none text-sm`}
                            />
                            <p className={`text-[10px] ${textSub} mt-1`}>Leave empty to use device default ({device.sampling_rate}ms)</p>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            <input 
                                type="checkbox" 
                                id="cleanExisting"
                                checked={cleanExisting}
                                onChange={e => setCleanExisting(e.target.checked)}
                                className={`w-4 h-4 rounded ${isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-300 bg-white'} text-purple-600 focus:ring-purple-500`}
                            />
                            <label htmlFor="cleanExisting" className={`text-sm ${textMain} font-medium cursor-pointer`}>
                                Clean existing data in range
                            </label>
                        </div>
                    </div>

                    <div className={`border p-3 rounded text-xs flex items-start gap-2 ${isDark ? 'bg-purple-900/20 border-purple-900/50 text-purple-200' : 'bg-purple-50 border-purple-200 text-purple-800'}`}>
                        <Clock size={14} className="mt-0.5 shrink-0" />
                        Data will be generated using current device logic and inserted into TDengine.
                    </div>
                </div>

                <div className={`p-4 border-t ${borderSub} flex justify-end gap-3 ${isDark ? 'bg-slate-900/50' : 'bg-gray-50'}`}>
                    <button onClick={onCancel} className={`px-4 py-2 ${textSub} hover:${textMain} font-semibold text-sm`}>
                        {dict.cancel}
                    </button>
                    <button 
                        onClick={handleConfirm}
                        disabled={isGenerating || !startTime || !endTime}
                        className={`flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-bold transition-colors text-sm`}
                    >
                        {isGenerating ? (
                            <RefreshCw size={14} className="animate-spin" />
                        ) : (
                            <Database size={14} />
                        )}
                        {isGenerating ? (dict.generating || 'Generating...') : (dict.generateData || 'Generate Data')}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- AI Batch Modal Component ---

interface AiBatchModalProps {
    onConfirm: () => void;
    onCancel: () => void;
    description: string;
    setDescription: (desc: string) => void;
    isGenerating: boolean;
    dict: any;
    theme?: 'dark' | 'light';
}

const AiBatchModal: React.FC<AiBatchModalProps> = ({ onConfirm, onCancel, description, setDescription, isGenerating, dict, theme = 'dark' }) => {
    const isDark = theme === 'dark';
    const bgModal = isDark ? 'bg-slate-900' : 'bg-white';
    const borderMain = isDark ? 'border-slate-700' : 'border-gray-200';
    const borderSub = isDark ? 'border-slate-800' : 'border-gray-100';
    const textMain = isDark ? 'text-white' : 'text-gray-900';
    const textSub = isDark ? 'text-slate-400' : 'text-gray-500';
    const inputBg = isDark ? 'bg-slate-800' : 'bg-gray-50';
    const inputBorder = isDark ? 'border-slate-700' : 'border-gray-300';

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className={`${bgModal} border ${borderMain} rounded-lg w-full max-w-lg shadow-2xl`}>
                <div className={`p-4 border-b ${borderSub} flex justify-between items-center`}>
                    <h3 className={`text-lg font-bold ${textMain} flex items-center gap-2`}>
                        <Sparkles className="text-purple-500" size={20} />
                        {dict.aiBatchGeneration || 'AI Batch Generation'}
                    </h3>
                    <button onClick={onCancel} className={`${textSub} hover:${textMain}`}><X size={20}/></button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div className={`text-sm ${textSub} mb-2`}>
                        {dict.aiBatchDesc || 'Describe the devices you want to generate. Be specific about quantity, type, and naming.'}
                    </div>
                    <textarea 
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className={`w-full ${inputBg} border ${inputBorder} rounded p-3 ${textMain} focus:border-purple-500 outline-none h-32 resize-none`}
                        placeholder={dict.aiBatchPlaceholder || "e.g., Create 10 Temperature Sensors for Warehouse A, numbered sequentially."}
                    />
                    <div className={`text-xs ${textSub} flex items-center gap-2`}>
                        <Sparkles size={12} />
                        {dict.aiBatchPoweredBy || 'Powered by active LLM provider (Gemini/DeepSeek)'}
                    </div>
                </div>

                <div className={`p-4 border-t ${borderSub} flex justify-end gap-3 ${isDark ? 'bg-slate-900/50' : 'bg-gray-50'}`}>
                    <button onClick={onCancel} className={`px-4 py-2 ${textSub} hover:${textMain} font-semibold text-sm`}>
                        {dict.cancel}
                    </button>
                    <button 
                        onClick={onConfirm}
                        disabled={isGenerating || !description.trim()}
                        className={`flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-bold transition-colors text-sm`}
                    >
                        {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        {isGenerating ? 'Generating...' : 'Generate Batch'}
                    </button>
                </div>
            </div>
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
  theme?: 'dark' | 'light';
}

const DeviceForm: React.FC<DeviceFormProps> = ({ device: initialDevice, categories, onSave, onCancel, dict, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const bgModal = isDark ? 'bg-slate-900' : 'bg-white';
  const borderMain = isDark ? 'border-slate-700' : 'border-gray-200';
  const borderHeader = isDark ? 'border-slate-800' : 'border-gray-200';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-slate-400' : 'text-gray-500';
  const textSubDarker = isDark ? 'text-slate-500' : 'text-gray-400';
  const inputBg = isDark ? 'bg-slate-800' : 'bg-gray-50';
  const inputBorder = isDark ? 'border-slate-700' : 'border-gray-300';
  const tabActive = isDark ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50' : 'text-blue-600 border-b-2 border-blue-600 bg-blue-50';
  const tabInactive = isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900';

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
      <div className={`${bgModal} border ${borderMain} rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl`}>
        {/* Modal Header */}
        <div className={`p-4 border-b ${borderHeader} flex justify-between items-center`}>
          <h3 className={`text-lg font-bold ${textMain}`}>
            {device.id ? dict.editDevice : dict.createDevice}
          </h3>
          <button onClick={onCancel} className={`${textSub} ${isDark ? 'hover:text-white' : 'hover:text-gray-900'}`}><X size={20}/></button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${borderHeader}`}>
            <button 
                className={`px-6 py-3 text-sm font-bold transition-colors ${activeTab === 'basic' ? tabActive : tabInactive}`}
                onClick={() => setActiveTab('basic')}
            >
                {dict.basicInfo}
            </button>
            <button 
                className={`px-6 py-3 text-sm font-bold transition-colors ${activeTab === 'params' ? tabActive : tabInactive}`}
                onClick={() => setActiveTab('params')}
            >
                {dict.parameters} ({device.parameters?.length || 0})
            </button>
            <button 
                className={`px-6 py-3 text-sm font-bold transition-colors ${activeTab === 'advanced' ? tabActive : tabInactive}`}
                onClick={() => setActiveTab('advanced')}
            >
                {dict.advancedAndErrors}
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
          {activeTab === 'basic' && (
            <div className="space-y-4 max-w-lg mx-auto">
               <div>
                 <label className={`block text-xs uppercase ${textSubDarker} font-bold mb-1`}>{dict.deviceName}</label>
                 <input 
                    type="text" 
                    value={device.name}
                    onChange={e => setDevice({...device, name: e.target.value})}
                    className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain} focus:border-blue-500 outline-none`}
                 />
               </div>
               <div>
                 <label className={`block text-xs uppercase ${textSubDarker} font-bold mb-1`}>{dict.type}</label>
                 <select 
                    value={device.type}
                    onChange={e => handleTypeChange(e.target.value)}
                    className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain} focus:border-blue-500 outline-none`}
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
                 <label className={`block text-xs uppercase ${textSubDarker} font-bold mb-1`}>{dict.description}</label>
                 <textarea 
                    value={device.description}
                    onChange={e => setDevice({...device, description: e.target.value})}
                    className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain} focus:border-blue-500 outline-none h-24`}
                 />
               </div>
               <div>
                 <label className={`block text-xs uppercase ${textSubDarker} font-bold mb-1`}>{dict.samplingRate} (ms)</label>
                 <input 
                    type="number" 
                    value={device.sampling_rate}
                    onChange={e => setDevice({...device, sampling_rate: parseInt(e.target.value)})}
                    className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain} focus:border-blue-500 outline-none`}
                 />
               </div>
               
               <div>
                 <label className={`block text-xs uppercase ${textSubDarker} font-bold mb-1`}>{dict.subTableName || 'TDengine Subtable'}</label>
                 <div className="relative">
                    <input 
                        type="text" 
                        value={device.id ? `device_${device.id}` : `device_<${dict.autoGenerated || 'auto-generated'}>`}
                        readOnly
                        className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textSub} font-mono text-sm`}
                    />
                    {device.id && (
                        <button 
                            onClick={() => navigator.clipboard.writeText(`device_${device.id}`)}
                            className={`absolute right-2 top-2 ${textSub} hover:text-blue-400`}
                            title="Copy to clipboard"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                    )}
                 </div>
                 <p className={`text-[10px] ${textSubDarker} mt-1`}>{dict.subTableHint || 'This is the actual table name in TDengine used for data storage.'}</p>
               </div>
            </div>
          )}

          {activeTab === 'params' && (
            <div className="space-y-3">
                 <div className="flex justify-between items-center mb-4">
                     <div className={`text-sm ${textSub}`}>{dict.defineMetrics}</div>
                     <button onClick={addParam} className={`flex items-center gap-1 text-xs ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-gray-100'} text-blue-400 px-3 py-1.5 rounded border ${borderMain}`}>
                        <Plus size={14}/> {dict.addParameter}
                     </button>
                 </div>

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
                        <input type="text" value="ts" disabled className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textSubDarker} font-mono`} />
                    </div>
                    <div className="w-[140px]">
                        <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramName}</label>
                        <input type="text" value={dict.startTime || "Timestamp"} disabled className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textSubDarker}`} />
                    </div>
                    <div className="w-[100px]">
                        <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramType}</label>
                        <div className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textSubDarker}`}>
                            Timestamp
                        </div>
                    </div>
                    <div className="w-[70px]">
                        <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramUnit}</label>
                        <input type="text" value="ms" disabled className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textSubDarker}`} />
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
                        <input type="text" value="device_code" disabled className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textSubDarker} font-mono`} />
                    </div>
                    <div className="w-[140px]">
                        <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramName || 'Name'}</label>
                        <input type="text" value="Device Code" disabled className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textSubDarker}`} />
                    </div>
                    <div className="w-[100px]">
                        <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramType || 'Data Type'}</label>
                        <div className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textSubDarker}`}>
                            STRING
                        </div>
                    </div>
                     <div className="flex-1 min-w-[150px]">
                         <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.tagValue || 'Tag Value'}</label>
                         <input 
                           type="text" 
                           value={device.parameters?.find(p => p.id === 'device_code')?.default_value || 'Auto-generated'} 
                           disabled
                           className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textSubDarker}`}
                         />
                      </div>
                    <div className="w-[30px] flex justify-center pb-2">
                        <Settings size={16} className="text-slate-600" />
                    </div>
                 </div>

                 {device.parameters?.filter(p => p.id !== 'device_code').map((param, idx) => {
                    const realIdx = device.parameters.findIndex(p => p === param);
                    return (
                    <div key={realIdx} className={`p-3 rounded border flex flex-wrap gap-3 items-end ${param.is_tag ? (isDark ? 'bg-amber-900/20 border-amber-700/50' : 'bg-amber-50 border-amber-200') : (isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50 border-gray-200')}`}>
                       {/* Field Type Select */}
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
                          <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramName}</label>
                          <input 
                            type="text" 
                            value={param.name} 
                            onChange={e => handleParamChange(realIdx, 'name', e.target.value)}
                            className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textMain}`}
                          />
                       </div>
                       <div className="w-[100px]">
                          <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramType}</label>
                          <select 
                             value={param.type}
                             onChange={e => handleParamChange(realIdx, 'type', e.target.value)}
                             className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textMain}`}
                          >
                             {Object.values(ParameterType).map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                       </div>

                       {param.is_tag ? (
                           <div className="flex-1 min-w-[150px]">
                               <label className="block text-[10px] text-amber-400 mb-1 font-bold">{dict.tagValue || 'Tag Value'}</label>
                               <input 
                                   type="text" 
                                   value={param.default_value || ''} 
                                   onChange={e => handleParamChange(realIdx, 'default_value', e.target.value)}
                                   disabled={param.id === 'device_code'}
                                   className={`w-full ${inputBg} border ${isDark ? 'border-amber-500/50' : 'border-amber-200'} rounded px-2 py-1 text-sm ${textMain} ${param.id === 'device_code' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                   placeholder={param.id === 'device_code' ? 'Auto-generated' : "Value for this device"}
                               />
                           </div>
                       ) : (
                           <>
                               <div className="w-[70px]">
                                  <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramUnit}</label>
                                  <input 
                                    type="text" 
                                    value={param.unit || ''} 
                                    onChange={e => handleParamChange(realIdx, 'unit', e.target.value)}
                                    className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textMain}`}
                                  />
                               </div>
                               <div className="w-[70px]">
                                  <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramMin}</label>
                                  <input 
                                    type="number" 
                                    value={param.min_value} 
                                    onChange={e => handleParamChange(realIdx, 'min_value', parseFloat(e.target.value))}
                                    className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textMain}`}
                                  />
                               </div>
                               <div className="w-[70px]">
                                  <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramMax}</label>
                                  <input 
                                    type="number" 
                                    value={param.max_value} 
                                    onChange={e => handleParamChange(realIdx, 'max_value', parseFloat(e.target.value))}
                                    className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textMain}`}
                                  />
                               </div>
                               <div className="w-[110px]">
                                  <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.paramGenMode}</label>
                                  <select 
                                     value={param.generation_mode}
                                     onChange={e => handleParamChange(realIdx, 'generation_mode', e.target.value)}
                                     className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textMain}`}
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
                 {device.parameters?.length === 0 && (
                    <div className={`text-center py-8 ${textSubDarker} italic`}>{dict.noParams}</div>
                 )}
            </div>
          )}

          {activeTab === 'advanced' && (
            <div>
                {/* Physics Config */}
                <div className={`mb-4 ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'} p-4 rounded border ${borderMain}`}>
                    <h4 className={`${textMain} font-bold mb-2`}>{dict.globalPhysicsConfig || 'Physics Config'}</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.massKg || 'Mass (kg)'}</label>
                            <input 
                                type="number" 
                                value={device.physics_config?.mass || ''}
                                onChange={e => handlePhysicsChange('mass', parseFloat(e.target.value))}
                                className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textMain}`} 
                            />
                        </div>
                        <div>
                             <label className={`block text-[10px] ${textSubDarker} mb-1`}>{dict.maxVelocity}</label>
                            <input 
                                type="number" 
                                value={device.physics_config?.max_velocity || ''}
                                onChange={e => handlePhysicsChange('max_velocity', parseFloat(e.target.value))}
                                className={`w-full ${inputBg} border ${inputBorder} rounded px-2 py-1 text-sm ${textMain}`} 
                            />
                        </div>
                    </div>
                </div>
                
                {/* Error Injection */}
                <h4 className={`${textMain} font-bold mb-4`}>{dict.paramErrorInjection || 'Error Injection'}</h4>
                <div className="space-y-4">
                    {(device.parameters || []).filter(p => p.type === ParameterType.NUMBER).map((param, idx) => (
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
                    {device.parameters?.filter(p => p.type === ParameterType.NUMBER).length === 0 && (
                        <div className={`text-slate-500 italic text-sm`}>{dict.noNumericParams}</div>
                    )}
                </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${borderMain} flex justify-end gap-3 ${isDark ? 'bg-slate-900/50' : 'bg-gray-100'}`}>
          <button onClick={onCancel} className={`px-4 py-2 ${textSub} ${isDark ? 'hover:text-white' : 'hover:text-gray-900'} font-semibold`}>{dict.cancel}</button>
          <button 
            onClick={() => onSave(device)}
            disabled={!device.name || !device.type}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} /> {dict.saveDevice}
          </button>
        </div>
      </div>
    </div>
  );
};
