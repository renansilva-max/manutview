import React, { useState, useEffect } from 'react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { 
  Plus, 
  Settings, 
  Download, 
  Copy, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  Factory,
  Wrench,
  LayoutGrid,
  BarChart3,
  Clock,
  LogIn,
  LogOut
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  Machine, 
  ProductionRecord, 
  DowntimeRecord
} from './types';
import { MachineRow } from './components/MachineRow';
import { MachineCard } from './components/MachineCard';
import { ComparativeDashboard } from './components/ComparativeDashboard';
import { 
  MachineManagementModal, 
  ProductionModal, 
  DowntimeModal,
  MachineDetailModal,
  ReportModal,
  LoginModal
} from './components/Modals';
import { cn } from './lib/utils';
import { FileText } from 'lucide-react';

// Initial Data
const INITIAL_MACHINES: Machine[] = [
  { id: '1', name: 'Filigrana 1', theoreticalProductionPerHour: 100, hourlyGoal: 80 },
  { id: '2', name: 'Filigrana 2', theoreticalProductionPerHour: 100, hourlyGoal: 80 },
  { id: '3', name: 'Filigrana 3', theoreticalProductionPerHour: 100, hourlyGoal: 80 },
  { id: '4', name: 'Filigrana 4', theoreticalProductionPerHour: 100, hourlyGoal: 80 },
  { id: '5', name: 'Filigrana 5', theoreticalProductionPerHour: 100, hourlyGoal: 80 },
];

