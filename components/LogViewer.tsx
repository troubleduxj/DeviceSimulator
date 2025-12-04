import React, { useEffect, useRef } from 'react';
import { SimulationStep } from '../types';
import { AlertTriangle, Info, XCircle, AlertOctagon, Download } from 'lucide-react';
import { formatTime, formatCSVTimestamp } from '../utils/timeUtils';

interface LogViewerProps {
  logs: SimulationStep[];
  dict: any;
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs, dict }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'critical': return <AlertOctagon className="w-4 h-4 text-red-600 animate-pulse" />;
      default: return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const handleExportCSV = () => {
      if (logs.length === 0) return;
      
      // 1. Collect all possible keys from metrics
      const allKeys = new Set<string>();
      logs.forEach(log => {
          if (log.metrics) {
              Object.keys(log.metrics).forEach(k => allKeys.add(k));
          }
      });
      const keysArray = Array.from(allKeys);

      // 2. Build Header Row
      const header = ['Timestamp', 'Severity', 'Message', ...keysArray].join(',');

      // 3. Build Data Rows
      const rows = logs.map(log => {
          const ts = formatCSVTimestamp(log.timestamp);
          const severity = log.statusSeverity;
          const msg = `"${log.logMessage.replace(/"/g, '""')}"`; // Escape quotes
          
          const metricValues = keysArray.map(key => {
              return log.metrics && log.metrics[key] !== undefined ? log.metrics[key] : '';
          });

          return [ts, severity, msg, ...metricValues].join(',');
      });

      // 4. Create Blob and Download
      const csvContent = [header, ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `simulation_logs_${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/50 rounded-lg border border-slate-800">
      <div className="p-3 border-b border-slate-800 bg-slate-900/80 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-slate-300">{dict.logs}</h3>
        <button 
            onClick={handleExportCSV}
            className="text-xs flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-blue-400 px-2 py-1 rounded border border-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={logs.length === 0}
            title={dict.exportCsv}
        >
            <Download size={12} /> {dict.exportCsv}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin text-xs font-mono space-y-1">
        {logs.length === 0 && <div className="text-slate-600 italic p-2">{dict.noLogs}</div>}
        
        {logs.map((log) => (
            <div key={log.timestamp} className={`flex items-start gap-2 p-2 rounded hover:bg-slate-800/50 ${log.statusSeverity === 'critical' ? 'bg-red-900/20' : ''}`}>
                <span className="mt-0.5">{getIcon(log.statusSeverity)}</span>
                <div className="flex flex-col">
                    <span className="text-slate-500 text-[10px]">
                        {formatTime(log.timestamp)}
                    </span>
                    <span className="text-slate-300">{log.logMessage}</span>
                </div>
            </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};
