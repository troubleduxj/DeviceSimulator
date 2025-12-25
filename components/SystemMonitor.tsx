import React, { useState, useEffect } from 'react';
import { backendService, SystemPerformance } from '../services/backendService';
import { Activity, Cpu, HardDrive, Server, Clock, Zap, Database, Network, List } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { SystemLogViewer } from './SystemLogViewer';

interface SystemMonitorProps {
    dict: any;
    theme?: 'dark' | 'light';
}

export const SystemMonitor: React.FC<SystemMonitorProps> = ({ dict, theme = 'dark' }) => {
    const [activeTab, setActiveTab] = useState<'monitor' | 'logs'>('monitor');
    const [perf, setPerf] = useState<SystemPerformance | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    
    const isDark = theme === 'dark';
    const bgCard = isDark ? 'bg-slate-800' : 'bg-white';
    const textMain = isDark ? 'text-white' : 'text-gray-900';
    const textSub = isDark ? 'text-slate-400' : 'text-gray-500';
    const borderMain = isDark ? 'border-slate-700' : 'border-gray-200';
    const tabActive = isDark ? 'text-purple-400 border-b-2 border-purple-400 bg-slate-800/50' : 'text-purple-600 border-b-2 border-purple-600 bg-purple-50';
    const tabInactive = isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900';

    useEffect(() => {
        const fetchPerf = async () => {
            try {
                const data = await backendService.fetchSystemPerformance();
                if ((data as any).error) {
                    setError((data as any).error);
                    return;
                }
                setPerf(data);
                setError(null);
                
                setHistory(prev => {
                    const now = new Date();
                    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0') + ':' + now.getSeconds().toString().padStart(2, '0');
                    const newItem = {
                        time: timeStr,
                        cpu: data.cpu.percent,
                        memory: data.memory.percent,
                        process_cpu: data.cpu.process_percent
                    };
                    const newHistory = [...prev, newItem];
                    if (newHistory.length > 30) return newHistory.slice(newHistory.length - 30);
                    return newHistory;
                });
            } catch (error: any) {
                console.error("Failed to fetch performance", error);
                setError(error.message || "Failed to fetch data");
            }
        };

        if (activeTab === 'monitor') {
            fetchPerf();
            const interval = setInterval(fetchPerf, 2000);
            return () => clearInterval(interval);
        }
    }, [activeTab]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Tabs */}
            <div className={`flex border-b ${borderMain} mb-4 shrink-0`}>
                <button 
                    className={`px-6 py-3 text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'monitor' ? tabActive : tabInactive}`}
                    onClick={() => setActiveTab('monitor')}
                >
                    <Activity size={16} /> {dict.systemMonitor || 'System Monitor'}
                </button>
                <button 
                    className={`px-6 py-3 text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'logs' ? tabActive : tabInactive}`}
                    onClick={() => setActiveTab('logs')}
                >
                    <List size={16} /> {dict.systemLogs || 'System Logs'}
                </button>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'monitor' && (
                    <div className="flex flex-col gap-4 h-full overflow-y-auto p-1">
                         {error ? (
                            <div className="p-8 text-center text-red-500 bg-red-500/10 rounded-lg border border-red-500/20 m-4">
                                <AlertTriangle className="mx-auto mb-2" size={24} />
                                <div className="font-bold">System Monitor Error</div>
                                <div className="text-sm opacity-80">{error}</div>
                                <div className="text-xs mt-2 text-slate-500">
                                    Backend might be missing 'psutil' dependency or have connection issues.
                                </div>
                            </div>
                         ) : !perf ? (
                            <div className={`p-8 text-center ${textSub}`}>Loading System Metrics...</div>
                         ) : (
                            <>
                                {/* Top Stats */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className={`${bgCard} p-4 rounded-lg shadow-sm border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Cpu className="text-purple-500" size={20} />
                                            <h3 className={`font-semibold ${textMain}`}>CPU</h3>
                                        </div>
                                        <div className="text-2xl font-bold text-purple-500">{perf.cpu.percent}%</div>
                                        <div className={`text-xs ${textSub}`}>{perf.cpu.count} Cores</div>
                                    </div>
                                    
                                    <div className={`${bgCard} p-4 rounded-lg shadow-sm border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Activity className="text-green-500" size={20} />
                                            <h3 className={`font-semibold ${textMain}`}>Memory</h3>
                                        </div>
                                        <div className="text-2xl font-bold text-green-500">{perf.memory.percent}%</div>
                                        <div className={`text-xs ${textSub}`}>{formatBytes(perf.memory.available)} available</div>
                                    </div>

                                    <div className={`${bgCard} p-4 rounded-lg shadow-sm border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <HardDrive className="text-purple-500" size={20} />
                                            <h3 className={`font-semibold ${textMain}`}>Disk</h3>
                                        </div>
                                        <div className="text-2xl font-bold text-purple-500">{perf.disk.percent}%</div>
                                        <div className={`text-xs ${textSub}`}>{formatBytes(perf.disk.free)} free</div>
                                    </div>

                                    <div className={`${bgCard} p-4 rounded-lg shadow-sm border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Clock className="text-orange-500" size={20} />
                                            <h3 className={`font-semibold ${textMain}`}>Uptime</h3>
                                        </div>
                                        <div className="text-xl font-bold text-orange-500">{formatUptime(perf.uptime)}</div>
                                        <div className={`text-xs ${textSub}`}>Backend Process</div>
                                    </div>
                                </div>

                                {/* Charts */}
                                <div className={`${bgCard} p-4 rounded-lg shadow-sm border ${isDark ? 'border-slate-700' : 'border-gray-200'} h-80 flex flex-col`}>
                                    <h3 className={`font-semibold ${textMain} mb-4 shrink-0`}>Resource Usage History</h3>
                                    <div className="flex-1 min-h-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={history}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                                                <XAxis dataKey="time" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} />
                                                <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} domain={[0, 100]} />
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0' }}
                                                />
                                                <Line type="monotone" dataKey="cpu" stroke="#9333ea" name="Total CPU %" strokeWidth={2} dot={false} />
                                                <Line type="monotone" dataKey="memory" stroke="#22c55e" name="Memory %" strokeWidth={2} dot={false} />
                                                <Line type="monotone" dataKey="process_cpu" stroke="#a855f7" name="Process CPU %" strokeWidth={2} dot={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Services Status */}
                                <div className={`${bgCard} p-4 rounded-lg shadow-sm border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                                    <h3 className={`font-semibold ${textMain} mb-4`}>Service Status</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                        <ServiceStatusCard name="API Server" status={perf.services.api} icon={Server} isDark={isDark} />
                                        <ServiceStatusCard name="Data Gen" status={perf.services.data_generator} icon={Zap} isDark={isDark} />
                                        <ServiceStatusCard name="TDengine" status={perf.services.tdengine} icon={Database} isDark={isDark} />
                                        <ServiceStatusCard name="MQTT" status={perf.services.mqtt} icon={Network} isDark={isDark} />
                                        <ServiceStatusCard name="Modbus" status={perf.services.modbus} icon={Network} isDark={isDark} />
                                        <ServiceStatusCard name="OPC UA" status={perf.services.opcua} icon={Network} isDark={isDark} />
                                    </div>
                                </div>
                            </>
                         )}
                    </div>
                )}

                {activeTab === 'logs' && (
                    <SystemLogViewer dict={dict} theme={theme} />
                )}
            </div>
        </div>
    );
};

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
};

const ServiceStatusCard = ({ name, status, icon: Icon, isDark }: any) => (
    <div className={`p-3 rounded border ${isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-50'} flex items-center gap-3`}>
        <div className={`p-2 rounded-full ${status ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
            <Icon size={18} />
        </div>
        <div>
            <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{name}</div>
            <div className={`font-bold text-sm ${status ? 'text-green-500' : 'text-red-500'}`}>
                {status ? 'Running' : 'Stopped'}
            </div>
        </div>
    </div>
);
