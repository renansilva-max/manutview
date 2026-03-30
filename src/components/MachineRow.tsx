import React, { useMemo } from 'react';
import { 
  TrendingDown, 
  Edit2,
  Wrench,
  CheckCircle2
} from 'lucide-react';
import { 
  Machine, 
  ProductionRecord, 
  DowntimeRecord 
} from '../types';
import { 
  getTimelineSegments, 
  calculateStats, 
  DAY_START, 
  DAY_END, 
  timeToMinutes 
} from '../utils';
import { cn } from '../lib/utils';

interface MachineRowProps {
  machine: Machine;
  selectedDate: string;
  currentTime: string;
  production: ProductionRecord[];
  downtime: DowntimeRecord[];
  isAuthenticated: boolean;
  onStartDowntime: () => void;
  onFinishDowntime: () => void;
  onClick: (machine: Machine) => void;
  onEditRecord: (type: 'production' | 'downtime', record: any) => void;
}

export const MachineRow: React.FC<MachineRowProps> = ({ 
  machine, 
  selectedDate, 
  currentTime,
  production, 
  downtime,
  isAuthenticated,
  onStartDowntime,
  onFinishDowntime,
  onClick,
  onEditRecord
}) => {
  const stats = useMemo(() => 
    calculateStats(machine, production, downtime, currentTime, { start: selectedDate, end: selectedDate }),
    [selectedDate, production, downtime, machine, currentTime]
  );

  const segments = useMemo(() => 
    getTimelineSegments(selectedDate, production.filter(p => p.machineId === machine.id), downtime.filter(d => d.machineId === machine.id), currentTime),
    [selectedDate, production, downtime, machine.id, currentTime]
  );

  const isActiveDowntime = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return selectedDate === today && downtime.some(d => d.machineId === machine.id && d.date === today && !d.endTime);
  }, [selectedDate, downtime, machine.id]);

  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h${m}m`;
  };

  return (
    <div 
      onClick={() => onClick(machine)}
      className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="p-1.5 flex flex-col md:flex-row gap-2 items-center">
        {/* Info Section - Extreme Compact */}
        <div className="w-full md:w-64 flex flex-col gap-0.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                isActiveDowntime ? "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]" : "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
              )} />
              <h3 className="font-bold text-slate-800 text-[11px] truncate max-w-[80px]">{machine.name}</h3>
            </div>
            <div className="flex items-center gap-1">
              <div className={cn(
                "px-1 py-0.5 rounded text-[8px] font-black border",
                stats.oee >= 0.85 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                stats.oee >= 0.65 ? "bg-amber-50 text-amber-600 border-amber-100" : 
                "bg-rose-50 text-rose-600 border-rose-100"
              )}>
                OEE: {(stats.oee * 100).toFixed(0)}%
              </div>
              <div className={cn(
                "px-1.5 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-tighter",
                isActiveDowntime ? "bg-rose-100 text-rose-700 border border-rose-200" : "bg-emerald-100 text-emerald-700 border border-emerald-200"
              )}>
                {isActiveDowntime ? "Parada" : "Ativa"}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-4 md:grid-cols-4 gap-x-2 gap-y-0">
            <div className="flex flex-col md:flex-row md:justify-between text-[9px] leading-tight">
              <span className="text-slate-400 font-medium">Prod:</span>
              <span className="text-slate-700 font-bold">{stats.totalProduction}</span>
            </div>
            <div className="flex flex-col md:flex-row md:justify-between text-[9px] leading-tight">
              <span className="text-slate-400 font-medium">Meta/hora:</span>
              <span className="text-slate-700 font-bold">{machine.hourlyGoal || 0}</span>
            </div>
            <div className="flex flex-col md:flex-row md:justify-between text-[9px] leading-tight">
              <span className="text-slate-400 font-medium">Prod/hora:</span>
              <span className="text-slate-700 font-bold">{stats.productionPerHour.toFixed(1)}</span>
            </div>
            <div className="flex flex-col md:flex-row md:justify-between text-[9px] leading-tight">
              <span className="text-slate-400 font-medium">Perf:</span>
              <span className={cn(
                "font-bold",
                machine.hourlyGoal && stats.productionPerHour >= machine.hourlyGoal ? "text-emerald-600" : "text-rose-600"
              )}>
                {machine.hourlyGoal ? ((stats.productionPerHour / machine.hourlyGoal) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <div className="flex flex-col md:flex-row md:justify-between text-[9px] leading-tight">
              <span className="text-slate-400 font-medium">Op:</span>
              <span className="text-emerald-600 font-bold">{formatMinutes(stats.totalOperationalMinutes)}</span>
            </div>
            <div className="flex flex-col md:flex-row md:justify-between text-[9px] leading-tight">
              <span className="text-slate-400 font-medium">Pa:</span>
              <span className="text-rose-600 font-bold">{formatMinutes(stats.totalDowntimeMinutes)}</span>
            </div>
            <div className="flex flex-col md:flex-row md:justify-between text-[9px] leading-tight">
              <span className="text-slate-400 font-medium">Disp:</span>
              <span className="text-slate-700 font-bold">{(stats.availability * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Timeline Section - Slim */}
        <div className="flex-1 w-full min-w-0">
          <div className="relative h-5 bg-slate-100 rounded-md overflow-hidden flex timeline-scroll overflow-x-auto">
            {segments.map((seg, idx) => {
              const width = (seg.durationMinutes / (timeToMinutes(DAY_END) - timeToMinutes(DAY_START))) * 100;
              return (
                <button
                  key={seg.id + idx}
                  onClick={() => {
                    if (seg.type !== 'empty' && seg.record) {
                      onEditRecord(seg.type, seg.record);
                    }
                  }}
                  className={cn(
                    "h-full transition-all relative group cursor-default",
                    seg.type === 'production' && "bg-emerald-500 hover:bg-emerald-400 cursor-pointer",
                    seg.type === 'downtime' && "bg-rose-500 hover:bg-rose-400 cursor-pointer",
                    seg.type === 'empty' && "bg-slate-200"
                  )}
                  style={{ width: `${width}%`, minWidth: width > 0 ? '2px' : '0' }}
                >
                  {seg.type !== 'empty' && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10">
                      <Edit2 className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Actions - Compact */}
        {isAuthenticated && (
          <div className="flex gap-2 w-full md:w-auto">
            {!isActiveDowntime ? (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onStartDowntime();
                }}
                className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-bold transition-all border border-rose-200"
              >
                <Wrench className="w-3 h-3" />
                Parar
              </button>
            ) : (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onFinishDowntime();
                }}
                className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-bold transition-all shadow-sm"
              >
                <CheckCircle2 className="w-3 h-3" />
                Voltar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
