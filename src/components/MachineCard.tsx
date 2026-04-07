import React, { useMemo } from 'react';
import { 
  Activity, 
  Clock, 
  Package, 
  TrendingUp,
  Wrench,
  CheckCircle2,
  Gauge,
  AlertTriangle
} from 'lucide-react';
import { 
  Machine, 
  ProductionRecord, 
  DowntimeRecord 
} from '../types';
import { 
  calculateStats 
} from '../utils';
import { cn } from '../lib/utils';

interface MachineCardProps {
  machine: Machine;
  selectedDate: string;
  currentTime: string;
  production: ProductionRecord[];
  downtime: DowntimeRecord[];
  isAuthenticated: boolean;
  onStartDowntime: () => void;
  onFinishDowntime: () => void;
  onClick: (machine: Machine) => void;
}

export const MachineCard: React.FC<MachineCardProps> = ({ 
  machine, 
  selectedDate, 
  currentTime,
  production, 
  downtime,
  isAuthenticated,
  onStartDowntime,
  onFinishDowntime,
  onClick
}) => {
  const stats = useMemo(() => 
    calculateStats(machine, production, downtime, currentTime, { start: selectedDate, end: selectedDate }),
    [selectedDate, production, downtime, machine, currentTime]
  );

  const activeDowntime = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return downtime.find(d => d.machineId === machine.id && d.date === today && !d.endTime);
  }, [selectedDate, downtime, machine.id]);

  const isActiveDowntime = !!activeDowntime;

  const calculateSeconds = (start: string, end: string) => {
    try {
      const startDate = new Date(`${selectedDate}T${start.length === 5 ? start + ':00' : start}`);
      const endDate = new Date(`${selectedDate}T${end.length === 5 ? end + ':00' : end}`);
      let diff = (endDate.getTime() - startDate.getTime()) / 1000;
      return diff < 0 ? diff + 86400 : diff;
    } catch (e) { return 0; }
  };

  const formatChronometer = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentDurationSeconds = activeDowntime ? calculateSeconds(activeDowntime.startTime, currentTime) : 0;

  const formatMinutes = (mins: number) => {
    const roundedMins = Math.round(mins);
    const h = Math.floor(roundedMins / 60);
    const m = roundedMins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const getOEEColor = (val: number) => {
    if (val >= 0.85) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (val >= 0.65) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-rose-600 bg-rose-50 border-rose-100';
  };

  const getOEEProgressColor = (val: number) => {
    if (val >= 0.85) return 'bg-emerald-500';
    if (val >= 0.65) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div 
      onClick={() => onClick(machine)}
      className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:border-emerald-200 transition-all cursor-pointer group flex flex-col"
    >
      {/* Header */}
      <div className={cn(
        "p-5 flex justify-between items-start transition-colors",
        isActiveDowntime ? "bg-rose-50/30" : "bg-emerald-50/30"
      )}>
        <div>
          <h3 className="text-lg font-black text-slate-800 group-hover:text-emerald-700 transition-colors">{machine.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              isActiveDowntime ? "bg-rose-500" : "bg-emerald-500"
            )} />
            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest",
              isActiveDowntime ? "text-rose-600" : "text-emerald-600"
            )}>
              {isActiveDowntime ? "Em Manutenção" : "Operacional"}
            </span>
          </div>
        </div>
        <div className={cn(
          "px-3 py-1.5 rounded-xl border font-black text-xs flex items-center gap-1.5 shadow-sm",
          getOEEColor(stats.oee)
        )}>
          <Gauge className="w-3 h-3" />
          OEE: {(stats.oee * 100).toFixed(0)}%
        </div>
      </div>

      {/* Main Stats */}
      <div className="p-5 space-y-5 flex-1">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative overflow-hidden">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Package className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase">Produção</span>
            </div>
            <div className="text-xl font-black text-slate-800">{stats.totalProduction}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="text-[10px] font-bold text-slate-400">{stats.productionPerHour.toFixed(1)} un/h</div>
              {machine.hourlyGoal && (
                <div className={cn(
                  "text-[9px] font-black px-1.5 py-0.5 rounded-full",
                  stats.productionPerHour >= machine.hourlyGoal ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                )}>
                  {((stats.productionPerHour / machine.hourlyGoal) * 100).toFixed(0)}% da Meta
                </div>
              )}
            </div>
            {machine.hourlyGoal && (
              <div className="absolute bottom-0 left-0 h-1 bg-slate-200 w-full">
                <div 
                  className={cn("h-full transition-all duration-1000", stats.productionPerHour >= machine.hourlyGoal ? "bg-emerald-500" : "bg-rose-500")}
                  style={{ width: `${Math.min((stats.productionPerHour / machine.hourlyGoal) * 100, 100)}%` }}
                />
              </div>
            )}
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Activity className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase">Meta/h</span>
            </div>
            <div className="text-xl font-black text-slate-800">{machine.hourlyGoal || 0}</div>
            <div className="text-[10px] font-bold text-slate-400 mt-0.5">Meta por Hora</div>
          </div>
        </div>

        {/* OEE Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Eficiência Geral (OEE)</span>
            <span className="text-[10px] font-black text-slate-700">{(stats.oee * 100).toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all duration-1000", getOEEProgressColor(stats.oee))}
              style={{ width: `${stats.oee * 100}%` }}
            />
          </div>
        </div>

        {/* Time Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
            <Clock className="w-3 h-3 text-emerald-500" />
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-emerald-600 uppercase leading-none">Operação</span>
              <span className="text-xs font-black text-emerald-700">{formatMinutes(stats.totalOperationalMinutes)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-rose-50/50 rounded-xl border border-rose-100/50">
            <AlertTriangle className="w-3 h-3 text-rose-500" />
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-rose-600 uppercase leading-none">Parada</span>
              <span className="text-xs font-black text-rose-700">{formatMinutes(stats.totalDowntimeMinutes)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Downtime Timer */}
      {isActiveDowntime && (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            onFinishDowntime();
          }}
          className="mx-5 mb-5 p-4 bg-rose-50 border-2 border-rose-500 rounded-2xl flex flex-col gap-1 cursor-pointer hover:scale-[1.02] transition-transform active:scale-95 group/timer"
          title="Clique para finalizar esta parada e retomar a operação"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
              <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Parado por: {activeDowntime.type}</span>
            </div>
            <div className="opacity-0 group-hover/timer:opacity-100 transition-opacity bg-white/50 p-1 rounded-full">
              <CheckCircle2 className="w-3 h-3 text-rose-600" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-400 uppercase">Tempo Decorrido:</span>
            <span className="text-xl font-black font-mono text-rose-700">{formatChronometer(currentDurationSeconds)}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      {isAuthenticated && (
        <div className="px-5 pb-5 flex gap-2" onClick={(e) => e.stopPropagation()}>
          {!isActiveDowntime ? (
            <button 
              onClick={onStartDowntime}
              className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all"
            >
              <Wrench className="w-3 h-3" />
              Iniciar Parada
            </button>
          ) : (
            <button 
              onClick={onFinishDowntime}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all"
            >
              <CheckCircle2 className="w-3 h-3" />
              Finalizar Parada
            </button>
          )}
        </div>
      )}
    </div>
  );
};
