import React, { useState, useEffect } from 'react';
import { backendService } from '../services/backendService';
import { Database, Table, ChevronRight, ChevronDown, RefreshCw, FileText, Info, Tag } from 'lucide-react';

interface TDengineViewerProps {
    dict: any;
    theme?: 'dark' | 'light';
}

export const TDengineViewer: React.FC<TDengineViewerProps> = ({ dict, theme = 'dark' }) => {
    const [stables, setStables] = useState<string[]>([]);
    const [expandedStable, setExpandedStable] = useState<string | null>(null);
    const [tables, setTables] = useState<any[]>([]);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [schema, setSchema] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingTables, setIsLoadingTables] = useState(false);

    // New states
    const [viewMode, setViewMode] = useState<'stable' | 'table' | null>(null);
    const [selectedStableName, setSelectedStableName] = useState<string | null>(null);
    const [childTableCount, setChildTableCount] = useState<number>(0);
    const [tableInfo, setTableInfo] = useState<any>(null);
    const [tableData, setTableData] = useState<any[]>([]);
    const [timezone, setTimezone] = useState<string>('UTC');

    const isDark = theme === 'dark';
    const bgCard = isDark ? 'bg-slate-800' : 'bg-white';
    const textMain = isDark ? 'text-white' : 'text-gray-900';
    const textSub = isDark ? 'text-slate-400' : 'text-gray-500';
    const hoverBg = isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100';
    const activeBg = isDark ? 'bg-purple-900/30' : 'bg-purple-50';
    const borderMain = isDark ? 'border-slate-700' : 'border-gray-200';

    const fetchStables = async () => {
        setIsLoading(true);
        try {
            const res = await backendService.fetchTDengineStables();
            
            if (res && (res as any).error) {
                throw new Error((res as any).error);
            }

            // Map to strings
            const names = Array.isArray(res) ? res.map((r: any) => {
                if (typeof r === 'string') return r;
                return r.name || r.stable_name || r.TABLE_NAME || 'unknown';
            }).filter(n => n && n !== 'unknown') : [];
            setStables(names);
        } catch (e: any) {
            console.error(e);
            alert(`Failed to fetch Stables: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async () => {
        if (!confirm('This will create missing super tables and sub tables for all existing devices. Continue?')) return;
        setIsLoading(true);
        try {
            const res = await backendService.syncTDengineTables();
            if (res.success) {
                alert('Synchronization completed successfully!');
                fetchStables();
            } else {
                alert(`Sync failed: ${res.message}`);
            }
        } catch (e: any) {
            alert(`Sync error: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const settings = await backendService.fetchSystemSettings();
            setTimezone(settings.timezone || 'UTC');
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchStables();
        fetchSettings();
    }, []);

    const handleStableClick = async (stable: string) => {
        // Always select stable view mode
        setSelectedStableName(stable);
        setSelectedTable(null);
        setViewMode('stable');
        
        // Fetch schema immediately
        try {
            const res = await backendService.fetchTDengineDescribe(stable);
            setSchema(res);
        } catch (e) {
            console.error(e);
        }

        // Toggle expand logic
        if (expandedStable === stable) {
            setExpandedStable(null);
            return;
        }
        
        setExpandedStable(stable);
        setIsLoadingTables(true);
        try {
            const res = await backendService.fetchTDengineTables(stable);
            if (res && (res as any).error) {
                throw new Error((res as any).error);
            }
            const mappedTables = Array.isArray(res) ? res.map((r: any) => r.tbname || r.table_name || r.name || 'unknown') : [];
            setTables(mappedTables);
            setChildTableCount(mappedTables.length);
        } catch (e: any) {
            console.error(e);
            alert(`Failed to fetch tables: ${e.message}`);
            setChildTableCount(0);
        } finally {
            setIsLoadingTables(false);
        }
    };

    const handleTableClick = async (table: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent bubbling to stable click
        setSelectedTable(table);
        setViewMode('table');
        
        const stable = expandedStable; // Assume context from expanded stable

        try {
            // 1. Fetch Info
            if (stable) {
                const info = await backendService.fetchTDengineTableInfo(stable, table);
                setTableInfo(info);
            }

            // 2. Fetch Data
            const data = await backendService.fetchTDengineData(table, 100);
            setTableData(data);
        } catch (e) {
            console.error(e);
        }
    };

    const renderSchemaTable = () => (
        <table className="w-full text-sm text-left">
            <thead className={`text-xs uppercase ${isDark ? 'bg-slate-900 text-slate-400' : 'bg-gray-100 text-gray-600'}`}>
                <tr>
                    <th className="px-4 py-3">Field</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Length</th>
                    <th className="px-4 py-3">Note</th>
                </tr>
            </thead>
            <tbody>
                {schema.map((row, idx) => (
                    <tr key={idx} className={`border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                        <td className={`px-4 py-2 font-mono ${textMain}`}>{row.Field || row.field}</td>
                        <td className={`px-4 py-2 ${textSub}`}>{row.Type || row.type}</td>
                        <td className={`px-4 py-2 ${textSub}`}>{row.Length || row.length}</td>
                        <td className={`px-4 py-2 ${textSub}`}>{row.Note || row.note}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    const renderDataTable = () => {
        if (tableData.length === 0) {
            return <div className={`p-4 ${textSub}`}>No data available (showing latest 100 rows)</div>;
        }
        
        const headers = Object.keys(tableData[0]);

        return (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className={`text-xs uppercase ${isDark ? 'bg-slate-900 text-slate-400' : 'bg-gray-100 text-gray-600'}`}>
                        <tr>
                            {headers.map(h => (
                                <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.map((row, idx) => (
                            <tr key={idx} className={`border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                                {headers.map(h => (
                                    <td key={h} className={`px-4 py-2 whitespace-nowrap ${textMain}`}>
                                        {h === 'ts' && row[h] 
                                            ? new Date(row[h]).toLocaleString('zh-CN', { timeZone: timezone, hour12: false }) 
                                            : (row[h] !== null ? String(row[h]) : '-')
                                        }
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="flex h-full gap-4 p-4">
            {/* Left Tree */}
            <div className={`w-72 flex flex-col ${bgCard} rounded-lg border ${borderMain} overflow-hidden shrink-0`}>
                <div className={`p-3 border-b ${borderMain} flex justify-between items-center`}>
                    <h3 className={`font-bold ${textMain} flex items-center gap-2`}>
                        <Database size={18} /> TDengine
                    </h3>
                    <div className="flex gap-1">
                        <button onClick={handleSync} className={`p-1 rounded-full ${hoverBg}`} title="Sync Tables">
                            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                        </button>
                        <button onClick={fetchStables} className={`p-1 rounded-full ${hoverBg}`} title="Refresh">
                            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
                    {stables.length === 0 && !isLoading && (
                        <div className={`text-sm ${textSub} p-2 text-center`}>No Super Tables Found</div>
                    )}
                    {stables.map(stable => (
                        <div key={stable}>
                            <div 
                                className={`flex items-center gap-2 p-2 rounded cursor-pointer ${hoverBg} ${expandedStable === stable ? textMain : textSub}`}
                                onClick={() => handleStableClick(stable)}
                            >
                                {expandedStable === stable ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                <Table size={16} className="text-purple-500" />
                                <span className="font-mono text-sm">{stable}</span>
                            </div>
                            {expandedStable === stable && (
                                <div className="ml-6 border-l border-slate-700 pl-2 mt-1 mb-1">
                                    {isLoadingTables ? (
                                        <div className={`text-xs ${textSub} p-2`}>Loading...</div>
                                    ) : (
                                        <>
                                            {tables.length === 0 && <div className={`text-xs ${textSub} p-2`}>No tables found</div>}
                                            {tables.map(table => (
                                                <div 
                                                    key={table}
                                                    className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm font-mono ${selectedTable === table ? activeBg + ' text-purple-400' : textSub + ' ' + hoverBg}`}
                                                    onClick={(e) => handleTableClick(table, e)}
                                                >
                                                    <FileText size={14} />
                                                    {table}
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Details */}
            <div className={`flex-1 flex flex-col ${bgCard} rounded-lg border ${borderMain} overflow-hidden`}>
                <div className={`p-3 border-b ${borderMain} flex justify-between items-center`}>
                    <h3 className={`font-bold ${textMain}`}>
                        {viewMode === 'stable' && selectedStableName && `Super Table: ${selectedStableName}`}
                        {viewMode === 'table' && selectedTable && `Table: ${selectedTable}`}
                        {!viewMode && 'Details'}
                    </h3>
                    {viewMode === 'stable' && (
                        <span className={`text-xs ${textSub}`}>Child Tables: {childTableCount}</span>
                    )}
                </div>
                
                <div className="flex-1 overflow-auto p-4 no-scrollbar">
                    {!viewMode ? (
                        <div className={`flex items-center justify-center h-full ${textSub}`}>
                            Select a super table or child table to view details
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6">
                            {/* Super Table View */}
                            {viewMode === 'stable' && (
                                <div>
                                    <div className="mb-4">
                                        <h4 className={`text-sm font-bold ${textMain} mb-2 flex items-center gap-2`}>
                                            <Info size={16} /> Schema Definition
                                        </h4>
                                        <div className={`rounded border ${borderMain} overflow-hidden`}>
                                            {renderSchemaTable()}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Child Table View */}
                            {viewMode === 'table' && (
                                <>
                                    {/* Info Section */}
                                    <div className={`grid grid-cols-2 gap-4 p-4 rounded border ${borderMain} ${isDark ? 'bg-slate-900/50' : 'bg-gray-50'}`}>
                                        <div>
                                            <span className={`text-xs uppercase ${textSub} block mb-1`}>Parent Super Table</span>
                                            <span className={`font-mono ${textMain}`}>{tableInfo?.stable_name || expandedStable || '-'}</span>
                                        </div>
                                        <div>
                                            <span className={`text-xs uppercase ${textSub} block mb-1`}>Tags</span>
                                            {tableInfo?.tags && Object.keys(tableInfo.tags).length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {Object.entries(tableInfo.tags).map(([key, val]) => (
                                                        <span key={key} className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
                                                            {key}: {String(val)}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className={`text-sm ${textSub}`}>No tags or Loading...</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Data Section */}
                                    <div className="flex-1 min-h-0 flex flex-col">
                                        <h4 className={`text-sm font-bold ${textMain} mb-2 flex items-center gap-2`}>
                                            <Database size={16} /> Latest Data (100 rows)
                                        </h4>
                                        <div className={`flex-1 rounded border ${borderMain} overflow-auto no-scrollbar`}>
                                            {renderDataTable()}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
