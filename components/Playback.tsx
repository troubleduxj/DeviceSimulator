import React, { useState, useEffect, useRef } from 'react';
import { Device, SimulationStep } from '../types';
import { backendService } from '../services/backendService';
import { 
  Play, Pause, Square, FastForward, SkipBack, Clock, Activity, AlertCircle, Calendar 
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { SearchableSelect } from './SearchableSelect';

interface PlaybackProps {
  devices: Device[];
  activeDeviceId: string;
  onDeviceChange: (id: string) => void;
  dict: any;
  theme?: 'dark' | 'light';
}

export const Playback: React.FC<PlaybackProps> = ({ devices, activeDeviceId, onDeviceChange, dict, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200 shadow-sm';
  const bgClass = isDark ? 'bg-slate-900' : 'bg-slate-50';
  const textPrimary = isDark ? 'text-white' : 'text-slate-800';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';
  const borderClass = isDark ? 'border-slate-700' : 'border-slate-200';
  const inputClass = isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0'; // Optimized grid color
  const axisColor = isDark ? '#64748b' : '#94a3b8'; // Optimized axis color
  
  // State
  // const [selectedDeviceId, setSelectedDeviceId] = useState<string>(devices[0]?.id || ''); // Managed by parent
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [playbackData, setPlaybackData] = useState<any[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 5x, 10x
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Refs
  const requestRef = useRef<number>();
  const lastFrameTime = useRef<number>(0);

  const selectedDevice = devices.find(d => d.id === activeDeviceId);

  // Reset data when device changes
  useEffect(() => {
    setPlaybackData([]);
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [activeDeviceId]);

  // Load Data
  const handleLoadData = async () => {
    if (!activeDeviceId || !startTime || !endTime) return;
    
    setIsLoading(true);
    setIsPlaying(false);
    setCurrentIndex(0);
    
    try {
      // Use existing getDeviceData but with time range (need to ensure backend supports it)
      // We updated backendService.getDeviceData to support range? 
      // Actually backendService.getDeviceData currently calls `?limit=1` for polling or `limit=100` for chart.
      // We might need a new method or updated one.
      // Let's assume we update backendService to expose a generic fetch method or use fetch directly for now.
      
      // Fetching all data might be heavy. For MVP let's limit to e.g. 2000 points or use a specific endpoint.
      // Ideally we should use the `get_device_data` with time range we just added/verified in backend.
      
      const startIso = new Date(startTime).toISOString();
      const endIso = new Date(endTime).toISOString();
      
      // Direct fetch to support custom params
      // We need to update backendService to expose this properly, but for now:
      const response = await fetch(`/api/data/devices/${activeDeviceId}/data?start_time=${startIso}&end_time=${endIso}&limit=5000`);
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const data = await response.json();
      
      // Sort by timestamp ASC for playback
      data.sort((a: any, b: any) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
      
      setPlaybackData(data);
    } catch (error) {
      console.error("Playback load error", error);
      alert("Failed to load playback data");
    } finally {
      setIsLoading(false);
    }
  };

  // Playback Loop
  const animate = (time: number) => {
    if (lastFrameTime.current === 0) lastFrameTime.current = time;
    const delta = time - lastFrameTime.current;
    
    // Logic: Update index based on speed
    // Ideally we want to map real time to data timestamps.
    // Simple approach: Frame based.
    // Better approach: Time based.
    
    // Let's assume data points are roughly equidistant or we just play them sequentially with a fixed frame rate modified by speed.
    // Default: 1 point per 100ms (10Hz) * speed
    
    const interval = 1000 / (1 * playbackSpeed); // Base 1Hz * speed? No, too slow.
    // If device is 1000ms sampling, 1x means 1 point per sec.
    // If device is 100ms, 1x means 10 points per sec.
    // We should try to respect the timestamp diffs or just constant rate.
    
    // Constant rate for MVP: 10 points per second at 1x?
    // Let's say 1x = Realtime (use timestamp diffs).
    
    // Simple Frame approach for robustness:
    if (delta > (1000 / (10 * playbackSpeed))) { // Cap at ~60fps visually, but logic updates
       setCurrentIndex(prev => {
           if (prev >= playbackData.length - 1) {
               setIsPlaying(false);
               return prev;
           }
           return prev + 1;
       });
       lastFrameTime.current = time;
    }
    
    if (isPlaying) {
        requestRef.current = requestAnimationFrame(animate);
    }
  };

  useEffect(() => {
    if (isPlaying && playbackData.length > 0) {
        requestRef.current = requestAnimationFrame(animate);
    } else {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, playbackData, playbackSpeed]);

  // Current Data Point
  const currentData = playbackData[currentIndex];

  // Memoized Chart Data for "Simulated Generation" effect
  // We want the chart to only show data up to currentIndex, BUT we want the XAxis to remain stable (showing full range).
  // Strategy: Pass full data to LineChart, but map future values to null.
  const chartData = React.useMemo(() => {
      if (playbackData.length === 0) return [];
      return playbackData.map((point, idx) => {
          if (idx > currentIndex) {
              // Create a copy where values are null, but timestamp is kept
              const futurePoint = { ...point };
              Object.keys(futurePoint).forEach(key => {
                  if (key !== 'ts' && key !== 'timestamp') {
                      futurePoint[key] = null;
                  }
              });
              return futurePoint;
          }
          return point;
      });
  }, [playbackData, currentIndex]);

  // Helper for metrics
  const getMetricValue = (key: string) => {
      if (!currentData) return '-';
      return typeof currentData[key] === 'number' ? currentData[key].toFixed(2) : currentData[key];
  };

  return (
    <div className={`h-full flex flex-col ${cardClass} rounded-lg border overflow-hidden`}>
      {/* Header / Controls */}
      <div className={`p-4 border-b ${borderClass} ${bgClass} flex flex-wrap gap-4 items-center justify-between`}>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <Activity className="text-purple-500" />
                <h2 className={`text-lg font-bold ${textPrimary}`}>{dict.playbackTitle || 'Historical Playback'}</h2>
            </div>
            
            <div className={`h-8 w-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'} mx-2`} />
            
            <div className="w-64">
                <SearchableSelect 
                    options={devices.map(d => ({ value: d.id, label: d.name }))}
                    value={activeDeviceId}
                    onChange={onDeviceChange}
                    placeholder="Select device..."
                    theme={theme}
                />
            </div>
        </div>

        <div className={`flex items-center gap-3 ${isDark ? 'bg-slate-900' : 'bg-slate-100'} p-1.5 rounded border ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
            <div className="flex items-center gap-2">
                <span className={`text-xs ${textMuted} uppercase font-bold px-2`}>{dict.startTime || 'Start'}</span>
                <input 
                    type="datetime-local" 
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className={`${inputClass} rounded px-2 py-1 text-xs outline-none`}
                />
            </div>
            <span className={textMuted}>-</span>
            <div className="flex items-center gap-2">
                <span className={`text-xs ${textMuted} uppercase font-bold px-2`}>{dict.endTime || 'End'}</span>
                <input 
                    type="datetime-local" 
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className={`${inputClass} rounded px-2 py-1 text-xs outline-none`}
                />
            </div>
            <button 
                onClick={handleLoadData}
                disabled={isLoading || !startTime || !endTime}
                className="ml-2 px-4 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded transition-colors disabled:opacity-50"
            >
                {isLoading ? 'Loading...' : 'Load Data'}
            </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          
          {/* Player Bar */}
          <div className={`${bgClass} border-b ${borderClass} p-4 flex items-center gap-6`}>
              <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setIsPlaying(false); setCurrentIndex(0); }}
                    className={`p-2 ${textMuted} hover:${textPrimary} hover:${isDark ? 'bg-slate-800' : 'bg-slate-200'} rounded`}
                  >
                      <SkipBack size={20} />
                  </button>
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`p-3 rounded-full ${isPlaying ? 'bg-purple-600 text-white' : `${isDark ? 'bg-slate-700' : 'bg-slate-200'} ${textPrimary} hover:${isDark ? 'bg-slate-600' : 'bg-slate-300'}`}`}
                  >
                      {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                  </button>
                  <button 
                    onClick={() => setIsPlaying(false)}
                    className={`p-2 ${textMuted} hover:${textPrimary} hover:${isDark ? 'bg-slate-800' : 'bg-slate-200'} rounded`}
                  >
                      <Square size={20} fill="currentColor" />
                  </button>
              </div>

              <div className="flex-1 flex flex-col justify-center gap-1">
                  <div className={`flex justify-between text-xs ${textMuted} font-mono`}>
                      <span>{currentData ? new Date(currentData.ts).toLocaleString() : '--:--:--'}</span>
                      <span>{playbackData.length > 0 ? `${currentIndex + 1} / ${playbackData.length}` : '0 / 0'}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max={playbackData.length > 0 ? playbackData.length - 1 : 0} 
                    value={currentIndex}
                    onChange={e => {
                        setIsPlaying(false);
                        setCurrentIndex(parseInt(e.target.value));
                    }}
                    className={`w-full h-2 ${isDark ? 'bg-slate-700' : 'bg-slate-300'} rounded-lg appearance-none cursor-pointer accent-purple-500`}
                  />
              </div>

              <div className="flex items-center gap-2">
                  <span className={`text-xs ${textMuted} font-bold`}>SPEED</span>
                  <select 
                    value={playbackSpeed}
                    onChange={e => setPlaybackSpeed(Number(e.target.value))}
                    className={`${inputClass} rounded px-2 py-1 text-xs outline-none`}
                  >
                      <option value="1" className={isDark ? 'bg-slate-800' : 'bg-white'}>1x</option>
                      <option value="2" className={isDark ? 'bg-slate-800' : 'bg-white'}>2x</option>
                      <option value="5" className={isDark ? 'bg-slate-800' : 'bg-white'}>5x</option>
                      <option value="10" className={isDark ? 'bg-slate-800' : 'bg-white'}>10x</option>
                      <option value="50" className={isDark ? 'bg-slate-800' : 'bg-white'}>50x</option>
                  </select>
              </div>
          </div>

          {/* Dashboard View */}
          <div className="flex-1 p-6 overflow-y-auto no-scrollbar">
              {playbackData.length === 0 ? (
                  <div className={`h-full flex flex-col items-center justify-center ${textMuted} gap-4`}>
                      <Calendar size={48} className="opacity-20" />
                      <p>Select a device and time range to load historical data.</p>
                  </div>
              ) : (
                  <div className="flex flex-col gap-6 h-full">
                      {/* KPI Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {selectedDevice?.parameters.filter(p => p.type === '数值').slice(0, 6).map(param => (
                              <div key={param.id} className={`${isDark ? 'bg-slate-800' : 'bg-slate-100'} p-4 rounded border ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
                                  <div className={`text-xs ${textMuted} uppercase font-bold mb-1 truncate`}>{param.name}</div>
                                  <div className={`text-2xl font-mono ${textPrimary} font-bold`}>
                                      {getMetricValue(param.id || param.name)}
                                      <span className={`text-sm ${textMuted} ml-1 font-normal`}>{param.unit}</span>
                                  </div>
                              </div>
                          ))}
                      </div>

                      {/* Main Chart */}
                      <div className={`flex-1 ${isDark ? 'bg-slate-800' : 'bg-slate-100'} p-4 rounded border ${isDark ? 'border-slate-700' : 'border-slate-300'} min-h-[300px]`}>
                          <h3 className={`text-sm font-bold ${textPrimary} mb-4 flex items-center gap-2`}>
                              <Activity size={16} className="text-purple-400" />
                              Trend Analysis
                          </h3>
                          <div className="h-[calc(100%-30px)] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={chartData}>
                                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                                      <XAxis 
                                        dataKey="ts" 
                                        tickFormatter={(ts) => new Date(ts).toLocaleTimeString()} 
                                        stroke={axisColor}
                                        fontSize={12}
                                      />
                                      <YAxis stroke={axisColor} fontSize={12} />
                                      <Tooltip 
                                        contentStyle={isDark ? { backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' } : { backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b' }}
                                        labelFormatter={(label) => new Date(label).toLocaleString()}
                                      />
                                      {/* Render first 3 numeric params */}
                                      {selectedDevice?.parameters.filter(p => p.type === '数值').slice(0, 3).map((param, idx) => (
                                          <Line 
                                            key={param.id}
                                            type="monotone" 
                                            dataKey={param.id || param.name} 
                                            stroke={['#9333ea', '#10b981', '#f59e0b'][idx % 3]} 
                                            dot={false}
                                            strokeWidth={2}
                                            connectNulls={false}
                                            isAnimationActive={false}
                                          />
                                      ))}
                                      {/* Current Position Line */}
                                      {currentData && (
                                          <ReferenceLine x={currentData.ts} stroke={isDark ? "white" : "#334155"} strokeDasharray="3 3" />
                                      )}
                                  </LineChart>
                              </ResponsiveContainer>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};