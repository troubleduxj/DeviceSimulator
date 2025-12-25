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
  theme?: 'dark' | 'light';
}

export const RealtimeMonitor: React.FC<RealtimeMonitorProps> = ({ 
  devices, 
  activeDeviceId, 
  onDeviceChange, 
  history,
  dict,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200 shadow-sm';
  const bgClass = isDark ? 'bg-slate-900' : 'bg-slate-50';
  const textPrimary = isDark ? 'text-white' : 'text-slate-800';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';
  const borderClass = isDark ? 'border-slate-700' : 'border-slate-200';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0'; // Optimized grid color
  const axisColor = isDark ? '#64748b' : '#94a3b8'; // Optimized axis color
  
  const selectedDevice = devices.find(d => d.id === activeDeviceId);

  // Helper for metrics
  const latestData = history.length > 0 ? history[history.length - 1] : null;
  const getMetricValue = (key: string) => {
      if (!latestData || !latestData.metrics) return '-';
      const val = latestData.metrics[key];
      
      // Check if parameter is integer
      const param = selectedDevice?.parameters?.find(p => (p.id || p.name) === key);
      const isInt = param?.is_integer;

      if (typeof val === 'number') {
          return isInt ? Math.round(val).toString() : val.toFixed(2);
      }
      return val;
  };

  return (
    <div className={`h-full flex flex-col ${cardClass} rounded-lg border overflow-hidden`}>
      {/* Header */}
      <div className={`p-4 border-b ${borderClass} ${bgClass} flex flex-wrap gap-4 items-center justify-between`}>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <Activity className="text-emerald-500" />
                <h2 className={`text-lg font-bold ${textPrimary}`}>{dict.monitorTitle || 'Real-time Monitor'}</h2>
            </div>
            
            <div className={`h-8 w-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'} mx-2`} />
            
            <div className="w-64">
                <SearchableSelect 
                    options={devices.map(d => ({ value: d.id, label: d.name }))}
                    value={activeDeviceId}
                    onChange={onDeviceChange}
                    placeholder={dict.searchDevice || "Select device..."}
                    theme={theme}
                />
            </div>
        </div>

        {/* Status Indicator */}
        {selectedDevice && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                selectedDevice.status === 'running' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : `${isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-500'}`
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
              <div className={`h-full flex flex-col items-center justify-center ${textMuted} gap-4`}>
                  <Activity size={48} className="opacity-20" />
                  <p>Select a device to view real-time metrics.</p>
              </div>
          ) : (
              <div className="flex flex-col gap-6 h-full">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {selectedDevice.parameters?.filter(p => p.type === '数值').slice(0, 6).map(param => (
                          <div key={param.id} className={`${isDark ? 'bg-slate-800' : 'bg-slate-100'} p-4 rounded border ${isDark ? 'border-slate-800' : 'border-slate-300'} relative overflow-hidden group`}>
                              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                  <Zap size={32} />
                              </div>
                              <div className={`text-xs ${textMuted} uppercase font-bold mb-1 truncate`}>{param.name}</div>
                              <div className={`text-2xl font-mono ${textPrimary} font-bold`}>
                                  {getMetricValue(param.id || param.name)}
                                  <span className={`text-sm ${textMuted} ml-1 font-normal`}>{param.unit}</span>
                              </div>
                          </div>
                      ))}
                      {/* Add Status Card */}
                      <div className={`${isDark ? 'bg-slate-800' : 'bg-slate-100'} p-4 rounded border ${isDark ? 'border-slate-800' : 'border-slate-300'} relative overflow-hidden`}>
                            <div className={`text-xs ${textMuted} uppercase font-bold mb-1`}>Scenario</div>
                            <div className="text-sm font-bold text-purple-400 truncate" title={selectedDevice.currentScenario}>
                                {selectedDevice.currentScenario || 'None'}
                            </div>
                      </div>
                  </div>

                  {/* Main Chart */}
                  <div className={`flex-1 ${isDark ? 'bg-slate-800' : 'bg-slate-100'} p-4 rounded border ${isDark ? 'border-slate-800' : 'border-slate-300'} min-h-[300px] flex flex-col`}>
                      <h3 className={`text-sm font-bold ${textPrimary} mb-4 flex items-center gap-2`}>
                          <Activity size={16} className="text-emerald-400" />
                          {dict.realTimeMetrics || 'Real-time Trends'}
                      </h3>
                      <div className="flex-1 w-full min-h-0">
                          {history.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={history}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                                    <XAxis 
                                      dataKey="timestamp" 
                                      tickFormatter={(ts) => new Date(ts).toLocaleTimeString()} 
                                      stroke={axisColor}
                                      fontSize={12}
                                      domain={['dataMin', 'dataMax']}
                                    />
                                    <YAxis stroke={axisColor} fontSize={12} />
                                    <Tooltip 
                                      contentStyle={isDark ? { backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' } : { backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b' }}
                                      labelFormatter={(label) => new Date(label).toLocaleString()}
                                      formatter={(value: any, name: any) => {
                                          const param = selectedDevice.parameters?.find(p => p.name === name);
                                          if (typeof value === 'number') {
                                              if (param?.is_integer) return [Math.round(value), name];
                                              return [value.toFixed(2), name];
                                          }
                                          return [value, name];
                                      }}
                                    />
                                    {/* Render numeric params */}
                                    {selectedDevice.parameters?.filter(p => p.type === '数值').map((param, idx) => (
                                        <Line 
                                          key={param.id}
                                          type="monotone" 
                                          dataKey={`metrics.${param.id || param.name}`}
                                          name={param.name}
                                          stroke={['#10b981', '#9333ea', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'][idx % 8]} 
                                          dot={false}
                                          strokeWidth={2}
                                          isAnimationActive={false}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                          ) : (
                              <div className={`h-full flex items-center justify-center ${textMuted} text-sm`}>
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
