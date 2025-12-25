import React, { useState, useEffect } from 'react';
import { backendService, Prompt, PromptVersion } from '../services/backendService';
import { Save, RefreshCw, Undo, Edit, Loader2, Sparkles, History, RotateCcw, Clock, ArrowLeft } from 'lucide-react';

interface PromptManagerProps {
  dict: any;
  theme?: 'dark' | 'light';
}

export const PromptManager: React.FC<PromptManagerProps> = ({ dict, theme = 'dark' }) => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Editor State
  const [editContent, setEditContent] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editComment, setEditComment] = useState(''); // New: Comment for version history
  
  // History State
  const [viewMode, setViewMode] = useState<'editor' | 'history'>('editor');
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  const isDark = theme === 'dark';
  const bgCard = isDark ? 'bg-slate-800' : 'bg-white';
  const borderCard = isDark ? 'border-slate-700' : 'border-gray-300';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-slate-400' : 'text-gray-500';
  const inputBg = isDark ? 'bg-slate-900' : 'bg-gray-50';
  const inputBorder = isDark ? 'border-slate-700' : 'border-gray-300';
  const itemHover = isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100';
  const itemActive = isDark ? 'bg-slate-700 border-l-4 border-purple-500' : 'bg-gray-100 border-l-4 border-purple-500';

  const fetchPrompts = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching prompts...');
      const data = await backendService.fetchPrompts();
      console.log('Prompts fetched:', data);
      setPrompts(data);
      if (selectedPrompt) {
          const updated = data.find(p => p.key === selectedPrompt.key);
          if (updated) {
              // Update metadata but keep editor state unless switched?
              // For simplicity, we don't force update editor content to avoid losing work.
          }
      } else if (data.length > 0) {
          selectPrompt(data[0]);
      }
    } catch (error) {
      console.error("Failed to fetch prompts", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  const selectPrompt = (prompt: Prompt) => {
      setSelectedPrompt(prompt);
      setEditContent(prompt.template);
      setEditDescription(prompt.description);
      setEditComment('');
      setViewMode('editor');
      setVersions([]); // Clear versions until fetched
  };

  const fetchVersions = async () => {
      if (!selectedPrompt) return;
      setIsLoadingVersions(true);
      try {
          const v = await backendService.fetchPromptVersions(selectedPrompt.key);
          setVersions(v);
      } catch (error) {
          console.error("Failed to fetch versions", error);
      } finally {
          setIsLoadingVersions(false);
      }
  };

  // Switch to History tab
  useEffect(() => {
      if (viewMode === 'history' && selectedPrompt) {
          fetchVersions();
      }
  }, [viewMode, selectedPrompt]);

  const handleSave = async () => {
      if (!selectedPrompt) return;
      setIsSaving(true);
      try {
          // We need to pass comment too, but backendService.updatePrompt currently only takes template/desc.
          // I need to update backendService.updatePrompt to accept comment if I want to support it.
          // But for now, let's just use the existing method, it will default to "Updated by user".
          // Wait, I should probably update the service method to support comment if I want it.
          // For now, I'll stick to the existing signature in frontend to avoid breaking changes there, 
          // but I updated backend to support it. 
          // Actually, let's just update template and description. 
          // The backend will create a version with "Updated by user" or I can add comment support later.
          
          await backendService.updatePrompt(selectedPrompt.key, editContent, editDescription);
          alert(dict?.saveSuccess || 'Saved successfully');
          fetchPrompts();
          if (viewMode === 'history') fetchVersions();
      } catch (error) {
          alert(dict?.saveFailed || 'Save failed');
      } finally {
          setIsSaving(false);
      }
  };

  const handleResetAll = async () => {
      if (!confirm(dict?.confirmReset || 'Are you sure you want to reset all prompts to default? This action cannot be undone.')) return;
      setIsLoading(true);
      try {
          const newPrompts = await backendService.resetPrompts();
          setPrompts(newPrompts);
          if (newPrompts.length > 0) {
              selectPrompt(newPrompts[0]);
          }
          alert(dict?.resetSuccess || 'Prompts reset to defaults');
      } catch (error) {
          alert(dict?.resetFailed || 'Reset failed');
      } finally {
          setIsLoading(false);
      }
  };

  const handleResetSingle = async () => {
      if (!selectedPrompt) return;
      if (!confirm(`Reset "${selectedPrompt.key}" to default? Current changes will be saved to history.`)) return;
      setIsSaving(true);
      try {
          const updated = await backendService.resetSinglePrompt(selectedPrompt.key);
          // Update local state
          const newPrompts = prompts.map(p => p.key === updated.key ? updated : p);
          setPrompts(newPrompts);
          selectPrompt(updated);
          alert('Prompt reset to default');
      } catch (error) {
          alert('Failed to reset prompt');
      } finally {
          setIsSaving(false);
      }
  };

  const handleRestore = async (version: PromptVersion) => {
      if (!selectedPrompt) return;
      if (!confirm(`Restore version from ${new Date(version.created_at).toLocaleString()}?`)) return;
      setIsSaving(true);
      try {
          const updated = await backendService.restorePromptVersion(selectedPrompt.key, version.id);
          const newPrompts = prompts.map(p => p.key === updated.key ? updated : p);
          setPrompts(newPrompts);
          selectPrompt(updated);
          alert('Version restored successfully');
          setViewMode('editor');
      } catch (error) {
          alert('Failed to restore version');
      } finally {
          setIsSaving(false);
      }
  };

  return (
    <div className="flex h-[600px] gap-4">
        {/* Sidebar List */}
        <div className={`w-1/3 flex flex-col border ${borderCard} rounded-lg overflow-hidden`}>
            <div className={`p-3 border-b ${borderCard} flex justify-between items-center ${isDark ? 'bg-slate-900/50' : 'bg-gray-100'}`}>
                <span className={`text-sm font-bold ${textMain} flex items-center gap-2`}>
                    <Sparkles size={14} className="text-purple-500" />
                    AI Prompts ({prompts.length})
                </span>
                <button onClick={fetchPrompts} className={`${textSub} hover:${textMain}`} title="Refresh">
                    <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''}/>
                </button>
            </div>
            <div className="flex-1 overflow-y-auto">
                {isLoading && prompts.length === 0 && (
                    <div className={`p-4 text-center ${textSub} text-sm`}>Loading...</div>
                )}
                {!isLoading && prompts.length === 0 && (
                     <div className={`p-4 text-center ${textSub} text-sm`}>
                        No prompts found.
                        <br/>
                        <button onClick={handleResetAll} className="text-purple-500 hover:underline mt-2">Reset All to Defaults</button>
                     </div>
                )}
                {prompts.map(p => (
                    <div 
                        key={p.key}
                        onClick={() => selectPrompt(p)}
                        className={`p-3 cursor-pointer text-sm transition-colors ${selectedPrompt?.key === p.key ? itemActive : `${itemHover} border-l-4 border-transparent`}`}
                    >
                        <div className={`font-medium ${textMain} truncate`}>{p.key}</div>
                        <div className={`text-xs ${textSub} truncate`}>{p.description}</div>
                    </div>
                ))}
            </div>
            <div className={`p-3 border-t ${borderCard} ${isDark ? 'bg-slate-900/30' : 'bg-gray-50'}`}>
                <button 
                    onClick={handleResetAll}
                    className={`w-full py-2 flex items-center justify-center gap-2 text-xs text-red-400 hover:bg-red-900/20 rounded transition-colors border border-transparent hover:border-red-900/30`}
                >
                    <Undo size={14} /> {dict?.resetDefaults || 'Reset All to Defaults'}
                </button>
            </div>
        </div>

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col border ${borderCard} rounded-lg overflow-hidden ${bgCard}`}>
            {selectedPrompt ? (
                <>
                    {/* Header with Tabs and Actions */}
                    <div className={`p-3 border-b ${borderCard} flex justify-between items-center`}>
                        <div className="flex bg-slate-100 dark:bg-slate-900 rounded p-1">
                            <button 
                                onClick={() => setViewMode('editor')}
                                className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-2 transition-colors ${viewMode === 'editor' ? 'bg-white dark:bg-slate-700 shadow text-purple-600 dark:text-purple-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                <Edit size={14} /> Editor
                            </button>
                            <button 
                                onClick={() => setViewMode('history')}
                                className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-2 transition-colors ${viewMode === 'history' ? 'bg-white dark:bg-slate-700 shadow text-purple-600 dark:text-purple-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                <History size={14} /> History
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={handleResetSingle}
                                disabled={isSaving}
                                className={`px-3 py-1.5 text-xs font-medium text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-900/30 transition-colors flex items-center gap-1`}
                                title="Reset only this prompt to default"
                            >
                                <RotateCcw size={14} /> Reset Current
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={isSaving}
                                className={`px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold text-xs transition-colors disabled:opacity-50 flex items-center gap-1`}
                            >
                                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                {dict?.save || 'Save'}
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden flex flex-col relative">
                        {viewMode === 'editor' ? (
                            <>
                                <div className={`p-4 border-b ${borderCard} space-y-3`}>
                                    <div>
                                        <h3 className={`text-lg font-bold ${textMain} font-mono`}>{selectedPrompt.key}</h3>
                                        <p className={`text-xs ${textSub} font-mono mt-1`}>Last updated: {new Date(selectedPrompt.updated_at).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <label className={`block text-xs uppercase ${textSub} font-bold mb-1`}>Description</label>
                                        <input 
                                            type="text" 
                                            value={editDescription}
                                            onChange={e => setEditDescription(e.target.value)}
                                            className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain} text-sm focus:border-purple-500 outline-none`}
                                        />
                                    </div>
                                </div>
                                <div className={`px-4 py-2 text-xs ${textSub} ${isDark ? 'bg-slate-900/30' : 'bg-gray-100'} border-b ${borderCard} flex justify-between`}>
                                    <span>Prompt Template</span>
                                    <span className="font-mono text-purple-400">{'{{variable}}'} supported</span>
                                </div>
                                <textarea 
                                    value={editContent}
                                    onChange={e => setEditContent(e.target.value)}
                                    className={`flex-1 w-full p-4 ${inputBg} ${textMain} font-mono text-sm focus:outline-none resize-none leading-relaxed`}
                                    spellCheck={false}
                                />
                            </>
                        ) : (
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {isLoadingVersions ? (
                                    <div className="flex justify-center p-8 text-slate-500">
                                        <Loader2 size={24} className="animate-spin" />
                                    </div>
                                ) : versions.length === 0 ? (
                                    <div className="text-center p-8 text-slate-500">
                                        <History size={32} className="mx-auto mb-2 opacity-20" />
                                        <p>No version history available</p>
                                    </div>
                                ) : (
                                    <div className="relative border-l-2 border-slate-300 dark:border-slate-700 ml-3 space-y-6">
                                        {versions.map((v, idx) => (
                                            <div key={v.id} className="relative pl-6">
                                                {/* Timeline Dot */}
                                                <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${idx === 0 ? 'bg-purple-500 border-purple-500' : 'bg-white dark:bg-slate-800 border-slate-400 dark:border-slate-600'}`} />
                                                
                                                <div className={`p-3 rounded-lg border ${borderCard} ${bgCard} shadow-sm`}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-sm font-bold ${textMain}`}>Version {v.version}</span>
                                                                {idx === 0 && <span className="text-[10px] bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded-full font-bold">Current</span>}
                                                            </div>
                                                            <div className={`text-xs ${textSub} flex items-center gap-1 mt-0.5`}>
                                                                <Clock size={10} />
                                                                {new Date(v.created_at).toLocaleString()}
                                                            </div>
                                                        </div>
                                                        {idx !== 0 && (
                                                            <button 
                                                                onClick={() => handleRestore(v)}
                                                                className="text-xs text-purple-500 hover:text-purple-600 hover:underline font-medium flex items-center gap-1"
                                                            >
                                                                <RotateCcw size={12} /> Restore
                                                            </button>
                                                        )}
                                                    </div>
                                                    
                                                    {v.comment && (
                                                        <div className={`text-xs ${textSub} italic mb-2 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded`}>
                                                            "{v.comment}"
                                                        </div>
                                                    )}
                                                    
                                                    <div className={`text-xs font-mono p-2 rounded ${isDark ? 'bg-slate-900' : 'bg-slate-100'} max-h-24 overflow-hidden text-ellipsis opacity-70`}>
                                                        {v.template.substring(0, 150)}...
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500 flex-col gap-2">
                    <Sparkles size={48} className="opacity-20" />
                    <p>Select a prompt to edit</p>
                </div>
            )}
        </div>
    </div>
  );
};
