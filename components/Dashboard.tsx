import React from 'react';
import { Device } from '../types';
import { Activity, Zap, Fan, Box, Server } from 'lucide-react';

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

  return (
    <div className="h-full overflow-y-auto p-4">
      <h1 className="text-2xl font-bold text-white mb-6">{dict.dashboardTitle}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {devices.map(device => (
          <div 
            key={device.id}
            onClick={() => onSelectDevice(device.id)}
            className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 cursor-pointer hover:bg-slate-800 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-900/10 transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 group-hover:border-blue-500/30 transition-colors">
                {getDeviceIcon(device.type)}
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                device.status === 'running' 
                ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${device.status === 'running' ? 'bg-green-500' : 'bg-red-500'}`} />
                {device.status === 'running' ? dict.running : dict.stopped}
              </div>
            </div>

            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors truncate" title={device.name}>
              {device.name}
            </h3>
            <p className="text-sm text-slate-500 line-clamp-2 h-10 mb-4">
              {device.description || dict.noDescription}
            </p>

            <div className="flex items-center gap-4 text-xs text-slate-400 border-t border-slate-800 pt-4">
              <div className="flex flex-col">
                <span className="text-slate-600 uppercase tracking-wider text-[10px]">{dict.type}</span>
                <span className="font-mono">{device.type}</span>
              </div>
              <div className="flex flex-col ml-auto text-right">
                <span className="text-slate-600 uppercase tracking-wider text-[10px]">{dict.metrics}</span>
                <span className="font-mono">{device.metrics.length}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
