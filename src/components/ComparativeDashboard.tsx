import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  Legend,
  LabelList
} from 'recharts';
import { 
  Machine, 
  ProductionRecord, 
  DowntimeRecord 
} from '../types';
import { 
  calculateStats,
  getTimelineSegments,
  minutesToTime,
  DAY_START,
  DAY_END,
  timeToMinutes
} from '../utils';
import { cn } from '../lib/utils';

interface ComparativeDashboardProps {
  machines: Machine[];
  selectedDate: string;
  currentTime: string;
  production: ProductionRecord[];
  downtime: DowntimeRecord[];
}

export const ComparativeDashboard: React.FC<ComparativeDashboardProps> = ({ 
  machines, 
  selectedDate, 
  currentTime,
  production, 
  downtime
}) => {
  const data = useMemo(() => {
    return machines.map(m => {
      const stats = calculateStats(
        m, 
        production, 
        downtime, 
        currentTime,
        { start: selectedDate, end: selectedDate }
      );
      return {
        name: m.name,
        producao: stats.totalProduction,
        operacional: Math.round(stats.totalOperationalMinutes / 60 * 10) / 10,
        manutencao: Math.round(stats.totalDowntimeMinutes / 60 * 10) / 10,
        prodHora: Math.round(stats.productionPerHour * 10) / 10,
        metaHora: m.hourlyGoal || 0,
        status: downtime.some(d => d.machineId === m.id && d.date === selectedDate && !d.endTime) ? 'Manutenção' : 'Operacional'
      };
    });
  }, [machines, selectedDate, production, downtime, currentTime]);

  const chronologicalData = useMemo(() => {
    return machines.map(m => {
      const machineProduction = production.filter(p => p.machineId === m.id && p.date === selectedDate);
      const machineDowntime = downtime.filter(d => d.machineId === m.id && d.date === selectedDate);
      const segments = getTimelineSegments(selectedDate, machineProduction, machineDowntime, currentTime);
      
      const result: any = { name: m.name };
      segments.forEach((seg, idx) => {
        const key = `seg_${idx}`;
        result[key] = seg.durationMinutes;
        result[`${key}_type`] = seg.type;
        result[`${key}_time`] = minutesToTime(seg.durationMinutes);
      });
      return result;
    });
  }, [machines, selectedDate, production, downtime, currentTime]);

  const maxSegments = useMemo(() => {
    let max = 0;
    machines.forEach(m => {
      const machineProduction = production.filter(p => p.machineId === m.id && p.date === selectedDate);
      const machineDowntime = downtime.filter(d => d.machineId === m.id && d.date === selectedDate);
      const segments = getTimelineSegments(selectedDate, machineProduction, machineDowntime, currentTime);
      if (segments.length > max) max = segments.length;
    });
    return max;
  }, [machines, selectedDate, production, downtime, currentTime]);

  return (
    <div className="space-y-6 pb-10">
      {/* Status Summary - Always Visible */}
      <div className="flex flex-wrap gap-2">
        {data.map((m, idx) => (
          <div key={`status-${m.name}-${idx}`} className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              m.status === 'Manutenção' ? "bg-rose-500" : "bg-emerald-500"
            )} />
            <span className="text-[10px] font-bold text-slate-700">{m.name}:</span>
            <span className={cn(
              "text-[9px] font-black uppercase tracking-tighter",
              m.status === 'Manutenção' ? "text-rose-600" : "text-emerald-600"
            )}>
              {m.status}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Produção Total */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-6">Produção Total (un)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="producao" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`comp-prod-cell-${index}`} fill={entry.status === 'Manutenção' ? '#f43f5e' : '#10b981'} />
                  ))}
                  <LabelList dataKey="producao" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Produção por Hora */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-6">Produção por Hora</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="top" height={36}/>
                <Bar name="Produzido" dataKey="prodHora" fill="#f43f5e" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="prodHora" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#f43f5e' }} />
                </Bar>
                <Bar name="Meta" dataKey="metaHora" fill="#10b981" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="metaHora" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#10b981' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tempo em Horas (Operação vs Manutenção) - Cronológico */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-6">Tempo em Horas (Operação vs Manutenção) - Cronológico</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chronologicalData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis 
                  type="number" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                  tickFormatter={(val) => minutesToTime(val)}
                  domain={[0, timeToMinutes(DAY_END) - timeToMinutes(DAY_START)]} 
                />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any, name: string, props: any) => {
                    const idx = name.split('_')[1];
                    const type = props.payload[`seg_${idx}_type`];
                    const label = type === 'production' ? 'Operação' : type === 'downtime' ? 'Manutenção' : 'Vazio';
                    return [minutesToTime(value), label];
                  }}
                />
                {Array.from({ length: maxSegments }).map((_, idx) => (
                  <Bar 
                    key={`comp-bar-seg-${idx}`} 
                    dataKey={`seg_${idx}`} 
                    stackId="a" 
                    isAnimationActive={false}
                  >
                    {chronologicalData.map((entry, index) => {
                      const type = entry[`seg_${idx}_type`];
                      return (
                        <Cell 
                          key={`comp-cell-seg-${idx}-${index}`} 
                          fill={type === 'production' ? '#10b981' : type === 'downtime' ? '#f43f5e' : '#f1f5f9'} 
                        />
                      );
                    })}
                    {/* Only show label if segment is large enough */}
                    <LabelList 
                      dataKey={`seg_${idx}`} 
                      position="center" 
                      style={{ fontSize: 9, fontWeight: 700, fill: '#fff', pointerEvents: 'none' }}
                      formatter={(val: number) => {
                        return val > 30 ? minutesToTime(val) : '';
                      }}
                    />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full" />
              <span className="text-xs font-bold text-slate-600">Operação</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-rose-500 rounded-full" />
              <span className="text-xs font-bold text-slate-600">Manutenção</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-slate-200 rounded-full" />
              <span className="text-xs font-bold text-slate-600">Vazio</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
