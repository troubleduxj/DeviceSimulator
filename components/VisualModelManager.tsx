import React, { useState, useEffect } from 'react';
import { 
  SimulationModel, backendService, BackendParameter, ParameterType, GenerationMode 
} from '../services/backendService';
import { 
  Plus, Trash2, Edit, Save, X, Folder, Database, RefreshCw, AlertTriangle, Settings, Sparkles, Loader2, Box, Eye 
} from 'lucide-react';
import { generateCategorySchema, generateVisualModel } from '../services/geminiService'; // Reusing AI generation for now, might need specialized one
import { DigitalTwin } from './DigitalTwin';
import { Device } from '../types';

interface VisualModelManagerProps {
  onClose: () => void;
  dict: any;
  theme?: 'dark' | 'light';
  lang?: string;
}

export const VisualModelManager: React.FC<VisualModelManagerProps> = ({ onClose, dict, theme = 'dark', lang = 'zh' }) => {
  const isDark = theme === 'dark';
  const bgMain = isDark ? 'bg-slate-900' : 'bg-gray-50';
  const bgCard = isDark ? 'bg-slate-800' : 'bg-white';
  const bgHeader = isDark ? 'bg-slate-900' : 'bg-gray-100';
  const borderMain = isDark ? 'border-slate-700' : 'border-gray-200';
  const borderCard = isDark ? 'border-slate-700' : 'border-gray-300';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-slate-400' : 'text-gray-500';
  const hoverBg = isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-200';
  const buttonBg = isDark ? 'bg-slate-800' : 'bg-white';
  const tagBg = isDark ? 'bg-slate-900' : 'bg-gray-100';

  const [models, setModels] = useState<SimulationModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingModel, setEditingModel] = useState<Partial<SimulationModel> | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [previewModel, setPreviewModel] = useState<SimulationModel | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await backendService.fetchSimulationModels();
      setModels(data);
    } catch (error) {
      console.error('Error fetching models:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm(dict.deleteModelConfirm || 'Are you sure you want to delete this visual model?')) return;
    try {
      await backendService.deleteSimulationModel(id);
      fetchData();
    } catch (error) {
      alert(dict.deleteFailed || 'Failed to delete model');
    }
  };

  const handleSave = async (model: Partial<SimulationModel>) => {
    try {
      let payload = { ...model };
      // Ensure parameters is valid JSON if it's a string (though BackendParameter[] is object)
      // Just basic validation
      if (!payload.name) {
          alert('Name is required');
          return;
      }

      if (model.id) {
        await backendService.updateSimulationModel(model.id, payload);
      } else {
        await backendService.createSimulationModel(payload);
      }
      setIsFormOpen(false);
      setEditingModel(null);
      fetchData();
    } catch (error: any) {
      console.error(error);
      alert(dict.saveFailed || 'Failed to save model: ' + error.message);
    }
  };

  const handleEdit = (model: SimulationModel) => {
    setEditingModel(model);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingModel({
      name: '',
      type: 'GLB',
      description: '',
      parameters: [] // Start with empty params
    });
    setIsFormOpen(true);
  };

  const handleAiGenerate = async () => {
      if (!editingModel?.description) {
          alert("Please enter a description first to generate the model.");
          return;
      }
      
      setIsGenerating(true);
      try {
          const generated = await generateVisualModel(editingModel.description, lang);
          console.log("AI Generated Model:", generated);

          if (!generated) throw new Error("Received empty response from AI");
          
          // Map AI generated parameters to match BackendParameter type
          const mappedParams = (generated.parameters || []).map((p: any) => {
              let type = ParameterType.STRING;
              const t = (p.type || '').toUpperCase();
              if (t === 'INT' || t === 'FLOAT' || t === 'NUMBER' || t === 'DOUBLE') type = ParameterType.NUMBER;
              else if (t === 'BOOL' || t === 'BOOLEAN') type = ParameterType.BOOLEAN;
              
              return {
                  ...p,
                  type: type,
                  // Ensure required fields
                  id: p.id || 'param_' + Math.random().toString(36).substr(2, 9),
                  generation_mode: GenerationMode.RANDOM,
                  generation_params: {}
              };
          });

          // If AI returns "Custom" type, or if visual_config is present but type is "Generic", enforce "Custom"
          let aiType = generated.type || prev?.type || 'Generic';
          if (generated.visual_config && generated.visual_config.components && generated.visual_config.components.length > 0) {
              if (aiType === 'Generic') aiType = 'Custom';
          }

          setEditingModel(prev => ({
              ...prev,
              name: generated.name || prev?.name,
              type: aiType,
              description: generated.description || prev?.description,
              parameters: mappedParams,
              visual_config: generated.visual_config || {}
          }));
      } catch (error: any) {
          console.error("AI Generation Failed:", error);
          alert("AI Generation Failed: " + error.message);
      } finally {
          setIsGenerating(false);
      }
  };

  const handlePreview = (model: SimulationModel) => {
      setPreviewModel(model);
  };

  // Construct a fake device for preview
  const getPreviewDevice = (model: SimulationModel): Device => {
      return {
          id: 'preview_device',
          name: model.name,
          type: model.type, // This tells DigitalTwin which component to load
          description: model.description || '',
          status: 'running', // Animate it
          currentScenario: 'Normal',
          scenarios: ['Normal'],
          metrics: [],
          visual_model: model.type, // Also pass visual_model
          visual_config: model.visual_config // Pass visual_config
      };
  };

  return (
    <div className={`h-full flex flex-col ${bgMain} overflow-hidden relative`}>
      {/* Header */}
      <div className={`p-4 border-b ${borderMain} flex items-center justify-between shrink-0 ${bgHeader}`}>
        <div className="flex items-center gap-3">
          {/* Close button removed as requested */}
          <div className="flex items-center gap-3">
             <Box size={24} className="text-pink-500" />
             <div>
                <h2 className={`text-lg font-bold ${textMain}`}>{dict.visualModelConfig || 'Visual Model Config'}</h2>
                <p className={`text-xs ${textSub}`}>{dict.visualModelDesc || 'Manage 3D models and simulation templates.'}</p>
             </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={fetchData} 
                className={`p-2 rounded-full ${hoverBg} ${textSub}`}
                title={dict.refresh}
            >
                <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
            </button>
            <button 
                onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors font-medium text-sm"
            >
                <Plus size={16} />
                {dict.createModel || 'New Model'}
            </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {isLoading && models.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-500">
                  <Loader2 className="animate-spin" size={32} />
                  <p>Loading models...</p>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {models.map(model => (
                      <div key={model.id} className={`${bgCard} border ${borderCard} rounded-xl p-4 flex flex-col hover:shadow-lg transition-all group relative overflow-hidden`}>
                          <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-500`}>
                                      <Box size={20} />
                                  </div>
                                  <div>
                                      <h3 className={`font-bold ${textMain} text-sm line-clamp-1`} title={model.name}>{model.name}</h3>
                                      <span className={`text-xs px-1.5 py-0.5 rounded ${tagBg} ${textSub} font-mono`}>{model.type}</span>
                                  </div>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handlePreview(model)} className={`p-1.5 rounded ${hoverBg} text-emerald-400`} title={dict.preview || 'Preview'}>
                                      <Eye size={14} />
                                  </button>
                                  <button onClick={() => handleEdit(model)} className={`p-1.5 rounded ${hoverBg} text-purple-400`} title={dict.edit}>
                                      <Edit size={14} />
                                  </button>
                                  <button onClick={() => handleDelete(model.id)} className={`p-1.5 rounded ${hoverBg} text-red-400`} title={dict.delete}>
                                      <Trash2 size={14} />
                                  </button>
                              </div>
                          </div>
                          
                          <p className={`text-xs ${textSub} line-clamp-2 mb-4 h-8`}>
                              {model.description || dict.noDescription}
                          </p>

                          <div className={`mt-auto pt-3 border-t ${borderCard} flex justify-between items-center text-xs ${textSub}`}>
                              <span>{model.parameters.length} {dict.parameters || 'Parameters'}</span>
                              <span className="font-mono">{new Date(model.updated_at || Date.now()).toLocaleDateString()}</span>
                          </div>
                      </div>
                  ))}
                  
                  {models.length === 0 && !isLoading && (
                      <div className="col-span-full flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-700 rounded-xl text-slate-500 gap-2">
                          <Box size={32} className="opacity-50" />
                          <p>{dict.noModels || 'No visual models found.'}</p>
                          <button onClick={handleCreate} className="text-pink-500 hover:underline text-sm font-medium">
                              {dict.createFirst || 'Create your first model'}
                          </button>
                      </div>
                  )}
              </div>
          )}
      </div>

      {/* Edit/Create Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className={`w-full max-w-2xl ${bgCard} border ${borderCard} rounded-xl shadow-2xl flex flex-col max-h-[90vh]`}>
                <div className={`p-4 border-b ${borderCard} flex justify-between items-center`}>
                    <h3 className={`text-lg font-bold ${textMain}`}>
                        {editingModel?.id ? (dict.editModel || 'Edit Visual Model') : (dict.createModel || 'New Visual Model')}
                    </h3>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleAiGenerate}
                            className={`text-xs flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium`}
                            disabled={isGenerating || !editingModel?.description}
                            title="Generate model config from description using AI"
                        >
                            {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            {isGenerating ? 'Generating...' : 'AI Auto-Fill'}
                        </button>
                        <button onClick={() => setIsFormOpen(false)} className={`${textSub} hover:${textMain} p-1`}>
                            <X size={20} />
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className={`text-xs font-bold ${textSub} uppercase`}>{dict.name || 'Name'}</label>
                            <input 
                                type="text" 
                                value={editingModel?.name || ''}
                                onChange={e => setEditingModel(prev => ({ ...prev, name: e.target.value }))}
                                className={`w-full p-2 rounded border ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-gray-900'} focus:ring-2 focus:ring-pink-500 outline-none`}
                                placeholder="e.g. Industrial Robot Arm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className={`text-xs font-bold ${textSub} uppercase`}>{dict.type || 'Type'}</label>
                            <select 
                                value={editingModel?.type || 'GLB'}
                                onChange={e => setEditingModel(prev => ({ ...prev, type: e.target.value }))}
                                className={`w-full p-2 rounded border ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-gray-900'} focus:ring-2 focus:ring-pink-500 outline-none`}
                            >
                                <option value="Generator">Generator (Built-in)</option>
                                <option value="Cutter">Cutter (Built-in)</option>
                                <option value="Generic">Generic (Built-in)</option>
                                <option value="Custom">Custom (AI Generated)</option>
                                <option value="GLB">GLB (Binary glTF)</option>
                                <option value="GLTF">glTF (JSON)</option>
                                <option value="OBJ">OBJ (Wavefront)</option>
                                <option value="FBX">FBX</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className={`text-xs font-bold ${textSub} uppercase`}>{dict.description || 'Description'}</label>
                        <textarea 
                            value={editingModel?.description || ''}
                            onChange={e => setEditingModel(prev => ({ ...prev, description: e.target.value }))}
                            className={`w-full p-2 rounded border ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-gray-900'} focus:ring-2 focus:ring-pink-500 outline-none min-h-[80px]`}
                            placeholder="Description of the 3D model..."
                        />
                    </div>
                    
                    {/* Placeholder for parameter editor or file uploader */}
                    <div className={`p-4 rounded border border-dashed ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-300 bg-gray-50'}`}>
                        <p className={`text-center text-sm ${textSub}`}>
                            Parameter editing and file upload will be implemented in future updates.
                            <br/>
                            Currently manages metadata only.
                        </p>
                    </div>

                </div>

                <div className={`p-4 border-t ${borderCard} flex justify-end gap-3`}>
                    <button 
                        onClick={() => setIsFormOpen(false)}
                        className={`px-4 py-2 rounded ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-600'}`}
                    >
                        {dict.cancel || 'Cancel'}
                    </button>
                    <button 
                        onClick={() => editingModel && handleSave(editingModel)}
                        className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded font-medium"
                    >
                        {dict.save || 'Save'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewModel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className={`w-full max-w-4xl h-[80vh] ${bgCard} border ${borderCard} rounded-xl shadow-2xl flex flex-col relative`}>
                  <button 
                      onClick={() => setPreviewModel(null)} 
                      className={`absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors`}
                  >
                      <X size={20} />
                  </button>
                  
                  <div className="flex-1 rounded-t-xl overflow-hidden relative">
                      <DigitalTwin 
                          device={getPreviewDevice(previewModel)}
                          latestData={null}
                          dict={dict}
                          theme={theme}
                      />
                  </div>
                  
                  <div className={`p-4 border-t ${borderCard} flex justify-between items-center`}>
                      <div>
                          <h3 className={`font-bold ${textMain}`}>{previewModel.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded ${tagBg} ${textSub} font-mono`}>{previewModel.type}</span>
                      </div>
                      <p className={`text-xs ${textSub} max-w-md text-right`}>
                          {previewModel.description}
                      </p>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};
