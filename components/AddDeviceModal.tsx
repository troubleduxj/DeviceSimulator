import React, { useState } from 'react';
import { Device, MetricConfig } from '../types';
import { X, Plus, Trash2 } from 'lucide-react';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (device: Device) => void;
  dict: any;
  theme?: 'dark' | 'light';
}

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({ isOpen, onClose, onSave, dict, theme = 'dark' }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<Device['type']>('Generic');
  const [metrics, setMetrics] = useState<MetricConfig[]>([]);
  const [metricInput, setMetricInput] = useState<Partial<MetricConfig>>({ min: 0, max: 100 });

  const isDark = theme === 'dark';
  const bgModal = isDark ? 'bg-slate-900' : 'bg-white';
  const borderMain = isDark ? 'border-slate-700' : 'border-gray-200';
  const borderSub = isDark ? 'border-slate-800' : 'border-gray-100';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-slate-400' : 'text-gray-500';
  const inputBg = isDark ? 'bg-slate-900' : 'bg-gray-50';
  const inputBorder = isDark ? 'border-slate-700' : 'border-gray-300';
  const itemBg = isDark ? 'bg-slate-900' : 'bg-gray-100';

  if (!isOpen) return null;

  const handleAddMetric = () => {
    if (metricInput.id && metricInput.name) {
      setMetrics([...metrics, { 
        id: metricInput.id, 
        name: metricInput.name, 
        unit: metricInput.unit || '', 
        min: metricInput.min || 0, 
        max: metricInput.max || 100 
      }]);
      setMetricInput({ min: 0, max: 100, id: '', name: '', unit: '' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newDevice: Device = {
      id: `dev_${Date.now()}`,
      name,
      type,
      description: dict.customDeviceDesc,
      status: 'stopped',
      currentScenario: 'Normal Operation',
      scenarios: ['Normal Operation', 'High Load', 'Failure'],
      metrics: metrics.length > 0 ? metrics : [{ id: 'val', name: 'Value', unit: '%', min: 0, max: 100 }],
    };
    onSave(newDevice);
    onClose();
    // Reset form
    setName('');
    setMetrics([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className={`${bgModal} border ${borderMain} rounded-lg w-full max-w-lg p-6 shadow-2xl`}>
        <div className="flex justify-between items-center mb-6">
            <h2 className={`text-xl font-bold ${textMain}`}>{dict.addDevice}</h2>
            <button onClick={onClose}><X className={`${textSub} hover:${textMain}`} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className={`block text-sm ${textSub} mb-1`}>{dict.name}</label>
                <input required value={name} onChange={e => setName(e.target.value)} className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain} focus:border-blue-500 outline-none`} />
            </div>
            
            <div>
                <label className={`block text-sm ${textSub} mb-1`}>{dict.type}</label>
                <select value={type} onChange={e => setType(e.target.value as any)} className={`w-full ${inputBg} border ${inputBorder} rounded p-2 ${textMain}`}>
                    <option value="Generic">{dict.generic}</option>
                    <option value="Generator">{dict.generator}</option>
                    <option value="Cutter">{dict.cutter}</option>
                </select>
            </div>

            <div className={`border-t ${borderSub} pt-4`}>
                <label className={`block text-sm ${textSub} mb-2`}>{dict.metrics}</label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                    <input placeholder={dict.metricIdPlaceholder} value={metricInput.id || ''} onChange={e => setMetricInput({...metricInput, id: e.target.value})} className={`${inputBg} rounded p-1 text-xs border ${inputBorder} ${textMain}`} />
                    <input placeholder={dict.metricNamePlaceholder} value={metricInput.name || ''} onChange={e => setMetricInput({...metricInput, name: e.target.value})} className={`${inputBg} rounded p-1 text-xs border ${inputBorder} ${textMain}`} />
                    <input placeholder={dict.metricUnitPlaceholder} value={metricInput.unit || ''} onChange={e => setMetricInput({...metricInput, unit: e.target.value})} className={`${inputBg} rounded p-1 text-xs border ${inputBorder} ${textMain}`} />
                </div>
                <button type="button" onClick={handleAddMetric} className={`w-full py-1 ${inputBg} hover:${isDark ? 'bg-slate-700' : 'bg-gray-200'} text-blue-400 text-xs rounded border border-dashed ${isDark ? 'border-slate-600' : 'border-gray-400'} flex items-center justify-center gap-1`}>
                    <Plus size={12}/> {dict.addMetric}
                </button>

                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                    {metrics.map((m, i) => (
                        <div key={i} className={`flex justify-between items-center ${itemBg} p-2 rounded text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                            <span>{m.name} ({m.unit})</span>
                            <button type="button" onClick={() => setMetrics(metrics.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300"><Trash2 size={12}/></button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onClose} className={`px-4 py-2 rounded ${textSub} hover:${textMain} text-sm`}>{dict.cancel}</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium">{dict.create}</button>
            </div>
        </form>
      </div>
    </div>
  );
};
