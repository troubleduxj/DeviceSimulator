import React, { useMemo } from 'react';
import { Device } from '../types';
import { Activity, Zap, Fan, Box, Server, Cpu, Database, BarChart3, Layers } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

interface DashboardProps {
  devices: Device[];
  onSelectDevice: (deviceId: string) => void;
  dict: any;
}

export const Dashboard: React.FC<DashboardProps> = ({ devices, onSelectDevice, dict }) => {
  
  const getDeviceIcon = (type: Device['type']) => {
    switch (type) {
        case 'Generator': return <Fan size={32} className="text-blue-400" />;
        case 'Cutter': return <Zap size={32} className="text-amber-400" />;
        case 'single_head_cutter': return <Zap size={32} className="text-amber-400" />;
        case 'welder': return <Zap size={32} className="text-orange-400" />;
        default: return <Box size={32} className="text-slate-400" />;
    }
  };

  // --- Statistics Calculation ---
  const stats = useMemo(() => {
    const totalDevices = devices.length;
    const runningDevices = devices.filter(d => d.status === 'running').length;
    const totalMetrics = devices.reduce((acc, d) => acc + (d.metrics?.length || 0), 0);
    // Estimated throughput: active devices * their metrics count (assuming 1Hz)
    const throughput = devices
      .filter(d => d.status === 'running')
      .reduce((acc, d) => acc + (d.metrics?.length || 0), 0);
    const avgMetrics = totalDevices > 0 ? (totalMetrics / totalDevices).toFixed(1) : '0';

    return { totalDevices, runningDevices, throughput, avgMetrics };
  }, [devices]);

  const statusData = useMemo(() => {
    const running = devices.filter(d => d.status === 'running').length;
    const stopped = devices.filter(d => d.status !== 'running').length;
    return [
      { name: dict.running || 'Running', value: running, color: '#10b981' },
      { name: dict.stopped || 'Stopped', value: stopped, color: '#64748b' }
    ];
  }, [devices, dict]);

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    devices.forEach(d => {
      const type = d.type || 'Unknown';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [devices]);

  const complexityData = useMemo(() => {
    return [...devices]
      .sort((a, b) => (b.metrics?.length || 0) - (a.metrics?.length || 0))
      .slice(0, 5)
      .map(d => ({
        name: d.name,
        value: d.metrics?.length || 0,
        type: d.type
      }));
  }, [devices]);

  const CATEGORY_COLORS = [
    '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#10b981', '#6366f1', 
    '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#14b8a6', '#d946ef'
  ];

  // Dynamic height calculation for the bar chart
  const barChartHeight = Math.max(250, categoryData.length * 50);

  return (
    <div 
      className="h-full overflow-y-auto p-6 space-y-8 no-scrollbar"
      style={{ scrollbarGutter: 'stable' }}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white tracking-tight">{dict.dashboardTitle}</h1>
        <div className="text-sm text-slate-500 font-mono">
           {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* KPI Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Card 1: Total Devices */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-blue-500/30 transition-all">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
            <Server size={24} />
          </div>
          <div>
            <div className="text-slate-500 text-xs uppercase font-bold tracking-wider">{dict.totalDevices}</div>
            <div className="text-2xl font-bold text-white font-mono">{stats.totalDevices}</div>
          </div>
        </div>

        {/* Card 2: Active Devices */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <Activity size={24} />
          </div>
          <div>
            <div className="text-slate-500 text-xs uppercase font-bold tracking-wider">{dict.activeDevices}</div>
            <div className="text-2xl font-bold text-white font-mono flex items-baseline gap-2">
              {stats.runningDevices}
              <span className="text-sm text-emerald-500/70 font-sans font-normal">
                ({((stats.runningDevices / (stats.totalDevices || 1)) * 100).toFixed(0)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Throughput */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-amber-500/30 transition-all">
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
            <Zap size={24} />
          </div>
          <div>
            <div className="text-slate-500 text-xs uppercase font-bold tracking-wider">{dict.dataThroughput}</div>
            <div className="text-2xl font-bold text-white font-mono flex items-baseline gap-2">
              {stats.throughput}
              <span className="text-xs text-slate-500 font-sans font-normal">{dict.ptsPerSec}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Avg Metrics */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-purple-500/30 transition-all">
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
            <Layers size={24} />
          </div>
          <div>
            <div className="text-slate-500 text-xs uppercase font-bold tracking-wider">{dict.avgMetrics}</div>
            <div className="text-2xl font-bold text-white font-mono">{stats.avgMetrics}</div>
          </div>
        </div>
      </div>
      
      {/* Charts Section Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Status Chart */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
               <Activity size={20} className="text-blue-400" />
            </div>
            {dict.statusDistribution || 'Status Distribution'}
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      stroke="none"
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9', borderRadius: '8px' }}
                  itemStyle={{ color: '#f1f5f9' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Chart */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col shadow-sm hover:shadow-md transition-all">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 shrink-0">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Server size={20} className="text-purple-400" />
            </div>
            {dict.categoryDistribution || 'Category Distribution'}
          </h3>
          <div className="flex-1 min-h-[300px] relative overflow-hidden bg-slate-950/30 rounded-xl border border-slate-800/50">
            <div className="absolute inset-0 overflow-y-auto pr-2 no-scrollbar">
              <div style={{ height: `${barChartHeight}px`, minHeight: '100%' }} className="p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={categoryData} 
                    layout="vertical" 
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                    barSize={24}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                      width={100} 
                    />
                    <Tooltip 
                      cursor={{ fill: '#1e293b', opacity: 0.5 }}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9', borderRadius: '8px' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {categoryData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section Row 2 */}
      <div className="grid grid-cols-1 gap-6">
         {/* Top Complexity Chart */}
         <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                 <BarChart3 size={20} className="text-indigo-400" />
              </div>
              {dict.topComplexDevices || 'Top Devices by Complexity'}
              <span className="text-xs font-normal text-slate-500 ml-2 border border-slate-800 px-2 py-0.5 rounded-full bg-slate-950">Top 5</span>
            </h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={complexityData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  barSize={32}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    width={120}
                  />
                  <Tooltip 
                    cursor={{ fill: '#1e293b', opacity: 0.5 }}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9', borderRadius: '8px' }}
                    formatter={(value: number) => [value, dict.metricsCount || 'Metrics Count']}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]}>
                    {complexityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
         </div>
      </div>

    </div>
  );
};
