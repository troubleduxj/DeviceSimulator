
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Device, SimulationStep } from '../types';
import { Download } from 'lucide-react';
import { formatTime } from '../utils/timeUtils';

interface TelemetryChartProps {
  device: Device;
  data: SimulationStep[];
  dict: any;
  onExport?: () => void;
  theme?: 'dark' | 'light';
}

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#a855f7'];

export const TelemetryChart: React.FC<TelemetryChartProps> = ({ device, data, dict, onExport, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'bg-black border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const textPrimary = isDark ? 'text-slate-300' : 'text-slate-700';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';
  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const tooltipStyle = isDark 
    ? { backgroundColor: '#000000', borderColor: '#1e293b', color: '#f1f5f9' }
    : { backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' };

  if (!device || data.length === 0) {
    return (
      <div className={`h-full w-full flex items-center justify-center ${cardClass} rounded-lg border ${textMuted}`}>
        {dict.waitingData}
      </div>
    );
  }

  // Format timestamp for X-axis
  const formattedData = data.map(d => ({
    ...d,
    ...d.metrics,
    time: formatTime(d.timestamp)
  }));

  return (
    <div className={`h-full w-full ${cardClass} rounded-lg border p-3 flex flex-col`}>
      <div className="flex justify-between items-center mb-2 shrink-0">
        <h3 className={`text-sm font-semibold ${textPrimary}`}>{dict.telemetry}</h3>
        {onExport && (
          <button 
            onClick={onExport}
            disabled={data.length === 0}
            className={`flex items-center gap-1 px-2 py-1 rounded ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-blue-400 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-blue-600 border-slate-200'} border transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs`}
            title="Export CSV"
          >
            <Download size={12} /> CSV
          </button>
        )}
      </div>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis 
                dataKey="time" 
                stroke={isDark ? "#94a3b8" : "#64748b"} 
                fontSize={12}
                tick={{ fill: isDark ? '#94a3b8' : '#64748b' }}
            />
            <YAxis 
                stroke={isDark ? "#94a3b8" : "#64748b"} 
                fontSize={12}
                tick={{ fill: isDark ? '#94a3b8' : '#64748b' }}
            />
            <Tooltip 
                contentStyle={tooltipStyle}
                itemStyle={{ color: isDark ? '#f1f5f9' : '#1e293b' }}
                labelStyle={{ color: isDark ? '#94a3b8' : '#64748b' }}
            />
            <Legend />
            {device.metrics && device.metrics
              .filter(metric => !metric.is_tag) // Filter out TAG type parameters
              .map((metric, index) => (
              <Line 
                key={metric.id}
                type="monotone" 
                dataKey={metric.id} 
                stroke={COLORS[index % COLORS.length]} 
                name={metric.name}
                dot={false}
                strokeWidth={2}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
