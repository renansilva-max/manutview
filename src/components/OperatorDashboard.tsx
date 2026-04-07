import React, { useState, useEffect } from 'react';
import { Machine, DowntimeRecord, DowntimeReason, ProductionRecord, ProductionLine } from '../types';
import { cn } from '../lib/utils';
import { Play, Square, AlertCircle, Clock, Package, Target, TrendingUp, LayoutGrid, List } from 'lucide-react';
import { calculateStats, calculateSeconds, formatChronometer, formatTotalTime } from '../utils';
import { OperatorMachineCard } from './OperatorMachineCard';

interface OperatorDashboardProps {
  machines: Machine[];
  productionLines: ProductionLine[];
  production: ProductionRecord[];
  downtime: DowntimeRecord[];
  reasons: DowntimeReason[];
  selectedDate: string;
  currentTime: string;
  onStartDowntime: (machineId: string, reason: string) => void;
  onFinishDowntime: (machineId: string, reasonName?: string) => void;
  onClick?: (machine: Machine) => void;
}

export function OperatorDashboard({ 
  machines, 
  productionLines,
  production,
  downtime, 
  reasons, 
  selectedDate,
  currentTime,
  onStartDowntime,
  onFinishDowntime,
  onClick
}: OperatorDashboardProps) {
  const [viewMode, setViewMode] = useState<'machine' | 'line'>('machine');
  const [expandedLineId, setExpandedLineId] = useState<string | null>(null);
  
  const commonProps = {
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
    formatChronometer
  };

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex justify-center mb-6">
        <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 shadow-inner">
          <button 
            onClick={() => setViewMode('machine')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              viewMode === 'machine' 
                ? "bg-white text-emerald-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            Máquina por Máquina
          </button>
          <button 
            onClick={() => setViewMode('line')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              viewMode === 'line' 
                ? "bg-white text-emerald-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <List className="w-4 h-4" />
            Agrupado por Linha
          </button>
        </div>
      </div>

      {viewMode === 'machine' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {machines.map((machine, machineIdx) => (
            <OperatorMachineCard 
              key={`machine-view-${machine.id || machineIdx}-${machineIdx}`} 
              machine={machine} 
              machineIdx={machineIdx} 
              {...commonProps}
            />
          ))}
        </div>
      ) : (
        /* Line View */
        <div className="space-y-6">
          {productionLines.map((line, lineIdx) => {
            const lineMachines = machines.filter(m => m.productionLineId === line.id);
            if (lineMachines.length === 0) return null;

            const isExpanded = expandedLineId === line.id;

            const lineStats = lineMachines.map(m => calculateStats(
              m, production, downtime, currentTime, { start: selectedDate, end: selectedDate }
            ));

            const totalProd = lineStats.reduce((acc, s) => acc + s.totalProduction, 0);
            const totalGoal = lineMachines.reduce((acc, m) => acc + (m.hourlyGoal || 0), 0);
            const avgProdPerHour = lineStats.length > 0 
              ? lineStats.reduce((acc, s) => acc + s.productionPerHour, 0) / lineStats.length 
              : 0;

            const stoppedMachinesCount = lineMachines.filter(m => 
              downtime.some(d => d.machineId === m.id && d.date === selectedDate && !d.endTime)
            ).length;

            return (
              <div key={`line-group-${line.id || lineIdx}`} className="space-y-4">
                <div 
                  onClick={() => setExpandedLineId(isExpanded ? null : line.id)}
                  className={cn(
                    "bg-white rounded-3xl p-6 shadow-sm border-2 transition-all flex flex-col cursor-pointer hover:shadow-md",
                    stoppedMachinesCount > 0 ? "border-rose-200 bg-rose-50/30" : "border-slate-100",
                    isExpanded && "ring-4 ring-emerald-500/10 border-emerald-500/20"
                  )}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{line.name}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {isExpanded ? "Clique para recolher" : "Clique para ver máquinas"}
                      </p>
                    </div>
                    <div className={cn(
                      "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border-2",
                      stoppedMachinesCount > 0 
                        ? "bg-rose-600 text-white border-rose-600" 
                        : "bg-emerald-100 text-emerald-600 border-emerald-200"
                    )}>
                      {stoppedMachinesCount > 0 
                        ? `${stoppedMachinesCount}/${lineMachines.length} MÁQUINAS PARADAS` 
                        : "LINHA OPERANDO"}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-4 h-4 text-emerald-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase">Prod Total</span>
                      </div>
                      <div className="text-xl font-black text-slate-800">{totalProd}</div>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-amber-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase">Meta/h Linha</span>
                      </div>
                      <div className="text-xl font-black text-slate-800">{totalGoal}</div>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase">Média Prod/h</span>
                      </div>
                      <div className="text-xl font-black text-slate-800">{avgProdPerHour.toFixed(1)}</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Registrar Parada para TODA A LINHA:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {reasons.map((reason, idx) => {
                        const machinesStoppedForThisReason = lineMachines.filter(m => 
                          downtime.some(d => d.machineId === m.id && d.date === selectedDate && d.type === reason.name && !d.endTime)
                        );
                        const isAllStopped = machinesStoppedForThisReason.length === lineMachines.length;
                        const isSomeStopped = machinesStoppedForThisReason.length > 0 && !isAllStopped;

                        return (
                          <button 
                            key={`line-reason-${line.id}-${reason.id}-${idx}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isAllStopped) {
                                lineMachines.forEach(m => onFinishDowntime(m.id, reason.name));
                              } else {
                                lineMachines.forEach(m => {
                                  const alreadyStopped = downtime.some(d => d.machineId === m.id && d.date === selectedDate && d.type === reason.name && !d.endTime);
                                  if (!alreadyStopped) onStartDowntime(m.id, reason.name);
                                });
                              }
                            }}
                            className={cn(
                              "flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all text-center group relative overflow-hidden",
                              isAllStopped 
                                ? "border-slate-800 scale-105 shadow-md z-10" 
                                : isSomeStopped
                                  ? "border-slate-400 border-dashed"
                                  : "border-transparent hover:scale-105"
                            )}
                            style={{ 
                              backgroundColor: isAllStopped ? reason.color : reason.color + '10',
                            }}
                          >
                            <div 
                              className={cn(
                                "w-7 h-7 rounded-xl mb-1.5 flex items-center justify-center shadow-sm transition-transform",
                                isAllStopped ? "bg-white/20" : "group-hover:rotate-12"
                              )}
                              style={{ backgroundColor: isAllStopped ? undefined : reason.color }}
                            >
                              {isAllStopped ? (
                                <Play className="w-3.5 h-3.5 text-white fill-current" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-white fill-current opacity-50" />
                              )}
                            </div>
                            <span className={cn(
                              "text-[9px] font-black uppercase leading-tight",
                              isAllStopped ? "text-white" : "text-slate-700"
                            )}>
                              {reason.name}
                            </span>
                            {isSomeStopped && (
                              <span className="text-[7px] font-bold text-slate-500 mt-0.5">
                                {machinesStoppedForThisReason.length}/{lineMachines.length}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Expanded Machines */}
                {isExpanded && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-4 border-l-4 border-emerald-500/20 py-2">
                    {lineMachines.map((machine, machineIdx) => (
                      <OperatorMachineCard 
                        key={`expanded-machine-${machine.id || machineIdx}`} 
                        machine={machine} 
                        machineIdx={machineIdx} 
                        isCompact={true} 
                        {...commonProps}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {machines.length === 0 && (
        <div className="col-span-full text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-bold">Nenhuma máquina encontrada para esta linha.</p>
        </div>
      )}
    </div>
  );
}
