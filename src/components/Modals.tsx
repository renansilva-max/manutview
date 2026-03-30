import React, { useState } from 'react';
import { X, Trash2, Edit2, FileText, Download, Filter, Calendar as CalendarIcon, Settings, Check, LogIn, Lock, Chrome } from 'lucide-react';
import { auth, googleProvider, signInWithPopup } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Machine, ProductionRecord, DowntimeRecord, MachineStats } from '../types';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { calculateStats } from '../utils';
import { cn } from '../lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function Modal({ title, onClose, children, maxWidth = "max-w-md" }: { title: string, onClose: () => void, children: React.ReactNode, maxWidth?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className={`bg-white rounded-3xl shadow-2xl w-full ${maxWidth} overflow-hidden flex flex-col max-h-[90vh]`}
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function LoginModal({ isOpen, onClose, onLogin }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'renan.silva' && password === 'Filigrana123') {
      onLogin();
      onClose();
    } else {
      setError('Usuário ou senha incorretos');
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Erro ao fazer login com Google. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Modal title="Acesso Restrito" onClose={onClose}>
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="bg-slate-100 p-4 rounded-full">
                <Lock className="w-8 h-8 text-slate-400" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-bold text-slate-800">Login com Google</h3>
              <p className="text-xs text-slate-500">Obrigatório para salvar dados na nuvem e sincronizar entre dispositivos.</p>
            </div>

            <button 
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <Chrome className="w-5 h-5 text-blue-500" />
              {isLoading ? 'Conectando...' : 'Entrar com Google'}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-bold">Ou acesso legado</span>
              </div>
            </div>
            
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-[10px] text-amber-700 font-medium leading-tight">
                <strong>Aviso:</strong> O acesso legado permite apenas visualização e testes locais. Alterações não serão salvas no banco de dados compartilhado.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Usuário</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ex: nome.sobrenome"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Senha</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <p className="text-xs font-bold text-rose-500 text-center">{error}</p>
              )}

              <button 
                type="submit"
                className="w-full py-4 bg-brand-primary text-white rounded-2xl font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-5 h-5" />
                Entrar
              </button>
            </form>
          </div>
        </Modal>
      )}
    </AnimatePresence>
  );
}

