import React, { useEffect, useRef, useState } from 'react';
import { SimulationStep } from '../types';
import { AlertTriangle, Info, XCircle, AlertOctagon, Download, Sparkles, X, Copy, Check } from 'lucide-react';
import { formatTime, formatCSVTimestamp } from '../utils/timeUtils';
import { generateLogAnalysis } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface LogViewerProps {
  logs: SimulationStep[];
  dict: any;
  theme?: 'dark' | 'light';
  lang?: string;
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs, dict, theme = 'dark', lang = 'zh' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'bg-black border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const headerClass = isDark ? 'bg-black border-slate-800' : 'bg-slate-50 border-slate-200';
  const textPrimary = isDark ? 'text-slate-300' : 'text-slate-700';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';
  const textSecondary = isDark ? 'text-slate-600' : 'text-slate-400';
  const hoverClass = isDark ? 'hover:bg-slate-900' : 'hover:bg-slate-100';

  useEffect(() => {
    if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'critical': return <AlertOctagon className="w-4 h-4 text-red-600 animate-pulse" />;
      default: return <Info className="w-4 h-4 text-purple-400" />;
    }
  };

  const handleAiAnalysis = async () => {
    if (logs.length === 0) return;
    setIsAnalyzing(true);
    try {
        const result = await generateLogAnalysis(logs, lang);
        setAnalysisResult(result);
    } catch (error) {
        setAnalysisResult("Analysis failed. Please check console.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleCopy = () => {
    if (analysisResult) {
      navigator.clipboard.writeText(analysisResult);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
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
    <div className={`h-full flex flex-col ${cardClass} rounded-lg border overflow-hidden relative`}>
      <div className={`p-3 border-b ${headerClass} flex justify-between items-center`}>
        <h3 className={`text-sm font-semibold ${textPrimary}`}>{dict.logs}</h3>
        <div className="flex items-center gap-2">
            <button 
                onClick={handleAiAnalysis}
                className={`text-xs flex items-center gap-1 ${isDark ? 'bg-purple-900/30 hover:bg-purple-900/50 border-purple-800' : 'bg-purple-100 hover:bg-purple-200 border-purple-200'} text-purple-400 px-2 py-1 rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                disabled={logs.length === 0 || isAnalyzing}
                title={dict.aiAnalysis}
            >
                {isAnalyzing ? <span className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full" /> : <Sparkles size={12} />}
                {isAnalyzing ? dict.analyzing : dict.aiAnalysis}
            </button>
            <button 
                onClick={handleExportCSV}
                className={`text-xs flex items-center gap-1 ${isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 border-slate-200'} text-purple-400 px-2 py-1 rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                disabled={logs.length === 0}
                title={dict.exportCsv}
            >
                <Download size={12} /> {dict.exportCsv}
            </button>
        </div>
      </div>

      {/* Result Modal */}
      {analysisResult && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className={`${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} w-full max-w-2xl max-h-[80vh] flex flex-col rounded-lg shadow-2xl border`}>
                 <div className={`flex justify-between items-center p-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                     <h3 className={`text-lg font-bold flex items-center gap-2 ${textPrimary}`}>
                         <Sparkles className="text-purple-400" /> {dict.analysisResult}
                     </h3>
                     <button onClick={() => setAnalysisResult(null)} className={`${textMuted} hover:${textPrimary}`}>
                         <X size={20} />
                     </button>
                 </div>
                 <div className={`p-6 overflow-y-auto text-sm leading-relaxed ${textPrimary}`}>
                     <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                            h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-3 mt-2" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-2 mt-2" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-base font-bold mb-1 mt-1" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
                            li: ({node, ...props}) => <li className="" {...props} />,
                            p: ({node, ...props}) => <p className="mb-2" {...props} />,
                            blockquote: ({node, ...props}) => <blockquote className={`border-l-4 ${isDark ? 'border-slate-600 bg-slate-800/50' : 'border-slate-300 bg-slate-50'} pl-4 py-2 mb-2 italic`} {...props} />,
                            code: ({node, inline, className, children, ...props}: any) => {
                                const match = /language-(\w+)/.exec(className || '');
                                return !inline ? (
                                    <pre className={`${isDark ? 'bg-slate-950' : 'bg-slate-100'} p-3 rounded-lg overflow-x-auto mb-2 text-xs font-mono border ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                                        <code className={className} {...props}>{children}</code>
                                    </pre>
                                ) : (
                                    <code className={`${isDark ? 'bg-slate-800' : 'bg-slate-200'} px-1 py-0.5 rounded font-mono text-xs`} {...props}>{children}</code>
                                )
                            },
                            table: ({node, ...props}) => <div className="overflow-x-auto mb-4"><table className={`w-full border-collapse border ${isDark ? 'border-slate-700' : 'border-slate-200'}`} {...props} /></div>,
                            th: ({node, ...props}) => <th className={`border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'} p-2 text-left font-bold`} {...props} />,
                            td: ({node, ...props}) => <td className={`border ${isDark ? 'border-slate-700' : 'border-slate-200'} p-2`} {...props} />,
                        }}
                     >
                        {analysisResult}
                     </ReactMarkdown>
                 </div>
                 <div className={`p-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} flex justify-end gap-2`}>
                    <button 
                        onClick={handleCopy}
                        className={`flex items-center gap-2 px-4 py-2 rounded ${isDark ? 'bg-purple-900/30 hover:bg-purple-900/50 text-purple-300' : 'bg-purple-100 hover:bg-purple-200 text-purple-700'} transition-colors text-xs font-medium`}
                    >
                        {isCopied ? <Check size={14} /> : <Copy size={14} />}
                        {isCopied ? (dict.copied || 'Copied') : (dict.copy || 'Copy')}
                    </button>
                    <button 
                        onClick={() => setAnalysisResult(null)}
                        className={`px-4 py-2 rounded ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'} ${textPrimary} text-xs font-medium`}
                    >
                        {dict.close}
                    </button>
                 </div>
            </div>
        </div>
      )}

      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-2 scrollbar-thin text-xs font-mono space-y-1"
      >
        {logs.length === 0 && <div className={`${textSecondary} italic p-2`}>{dict.noLogs}</div>}
        
        {logs.map((log) => (
            <div key={log.timestamp} className={`flex items-start gap-2 p-2 rounded ${hoverClass} ${log.statusSeverity === 'critical' ? (isDark ? 'bg-red-900/20' : 'bg-red-100') : ''}`}>
                <span className="mt-0.5">{getIcon(log.statusSeverity)}</span>
                <div className="flex flex-col">
                    <span className={`${textMuted} text-[10px]`}>
                        {formatTime(log.timestamp)}
                    </span>
                    <span className={textPrimary}>{log.logMessage}</span>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};
