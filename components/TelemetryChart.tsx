
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Device, SimulationStep } from '../types';

interface TelemetryChartProps {
  device: Device;
  data: SimulationStep[];
  dict: any;
}

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#a855f7'];

export const TelemetryChart: React.FC<TelemetryChartProps> = ({ device, data, dict }) => {
  if (!device || data.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-900/50 rounded-lg border border-slate-800 text-slate-500">
        {dict.waitingData}
      </div>
    );
  }

  // Format timestamp for X-axis
  const formattedData = data.map(d => ({
    ...d,
    ...d.metrics,
    time: new Date(d.timestamp).toLocaleTimeString([], { hour12: false, second: '2-digit', minute: '2-digit' })
  }));

  return (
    <div className="h-full w-full bg-slate-900/50 rounded-lg border border-slate-800 p-3 flex flex-col">
      <h3 className="text-sm font-semibold text-slate-300 mb-2 shrink-0">{dict.telemetry}</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              dataKey="time" 
              stroke="#94a3b8" 
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
              tickMargin={5}
            />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} width={30} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
              itemStyle={{ fontSize: 12 }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }}/>
            {device.metrics.map((metric, index) => (
              <Line
                key={metric.id}
                type="monotone"
                dataKey={metric.id}
                name={metric.name}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false} // Performance optimization for real-time
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
