import React from 'react';
import { Machine, DowntimeRecord, DowntimeReason, ProductionRecord } from '../types';
import { cn } from '../lib/utils';
import { Play, Square, Clock, Package, Target, TrendingUp } from 'lucide-react';
import { calculateStats } from '../utils';

interface OperatorMachineCardProps {
  machine: Machine;
  machineIdx: number;
  isCompact?: boolean;
  downtime: DowntimeRecord[];
  selectedDate: string;
  production: ProductionRecord[];
  currentTime: string;
  reasons: DowntimeReason[];
  onFinishDowntime: (machineId: string, reasonName?: string) => void;
  onStartDowntime: (machineId: string, reason: string) => void;
  onClick?: (machine: Machine) => void;
  calculateSeconds: (start: string, end: string) => number;
  formatTotalTime: (totalSeconds: number) => string;
  formatChronometer: (totalSeconds: number) => string;
  hideProductionStats?: boolean;
}

export const OperatorMachineCard: React.FC<OperatorMachineCardProps> = ({ 
  machine, 
  machineIdx, 
  isCompact = false,
  downtime,
  selectedDate,
  production,
  currentTime,
  reasons,
  onFinishDowntime,
  onStartDowntime,
  onClick,
  calculateSeconds,
  formatTotalTime,
  formatChronometer,
  hideProductionStats = false
}) => {
  const activeDowntimes = downtime.filter(d => 
    d.machineId === machine.id && 
    d.date === selectedDate && 
    !d.endTime
  );
  
  const isMachineStopped = activeDowntimes.length > 0;

  const stats = calculateStats(
    machine,
    production,
    downtime,
    currentTime,
    { start: selectedDate, end: selectedDate }
  );

  return (
    <div 
      onClick={() => onClick?.(machine)}
      className={cn(
        "bg-white rounded-3xl shadow-sm border-2 transition-all flex flex-col cursor-pointer hover:shadow-md",
        isCompact ? "p-4 rounded-2xl" : "p-4",
        isMachineStopped ? "border-rose-200 bg-rose-50/30" : "border-slate-100"
      )}
    >
      <div className={cn("flex justify-between items-start", isCompact ? "mb-2" : "mb-3")}>
        <div>
          <h3 className={cn("font-black text-slate-800 uppercase tracking-tight", isCompact ? "text-lg" : "text-xl")}>
            {machine.name}
          </h3>
          {!isCompact && <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status Atual</p>}
          {isMachineStopped && (
            <div className="mt-1 flex items-center gap-1.5 text-rose-600">
              <Clock className="w-3 h-3" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Parada Total: {formatTotalTime(stats.totalDowntimeMinutes * 60)}
              </span>
            </div>
          )}
        </div>
        <div className={cn(
          "font-black uppercase tracking-widest shadow-sm border-2",
          isCompact ? "px-3 py-1 rounded-full text-[8px]" : "px-4 py-1.5 rounded-full text-[10px]",
          isMachineStopped 
            ? "bg-rose-600 text-white border-rose-600 animate-pulse" 
            : "bg-emerald-100 text-emerald-600 border-emerald-200"
        )}>
          {isMachineStopped ? (isCompact ? "PARADA" : "MÁQUINA PARADA") : (isCompact ? "OK" : "OPERANDO")}
        </div>
      </div>

      {/* Production Stats */}
      {!hideProductionStats && (
        <div className={cn("grid grid-cols-2 gap-2", isCompact ? "mb-3" : "mb-4")}>
          <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-100">
            <div className="flex items-center gap-1 mb-0.5">
              <Package className={cn("text-slate-400", isCompact ? "w-2.5 h-2.5" : "w-3 h-3")} />
              <span className={cn("font-black text-slate-400 uppercase", isCompact ? "text-[7px]" : "text-[8px]")}>Prod</span>
            </div>
            <div className={cn("font-black text-slate-700", isCompact ? "text-xs" : "text-sm")}>{stats.totalProduction}</div>
          </div>
          <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-100">
            <div className="flex items-center gap-1 mb-0.5">
              <Target className={cn("text-slate-400", isCompact ? "w-2.5 h-2.5" : "w-3 h-3")} />
              <span className={cn("font-black text-slate-400 uppercase", isCompact ? "text-[7px]" : "text-[8px]")}>Meta/h</span>
            </div>
            <div className={cn("font-black text-slate-700", isCompact ? "text-xs" : "text-sm")}>{machine.hourlyGoal || 0}</div>
          </div>
          <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-100">
            <div className="flex items-center gap-1 mb-0.5">
              <TrendingUp className={cn("text-slate-400", isCompact ? "w-2.5 h-2.5" : "w-3 h-3")} />
              <span className={cn("font-black text-slate-400 uppercase", isCompact ? "text-[7px]" : "text-[8px]")}>Prod/h</span>
            </div>
            <div className={cn("font-black text-slate-700", isCompact ? "text-xs" : "text-sm")}>{stats.productionPerHour.toFixed(1)}</div>
          </div>
          <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-100">
            <div className="flex items-center gap-1 mb-0.5">
              <Clock className={cn("text-slate-400", isCompact ? "w-2.5 h-2.5" : "w-3 h-3")} />
              <span className={cn("font-black text-slate-400 uppercase", isCompact ? "text-[7px]" : "text-[8px]")}>Parada Total</span>
            </div>
            <div className={cn("font-black text-slate-700", isCompact ? "text-xs" : "text-sm")}>
              {formatTotalTime(stats.totalDowntimeMinutes * 60)}
            </div>
          </div>
        </div>
      )}

      {hideProductionStats && (
        <div className="mb-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 mb-0.5">
              <Clock className="text-slate-400 w-4 h-4" />
              <span className="font-black text-slate-400 uppercase text-xs">Parada Total</span>
            </div>
            <div className="font-black text-slate-700 text-xl">
              {formatTotalTime(stats.totalDowntimeMinutes * 60)}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3 flex-1">
        {activeDowntimes.length > 0 && (
          <div className="space-y-1.5">
            {activeDowntimes.map((active, activeIdx) => {
              const reason = reasons.find(r => r.name === active.type);
              
              const totalSecondsToday = downtime
                .filter(d => d.machineId === machine.id && d.date === selectedDate && d.type === active.type)
                .reduce((acc, d) => {
                  if (d.endTime) {
                    return acc + calculateSeconds(d.startTime, d.endTime);
                  } else {
                    return acc + calculateSeconds(d.startTime, currentTime);
                  }
                }, 0);

              const currentDurationSeconds = calculateSeconds(active.startTime, currentTime);

              return (
                <div 
                  key={`active-${machine.id}-${active.id || activeIdx}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onFinishDowntime(machine.id, active.type);
                  }}
                  className={cn(
                    "rounded-2xl flex flex-col gap-1.5 shadow-sm cursor-pointer hover:scale-[1.02] transition-transform active:scale-95 group/timer", 
                    isCompact ? "p-2.5" : "p-3"
                  )}
                  style={{ 
                    backgroundColor: reason?.color + '20', 
                    border: `2px solid ${reason?.color}` 
                  }}
                  title="Clique para finalizar esta parada e retomar a operação"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className={cn("rounded-full animate-ping", isCompact ? "w-2.5 h-2.5" : "w-3.5 h-3.5")}
                        style={{ backgroundColor: reason?.color }}
                      />
                      <div>
                        <p className={cn("font-bold text-slate-500 uppercase tracking-widest", isCompact ? "text-[7px]" : "text-[9px]")}>Parado por:</p>
                        <p className={cn("font-black uppercase leading-tight", isCompact ? "text-xs" : "text-base")} style={{ color: reason?.color }}>
                          {active.type}
                        </p>
                      </div>
                    </div>
                    <div className="opacity-0 group-hover/timer:opacity-100 transition-opacity bg-white/50 p-1 rounded-full">
                      <Play className="w-3.5 h-3.5 text-slate-600 fill-current" />
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-0.5 pt-1.5 border-t border-black/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-slate-600">
                        <Clock className={cn(isCompact ? "w-2.5 h-2.5" : "w-3 h-3")} />
                        <span className={cn("font-bold uppercase tracking-wider", isCompact ? "text-[7px]" : "text-[9px]")}>Tempo:</span>
                      </div>
                      <span className={cn("font-black font-mono text-slate-800", isCompact ? "text-base" : "text-lg")}>
                        {formatChronometer(currentDurationSeconds)}
                      </span>
                    </div>
                    {!isCompact && (
                      <p className="text-[9px] font-bold text-slate-400 text-right italic">
                        (total hoje: {formatTotalTime(totalSecondsToday)})
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="space-y-2">
          {!isCompact && (
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
              {isMachineStopped ? "Clique no motivo ativo para retomar:" : "Registrar Parada:"}
            </p>
          )}
          <div className={cn("grid gap-1.5", isCompact ? "grid-cols-1" : "grid-cols-2")}>
            {reasons.map((reason, reasonIdx) => {
              const activeRecord = activeDowntimes.find(d => d.type === reason.name);
              const isActive = !!activeRecord;

              const reasonTotalSecondsToday = downtime
                .filter(d => d.machineId === machine.id && d.date === selectedDate && d.type === reason.name)
                .reduce((acc, d) => {
                  if (d.endTime) {
                    return acc + calculateSeconds(d.startTime, d.endTime);
                  } else {
                    return acc + calculateSeconds(d.startTime, currentTime);
                  }
                }, 0);

              return (
                <button 
                  key={`operator-reason-${machine.id}-${reason.id || reasonIdx}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isActive) {
                      onFinishDowntime(machine.id, reason.name);
                    } else {
                      onStartDowntime(machine.id, reason.name);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-2 p-1.5 rounded-xl border-2 transition-all group relative overflow-hidden",
                    isCompact ? "justify-start" : "flex-col justify-center p-2 rounded-2xl",
                    isActive 
                      ? "border-slate-800 scale-105 shadow-md z-10" 
                      : "border-transparent hover:scale-105"
                  )}
                  style={{ 
                    backgroundColor: isActive ? reason.color : reason.color + '10',
                  }}
                >
                  <div 
                    className={cn(
                      "rounded-lg flex items-center justify-center shadow-sm transition-transform shrink-0",
                      isCompact ? "w-5 h-5" : "w-7 h-7 rounded-xl mb-1",
                      isActive ? "bg-white/20" : "group-hover:rotate-12"
                    )}
                    style={{ backgroundColor: isActive ? undefined : reason.color }}
                  >
                    {isActive ? (
                      <Play className={cn("text-white fill-current", isCompact ? "w-2.5 h-2.5" : "w-3.5 h-3.5")} />
                    ) : (
                      <Square className={cn("text-white fill-current opacity-50", isCompact ? "w-2.5 h-2.5" : "w-3.5 h-3.5")} />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className={cn(
                      "font-black uppercase leading-tight",
                      isCompact ? "text-[8px]" : "text-[9px]",
                      isActive ? "text-white" : "text-slate-700"
                    )}>
                      {reason.name}
                    </span>
                    <span className={cn(
                      "font-bold uppercase tracking-tighter mt-0.5",
                      isCompact ? "text-[6px]" : "text-[7px]",
                      isActive ? "text-white/80" : "text-slate-400"
                    )}>
                      Parada: {formatTotalTime(reasonTotalSecondsToday)}
                    </span>
                  </div>
                  {isActive && (
                    <div className="absolute top-1 right-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
