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
}

export const Playback: React.FC<PlaybackProps> = ({ devices, activeDeviceId, onDeviceChange, dict }) => {
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
    <div className="h-full flex flex-col bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
      {/* Header / Controls */}
      <div className="p-4 border-b border-slate-800 bg-slate-900 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <Activity className="text-purple-500" />
                <h2 className="text-lg font-bold text-white">{dict.playbackTitle || 'Historical Playback'}</h2>
            </div>
            
            <div className="h-8 w-px bg-slate-800 mx-2" />
            
            <div className="w-64">
                <SearchableSelect 
                    options={devices.map(d => ({ value: d.id, label: d.name }))}
                    value={activeDeviceId}
                    onChange={onDeviceChange}
                    placeholder="Select device..."
                />
            </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-800/50 p-1.5 rounded border border-slate-700">
            <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 uppercase font-bold px-2">{dict.startTime || 'Start'}</span>
                <input 
                    type="datetime-local" 
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none"
                />
            </div>
            <span className="text-slate-600">-</span>
            <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 uppercase font-bold px-2">{dict.endTime || 'End'}</span>
                <input 
                    type="datetime-local" 
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none"
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
          <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center gap-6">
              <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setIsPlaying(false); setCurrentIndex(0); }}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
                  >
                      <SkipBack size={20} />
                  </button>
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`p-3 rounded-full ${isPlaying ? 'bg-purple-600 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                  >
                      {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                  </button>
                  <button 
                    onClick={() => setIsPlaying(false)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
                  >
                      <Square size={20} fill="currentColor" />
                  </button>
              </div>

              <div className="flex-1 flex flex-col justify-center gap-1">
                  <div className="flex justify-between text-xs text-slate-400 font-mono">
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
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
              </div>

              <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-bold">SPEED</span>
                  <select 
                    value={playbackSpeed}
                    onChange={e => setPlaybackSpeed(Number(e.target.value))}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none"
                  >
                      <option value="1">1x</option>
                      <option value="2">2x</option>
                      <option value="5">5x</option>
                      <option value="10">10x</option>
                      <option value="50">50x</option>
                  </select>
              </div>
          </div>

          {/* Dashboard View */}
          <div className="flex-1 p-6 overflow-y-auto no-scrollbar">
              {playbackData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                      <Calendar size={48} className="opacity-20" />
                      <p>Select a device and time range to load historical data.</p>
                  </div>
              ) : (
                  <div className="flex flex-col gap-6 h-full">
                      {/* KPI Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {selectedDevice?.parameters.filter(p => p.type === '数值').slice(0, 6).map(param => (
                              <div key={param.id} className="bg-slate-800 p-4 rounded border border-slate-700">
                                  <div className="text-xs text-slate-500 uppercase font-bold mb-1 truncate">{param.name}</div>
                                  <div className="text-2xl font-mono text-white font-bold">
                                      {getMetricValue(param.id || param.name)}
                                      <span className="text-sm text-slate-500 ml-1 font-normal">{param.unit}</span>
                                  </div>
                              </div>
                          ))}
                      </div>

                      {/* Main Chart */}
                      <div className="flex-1 bg-slate-800 p-4 rounded border border-slate-700 min-h-[300px]">
                          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                              <Activity size={16} className="text-blue-400" />
                              Trend Analysis
                          </h3>
                          <div className="h-[calc(100%-30px)] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={chartData}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                      <XAxis 
                                        dataKey="ts" 
                                        tickFormatter={(ts) => new Date(ts).toLocaleTimeString()} 
                                        stroke="#64748b"
                                        fontSize={12}
                                      />
                                      <YAxis stroke="#64748b" fontSize={12} />
                                      <Tooltip 
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                                        labelFormatter={(label) => new Date(label).toLocaleString()}
                                      />
                                      {/* Render first 3 numeric params */}
                                      {selectedDevice?.parameters.filter(p => p.type === '数值').slice(0, 3).map((param, idx) => (
                                          <Line 
                                            key={param.id}
                                            type="monotone" 
                                            dataKey={param.id || param.name} 
                                            stroke={['#3b82f6', '#10b981', '#f59e0b'][idx % 3]} 
                                            dot={false}
                                            strokeWidth={2}
                                            connectNulls={false}
                                            isAnimationActive={false}
                                          />
                                      ))}
                                      {/* Current Position Line */}
                                      {currentData && (
                                          <ReferenceLine x={currentData.ts} stroke="white" strokeDasharray="3 3" />
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