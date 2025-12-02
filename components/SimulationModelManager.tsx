import React, { useState, useEffect } from 'react';
import { 
  SimulationModel, backendService 
} from '../services/backendService';
import { 
  Plus, Trash2, Edit, Save, X, FileCode, RefreshCw, AlertTriangle 
} from 'lucide-react';

interface SimulationModelManagerProps {
  onClose: () => void;
  dict: any;
}

export const SimulationModelManager: React.FC<SimulationModelManagerProps> = ({ onClose, dict }) => {
  const [models, setModels] = useState<SimulationModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingModel, setEditingModel] = useState<Partial<SimulationModel> | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchModels = async () => {
    setIsLoading(true);
    try {
      const data = await backendService.fetchSimulationModels();
      setModels(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm(dict.deleteModelConfirm)) return;
    try {
      await backendService.deleteSimulationModel(id);
      fetchModels();
    } catch (error) {
      alert(dict.deleteFailed || 'Failed to delete simulation model');
    }
  };

  const handleSave = async (model: Partial<SimulationModel>) => {
    try {
      let payload = { ...model };
      if (typeof payload.config === 'string') {
        try {
          payload.config = JSON.parse(payload.config);
        } catch (e) {
          alert(dict.invalidJson || 'Invalid JSON for config');
          return;
        }
      }

      if (model.id) {
        await backendService.updateSimulationModel(model.id, payload);
      } else {
        await backendService.createSimulationModel(payload);
      }
      setIsFormOpen(false);
      setEditingModel(null);
      fetchModels();
    } catch (error: any) {
      alert(error.message || dict.saveFailed || 'Failed to save model');
    }
  };

  const openCreate = () => {
    setEditingModel({
      name: '',
      type: 'custom',
      description: '',
      config: {}
    });
    setIsFormOpen(true);
  };

  const openEdit = (model: SimulationModel) => {
    setEditingModel(JSON.parse(JSON.stringify(model)));
    setIsFormOpen(true);
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <FileCode className="text-purple-500" />
          {dict.modelManagement}
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={fetchModels} 
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
            {dict.newModel}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map(model => (
            <div key={model.id} className="bg-slate-800 p-4 rounded border border-slate-700 hover:border-slate-600 transition-all group">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold text-lg text-white">{model.name}</div>
                  <div className="text-xs text-slate-500 font-mono px-1.5 py-0.5 bg-slate-900 rounded inline-block mt-1">{model.type}</div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(model)} className="p-1.5 text-blue-400 hover:bg-blue-900/30 rounded">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(model.id)} className="p-1.5 text-red-400 hover:bg-red-900/30 rounded">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-3 line-clamp-2">{model.description || dict.noDescription}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Form */}
      {isFormOpen && editingModel && (
        <ModelForm 
          model={editingModel} 
          onSave={handleSave} 
          onCancel={() => setIsFormOpen(false)}
          dict={dict}
        />
      )}
    </div>
  );
};

// --- Model Form Component ---

interface ModelFormProps {
  model: Partial<SimulationModel>;
  onSave: (model: Partial<SimulationModel>) => void;
  onCancel: () => void;
  dict: any;
}

const ModelForm: React.FC<ModelFormProps> = ({ model: initialModel, onSave, onCancel, dict }) => {
  const [model, setModel] = useState(initialModel);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [configString, setConfigString] = useState(
    JSON.stringify(initialModel.config || {}, null, 2)
  );

  useEffect(() => {
    try {
        const parsed = JSON.parse(configString);
        setModel(prev => ({ ...prev, config: parsed }));
        setJsonError(null);
    } catch (e) {
        setJsonError(dict.invalidJsonFormat || 'Invalid JSON format');
    }
  }, [configString]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-2xl flex flex-col shadow-2xl max-h-[90vh]">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">
            {model.id ? dict.editModel : dict.createModel}
          </h3>
          <button onClick={onCancel} className="text-slate-500 hover:text-white"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
           <div>
             <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{dict.modelName}</label>
             <input 
                type="text" 
                value={model.name}
                onChange={e => setModel({...model, name: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none"
             />
           </div>
           <div>
             <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{dict.type}</label>
             <input 
                type="text" 
                value={model.type}
                onChange={e => setModel({...model, type: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none font-mono"
             />
           </div>
           <div>
             <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{dict.description}</label>
             <textarea 
                value={model.description}
                onChange={e => setModel({...model, description: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none h-20"
             />
           </div>
           <div className="flex-1 flex flex-col min-h-[200px]">
             <div className="flex justify-between items-center mb-1">
                 <label className="block text-xs uppercase text-slate-500 font-bold">{dict.configJson}</label>
                 {jsonError && <span className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle size={12}/> {jsonError}</span>}
             </div>
             <textarea 
                value={configString}
                onChange={e => setConfigString(e.target.value)}
                className={`w-full flex-1 bg-slate-950 border rounded p-2 text-slate-300 font-mono text-sm outline-none ${
                    jsonError ? 'border-red-500/50 focus:border-red-500' : 'border-slate-800 focus:border-blue-500'
                }`}
                placeholder='{"param": "value", ...}'
             />
           </div>
        </div>

        <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50">
          <button onClick={onCancel} className="px-4 py-2 text-slate-400 hover:text-white font-semibold">{dict.cancel}</button>
          <button 
            onClick={() => !jsonError && onSave(model)}
            disabled={!!jsonError || !model.name}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} /> {dict.saveModel}
          </button>
        </div>
      </div>
    </div>
  );
};
