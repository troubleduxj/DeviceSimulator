import React, { useState, useEffect, useCallback } from 'react';
import { backendService, SystemLog } from '../services/backendService';
import { Search, RefreshCw, Filter, AlertTriangle, Info, AlertCircle } from 'lucide-react';

interface SystemLogViewerProps {
    dict: any;
    theme?: 'dark' | 'light';
}

export const SystemLogViewer: React.FC<SystemLogViewerProps> = ({ dict, theme = 'dark' }) => {
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [level, setLevel] = useState('All');
    const [keyword, setKeyword] = useState('');
    const [limit, setLimit] = useState(100);

    const isDark = theme === 'dark';
    const bgCard = isDark ? 'bg-slate-800' : 'bg-white';
    const textMain = isDark ? 'text-white' : 'text-gray-900';
    const textSub = isDark ? 'text-slate-400' : 'text-gray-500';
    const borderMain = isDark ? 'border-slate-700' : 'border-gray-200';
    const inputBg = isDark ? 'bg-slate-900' : 'bg-gray-50';

    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await backendService.fetchSystemLogs(level, keyword, limit);
            setLogs(data.logs);
        } catch (error) {
            console.error("Failed to fetch logs", error);
        } finally {
            setIsLoading(false);
        }
    }, [level, keyword, limit]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const getLevelColor = (lvl: string) => {
        switch (lvl.toUpperCase()) {
            case 'INFO': return 'text-blue-500';
            case 'WARNING': return 'text-orange-500';
            case 'ERROR': return 'text-red-500';
            default: return textSub;
        }
    };

    const getLevelIcon = (lvl: string) => {
        switch (lvl.toUpperCase()) {
            case 'INFO': return <Info size={16} />;
            case 'WARNING': return <AlertTriangle size={16} />;
            case 'ERROR': return <AlertCircle size={16} />;
            default: return <Info size={16} />;
        }
    };

    return (
        <div className="flex flex-col h-full gap-4 p-4">
            <div className="flex items-center justify-between">
                <h2 className={`text-lg font-bold ${textMain}`}>{dict.systemLogs || 'System Logs'}</h2>
                <button 
                    onClick={fetchLogs} 
                    className={`p-2 rounded-full hover:bg-slate-700 ${textSub} transition-colors`}
                    title="Refresh"
                >
                    <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Filters */}
            <div className={`${bgCard} p-4 rounded-lg border ${borderMain} flex flex-wrap gap-4 items-center`}>
                <div className="flex items-center gap-2">
                    <Filter size={18} className={textSub} />
                    <select 
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                        className={`p-2 rounded border ${borderMain} ${inputBg} ${textMain} text-sm focus:outline-none focus:ring-1 focus:ring-purple-500`}
                    >
                        <option value="All">All Levels</option>
                        <option value="INFO">INFO</option>
                        <option value="WARNING">WARNING</option>
                        <option value="ERROR">ERROR</option>
                    </select>
                </div>

                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <Search size={18} className={textSub} />
                    <input 
                        type="text" 
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="Search logs..."
                        className={`flex-1 p-2 rounded border ${borderMain} ${inputBg} ${textMain} text-sm focus:outline-none focus:ring-1 focus:ring-purple-500`}
                        onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
                    />
                </div>

                 <div className="flex items-center gap-2">
                    <span className={`text-xs ${textSub}`}>Limit:</span>
                    <select 
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                        className={`p-2 rounded border ${borderMain} ${inputBg} ${textMain} text-sm focus:outline-none focus:ring-1 focus:ring-purple-500`}
                    >
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={500}>500</option>
                        <option value={1000}>1000</option>
                    </select>
                </div>
            </div>

            {/* Logs List */}
            <div className={`flex-1 overflow-auto rounded-lg border ${borderMain} ${inputBg}`}>
                <table className="w-full text-sm text-left">
                    <thead className={`text-xs uppercase ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-600'} sticky top-0`}>
                        <tr>
                            <th className="px-4 py-3 w-48">Timestamp</th>
                            <th className="px-4 py-3 w-24">Level</th>
                            <th className="px-4 py-3 w-32">Source</th>
                            <th className="px-4 py-3">Message</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan={4} className={`px-4 py-8 text-center ${textSub}`}>
                                    No logs found.
                                </td>
                            </tr>
                        ) : (
                            logs.map((log, index) => (
                                <tr key={index} className={`border-b ${isDark ? 'border-slate-800' : 'border-gray-200'} hover:bg-slate-800/50`}>
                                    <td className={`px-4 py-2 ${textSub} font-mono text-xs`}>{log.timestamp}</td>
                                    <td className={`px-4 py-2 font-bold flex items-center gap-2 ${getLevelColor(log.level)}`}>
                                        {getLevelIcon(log.level)}
                                        {log.level}
                                    </td>
                                    <td className={`px-4 py-2 ${textSub}`}>{log.source}</td>
                                    <td className={`px-4 py-2 ${textMain} whitespace-pre-wrap`}>{log.message}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
