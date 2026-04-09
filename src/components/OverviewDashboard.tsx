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
  PieChart,
  Pie,
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
  DAY_START,
  DAY_END,
  timeToMinutes
} from '../utils';
import { cn } from '../lib/utils';
import { Wrench, Package, Clock, Target, TrendingUp, AlertTriangle } from 'lucide-react';

interface MaintenanceSummaryDashboardProps {
  machines: Machine[];
  selectedDate: string;
  selectedEndDate?: string;
  currentTime: string;
  production: ProductionRecord[];
  downtime: DowntimeRecord[];
}

export const OverviewDashboard: React.FC<MaintenanceSummaryDashboardProps> = ({ 
  machines, 
  selectedDate, 
  selectedEndDate,
  currentTime,
  production, 
  downtime
}) => {
  const workingHoursInfo = useMemo(() => {
    const dayProd = production.filter(p => p.date >= selectedDate && p.date <= (selectedEndDate || selectedDate));
    const dayDown = downtime.filter(d => d.date >= selectedDate && d.date <= (selectedEndDate || selectedDate));
    
    const allTimes = [
      ...dayProd.map(p => timeToMinutes(p.startTime)),
      ...dayProd.map(p => timeToMinutes(p.endTime)),
      ...dayDown.map(d => timeToMinutes(d.startTime)),
      ...dayDown.map(d => d.endTime ? timeToMinutes(d.endTime) : timeToMinutes(currentTime))
    ].filter(t => !isNaN(t));

    if (allTimes.length === 0) return { minutes: 0, hours: 0 };

    const start = Math.min(...allTimes);
    const end = Math.max(...allTimes);
    
    // Subtract 1 hour for lunch (60 minutes)
    const totalMinutes = Math.max(0, (end - start) - 60);
    return {
      minutes: totalMinutes,
      hours: totalMinutes / 60,
      startTime: start,
      endTime: end
    };
  }, [production, downtime, selectedDate, selectedEndDate, currentTime]);

  const formatDuration = (minutes: number) => {
    const totalMinutes = Math.round(minutes);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}h${m.toString().padStart(2, '0')}`;
  };

  const machineData = useMemo(() => {
    return machines.map(m => {
      const stats = calculateStats(
        m, 
        production, 
        downtime, 
        currentTime,
        { start: selectedDate, end: selectedEndDate || selectedDate }
      );
      
      const totalTime = stats.totalOperationalMinutes + stats.totalDowntimeMinutes;
      const maintenancePercent = totalTime > 0 ? (stats.totalDowntimeMinutes / totalTime) * 100 : 0;

      return {
        id: m.id,
        name: m.name,
        prodTime: stats.totalOperationalMinutes,
        maintTime: stats.totalDowntimeMinutes,
        totalProd: stats.totalProduction,
        maintenancePercent,
        totalTime
      };
    });
  }, [machines, selectedDate, selectedEndDate, production, downtime, currentTime, workingHoursInfo]);

  const totalStats = useMemo(() => {
    const totals = machineData.reduce((acc, curr) => ({
      prodTime: acc.prodTime + curr.prodTime,
      maintTime: acc.maintTime + curr.maintTime,
      totalProd: acc.totalProd + curr.totalProd,
    }), { prodTime: 0, maintTime: 0, totalProd: 0 });

    const totalTime = totals.prodTime + totals.maintTime;
    const maintenancePercent = totalTime > 0 ? (totals.maintTime / totalTime) * 100 : 0;

    return {
      ...totals,
      totalTime,
      maintenancePercent
    };
  }, [machineData]);

  const pieData = [
    { name: 'Produção', value: totalStats.prodTime, color: '#10b981' },
    { name: 'Manutenção', value: totalStats.maintTime, color: '#f43f5e' }
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Total Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase">Produção Total</span>
          </div>
          <div className="text-2xl font-black text-slate-800">{totalStats.totalProd} <span className="text-sm font-bold text-slate-400">peças</span></div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
              <Wrench className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase">Manutenção Total</span>
          </div>
          <div className="text-2xl font-black text-slate-800">{formatDuration(totalStats.maintTime)}</div>
          <div className="mt-2 flex items-center gap-1 text-[10px] font-black text-rose-600 uppercase">
            <AlertTriangle className="w-3 h-3" />
            {totalStats.maintenancePercent.toFixed(1)}% do tempo total
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase">Tempo em Operação</span>
          </div>
          <div className="text-2xl font-black text-slate-800">{formatDuration(totalStats.prodTime)}</div>
          <div className="mt-2 text-[10px] font-bold text-slate-400 uppercase">Soma de todas as máquinas</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total Time Distribution Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-6">Distribuição de Tempo Total</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`overview-pie-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatDuration(value)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl">
              <span className="text-xs font-bold text-emerald-700 uppercase">Operação</span>
              <span className="text-sm font-black text-emerald-800">{((totalStats.prodTime / totalStats.totalTime) * 100 || 0).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-rose-50 rounded-xl">
              <span className="text-xs font-bold text-rose-700 uppercase">Manutenção</span>
              <span className="text-sm font-black text-rose-800">{totalStats.maintenancePercent.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Maintenance Time per Machine */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-6">Tempo de Manutenção por Máquina (minutos)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={machineData} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(value: number) => [formatDuration(value), 'Tempo']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="maintTime" fill="#f43f5e" radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="maintTime" position="right" formatter={(val: number) => formatDuration(val)} style={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Table/Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">Resumo Detalhado por Máquina</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Máquina</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Tempo Produção</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Tempo Manutenção</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Produzido</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Insights</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {machineData.map((m, idx) => (
                <tr key={`overview-table-row-${m.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-black text-slate-700">{m.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-emerald-600">{formatDuration(m.prodTime)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-rose-600">{formatDuration(m.maintTime)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-black text-slate-700">{m.totalProd} peças</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <div className={cn("w-1.5 h-1.5 rounded-full", m.maintenancePercent < 10 ? "bg-emerald-500" : "bg-rose-500")} />
                        <span className="text-[10px] font-bold text-slate-600">
                          {m.maintenancePercent.toFixed(1)}% tempo de parada
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