export function MachineManagementModal({ isOpen, machines, onClose, onAdd, onUpdate, onDelete }: any) {
  const [newName, setNewName] = useState('');
  const [newTheoretical, setNewTheoretical] = useState('100');
  const [newGoal, setNewGoal] = useState('80');
  const [isLoading, setIsLoading] = useState(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <Modal title="Gerenciar Máquinas" onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-400 uppercase">Nova Máquina</label>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Nome"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 px-4 py-2 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
              />
              <button 
                onClick={async () => {
                  if (newName) {
                    setIsLoading(true);
                    try {
                      await onAdd(newName, parseInt(newTheoretical) || 100, parseInt(newGoal) || 80);
                      setNewName('');
                      setNewTheoretical('100');
                      setNewGoal('80');
                    } catch (error) {
                      console.error("Error adding machine:", error);
                    } finally {
                      setIsLoading(false);
                    }
                  }
                }}
                disabled={isLoading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold disabled:opacity-50"
              >
                {isLoading ? '...' : 'Add'}
              </button>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Prod. Teórica/h</label>
                <input 
                  type="number" 
                  placeholder="Teórica"
                  value={newTheoretical}
                  onChange={(e) => setNewTheoretical(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Meta/h</label>
                <input 
                  type="number" 
                  placeholder="Meta"
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
          {machines.map((m: Machine) => (
            <div key={m.id} className="flex flex-col p-3 bg-slate-50 rounded-xl group gap-2">
              <div className="flex items-center justify-between">
                <input 
                  type="text" 
                  value={m.name}
                  onChange={(e) => onUpdate(m.id, { name: e.target.value })}
                  className="bg-transparent border-none font-bold text-slate-700 focus:ring-0 p-0 text-sm"
                />
                <button 
                  onClick={async () => {
                    setIsLoading(true);
                    try {
                      await onDelete(m.id);
                    } catch (error) {
                      console.error("Error deleting machine:", error);
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading}
                  className="p-2 text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Teórica/h:</span>
                  <input 
                    type="number" 
                    value={m.theoreticalProductionPerHour}
                    onChange={(e) => onUpdate(m.id, { theoreticalProductionPerHour: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-200 rounded px-2 py-0.5 text-xs font-bold text-slate-600 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Meta/h:</span>
                  <input 
                    type="number" 
                    value={m.hourlyGoal || 0}
                    onChange={(e) => onUpdate(m.id, { hourlyGoal: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-200 rounded px-2 py-0.5 text-xs font-bold text-slate-600 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
      )}
    </AnimatePresence>
  );
}

export function ProductionModal({ isOpen, machines, date, editingData, onClose, onSave, onDelete }: any) {
  const [machineId, setMachineId] = useState(editingData?.machineId || machines[0]?.id || '');
  const [startTime, setStartTime] = useState(editingData?.startTime || '07:00');
  const [endTime, setEndTime] = useState(editingData?.endTime || '18:00');
  const [quantity, setQuantity] = useState(editingData?.quantity?.toString() || '');
  const [scrapQuantity, setScrapQuantity] = useState(editingData?.scrapQuantity?.toString() || '0');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!machineId) return;
    setIsLoading(true);
    try {
      await onSave({
        machineId,
        date,
        startTime,
        endTime,
        quantity: quantity ? parseInt(quantity) : undefined,
        scrapQuantity: scrapQuantity ? parseInt(scrapQuantity) : 0
      }, editingData?.id);
      onClose();
    } catch (error) {
      console.error("Error saving production:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Modal title={editingData ? "Editar Produção" : "Registrar Produção"} onClose={onClose}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Máquina</label>
              <select 
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
              >
                {machines.map((m: Machine) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Início</label>
                <input 
                  type="time" 
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Fim</label>
                <input 
                  type="time" 
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Qtd. Produzida</label>
                <input 
                  type="number" 
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Ex: 500"
                  className="w-full px-4 py-3 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Qtd. Refugo</label>
                <input 
                  type="number" 
                  value={scrapQuantity}
                  onChange={(e) => setScrapQuantity(e.target.value)}
                  placeholder="Ex: 10"
                  className="w-full px-4 py-3 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              {editingData && (
                <button 
                  onClick={async () => {
                    setIsLoading(true);
                    try {
                      await onDelete(editingData.id);
                      onClose();
                    } catch (error) {
                      console.error("Error deleting production:", error);
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-slate-100 text-rose-600 rounded-xl font-bold hover:bg-rose-50 transition-colors disabled:opacity-50"
                >
                  Excluir
                </button>
              )}
              <button 
                onClick={handleSave}
                disabled={isLoading}
                className="flex-[2] py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : 'Salvar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AnimatePresence>
  );
}

export function DowntimeModal({ isOpen, machines, date, editingData, onClose, onSave, onDelete }: any) {
  const [machineId, setMachineId] = useState(editingData?.machineId || machines[0]?.id || '');
  const [startTime, setStartTime] = useState(editingData?.startTime || '07:00');
  const [endTime, setEndTime] = useState(editingData?.endTime || '');
  const [type, setType] = useState(editingData?.type || 'Mecânica');
  const [observation, setObservation] = useState(editingData?.observation || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!machineId) return;
    setIsLoading(true);
    try {
      await onSave({
        machineId,
        date,
        startTime,
        endTime: endTime || undefined,
        type,
        observation
      }, editingData?.id);
      onClose();
    } catch (error) {
      console.error("Error saving downtime:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Modal title={editingData ? "Editar Parada" : "Registrar Parada"} onClose={onClose}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Máquina</label>
              <select 
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-rose-500"
              >
                {machines.map((m: Machine) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Início</label>
                <input 
                  type="time" 
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Fim (Opcional)</label>
                <input 
                  type="time" 
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tipo de Parada</label>
              <select 
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-4 py-3 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="Mecânica">Mecânica</option>
                <option value="Elétrica">Elétrica</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Observação (Opcional)</label>
              <textarea 
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Descreva o motivo..."
                rows={2}
                className="w-full px-4 py-3 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-rose-500 resize-none"
              />
            </div>
            <div className="flex gap-3 pt-4">
              {editingData && (
                <button 
                  onClick={async () => {
                    setIsLoading(true);
                    try {
                      await onDelete(editingData.id);
                      onClose();
                    } catch (error) {
                      console.error("Error deleting downtime:", error);
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-slate-100 text-rose-600 rounded-xl font-bold hover:bg-rose-50 transition-colors disabled:opacity-50"
                >
                  Excluir
                </button>
              )}
              <button 
                onClick={handleSave}
                disabled={isLoading}
                className="flex-[2] py-3 bg-rose-600 text-white rounded-xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : 'Salvar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AnimatePresence>
  );
}

export function MachineDetailModal({ 
  isOpen, 
  machine, 
  production, 
  downtime, 
  onClose, 
  onEditProduction, 
  onDeleteProduction, 
  onEditDowntime, 
  onDeleteDowntime,
  onUpdateMachine,
  isAuthenticated
}: any) {
  const [activeTab, setActiveTab] = useState<'producao' | 'manutencao'>('producao');
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(machine?.hourlyGoal?.toString() || '0');

  if (!machine) return null;

  const machineProd = production
    .filter((p: any) => p.machineId === machine.id)
    .sort((a: any, b: any) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
  const machineDown = downtime
    .filter((d: any) => d.machineId === machine.id)
    .sort((a: any, b: any) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));

  const handleSaveGoal = () => {
    onUpdateMachine(machine.id, { hourlyGoal: parseInt(tempGoal) || 0 });
    setIsEditingGoal(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Modal title={`Detalhes: ${machine.name}`} onClose={onClose} maxWidth="max-w-2xl">
          <div className="flex flex-col h-full">
            {/* Machine Summary & Goal Section */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{machine.name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Configurações da Máquina</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Meta por Hora:</span>
                    {isEditingGoal && isAuthenticated ? (
                      <div className="flex items-center gap-1">
                        <input 
                          type="number" 
                          value={tempGoal}
                          onChange={(e) => setTempGoal(e.target.value)}
                          className="w-16 px-2 py-1 bg-white border border-emerald-200 rounded text-xs font-bold focus:ring-1 focus:ring-emerald-500"
                          autoFocus
                        />
                        <button onClick={handleSaveGoal} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className={cn(
                        "flex items-center gap-1 group",
                        isAuthenticated && "cursor-pointer"
                      )} onClick={() => isAuthenticated && setIsEditingGoal(true)}>
                        <span className="text-sm font-black text-emerald-600">{machine.hourlyGoal || 0}</span>
                        {isAuthenticated && <Edit2 className="w-3 h-3 text-slate-300 group-hover:text-emerald-500 transition-colors" />}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">Teórica: {machine.theoreticalProductionPerHour}/h</p>
                </div>
              </div>
            </div>

            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6">
              <button 
                onClick={() => setActiveTab('producao')}
                className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'producao' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Produção
              </button>
              <button 
                onClick={() => setActiveTab('manutencao')}
                className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'manutencao' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Manutenção
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-[50vh]">
              {activeTab === 'producao' ? (
                machineProd.length > 0 ? (
                  machineProd.map((p: ProductionRecord) => (
                    <div key={p.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-black text-slate-400 uppercase">{format(parseISO(p.date), 'dd/MM/yyyy')}</span>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold">{p.startTime} - {p.endTime}</span>
                        </div>
                        <div className="flex gap-4">
                          <div className="text-sm font-bold text-slate-700">Prod: <span className="text-emerald-600">{p.quantity || 0}</span></div>
                          <div className="text-sm font-bold text-slate-700">Refugo: <span className="text-rose-600">{p.scrapQuantity || 0}</span></div>
                        </div>
                      </div>
                      {isAuthenticated && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => onEditProduction(p)}
                            className="p-2 bg-white text-slate-400 hover:text-emerald-600 rounded-xl border border-slate-200 shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onDeleteProduction(p.id)}
                            className="p-2 bg-white text-slate-400 hover:text-rose-600 rounded-xl border border-slate-200 shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-slate-400 font-medium">Nenhum registro de produção.</div>
                )
              ) : (
                machineDown.length > 0 ? (
                  machineDown.map((d: DowntimeRecord) => (
                    <div key={d.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-black text-slate-400 uppercase">{format(parseISO(d.date), 'dd/MM/yyyy')}</span>
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-[10px] font-bold">{d.startTime} - {d.endTime || 'Em aberto'}</span>
                        </div>
                        <div className="text-sm font-bold text-slate-700 mb-1">{d.type}</div>
                        {d.observation && <div className="text-xs text-slate-500 italic">{d.observation}</div>}
                      </div>
                      {isAuthenticated && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => onEditDowntime(d)}
                            className="p-2 bg-white text-slate-400 hover:text-rose-600 rounded-xl border border-slate-200 shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onDeleteDowntime(d.id)}
                            className="p-2 bg-white text-slate-400 hover:text-rose-600 rounded-xl border border-slate-200 shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-slate-400 font-medium">Nenhum registro de manutenção.</div>
                )
              )}
            </div>
          </div>
        </Modal>
      )}
    </AnimatePresence>
  );
}

export function ReportModal({ isOpen, machines, production, downtime, currentTime, onClose }: any) {
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMachineId, setSelectedMachineId] = useState('all');

  const generatePDF = () => {
    const doc = new jsPDF();
    const title = "Relatório de Performance Industrial";
    const dateRange = `Período: ${format(parseISO(startDate), 'dd/MM/yyyy')} até ${format(parseISO(endDate), 'dd/MM/yyyy')}`;
    
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text(title, 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(dateRange, 14, 30);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 35);

    const filteredMachines = selectedMachineId === 'all' 
      ? machines 
      : machines.filter((m: Machine) => m.id === selectedMachineId);

    const tableData = filteredMachines.map((m: Machine) => {
      const stats = calculateStats(m, production, downtime, currentTime, { start: startDate, end: endDate });
      return [
        m.name,
        stats.totalProduction.toString(),
        `${(stats.totalOperationalMinutes / 60).toFixed(1)}h`,
        `${(stats.totalDowntimeMinutes / 60).toFixed(1)}h`,
        `${(stats.totalAvailableMinutes / 60).toFixed(1)}h`,
        `${(stats.availability * 100).toFixed(1)}%`,
        `${(stats.oee * 100).toFixed(1)}%`
      ];
    });

    autoTable(doc, {
      startY: 45,
      head: [['Máquina', 'Produção', 'Operação', 'Parada', 'Disponível', 'Disp.', 'OEE']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    // Summary
    const totalProd = tableData.reduce((acc: number, row: any) => acc + parseInt(row[1]), 0);
    const totalOp = tableData.reduce((acc: number, row: any) => acc + parseFloat(row[2]), 0);
    const avgOEE = tableData.reduce((acc: number, row: any) => acc + parseFloat(row[6]), 0) / tableData.length;

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text("Resumo Geral", 14, finalY);
    
    doc.setFontSize(10);
    doc.text(`Total Produzido: ${totalProd} unidades`, 14, finalY + 10);
    doc.text(`Tempo Total Operação: ${totalOp.toFixed(1)} horas`, 14, finalY + 17);
    doc.text(`OEE Médio: ${avgOEE.toFixed(1)}%`, 14, finalY + 24);

    doc.save(`relatorio-producao-${startDate}-a-${endDate}.pdf`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Modal title="Exportar Relatório PDF" onClose={onClose}>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Data Inicial</label>
                <div className="relative">
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Data Final</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Máquina</label>
              <select 
                value={selectedMachineId}
                onChange={(e) => setSelectedMachineId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Todas as Máquinas</option>
                {machines.map((m: Machine) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">O que será exportado?</h4>
                  <p className="text-xs text-emerald-700 mt-1">
                    Um documento PDF profissional contendo indicadores de OEE, Disponibilidade, Performance e Qualidade para o período selecionado.
                  </p>
                </div>
              </div>
            </div>

            <button 
              onClick={generatePDF}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Gerar Relatório PDF
            </button>
          </div>
        </Modal>
      )}
    </AnimatePresence>
  );
}