export default function App() {
  // State
  const [machines, setMachines] = useState<Machine[]>(() => {
    const saved = localStorage.getItem('machines');
    return saved ? JSON.parse(saved) : INITIAL_MACHINES;
  });
  const [production, setProduction] = useState<ProductionRecord[]>(() => {
    const saved = localStorage.getItem('production');
    return saved ? JSON.parse(saved) : [];
  });
  const [downtime, setDowntime] = useState<DowntimeRecord[]>(() => {
    const saved = localStorage.getItem('downtime');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentTime, setCurrentTime] = useState(format(new Date(), 'HH:mm'));
  const [currentDashboard, setCurrentDashboard] = useState<'timeline' | 'summary' | 'comparative'>('timeline');
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('isAuthenticated', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
  };
  
  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(format(new Date(), 'HH:mm'));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Modals
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);
  const [isDowntimeModalOpen, setIsDowntimeModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<{ type: 'production' | 'downtime' | 'machine', data: any } | null>(null);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedMachineForDetail, setSelectedMachineForDetail] = useState<Machine | null>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('machines', JSON.stringify(machines));
  }, [machines]);
  useEffect(() => {
    localStorage.setItem('production', JSON.stringify(production));
  }, [production]);
  useEffect(() => {
    localStorage.setItem('downtime', JSON.stringify(downtime));
  }, [downtime]);

  // Actions
  const addMachine = (name: string, theoretical: number, hourlyGoal: number) => {
    const newMachine: Machine = { 
      id: crypto.randomUUID(), 
      name,
      theoreticalProductionPerHour: theoretical,
      hourlyGoal
    };
    setMachines([...machines, newMachine]);
  };

  const updateMachine = (id: string, data: Partial<Machine>) => {
    setMachines(machines.map(m => m.id === id ? { ...m, ...data } : m));
  };

  const deleteMachine = (id: string) => {
    if (confirm(`Excluir ${machines.find(m => m.id === id)?.name}?`)) {
      setMachines(machines.filter(m => m.id !== id));
      setProduction(production.filter(p => p.machineId !== id));
      setDowntime(downtime.filter(d => d.machineId !== id));
    }
  };

  const saveProduction = (data: Omit<ProductionRecord, 'id'>, id?: string) => {
    if (id) {
      setProduction(production.map(p => p.id === id ? { ...p, ...data } : p));
    } else {
      setProduction([...production, { ...data, id: crypto.randomUUID() }]);
    }
  };

  const saveDowntime = (data: Omit<DowntimeRecord, 'id'>, id?: string) => {
    if (id) {
      setDowntime(downtime.map(d => d.id === id ? { ...d, ...data } : d));
    } else {
      setDowntime([...downtime, { ...data, id: crypto.randomUUID() }]);
    }
  };

  const startDowntime = (machineId: string) => {
    const active = downtime.find(d => d.machineId === machineId && d.date === selectedDate && !d.endTime);
    if (active) return;

    saveDowntime({
      machineId,
      date: selectedDate,
      startTime: currentTime,
      type: 'Mecânica',
      observation: ''
    });
  };

  const finishDowntime = (machineId: string) => {
    const active = downtime.find(d => d.machineId === machineId && d.date === selectedDate && !d.endTime);
    if (active) {
      saveDowntime({ ...active, endTime: currentTime }, active.id);
    }
  };

  const deleteRecord = (type: 'production' | 'downtime', id: string) => {
    if (type === 'production') {
      setProduction(production.filter(p => p.id !== id));
    } else {
      setDowntime(downtime.filter(d => d.id !== id));
    }
  };

  const copyPreviousDay = () => {
    const prevDate = format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd');
    const prevProd = production.filter(p => p.date === prevDate);
    const prevDown = downtime.filter(d => d.date === prevDate);

    if (prevProd.length === 0 && prevDown.length === 0) {
      alert('Nenhum dado encontrado no dia anterior.');
      return;
    }

    const newProd = prevProd.map(p => ({ ...p, id: crypto.randomUUID(), date: selectedDate }));
    const newDown = prevDown.map(d => ({ ...d, id: crypto.randomUUID(), date: selectedDate }));

    setProduction([...production, ...newProd]);
    setDowntime([...downtime, ...newDown]);
  };

  const exportCSV = () => {
    const rows = [
      ['Máquina', 'Tipo', 'Início', 'Fim', 'Quantidade/Tipo Parada', 'Obs']
    ];

    machines.forEach(m => {
      production.filter(p => p.date === selectedDate && p.machineId === m.id).forEach(p => {
        rows.push([m.name, 'Produção', p.startTime, p.endTime, p.quantity?.toString() || '0', '']);
      });
      downtime.filter(d => d.date === selectedDate && d.machineId === m.id).forEach(d => {
        rows.push([m.name, 'Parada', d.startTime, d.endTime, d.type, d.observation || '']);
      });
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `producao_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-brand-primary text-white p-4 shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg">
              <Factory className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Filigrana Monitor</h1>
              <p className="text-xs text-slate-400">Controle de Produção Têxtil</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/10 p-1 rounded-full">
            <button 
              onClick={() => setSelectedDate(format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer px-2"
            />
            <button 
              onClick={() => setSelectedDate(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button 
                onClick={copyPreviousDay}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-all"
                title="Copiar do dia anterior"
              >
                <Copy className="w-4 h-4" />
                <span className="hidden sm:inline">Copiar Ontem</span>
              </button>
            )}
            <button 
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium transition-all shadow-lg shadow-emerald-900/20"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Relatórios</span>
            </button>
            {isAuthenticated ? (
              <>
                <button 
                  onClick={() => setIsMachineModalOpen(true)}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-all"
                  title="Configurações"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleLogout}
                  className="p-2 bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 rounded-lg transition-all border border-rose-500/30"
                  title="Sair"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button 
                onClick={() => setIsLoginModalOpen(true)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all flex items-center gap-2 px-3"
                title="Entrar"
              >
                <LogIn className="w-5 h-5" />
                <span className="text-sm font-bold">Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-2 md:p-4 max-w-7xl mx-auto w-full space-y-4">
        
        {/* Dashboard Switcher - Sticky */}
        <div className="sticky top-[72px] z-20 bg-slate-50/80 backdrop-blur-md py-2 -mx-2 px-2">
          <div className="flex bg-slate-200/50 p-1 rounded-xl gap-1 border border-slate-200 shadow-sm">
            <button 
              onClick={() => setCurrentDashboard('timeline')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black transition-all uppercase tracking-wider",
                currentDashboard === 'timeline' ? "bg-white text-brand-primary shadow-md" : "text-slate-500 hover:bg-slate-200"
              )}
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard 1: Timeline</span>
              <span className="sm:hidden">Timeline</span>
            </button>
            <button 
              onClick={() => setCurrentDashboard('summary')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black transition-all uppercase tracking-wider",
                currentDashboard === 'summary' ? "bg-white text-brand-primary shadow-md" : "text-slate-500 hover:bg-slate-200"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard 2: Resumo</span>
              <span className="sm:hidden">Resumo</span>
            </button>
            <button 
              onClick={() => setCurrentDashboard('comparative')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black transition-all uppercase tracking-wider",
                currentDashboard === 'comparative' ? "bg-white text-brand-primary shadow-md" : "text-slate-500 hover:bg-slate-200"
              )}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard 3: Comparativo</span>
              <span className="sm:hidden">Comparativo</span>
            </button>
          </div>
        </div>

        {/* Quick Actions - Compact */}
        {isAuthenticated && (
          <div className="grid grid-cols-2 md:flex gap-2">
            <button 
              onClick={() => {
                setEditingRecord(null);
                setIsProductionModalOpen(true);
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm transition-all active:scale-95 text-sm"
            >
              <Plus className="w-4 h-4" />
              Produção
            </button>
            <button 
              onClick={() => {
                setEditingRecord(null);
                setIsDowntimeModalOpen(true);
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-sm transition-all active:scale-95 text-sm"
            >
              <Wrench className="w-4 h-4" />
              Parada
            </button>
          </div>
        )}

        {/* Dashboard Content */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentDashboard}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {currentDashboard === 'timeline' && (
              <div className="space-y-2">
                {machines.map(machine => (
                  <MachineRow 
                    key={machine.id}
                    machine={machine}
                    selectedDate={selectedDate}
                    currentTime={currentTime}
                    production={production}
                    downtime={downtime}
                    isAuthenticated={isAuthenticated}
                    onStartDowntime={() => startDowntime(machine.id)}
                    onFinishDowntime={() => finishDowntime(machine.id)}
                    onClick={setSelectedMachineForDetail}
                    onEditRecord={(type, record) => {
                      if (!isAuthenticated) return;
                      setEditingRecord({ type, data: record });
                      if (type === 'production') setIsProductionModalOpen(true);
                      else setIsDowntimeModalOpen(true);
                    }}
                  />
                ))}
              </div>
            )}

            {currentDashboard === 'summary' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {machines.map(machine => (
                  <MachineCard 
                    key={machine.id}
                    machine={machine}
                    selectedDate={selectedDate}
                    currentTime={currentTime}
                    production={production}
                    downtime={downtime}
                    isAuthenticated={isAuthenticated}
                    onStartDowntime={() => startDowntime(machine.id)}
                    onFinishDowntime={() => finishDowntime(machine.id)}
                    onClick={setSelectedMachineForDetail}
                  />
                ))}
              </div>
            )}

            {currentDashboard === 'comparative' && (
              <ComparativeDashboard 
                machines={machines}
                selectedDate={selectedDate}
                currentTime={currentTime}
                production={production}
                downtime={downtime}
              />
            )}

            {machines.length === 0 && (
              <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Nenhuma máquina cadastrada.</p>
                <button 
                  onClick={() => setIsMachineModalOpen(true)}
                  className="mt-4 text-emerald-600 font-semibold hover:underline"
                >
                  Cadastrar agora
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isLoginModalOpen && (
          <LoginModal 
            isOpen={isLoginModalOpen}
            onClose={() => setIsLoginModalOpen(false)}
            onLogin={handleLogin}
          />
        )}
        {isMachineModalOpen && (
          <MachineManagementModal 
            isOpen={isMachineModalOpen}
            machines={machines}
            onClose={() => setIsMachineModalOpen(false)}
            onAdd={addMachine}
            onUpdate={updateMachine}
            onDelete={deleteMachine}
          />
        )}
        {isProductionModalOpen && (
          <ProductionModal 
            isOpen={isProductionModalOpen}
            machines={machines}
            date={selectedDate}
            editingData={editingRecord?.type === 'production' ? editingRecord.data : null}
            onClose={() => {
              setIsProductionModalOpen(false);
              setEditingRecord(null);
            }}
            onSave={saveProduction}
            onDelete={(id: string) => deleteRecord('production', id)}
          />
        )}
        {isDowntimeModalOpen && (
          <DowntimeModal 
            isOpen={isDowntimeModalOpen}
            machines={machines}
            date={selectedDate}
            editingData={editingRecord?.type === 'downtime' ? editingRecord.data : null}
            onClose={() => {
              setIsDowntimeModalOpen(false);
              setEditingRecord(null);
            }}
            onSave={saveDowntime}
            onDelete={(id: string) => deleteRecord('downtime', id)}
          />
        )}
        {isReportModalOpen && (
          <ReportModal
            isOpen={isReportModalOpen}
            onClose={() => setIsReportModalOpen(false)}
            machines={machines}
            production={production}
            downtime={downtime}
            currentTime={currentTime}
          />
        )}
        {selectedMachineForDetail && (
          <MachineDetailModal
            isOpen={!!selectedMachineForDetail}
            onClose={() => setSelectedMachineForDetail(null)}
            machine={selectedMachineForDetail}
            production={production}
            downtime={downtime}
            onEditProduction={(p: any) => {
              if (!isAuthenticated) return;
              setEditingRecord({ type: 'production', data: p });
              setIsProductionModalOpen(true);
            }}
            onDeleteProduction={(id: string) => {
              if (!isAuthenticated) return;
              deleteRecord('production', id);
            }}
            onEditDowntime={(d: any) => {
              if (!isAuthenticated) return;
              setEditingRecord({ type: 'downtime', data: d });
              setIsDowntimeModalOpen(true);
            }}
            onDeleteDowntime={(id: string) => {
              if (!isAuthenticated) return;
              deleteRecord('downtime', id);
            }}
            onUpdateMachine={updateMachine}
            isAuthenticated={isAuthenticated}
          />
        )}
      </AnimatePresence>

      <footer className="bg-white border-t border-slate-200 p-4 text-center text-xs text-slate-400">
        &copy; 2026 Filigrana Monitor - Sistema de Gestão Industrial
      </footer>
    </div>
  );
}
