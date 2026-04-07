import React, { useMemo, useState } from 'react';
import { 
  Machine, 
  ProductionRecord, 
  DowntimeRecord,
  DowntimeReason
} from '../types';
import { OperatorMachineCard } from './OperatorMachineCard';
import { Wrench, AlertCircle, Filter, Check } from 'lucide-react';
import { calculateSeconds, formatChronometer, formatTotalTime } from '../utils';
import { cn } from '../lib/utils';

interface ActiveMaintenanceDashboardProps {
  machines: Machine[];
  selectedDate: string;
  currentTime: string;
  production: ProductionRecord[];
  downtime: DowntimeRecord[];
  reasons: DowntimeReason[];
  isAuthenticated: boolean;
  onStartDowntime: (machineId: string, reason: string) => void;
  onFinishDowntime: (machineId: string, reasonName?: string) => void;
  onClick: (machine: Machine) => void;
}

export const ActiveMaintenanceDashboard: React.FC<ActiveMaintenanceDashboardProps> = ({ 
  machines, 
  selectedDate, 
  currentTime,
  production, 
  downtime,
  reasons,
  isAuthenticated,
  onStartDowntime,
  onFinishDowntime,
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

  const activeMaintenanceMachines = useMemo(() => {
    return machines.filter(m => {
      const activeDowntime = downtime.find(d => d.machineId === m.id && d.date === selectedDate && !d.endTime);
      if (!activeDowntime) return false;
      
      // If no reasons are selected, show all active downtimes
      if (selectedReasons.length === 0) return true;
      
      // Otherwise, check if the active downtime type is in the selected reasons
      return selectedReasons.includes(activeDowntime.type);
    });
  }, [machines, downtime, selectedDate, selectedReasons]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Máquinas em Manutenção</h2>
          <p className="text-xs text-slate-500 font-medium">Equipamentos com paradas ativas no momento</p>
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

        <div className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-200 self-start md:self-auto">
          <Wrench className="w-4 h-4 animate-bounce" />
          <span className="text-sm font-black">{activeMaintenanceMachines.length} Máquinas</span>
        </div>
      </div>

      {activeMaintenanceMachines.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeMaintenanceMachines.map((machine, idx) => (
            <OperatorMachineCard 
              key={`active-maint-${machine.id}-${idx}`}
              machine={machine}
              machineIdx={idx}
              downtime={downtime}
              selectedDate={selectedDate}
              production={production}
              currentTime={currentTime}
              reasons={reasons}
              onFinishDowntime={onFinishDowntime}
              onStartDowntime={onStartDowntime}
              onClick={onClick}
              calculateSeconds={calculateSeconds}
              formatTotalTime={formatTotalTime}
              formatChronometer={formatChronometer}
              hideProductionStats={true}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-black text-slate-800">
            {selectedReasons.length > 0 ? "Nenhuma máquina com este motivo" : "Tudo em Ordem!"}
          </h3>
          <p className="text-slate-500 font-medium">
            {selectedReasons.length > 0 
              ? "Tente selecionar outros motivos ou limpe o filtro." 
              : "Nenhuma máquina em manutenção no momento."}
          </p>
        </div>
      )}
    </div>
  );
};
