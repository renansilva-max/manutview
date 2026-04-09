import React, { useMemo, useState } from 'react';
import { 
  Machine, 
  ProductionRecord, 
  DowntimeRecord,
  DowntimeReason
} from '../types';
import { 
  calculateStats
} from '../utils';
import { cn } from '../lib/utils';
import { Wrench, Clock, AlertTriangle, TrendingDown, Filter, Check } from 'lucide-react';

interface MaintenanceRankingDashboardProps {
  machines: Machine[];
  selectedDate: string;
  selectedEndDate?: string;
  currentTime: string;
  production: ProductionRecord[];
  downtime: DowntimeRecord[];
  reasons: DowntimeReason[];
  onClick?: (machine: Machine) => void;
}

export const MaintenanceRankingDashboard: React.FC<MaintenanceRankingDashboardProps> = ({ 
  machines, 
  selectedDate, 
  selectedEndDate,
  currentTime,
  production, 
  downtime,
  reasons,
  onClick
}) => {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);

  const toggleReason = (reasonName: string) => {
    setSelectedReasons(prev => 
      prev.includes(reasonName) 
        ? prev.filter(r => r !== reasonName) 
        : [...prev, reasonName]
    );
  };

  const rankedMachines = useMemo(() => {
    return machines.map(m => {
      // Filter downtime by selected reasons if any
      const filteredDowntime = selectedReasons.length > 0
        ? downtime.filter(d => selectedReasons.includes(d.type))
        : downtime;

      const stats = calculateStats(
        m, 
        production, 
        filteredDowntime, 
        currentTime,
        { start: selectedDate, end: selectedEndDate || selectedDate }
      );
      
      return {
        ...m,
        maintTime: stats.totalDowntimeMinutes,
        maintPercent: (stats.totalDowntimeMinutes / (stats.totalOperationalMinutes + stats.totalDowntimeMinutes || 1)) * 100
      };
    })
    .filter(m => m.maintTime > 0) // Exclude machines with zero downtime
    .sort((a, b) => b.maintTime - a.maintTime);
  }, [machines, selectedDate, selectedEndDate, production, downtime, currentTime, selectedReasons]);

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Ranking de máquina parada</h2>
          <p className="text-xs text-slate-500 font-medium">Máquinas com maior tempo de parada no período selecionado</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl text-slate-500 text-[10px] font-black uppercase tracking-wider mr-2">
            <Filter className="w-3 h-3" />
            Filtrar Motivo:
          </div>
          {reasons.map((reason, idx) => {
            const isSelected = selectedReasons.includes(reason.name);
            return (
              <button
                key={`filter-reason-${reason.id || idx}`}
                onClick={() => toggleReason(reason.name)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border-2 flex items-center gap-1.5",
                  isSelected 
                    ? "text-white border-transparent shadow-sm" 
                    : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                )}
                style={{ 
                  backgroundColor: isSelected ? reason.color : undefined,
                }}
              >
                {isSelected && <Check className="w-3 h-3" />}
                {reason.name}
              </button>
            );
          })}
          {selectedReasons.length > 0 && (
            <button 
              onClick={() => setSelectedReasons([])}
              className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-rose-500 hover:bg-rose-50 transition-colors"
            >
              Limpar
            </button>
          )}
        </div>

        <div className="p-2 bg-rose-50 rounded-2xl border border-rose-100 flex items-center gap-3 self-start md:self-auto">
          <Wrench className="w-5 h-5 text-rose-600" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-rose-400 uppercase leading-none">Total Paradas</span>
            <span className="text-base font-black text-rose-700">
              {formatDuration(rankedMachines.reduce((acc, m) => acc + m.maintTime, 0))}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {rankedMachines.map((m, idx) => (
          <div 
            key={`ranking-${m.id}-${idx}`}
            onClick={() => onClick?.(m)}
            className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-black shadow-sm",
                idx === 0 ? "bg-rose-600 text-white" : 
                idx === 1 ? "bg-rose-500 text-white" :
                idx === 2 ? "bg-rose-400 text-white" : "bg-slate-100 text-slate-400"
              )}>
                {idx + 1}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 group-hover:text-rose-600 transition-colors">{m.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase">
                    <Clock className="w-3 h-3" />
                    Tempo Total: {formatDuration(m.maintTime)}
                  </div>
                  <div className="w-1 h-1 bg-slate-300 rounded-full" />
                  <div className="flex items-center gap-1 text-[9px] font-bold text-rose-500 uppercase">
                    <AlertTriangle className="w-3 h-3" />
                    {m.maintPercent.toFixed(1)}% de Indisponibilidade
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Impacto na Produção</span>
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-lg font-black text-slate-800">{formatDuration(m.maintTime)}</span>
                </div>
              </div>
              <div className="h-10 w-1 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="bg-rose-500 w-full transition-all duration-1000"
                  style={{ height: `${Math.min(m.maintPercent, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}

        {rankedMachines.length === 0 && (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-black text-slate-800">
              {selectedReasons.length > 0 ? "Nenhuma máquina com este motivo" : "Nenhuma parada registrada"}
            </h3>
            <p className="text-slate-500 font-medium">
              {selectedReasons.length > 0 
                ? "Tente selecionar outros motivos ou limpe o filtro." 
                : "Não há registros de paradas para as máquinas no período selecionado."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
