import React, { useState, useEffect, useRef } from 'react';
import { Device, SimulationStep } from '../types';
import { backendService } from '../services/backendService';
import { Activity, Clock, Server, Zap, AlertCircle } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { SearchableSelect } from './SearchableSelect';

interface RealtimeMonitorProps {
  devices: Device[];
  activeDeviceId: string;
  onDeviceChange: (id: string) => void;
  history: SimulationStep[];
  dict: any;
}

export const RealtimeMonitor: React.FC<RealtimeMonitorProps> = ({ 
  devices, 
  activeDeviceId, 
  onDeviceChange, 
  history,
  dict 
}) => {
  const selectedDevice = devices.find(d => d.id === activeDeviceId);

  // Helper for metrics
  const latestData = history.length > 0 ? history[history.length - 1] : null;
  const getMetricValue = (key: string) => {
      if (!latestData || !latestData.metrics) return '-';
      const val = latestData.metrics[key];
      return typeof val === 'number' ? val.toFixed(2) : val;
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <Activity className="text-emerald-500" />
                <h2 className="text-lg font-bold text-white">{dict.monitorTitle || 'Real-time Monitor'}</h2>
            </div>
            
            <div className="h-8 w-px bg-slate-800 mx-2" />
            
            <div className="w-64">
                <SearchableSelect 
                    options={devices.map(d => ({ value: d.id, label: d.name }))}
                    value={activeDeviceId}
                    onChange={onDeviceChange}
                    placeholder={dict.searchDevice || "Select device..."}
                />
            </div>
        </div>

        {/* Status Indicator */}
        {selectedDevice && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                selectedDevice.status === 'running' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}>
                <div className={`w-2 h-2 rounded-full ${
                    selectedDevice.status === 'running' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
                }`} />
                <span className="text-xs font-bold uppercase">{selectedDevice.status === 'running' ? dict.running : dict.stopped}</span>
            </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto no-scrollbar">
          {!selectedDevice ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                  <Activity size={48} className="opacity-20" />
                  <p>Select a device to view real-time metrics.</p>
              </div>
          ) : (
              <div className="flex flex-col gap-6 h-full">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {selectedDevice.parameters?.filter(p => p.type === '数值').slice(0, 6).map(param => (
                          <div key={param.id} className="bg-slate-800 p-4 rounded border border-slate-700 relative overflow-hidden group">
                              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                  <Zap size={32} />
                              </div>
                              <div className="text-xs text-slate-500 uppercase font-bold mb-1 truncate">{param.name}</div>
                              <div className="text-2xl font-mono text-white font-bold">
                                  {getMetricValue(param.id || param.name)}
                                  <span className="text-sm text-slate-500 ml-1 font-normal">{param.unit}</span>
                              </div>
                          </div>
                      ))}
                      {/* Add Status Card */}
                      <div className="bg-slate-800 p-4 rounded border border-slate-700 relative overflow-hidden">
                            <div className="text-xs text-slate-500 uppercase font-bold mb-1">Scenario</div>
                            <div className="text-sm font-bold text-blue-400 truncate" title={selectedDevice.currentScenario}>
                                {selectedDevice.currentScenario || 'None'}
                            </div>
                      </div>
                  </div>

                  {/* Main Chart */}
                  <div className="flex-1 bg-slate-800 p-4 rounded border border-slate-700 min-h-[300px] flex flex-col">
                      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                          <Activity size={16} className="text-emerald-400" />
                          {dict.realTimeMetrics || 'Real-time Trends'}
                      </h3>
                      <div className="flex-1 w-full min-h-0">
                          {history.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={history}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis 
                                      dataKey="timestamp" 
                                      tickFormatter={(ts) => new Date(ts).toLocaleTimeString()} 
                                      stroke="#64748b"
                                      fontSize={12}
                                      domain={['dataMin', 'dataMax']}
                                    />
                                    <YAxis stroke="#64748b" fontSize={12} />
                                    <Tooltip 
                                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                                      labelFormatter={(label) => new Date(label).toLocaleString()}
                                    />
                                    {/* Render first 3 numeric params */}
                                    {selectedDevice.parameters?.filter(p => p.type === '数值').slice(0, 3).map((param, idx) => (
                                        <Line 
                                          key={param.id}
                                          type="monotone" 
                                          dataKey={`metrics.${param.id || param.name}`}
                                          name={param.name}
                                          stroke={['#10b981', '#3b82f6', '#f59e0b'][idx % 3]} 
                                          dot={false}
                                          strokeWidth={2}
                                          isAnimationActive={false}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                          ) : (
                              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                                  {selectedDevice.status === 'running' ? 'Waiting for data...' : 'Device stopped'}
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};
