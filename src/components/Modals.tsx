import React, { useState, useMemo, useEffect } from 'react';
import { X, Trash2, Edit2, FileText, Download, Filter, Calendar as CalendarIcon, Settings, Check, LogIn, Lock, Chrome, Wrench, Upload, Database, Plus } from 'lucide-react';
import { auth, googleProvider, signInWithPopup } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Machine, ProductionRecord, DowntimeRecord, MachineStats, DowntimeReason, AuditLog } from '../types';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { calculateStats, DAY_START, DAY_END, timeToMinutes, formatDuration } from '../utils';
import { cn } from '../lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export function Modal({ title, onClose, children, maxWidth = "max-w-md", zIndex = "z-50" }: { title: string, onClose?: () => void, children: React.ReactNode, maxWidth?: string, zIndex?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
      className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm`}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className={`bg-white rounded-3xl shadow-2xl w-full ${maxWidth} overflow-hidden flex flex-col max-h-[90vh]`}
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          )}
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function SettingsModal({ isOpen, onClose, onManageLines, onManageMachines, onManageReasons, onManageUsers, onDownloadExcel, onResetData, onBackup, onRestore, isAuthenticated, isAdmin, appName, appDescription, onUpdateConfig }: any) {
  const [editingName, setEditingName] = useState(appName);
  const [editingDesc, setEditingDesc] = useState(appDescription);

  React.useEffect(() => {
    setEditingName(appName);
    setEditingDesc(appDescription);
  }, [appName, appDescription, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onRestore(file);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Modal title="Configurações" onClose={onClose}>
          <div className="space-y-4">
            {isAdmin && (
              <>
                <div className="p-4 bg-slate-50 rounded-2xl space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Nome do Aplicativo</label>
                      <input 
                        type="text" 
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => onUpdateConfig(editingName, editingDesc)}
                        onKeyDown={(e) => e.key === 'Enter' && onUpdateConfig(editingName, editingDesc)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 transition-all"
                        placeholder="Nome do App"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Descrição / Slogan</label>
                      <input 
                        type="text" 
                        value={editingDesc}
                        onChange={(e) => setEditingDesc(e.target.value)}
                        onBlur={() => onUpdateConfig(editingName, editingDesc)}
                        onKeyDown={(e) => e.key === 'Enter' && onUpdateConfig(editingName, editingDesc)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-500 focus:ring-2 focus:ring-emerald-500 transition-all"
                        placeholder="Descrição do App"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onManageLines();
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all group text-left"
                >
                  <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                    <Settings className="w-6 h-6 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Linhas de Produção</h3>
                    <p className="text-xs text-slate-500">Gerenciar linhas de produção do sistema.</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onManageMachines();
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all group text-left"
                >
                  <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                    <Settings className="w-6 h-6 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Gerenciar Máquinas</h3>
                    <p className="text-xs text-slate-500">Adicionar, editar ou excluir máquinas.</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onManageReasons();
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all group text-left"
                >
                  <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                    <Wrench className="w-6 h-6 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Motivos de Parada</h3>
                    <p className="text-xs text-slate-500">Configurar motivos e cores para paradas.</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onManageUsers?.();
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all group text-left"
                >
                  <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                    <Lock className="w-6 h-6 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Gerenciar Usuários</h3>
                    <p className="text-xs text-slate-500">Controle de permissões e acessos.</p>
                  </div>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={onBackup}
                    className="flex flex-col items-center gap-2 p-4 bg-emerald-50 hover:bg-emerald-100 rounded-2xl transition-all group text-center"
                  >
                    <Database className="w-6 h-6 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-700">Backup Geral</span>
                  </button>

                  <label className="flex flex-col items-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 rounded-2xl transition-all group text-center cursor-pointer">
                    <Upload className="w-6 h-6 text-blue-600" />
                    <span className="text-xs font-bold text-blue-700">Restaurar Backup</span>
                    <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (window.confirm("Isso irá restaurar as linhas, máquinas e motivos para os valores iniciais. Deseja continuar?")) {
                        onResetData();
                      }
                    }}
                    className="w-full flex items-center gap-2 p-3 text-rose-600 hover:bg-rose-50 rounded-xl transition-all text-xs font-bold"
                  >
                    <Trash2 className="w-4 h-4" />
                    Restaurar Dados Iniciais (Admin)
                  </button>
                </div>
              </>
            )}

            <button
              onClick={() => {
                onDownloadExcel();
                onClose();
              }}
              className="w-full flex items-center gap-4 p-4 bg-emerald-50 hover:bg-emerald-100 rounded-2xl transition-all group text-left"
            >
              <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                <Download className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-emerald-800">Exportar para Excel</h3>
                <p className="text-xs text-emerald-600/70">Baixar todos os dados de produção e paradas em formato .xlsx</p>
              </div>
            </button>
          </div>
        </Modal>
      )}
    </AnimatePresence>
  );
}

export function LoginModal({ isOpen, onClose, onLogin, users, isMandatory }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user exists in registered users
    const user = users.find((u: any) => 
      (u.email.toLowerCase() === username.toLowerCase() || u.email.split('@')[0].toLowerCase() === username.toLowerCase()) &&
      u.password === password
    );

    if (user) {
      onLogin(user.email);
      onClose();
    } else {
      // Check if it's the master user (fallback if not in DB yet)
      if (username === 'renan.silva' && password === 'Filigrana123') {
        onLogin(username);
        onClose();
      } else {
        const userExists = users.some((u: any) => 
          u.email.toLowerCase() === username.toLowerCase() || 
          u.email.split('@')[0].toLowerCase() === username.toLowerCase()
        );
        
        if (userExists) {
          setError('Senha incorreta.');
        } else {
          setError('Usuário não cadastrado.');
        }
      }
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user.email?.toLowerCase();
      
      const allowedEmails = ['ciaheringgoianesia@gmail.com', 'renan.silva@ciahering.com.br'];
      const isRegistered = users.some((u: any) => u.email.toLowerCase() === email) || allowedEmails.includes(email || '');
      
      if (!isRegistered) {
        await auth.signOut();
        setError('Usuário não cadastrado.');
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('O pop-up foi bloqueado pelo seu navegador. Por favor, permita pop-ups para este site.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('O login foi cancelado ou o pop-up foi fechado antes de completar.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Este domínio não está autorizado para login. Verifique as configurações do Firebase.');
      } else {
        setError(`Erro ao fazer login: ${err.message || 'Tente novamente.'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    isOpen && (
      <Modal title="Acesso Restrito" onClose={isMandatory ? undefined : onClose}>
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

            <div className="space-y-3">
              <button 
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <Chrome className="w-5 h-5 text-blue-500" />
                {isLoading ? 'Conectando...' : 'Entrar com Google'}
              </button>
              
              {isLoading && (
                <p className="text-[10px] text-slate-400 text-center animate-pulse">
                  Verifique se uma janela de login abriu no seu navegador.
                </p>
              )}
            </div>

            {error && (
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                <p className="text-xs font-bold text-rose-500 text-center">{error}</p>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-bold">Ou entrar com usuário e senha</span>
              </div>
            </div>
            
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-[10px] text-blue-700 font-medium leading-tight">
                <strong>Acesso Restrito:</strong> Apenas usuários previamente cadastrados pelo administrador podem acessar o sistema.
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
    )
  );
}

export function ProductionLineManagementModal({ isOpen, lines, onClose, onAdd, onUpdate, onDelete }: any) {
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  return (
    isOpen && (
      <Modal title="Gerenciar Linhas de Produção" onClose={onClose}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase">Nova Linha</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Nome da Linha"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 px-4 py-2 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
              />
              <button 
                onClick={async () => {
                  if (newName) {
                    setIsLoading(true);
                    try {
                      await onAdd(newName);
                      setNewName('');
                    } catch (error) {
                      console.error("Error adding line:", error);
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
          </div>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
            {[...lines].sort((a, b) => a.name.localeCompare(b.name)).map((l: any, idx: number) => (
              <div key={`mgmt-line-${l.id}-${idx}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group">
                <input 
                  type="text" 
                  value={l.name}
                  onChange={(e) => onUpdate(l.id, { name: e.target.value })}
                  className="bg-transparent border-none font-bold text-slate-700 focus:ring-0 p-0 text-sm flex-1"
                />
                <button 
                  onClick={async () => {
                    setIsLoading(true);
                    try {
                      await onDelete(l.id);
                    } catch (error) {
                      console.error("Error deleting line:", error);
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading}
                  className="p-2 text-rose-500 opacity-100 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    )
  );
}

export function MachineManagementModal({ isOpen, machines, productionLines, onClose, onAdd, onUpdate, onDelete }: any) {
  const [newName, setNewName] = useState('');
  const [newLineId, setNewLineId] = useState(productionLines[0]?.id || '');
  const [newTheoretical, setNewTheoretical] = useState('100');
  const [newGoal, setNewGoal] = useState('80');
  const [isLoading, setIsLoading] = useState(false);

  return (
    isOpen && (
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
                  if (newName && newLineId) {
                    setIsLoading(true);
                    try {
                      await onAdd(newName, newLineId, parseInt(newTheoretical) || 100, parseInt(newGoal) || 80);
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
                disabled={isLoading || !newLineId}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold disabled:opacity-50"
              >
                {isLoading ? '...' : 'Add'}
              </button>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Linha de Produção</label>
                <select 
                  value={newLineId}
                  onChange={(e) => setNewLineId(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 text-sm"
                >
                  <option value="" disabled>Selecione uma linha</option>
                  {productionLines.map((l: any, idx: number) => (
                    <option key={`${l.id}-${idx}`} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
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
          {[...machines].sort((a, b) => a.name.localeCompare(b.name)).map((m: Machine, idx: number) => (
            <div key={`mgmt-machine-${m.id}-${idx}`} className="flex flex-col p-3 bg-slate-50 rounded-xl group gap-2">
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
                  className="p-2 text-rose-500 opacity-100 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1 col-span-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Linha:</span>
                  <select 
                    value={m.productionLineId}
                    onChange={(e) => onUpdate(m.id, { productionLineId: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded px-2 py-0.5 text-xs font-bold text-slate-600 focus:ring-1 focus:ring-emerald-500"
                  >
                    {productionLines.map((l: any, idx: number) => (
                      <option key={`${l.id}-${idx}`} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
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
    )
  );
}

export function FilterModal({ isOpen, lines, selectedLineIds, onClose, onToggleLine, onSelectAll, onClearAll }: any) {
  return (
    isOpen && (
      <Modal title="Filtrar Linhas de Produção" onClose={onClose}>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <button 
              onClick={onSelectAll}
              className="text-xs font-bold text-emerald-600 hover:underline"
            >
              Selecionar Todas
            </button>
            <button 
              onClick={onClearAll}
              className="text-xs font-bold text-rose-600 hover:underline"
            >
              Limpar Todas
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
            {lines.map((line: any, idx: number) => (
              <button 
                key={`${line.id}-${idx}`}
                onClick={() => onToggleLine(line.id)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl transition-all border-2",
                  selectedLineIds.includes(line.id) 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                    : "bg-slate-50 border-slate-100 text-slate-400"
                )}
              >
                <span className="font-bold text-sm">{line.name}</span>
                {selectedLineIds.includes(line.id) && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
          <button 
            onClick={onClose}
            className="w-full py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
          >
            Aplicar Filtros
          </button>
        </div>
      </Modal>
    )
  );
}

function DowntimeReasonRow({ reason, onUpdate, onDelete }: any) {
  const [name, setName] = useState(reason.name);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colors = ['#e11d48', '#2563eb', '#d97706', '#4b5563', '#10b981', '#8b5cf6', '#f43f5e', '#0ea5e9'];

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(reason.id);
    } catch (error) {
      console.error("Error deleting reason:", error);
      alert("Erro ao excluir motivo. Verifique sua conexão ou permissões.");
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="flex flex-col p-3 bg-slate-50 rounded-xl gap-3">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="w-8 h-8 rounded-full border-2 border-white shadow-sm shrink-0 transition-transform hover:scale-110"
          style={{ backgroundColor: reason.color }}
          title="Clique para mudar a cor"
        />

        <input 
          type="text" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name !== reason.name) {
              onUpdate(reason.id, { name });
            }
          }}
          className="bg-transparent border-none font-bold text-slate-700 focus:ring-0 p-0 text-sm flex-1"
        />
        
        {showConfirm ? (
          <div className="flex items-center gap-1">
            <button 
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-2 py-1 bg-rose-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-rose-700 transition-all disabled:opacity-50"
            >
              {isDeleting ? 'Excluindo...' : 'Confirmar'}
            </button>
            <button 
              onClick={() => setShowConfirm(false)}
              disabled={isDeleting}
              className="p-1 text-slate-400 hover:bg-slate-200 rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setShowConfirm(true)}
            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showColorPicker && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 flex-wrap p-2 bg-white rounded-xl border border-slate-100">
              {colors.map((c, idx) => (
                <button 
                  key={`${c}-${idx}`}
                  onClick={() => {
                    onUpdate(reason.id, { color: c });
                    setShowColorPicker(false);
                  }}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
                    reason.color === c ? "border-slate-800" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DowntimeReasonManagementModal({ isOpen, reasons, onClose, onAdd, onUpdate, onDelete }: any) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#e11d48');
  const [isLoading, setIsLoading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const colors = [
    '#e11d48', '#2563eb', '#d97706', '#4b5563', '#10b981', '#8b5cf6', '#f43f5e', '#0ea5e9'
  ];

  return (
    isOpen && (
      <Modal title="Gerenciar Motivos de Parada" onClose={onClose}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase">Novo Motivo</label>
            <div className="flex flex-col gap-2">
              <div className="flex gap-3 items-center">
                <button 
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="w-10 h-10 rounded-xl border-2 border-white shadow-sm shrink-0 transition-transform hover:scale-105"
                  style={{ backgroundColor: newColor }}
                  title="Escolher cor"
                />
                <input 
                  type="text" 
                  placeholder="Nome do Motivo"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 px-4 py-2 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
                />
                <button 
                  onClick={async () => {
                    if (newName) {
                      setIsLoading(true);
                      try {
                        await onAdd(newName, newColor);
                        setNewName('');
                        setShowColorPicker(false);
                      } catch (error) {
                        console.error("Error adding reason:", error);
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
              
              <AnimatePresence>
                {showColorPicker && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex gap-2 flex-wrap p-3 bg-white rounded-2xl border border-slate-100 shadow-inner">
                      {colors.map((c, idx) => (
                        <button 
                          key={`${c}-${idx}`}
                          onClick={() => {
                            setNewColor(c);
                            setShowColorPicker(false);
                          }}
                          className={cn(
                            "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                            newColor === c ? "border-slate-800" : "border-transparent"
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
            {reasons.map((r: any, idx: number) => (
              <DowntimeReasonRow 
                key={`mgmt-reason-${r.id}-${idx}`} 
                reason={r} 
                onUpdate={onUpdate} 
                onDelete={onDelete} 
              />
            ))}
          </div>
        </div>
      </Modal>
    )
  );
}

export function ProductionModal({ isOpen, machines, date, editingData, onClose, onSave, onDelete, initialMachineId }: any) {
  const sortedMachines = useMemo(() => {
    return [...machines].sort((a, b) => a.name.localeCompare(b.name));
  }, [machines]);

  const [machineId, setMachineId] = useState(editingData?.machineId || initialMachineId || sortedMachines[0]?.id || '');
  const [startTime, setStartTime] = useState(editingData?.startTime || DAY_START);
  const [endTime, setEndTime] = useState(editingData?.endTime || DAY_END);
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
    isOpen && (
      <Modal title={editingData ? "Editar Produção" : "Registrar Produção"} onClose={onClose} zIndex="z-[60]">
        <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Máquina</label>
              <select 
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
              >
                {sortedMachines.map((m: Machine, idx: number) => <option key={`${m.id}-${idx}`} value={m.id}>{m.name}</option>)}
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
    )
  );
}

export function DowntimeModal({ isOpen, machines, date, reasons, editingData, onClose, onSave, onDelete, initialMachineId }: any) {
  const sortedMachines = useMemo(() => {
    return [...machines].sort((a, b) => a.name.localeCompare(b.name));
  }, [machines]);

  const [machineId, setMachineId] = useState(editingData?.machineId || initialMachineId || sortedMachines[0]?.id || '');
  const [startTime, setStartTime] = useState(editingData?.startTime || DAY_START);
  const [endTime, setEndTime] = useState(editingData?.endTime || '');
  const [type, setType] = useState(editingData?.type || reasons?.[0]?.name || 'Mecânica');
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
    isOpen && (
      <Modal title={editingData ? "Editar Parada" : "Registrar Parada"} onClose={onClose} zIndex="z-[60]">
        <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Máquina</label>
              <select 
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-rose-500"
              >
                {sortedMachines.map((m: Machine, idx: number) => <option key={`${m.id}-${idx}`} value={m.id}>{m.name}</option>)}
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
                {reasons?.map((reason: any, idx: number) => (
                  <option key={`${reason.id}-${idx}`} value={reason.name}>{reason.name}</option>
                ))}
                {!reasons?.length && (
                  <>
                    <option value="Mecânica">Mecânica</option>
                    <option value="Elétrica">Elétrica</option>
                    <option value="Outros">Outros</option>
                  </>
                )}
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
    )
  );
}

export function MachineDetailModal({ 
  isOpen, 
  machine, 
  production, 
  downtime, 
  date,
  onClose, 
  onEditProduction, 
  onDeleteProduction, 
  onEditDowntime, 
  onDeleteDowntime,
  onUpdateMachine,
  onAddProduction,
  onAddDowntime,
  isAuthenticated
}: any) {
  const [activeTab, setActiveTab] = useState<'producao' | 'intervencoes'>('producao');
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(machine?.hourlyGoal?.toString() || '0');

  if (!machine) return null;

  const machineProd = useMemo(() => production
    .filter((p: any) => p.machineId === machine.id && p.date === date)
    .sort((a: any, b: any) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime)),
    [production, machine.id, date]
  );

  const machineDown = useMemo(() => downtime
    .filter((d: any) => d.machineId === machine.id && d.date === date)
    .sort((a: any, b: any) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime)),
    [downtime, machine.id, date]
  );

  const handleSaveGoal = () => {
    onUpdateMachine(machine.id, { hourlyGoal: parseInt(tempGoal) || 0 });
    setIsEditingGoal(false);
  };

  return (
    isOpen && (
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
                        {isAuthenticated && <Edit2 className="w-3 h-3 text-emerald-500 transition-colors" />}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">Teórica: {machine.theoreticalProductionPerHour}/h</p>
                </div>
              </div>
            </div>

            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-4">
              <button 
                onClick={() => setActiveTab('producao')}
                className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'producao' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Produção
              </button>
              <button 
                onClick={() => setActiveTab('intervencoes')}
                className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'intervencoes' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Intervenções
              </button>
            </div>

            {isAuthenticated && (
              <div className="mb-4">
                {activeTab === 'producao' ? (
                  <button 
                    onClick={() => onAddProduction(machine.id)}
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Produção
                  </button>
                ) : (
                  <button 
                    onClick={() => onAddDowntime(machine.id)}
                    className="w-full py-3 bg-rose-600 text-white rounded-xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Wrench className="w-4 h-4" />
                    Adicionar Parada
                  </button>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-[50vh]">
              {activeTab === 'producao' ? (
                machineProd.length > 0 ? (
                  machineProd.map((p: ProductionRecord, idx: number) => (
                    <div 
                      key={`detail-prod-${p.id}-${idx}`} 
                      onClick={() => isAuthenticated && onEditProduction(p)}
                      className={cn(
                        "p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group transition-all",
                        isAuthenticated && "cursor-pointer hover:bg-slate-100 hover:border-emerald-200"
                      )}
                    >
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
                          <div className="p-2 bg-white text-slate-400 group-hover:text-emerald-600 rounded-xl border border-slate-200 shadow-sm transition-all">
                            <Edit2 className="w-4 h-4" />
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteProduction(p.id);
                            }}
                            className="p-2 bg-white text-slate-400 hover:text-rose-600 rounded-xl border border-slate-200 shadow-sm transition-all"
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
                  machineDown.map((d: DowntimeRecord, idx: number) => (
                    <div 
                      key={`detail-down-${d.id}-${idx}`} 
                      onClick={() => isAuthenticated && onEditDowntime(d)}
                      className={cn(
                        "p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group transition-all",
                        isAuthenticated && "cursor-pointer hover:bg-slate-100 hover:border-rose-200"
                      )}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-black text-slate-400 uppercase">{format(parseISO(d.date), 'dd/MM/yyyy')}</span>
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-[10px] font-bold">{d.startTime} - {d.endTime || 'Em aberto'}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase">Motivo:</span>
                          <div className="text-sm font-black text-slate-800">{d.type}</div>
                        </div>
                        {d.observation && (
                          <div className="mt-2 p-2 bg-white/60 rounded-xl border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Observação:</span>
                            <div className="text-xs text-slate-600 italic leading-relaxed">
                              {d.observation}
                            </div>
                          </div>
                        )}
                      </div>
                      {isAuthenticated && (
                        <div className="flex gap-2">
                          <div className="p-2 bg-white text-slate-400 group-hover:text-rose-600 rounded-xl border border-slate-200 shadow-sm transition-all">
                            <Edit2 className="w-4 h-4" />
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteDowntime(d.id);
                            }}
                            className="p-2 bg-white text-slate-400 hover:text-rose-600 rounded-xl border border-slate-200 shadow-sm transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-slate-400 font-medium">Nenhum registro de intervenções.</div>
                )
              )}
            </div>
          </div>
        </Modal>
    )
  );
}

export function ReportModal({ isOpen, machines, productionLines, production, downtime, currentTime, onClose }: any) {
  const sortedMachines = useMemo(() => {
    return [...machines].sort((a, b) => a.name.localeCompare(b.name));
  }, [machines]);

  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>(productionLines.map((l: any) => l.id));
  const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>(machines.map((m: any) => m.id));

  // Sync selections when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedLineIds(productionLines.map((l: any) => l.id));
      setSelectedMachineIds(machines.map((m: any) => m.id));
    }
  }, [isOpen, productionLines, machines]);

  const filteredMachinesForSelection = useMemo(() => {
    return sortedMachines.filter(m => selectedLineIds.includes(m.productionLineId));
  }, [sortedMachines, selectedLineIds]);

  const toggleLine = (id: string) => {
    setSelectedLineIds(prev => {
      const newLines = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      // Also update machines: if a line is removed, remove its machines
      if (prev.includes(id)) {
        const machinesOfLine = machines.filter((m: any) => m.productionLineId === id).map((m: any) => m.id);
        setSelectedMachineIds(mPrev => mPrev.filter(mId => !machinesOfLine.includes(mId)));
      } else {
        // If a line is added, add its machines
        const machinesOfLine = machines.filter((m: any) => m.productionLineId === id).map((m: any) => m.id);
        setSelectedMachineIds(mPrev => [...new Set([...mPrev, ...machinesOfLine])]);
      }
      return newLines;
    });
  };

  const toggleMachine = (id: string) => {
    setSelectedMachineIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAllLines = () => {
    setSelectedLineIds(productionLines.map((l: any) => l.id));
    setSelectedMachineIds(machines.map((m: any) => m.id));
  };

  const deselectAllLines = () => {
    setSelectedLineIds([]);
    setSelectedMachineIds([]);
  };

  const selectAllMachines = () => {
    const currentFilteredIds = filteredMachinesForSelection.map(m => m.id);
    setSelectedMachineIds(prev => [...new Set([...prev, ...currentFilteredIds])]);
  };

  const deselectAllMachines = () => {
    const currentFilteredIds = filteredMachinesForSelection.map(m => m.id);
    setSelectedMachineIds(prev => prev.filter(id => !currentFilteredIds.includes(id)));
  };

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

    const filteredMachines = machines.filter((m: Machine) => selectedMachineIds.includes(m.id));

    if (filteredMachines.length === 0) {
      alert("Selecione pelo menos uma máquina para gerar o relatório.");
      return;
    }

    // Group by Production Line
    const machinesByLine: Record<string, Machine[]> = {};
    filteredMachines.forEach(m => {
      if (!machinesByLine[m.productionLineId]) {
        machinesByLine[m.productionLineId] = [];
      }
      machinesByLine[m.productionLineId].push(m);
    });

    const tableData: any[] = [];
    
    // Sort lines by name
    const sortedLines = productionLines
      .filter((l: any) => selectedLineIds.includes(l.id))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    let grandTotalProd = 0;
    let grandTotalOp = 0;
    let grandOEEAccum = 0;
    let totalMachinesCount = 0;

    sortedLines.forEach((line: any) => {
      const lineMachines = machinesByLine[line.id] || [];
      if (lineMachines.length === 0) return;

      // Sort machines alphabetically
      lineMachines.sort((a, b) => a.name.localeCompare(b.name));

      // Add Line Header Row
      tableData.push([
        { 
          content: `LINHA: ${line.name.toUpperCase()}`, 
          colSpan: 7, 
          styles: { fillColor: [241, 245, 249], fontStyle: 'bold', textColor: [30, 41, 59] } 
        }
      ]);

      let lineTotalProd = 0;
      let lineTotalOp = 0;
      let lineTotalDown = 0;
      let lineTotalAvail = 0;
      let lineOEEAccum = 0;

      lineMachines.forEach(m => {
        const stats = calculateStats(m, production, downtime, currentTime, { start: startDate, end: endDate });
        tableData.push([
          m.name,
          stats.totalProduction.toString(),
          formatDuration(stats.totalOperationalMinutes),
          formatDuration(stats.totalDowntimeMinutes),
          formatDuration(stats.totalAvailableMinutes),
          `${(stats.availability * 100).toFixed(1)}%`,
          `${(stats.oee * 100).toFixed(1)}%`
        ]);

        lineTotalProd += stats.totalProduction;
        lineTotalOp += stats.totalOperationalMinutes;
        lineTotalDown += stats.totalDowntimeMinutes;
        lineTotalAvail += stats.totalAvailableMinutes;
        lineOEEAccum += stats.oee;
        
        grandTotalProd += stats.totalProduction;
        grandTotalOp += stats.totalOperationalMinutes;
        grandOEEAccum += stats.oee;
        totalMachinesCount++;
      });

      // Add Line Total Row
      tableData.push([
        { content: `TOTAL ${line.name.toUpperCase()}`, styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: lineTotalProd.toString(), styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: formatDuration(lineTotalOp), styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: formatDuration(lineTotalDown), styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: formatDuration(lineTotalAvail), styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: `${((lineTotalOp / (lineTotalAvail || 1)) * 100).toFixed(1)}%`, styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: `${((lineOEEAccum / lineMachines.length) * 100).toFixed(1)}%`, styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }
      ]);
    });

    autoTable(doc, {
      startY: 45,
      head: [['Máquina', 'Produção', 'Operação', 'Parada', 'Disponível', 'Disp.', 'OEE']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [255, 255, 255] }
    });

    // Downtime Reasons Breakdown
    const downtimeByReason: Record<string, number> = {};
    filteredMachines.forEach(m => {
      const machineDowntime = downtime.filter((d: any) => 
        d.machineId === m.id && 
        d.date >= startDate && 
        d.date <= endDate
      );
      
      machineDowntime.forEach((d: any) => {
        const start = timeToMinutes(d.startTime);
        const end = d.endTime ? timeToMinutes(d.endTime) : timeToMinutes(currentTime);
        const duration = Math.max(0, end - start);
        downtimeByReason[d.type] = (downtimeByReason[d.type] || 0) + duration;
      });
    });

    const reasonData = Object.entries(downtimeByReason)
      .sort((a, b) => b[1] - a[1])
      .map(([type, duration]) => [type, formatDuration(duration)]);

    if (reasonData.length > 0) {
      const finalYMain = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text("Detalhamento de Paradas por Motivo", 14, finalYMain);

      autoTable(doc, {
        startY: finalYMain + 5,
        head: [['Motivo da Parada', 'Tempo Total']],
        body: reasonData,
        theme: 'striped',
        headStyles: { fillColor: [100, 116, 139], textColor: 255 },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 100 } // Make it narrower
      });
    }

    // Summary
    const avgOEE = totalMachinesCount > 0 ? (grandOEEAccum / totalMachinesCount) : 0;

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text("Resumo Geral", 14, finalY);
    
    doc.setFontSize(10);
    doc.text(`Total Produzido: ${grandTotalProd} unidades`, 14, finalY + 10);
    doc.text(`Tempo Total Operação: ${formatDuration(grandTotalOp)}`, 14, finalY + 17);
    doc.text(`OEE Médio: ${(avgOEE * 100).toFixed(1)}%`, 14, finalY + 24);

    doc.save(`relatorio-producao-${startDate}-a-${endDate}.pdf`);
  };

  return (
    isOpen && (
      <Modal title="Exportar Relatório PDF" onClose={onClose} maxWidth="max-w-2xl">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Linhas de Produção</label>
                  <div className="flex gap-2">
                    <button onClick={selectAllLines} className="text-[10px] font-bold text-emerald-600 hover:underline">Tudo</button>
                    <button onClick={deselectAllLines} className="text-[10px] font-bold text-rose-600 hover:underline">Nada</button>
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-2xl border border-slate-100">
                  {productionLines.map((line: any) => (
                    <button 
                      key={`report-line-${line.id}`}
                      onClick={() => toggleLine(line.id)}
                      className={cn(
                        "w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left",
                        selectedLineIds.includes(line.id) 
                          ? "bg-white shadow-sm ring-1 ring-emerald-500/20 text-emerald-900" 
                          : "text-slate-400 hover:bg-white/50"
                      )}
                    >
                      <span className="font-bold text-xs">{line.name}</span>
                      {selectedLineIds.includes(line.id) && <Check className="w-3 h-3 text-emerald-600" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Máquinas</label>
                  <div className="flex gap-2">
                    <button onClick={selectAllMachines} className="text-[10px] font-bold text-blue-600 hover:underline">Tudo</button>
                    <button onClick={deselectAllMachines} className="text-[10px] font-bold text-rose-600 hover:underline">Nada</button>
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-2xl border border-slate-100">
                  {filteredMachinesForSelection.map((m: any) => (
                    <button 
                      key={`report-machine-${m.id}`}
                      onClick={() => toggleMachine(m.id)}
                      className={cn(
                        "w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left",
                        selectedMachineIds.includes(m.id) 
                          ? "bg-white shadow-sm ring-1 ring-blue-500/20 text-blue-900" 
                          : "text-slate-400 hover:bg-white/50"
                      )}
                    >
                      <span className="font-bold text-xs">{m.name}</span>
                      {selectedMachineIds.includes(m.id) && <Check className="w-3 h-3 text-blue-600" />}
                    </button>
                  ))}
                  {filteredMachinesForSelection.length === 0 && (
                    <div className="text-center py-8 text-[10px] text-slate-400 font-medium italic">
                      Selecione uma linha para ver as máquinas.
                    </div>
                  )}
                </div>
              </div>
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
    )
  );
}

export function UserManagementModal({ isOpen, users, onClose, onAdd, onUpdate, onDelete }: any) {
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [accessType, setAccessType] = useState<'google' | 'manual'>('google');
  const [newRole, setNewRole] = useState<'admin' | 'user' | 'viewer'>('user');
  const [newCanEdit, setNewCanEdit] = useState(true);
  const [newCanDelete, setNewCanDelete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAdd = async () => {
    if (!newEmail) return;
    setIsLoading(true);
    try {
      await onAdd({
        email: newEmail.toLowerCase().trim(),
        password: accessType === 'manual' ? newPassword : undefined,
        canEdit: newRole === 'viewer' ? false : newCanEdit,
        canDelete: newRole === 'viewer' ? false : newCanDelete,
        role: newRole
      });
      setNewEmail('');
      setNewPassword('');
      setNewRole('user');
    } catch (error) {
      console.error("Error adding user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    isOpen && (
      <Modal title="Gerenciar Usuários" onClose={onClose} maxWidth="max-w-lg">
        <div className="space-y-6">
          <div className="p-4 bg-slate-50 rounded-2xl space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Adicionar Novo Usuário</h3>
            <div className="space-y-3">
              <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                <button 
                  onClick={() => setAccessType('google')}
                  className={cn(
                    "flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all",
                    accessType === 'google' ? "bg-blue-500 text-white shadow-sm" : "text-slate-400 hover:bg-slate-50"
                  )}
                >
                  Login Google
                </button>
                <button 
                  onClick={() => setAccessType('manual')}
                  className={cn(
                    "flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all",
                    accessType === 'manual' ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:bg-slate-50"
                  )}
                >
                  Usuário/Senha
                </button>
              </div>

              <input 
                type="text" 
                placeholder={accessType === 'google' ? "E-mail do Google" : "Nome de Usuário"}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
              />
              
              {accessType === 'manual' && (
                <input 
                  type="text" 
                  placeholder="Senha de acesso"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              )}
              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1">Perfil / Role</label>
                <select 
                  value={newRole}
                  onChange={(e: any) => {
                    const role = e.target.value;
                    setNewRole(role);
                    if (role === 'viewer') {
                      setNewCanEdit(false);
                      setNewCanDelete(false);
                    } else if (role === 'admin') {
                      setNewCanEdit(true);
                      setNewCanDelete(true);
                    }
                  }}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                >
                  <option value="admin">Administrador</option>
                  <option value="user">Líder / Operador</option>
                  <option value="viewer">Visualizador</option>
                </select>
              </div>
              {newRole !== 'viewer' && (
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={newCanEdit}
                      onChange={(e) => setNewCanEdit(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-600">Pode Editar</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={newCanDelete}
                      onChange={(e) => setNewCanDelete(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-600">Pode Excluir</span>
                  </label>
                </div>
              )}
              <button 
                onClick={handleAdd}
                disabled={isLoading || !newEmail}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                Adicionar Usuário
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Usuários Cadastrados</h3>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
              {users.map((user: any, idx: number) => (
                <div key={`${user.id}-${idx}`} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-emerald-200 transition-all">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-700">{user.email}</span>
                      <span className={cn(
                        "text-[8px] font-black uppercase px-1.5 py-0.5 rounded",
                        user.role === 'admin' ? "bg-purple-100 text-purple-700" :
                        user.role === 'viewer' ? "bg-blue-100 text-blue-700" :
                        "bg-slate-100 text-slate-600"
                      )}>
                        {user.role}
                      </span>
                    </div>
                    {user.password && <span className="text-[10px] text-slate-400">Senha: {user.password}</span>}
                    <div className="flex gap-2">
                      <span className={cn(
                        "text-[9px] font-black uppercase px-1.5 py-0.5 rounded",
                        user.canEdit ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                      )}>
                        {user.canEdit ? "Editar" : "Sem Edição"}
                      </span>
                      <span className={cn(
                        "text-[9px] font-black uppercase px-1.5 py-0.5 rounded",
                        user.canDelete ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-400"
                      )}>
                        {user.canDelete ? "Excluir" : "Sem Exclusão"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        const roles: ('admin' | 'user' | 'viewer')[] = ['admin', 'user', 'viewer'];
                        const nextRole = roles[(roles.indexOf(user.role) + 1) % roles.length];
                        onUpdate(user.id, { 
                          role: nextRole,
                          canEdit: nextRole === 'viewer' ? false : (nextRole === 'admin' ? true : user.canEdit),
                          canDelete: nextRole === 'viewer' ? false : (nextRole === 'admin' ? true : user.canDelete)
                        });
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Alternar Perfil"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onUpdate(user.id, { canEdit: !user.canEdit })}
                      disabled={user.role === 'viewer' || user.role === 'admin'}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-30"
                      title="Alternar Edição"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onUpdate(user.id, { canDelete: !user.canDelete })}
                      disabled={user.role === 'viewer' || user.role === 'admin'}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-30"
                      title="Alternar Exclusão"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onDelete(user.id)}
                      className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Remover Usuário"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs font-medium italic">
                  Nenhum usuário adicional cadastrado.
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    )
  );
}

export function AuditLogModal({ isOpen, onClose, logs }: { isOpen: boolean, onClose: () => void, logs: AuditLog[] }) {
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const filteredLogs = logs.filter(log => log.timestamp.startsWith(filterDate));

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Logs de Auditoria", 14, 20);
    doc.setFontSize(10);
    doc.text(`Data: ${format(parseISO(filterDate), 'dd/MM/yyyy')}`, 14, 28);

    const tableData = filteredLogs.map(log => [
      format(parseISO(log.timestamp), 'HH:mm:ss'),
      log.userEmail,
      log.action,
      log.entityType,
      log.details
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Hora', 'Usuário', 'Ação', 'Entidade', 'Detalhes']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] },
      styles: { fontSize: 8 }
    });

    doc.save(`logs-auditoria-${filterDate}.pdf`);
  };

  const exportExcel = () => {
    const data = filteredLogs.map(log => ({
      Data: format(parseISO(log.timestamp), 'dd/MM/yyyy HH:mm:ss'),
      Usuário: log.userEmail,
      Ação: log.action,
      Entidade: log.entityType,
      Detalhes: log.details
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Logs");
    XLSX.writeFile(wb, `logs-auditoria-${filterDate}.xlsx`);
  };

  return (
    isOpen && (
      <Modal title="Logs de Auditoria" onClose={onClose} maxWidth="max-w-4xl">
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-end">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Filtrar Data</label>
              <input 
                type="date" 
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-brand-primary/20 transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-all">
                <Download className="w-4 h-4" /> Excel
              </button>
              <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold hover:bg-rose-100 transition-all">
                <FileText className="w-4 h-4" /> PDF
              </button>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white border-b border-slate-200 z-10">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hora</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuário</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ação</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400 font-medium italic">Nenhum log encontrado para esta data.</td>
                    </tr>
                  ) : (
                    filteredLogs.map((log, idx) => (
                      <tr key={`${log.id}-${idx}`} className="hover:bg-white transition-colors">
                        <td className="px-4 py-3 text-xs font-mono text-slate-500">{format(parseISO(log.timestamp), 'HH:mm:ss')}</td>
                        <td className="px-4 py-3 text-xs font-bold text-slate-700">{log.userEmail}</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "text-[10px] font-black px-2 py-0.5 rounded-full uppercase",
                            log.action === 'CREATE' ? "bg-emerald-100 text-emerald-600" :
                            log.action === 'UPDATE' ? "bg-blue-100 text-blue-600" :
                            "bg-rose-100 text-rose-600"
                          )}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{log.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>
    )
  );
}
