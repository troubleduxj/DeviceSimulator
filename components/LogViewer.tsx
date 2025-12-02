import React, { useEffect, useRef } from 'react';
import { SimulationStep } from '../types';
import { AlertTriangle, Info, XCircle, AlertOctagon } from 'lucide-react';

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

  return (
    <div className="h-full flex flex-col bg-slate-900/50 rounded-lg border border-slate-800">
      <div className="p-3 border-b border-slate-800 bg-slate-900/80">
        <h3 className="text-sm font-semibold text-slate-300">{dict.logs}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin text-xs font-mono space-y-1">
        {logs.length === 0 && <div className="text-slate-600 italic p-2">{dict.noLogs}</div>}
        
        {logs.map((log) => (
            <div key={log.timestamp} className={`flex items-start gap-2 p-2 rounded hover:bg-slate-800/50 ${log.statusSeverity === 'critical' ? 'bg-red-900/20' : ''}`}>
                <span className="mt-0.5">{getIcon(log.statusSeverity)}</span>
                <div className="flex flex-col">
                    <span className="text-slate-500 text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
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
