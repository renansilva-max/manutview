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
  Legend
} from 'recharts';
import { 
  Machine, 
  ProductionRecord, 
  DowntimeRecord 
} from '../types';
import { 
  calculateStats 
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
        status: downtime.some(d => d.machineId === m.id && d.date === selectedDate && !d.endTime) ? 'Manutenção' : 'Operacional'
      };
    });
  }, [machines, selectedDate, production, downtime, currentTime]);

  return (
    <div className="space-y-6 pb-10">
      {/* Status Summary - Always Visible */}
      <div className="flex flex-wrap gap-2">
        {data.map((m, idx) => (
          <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm">
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
                    <Cell key={`cell-${index}`} fill={entry.status === 'Manutenção' ? '#f43f5e' : '#10b981'} />
                  ))}
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
                <Bar dataKey="prodHora" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tempo Operacional vs Manutenção */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-6">Tempo em Horas (Operação vs Manutenção)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600 }} />
                <Bar name="Operação (h)" dataKey="operacional" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar name="Manutenção (h)" dataKey="manutencao" stackId="a" fill="#f43f5e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
