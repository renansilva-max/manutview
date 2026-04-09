import React, { useState, useEffect, Component } from 'react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { 
  Plus, 
  Settings, 
  Download, 
  Copy, 
  Filter,
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  AlertTriangle,
  Check,
  X,
  Factory,
  Wrench,
  LayoutGrid,
  BarChart3,
  Clock,
  LogIn,
  LogOut,
  Monitor,
  Database
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  Machine, 
  ProductionRecord, 
  DowntimeRecord,
  ProductionLine,
  DowntimeReason,
  UserProfile,
  AuditLog
} from './types';
import { MachineRow } from './components/MachineRow';
import { MachineCard } from './components/MachineCard';
import { ComparativeDashboard } from './components/ComparativeDashboard';
import { OverviewDashboard } from './components/OverviewDashboard';
import { OperatorDashboard } from './components/OperatorDashboard';
import { MaintenanceRankingDashboard } from './components/MaintenanceRankingDashboard';
import { ActiveMaintenanceDashboard } from './components/ActiveMaintenanceDashboard';
import { 
  MachineManagementModal, 
  ProductionLineManagementModal,
  ProductionModal, 
  DowntimeModal,
  MachineDetailModal,
  ReportModal,
  LoginModal,
  SettingsModal,
  FilterModal,
  DowntimeReasonManagementModal,
  UserManagementModal,
  AuditLogModal
} from './components/Modals';
import * as XLSX from 'xlsx';
import { cn } from './lib/utils';
import { FileText } from 'lucide-react';
import { 
  db, 
  auth, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  OperationType, 
  handleFirestoreError,
  signInAnonymously 
} from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { generateId, formatDuration } from './utils';

// Error Boundary Component
class ErrorBoundary extends Component<React.PropsWithChildren<{}>, { hasError: boolean, errorInfo: string | null }> {
  state = { hasError: false, errorInfo: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Ocorreu um erro inesperado.";
      let rawError = this.state.errorInfo;
      
      try {
        const parsed = JSON.parse(this.state.errorInfo || "");
        if (parsed.error && parsed.error.includes("insufficient permissions")) {
          displayMessage = "Você não tem permissão para realizar esta ação. Por favor, faça login como administrador.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-100">
            <div className="bg-rose-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-rose-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-4 uppercase tracking-tight">Ops! Algo deu errado</h2>
            <p className="text-slate-600 mb-4 font-medium leading-relaxed">
              {displayMessage}
            </p>
            {rawError && (
              <div className="mb-8 p-3 bg-slate-50 rounded-xl border border-slate-200 text-left overflow-auto max-h-32">
                <p className="text-[10px] font-mono text-slate-500 break-all">
                  {rawError}
                </p>
              </div>
            )}
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-brand-primary text-white rounded-2xl font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all"
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

// Initial Data
const INITIAL_PRODUCTION_LINES: ProductionLine[] = [
  { id: 'line-1', name: 'Etiquetas ou Filigranas' }
];

const safeLocalStorage = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {}
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  }
};

const INITIAL_MACHINES: Machine[] = [
  { id: 'machine-1', name: 'Filigrana 1', productionLineId: 'line-1', theoreticalProductionPerHour: 100, hourlyGoal: 80 },
  { id: 'machine-2', name: 'Filigrana 2', productionLineId: 'line-1', theoreticalProductionPerHour: 100, hourlyGoal: 80 },
  { id: 'machine-3', name: 'Filigrana 3', productionLineId: 'line-1', theoreticalProductionPerHour: 100, hourlyGoal: 80 },
  { id: 'machine-4', name: 'Filigrana 4', productionLineId: 'line-1', theoreticalProductionPerHour: 100, hourlyGoal: 80 },
  { id: 'machine-5', name: 'Filigrana 5', productionLineId: 'line-1', theoreticalProductionPerHour: 100, hourlyGoal: 80 },
];

const INITIAL_DOWNTIME_REASONS: DowntimeReason[] = [
  { id: 'reason-1', name: 'Mecânica', color: '#e11d48' },
  { id: 'reason-2', name: 'Elétrica', color: '#2563eb' },
  { id: 'reason-3', name: 'Troca de Artigo', color: '#d97706' },
  { id: 'reason-4', name: 'Falta de Material', color: '#4b5563' },
];

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  // State
  const [productionLines, setProductionLines] = useState<ProductionLine[]>(INITIAL_PRODUCTION_LINES);
  const [machines, setMachines] = useState<Machine[]>(INITIAL_MACHINES);
  const [production, setProduction] = useState<ProductionRecord[]>([]);
  const [downtime, setDowntime] = useState<DowntimeRecord[]>([]);
  const [downtimeReasons, setDowntimeReasons] = useState<DowntimeReason[]>(INITIAL_DOWNTIME_REASONS);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedEndDate, setSelectedEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(format(new Date(), 'HH:mm:ss'));
  const [currentDashboard, setCurrentDashboard] = useState<'timeline' | 'summary' | 'comparative' | 'maintenance' | 'operator' | 'maintenance_ranking' | 'active_maintenance'>('timeline');
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [isLegacyAuthWarningOpen, setIsLegacyAuthWarningOpen] = useState(false);
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>([]);

  const [appName, setAppName] = useState('Controle de Produção');
  const [appDescription, setAppDescription] = useState('Monitoramento de produção e manutenção industrial');
  const [appIcon, setAppIcon] = useState('https://picsum.photos/seed/factory/192/192');
  const [welcomeMessage, setWelcomeMessage] = useState('Bem-vindo ao sistema de controle de produção!');

  // Modals
  const [isLineModalOpen, setIsLineModalOpen] = useState(false);
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);
  const [isDowntimeModalOpen, setIsDowntimeModalOpen] = useState(false);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<{ type: 'production' | 'downtime' | 'machine', data: any } | null>(null);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedMachineForDetail, setSelectedMachineForDetail] = useState<Machine | null>(null);
  const [preSelectedMachineId, setPreSelectedMachineId] = useState<string | null>(null);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(format(new Date(), 'HH:mm:ss'));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auth State Management
  const [fbUser, setFbUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFbUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribeAuth();
  }, []);

  // Sync User Profile and Permissions
  useEffect(() => {
    const legacyUser = safeLocalStorage.getItem('legacyUser');
    const isAuthStored = safeLocalStorage.getItem('isAuthenticated') === 'true';
    const effectiveEmail = fbUser?.email || (isAuthStored ? legacyUser : null);
    
    if (effectiveEmail) {
      const profile = (userProfiles || []).find(p => p && p.email?.toLowerCase() === effectiveEmail.toLowerCase());
      const allowedEmails = ['ciaheringgoianesia@gmail.com', 'renan.silva@ciahering.com.br'];
      const isMaster = allowedEmails.includes(effectiveEmail.toLowerCase()) || 
                       effectiveEmail.toLowerCase() === 'renan.silva' ||
                       effectiveEmail.toLowerCase() === 'viewhering@manual.com';
      
      if (profile || isMaster) {
        setCurrentUserProfile(profile || null);
        setIsAdmin(profile?.role === 'admin' || isMaster);
        setIsAuthenticated(true);

        // If we have a legacy session but no Firebase user, try to sign in anonymously
        if (!fbUser && isAuthStored) {
          signInAnonymously(auth).catch(e => {
            if (e.code === 'auth/admin-restricted-operation') {
              setIsLegacyAuthWarningOpen(true);
            }
          });
        }
      } else {
        // User not found in registered profiles and not a master account
        setCurrentUserProfile(null);
        setIsAdmin(false);
        setIsAuthenticated(false);
        
        // Clear legacy session if it's invalid
        if (!fbUser && isAuthStored) {
          safeLocalStorage.removeItem('isAuthenticated');
          safeLocalStorage.removeItem('legacyUser');
        }
      }
    } else {
      setCurrentUserProfile(null);
      setIsAdmin(false);
      setIsAuthenticated(false);
    }
  }, [fbUser, userProfiles]);

  useEffect(() => {
    document.title = appName;
    
    // Update favicon and apple-touch-icon
    const updateIcon = (rel: string, href: string) => {
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = href;
    };

    updateIcon('icon', appIcon);
    updateIcon('apple-touch-icon', appIcon);
    updateIcon('shortcut icon', appIcon);
  }, [appName, appIcon]);

  // Data Sync
  useEffect(() => {
    const unsubscribeConfig = onSnapshot(doc(db, 'config', 'app'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.name) setAppName(data.name);
        if (data.description) setAppDescription(data.description);
        if (data.icon) setAppIcon(data.icon);
        if (data.welcomeMessage) setWelcomeMessage(data.welcomeMessage);
      }
    }, (error) => console.warn("Config sync error:", error));

    const unsubscribeUsers = onSnapshot(collection(db, 'userProfiles'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserProfile));
      setUserProfiles(data);
    }, (error) => console.warn("User profiles sync error:", error));

    // Sync operational data (visible to all authenticated users or publicly)
    const unsubscribeLines = onSnapshot(collection(db, 'productionLines'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ProductionLine));
      if (data.length > 0) {
        setProductionLines(data);
        setSelectedLineIds(prev => prev.length === 0 ? data.map(l => l.id) : prev);
      } else {
        setProductionLines(prev => prev.length === 0 ? INITIAL_PRODUCTION_LINES : []);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'productionLines'));

    const unsubscribeMachines = onSnapshot(collection(db, 'machines'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Machine));
      if (data.length > 0) {
        setMachines(data);
      } else {
        setMachines(prev => prev.length === 0 ? INITIAL_MACHINES : []);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'machines'));

    const unsubscribeProduction = onSnapshot(collection(db, 'production'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ProductionRecord));
      setProduction(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'production'));

    const unsubscribeDowntime = onSnapshot(collection(db, 'downtime'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as DowntimeRecord));
      setDowntime(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'downtime'));

    const unsubscribeReasons = onSnapshot(collection(db, 'downtimeReasons'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as DowntimeReason));
      if (data.length > 0) {
        setDowntimeReasons(data);
      } else {
        setDowntimeReasons(prev => prev.length === 0 ? INITIAL_DOWNTIME_REASONS : []);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'downtimeReasons'));

    return () => {
      unsubscribeConfig();
      unsubscribeUsers();
      unsubscribeLines();
      unsubscribeMachines();
      unsubscribeProduction();
      unsubscribeDowntime();
      unsubscribeReasons();
    };
  }, []);

  // Audit Logs Sync (Admin only)
  useEffect(() => {
    if (!isAdmin) return;
    
    const unsubscribeLogs = onSnapshot(collection(db, 'auditLogs'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AuditLog));
      setAuditLogs(data.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    }, (error) => console.warn("Audit logs sync error:", error));

    return () => unsubscribeLogs();
  }, [isAdmin]);

  // Show welcome message after login
  useEffect(() => {
    if (!isAuthReady) return;
    
    const showWelcome = sessionStorage.getItem('showWelcome');
    if (showWelcome === 'true' && isAuthenticated && welcomeMessage) {
      setShowWelcomeBanner(true);
      sessionStorage.removeItem('showWelcome');
      // Auto hide after 10 seconds
      const timer = setTimeout(() => setShowWelcomeBanner(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [isAuthReady, isAuthenticated, welcomeMessage]);

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    const safeFormatDate = (dateStr: string | undefined) => {
      if (!dateStr) return '-';
      try {
        return format(parseISO(dateStr), 'dd/MM/yyyy HH:mm');
      } catch (e) {
        return dateStr;
      }
    };

    // Machines Sheet
    const machinesWS = XLSX.utils.json_to_sheet(machines.map(m => ({
      ID: m.id,
      Nome: m.name,
      'Produção Teórica/h': m.theoreticalProductionPerHour,
      'Meta/h': m.hourlyGoal
    })));
    XLSX.utils.book_append_sheet(wb, machinesWS, "Máquinas");

    // Production Sheet
    const productionWS = XLSX.utils.json_to_sheet(production.map(p => {
      const machine = machines.find(m => m.id === p.machineId);
      return {
        'Máquina': machine?.name || p.machineId,
        Data: p.date,
        'Hora Início': p.startTime,
        'Hora Fim': p.endTime,
        'Quantidade Produzida': p.quantity || 0,
        'Quantidade Refugo': p.scrapQuantity || 0,
        'Cadastrado por': p.createdBy || '-',
        'Data Cadastro': safeFormatDate(p.createdAt),
        'Atualizado por': p.updatedBy || '-',
        'Data Atualização': safeFormatDate(p.updatedAt)
      };
    }));
    XLSX.utils.book_append_sheet(wb, productionWS, "Produção");

    // Downtime Sheet
    const downtimeWS = XLSX.utils.json_to_sheet(downtime.map(d => {
      const machine = machines.find(m => m.id === d.machineId);
      return {
        'Máquina': machine?.name || d.machineId,
        Data: d.date,
        'Hora Início': d.startTime,
        'Hora Fim': d.endTime || 'Em aberto',
        Tipo: d.type,
        Observação: d.observation || '',
        'Cadastrado por': d.createdBy || '-',
        'Data Cadastro': safeFormatDate(d.createdAt),
        'Atualizado por': d.updatedBy || '-',
        'Data Atualização': safeFormatDate(d.updatedAt)
      };
    }));
    XLSX.utils.book_append_sheet(wb, downtimeWS, "Paradas");

    XLSX.writeFile(wb, `Controle_Producao_Dados_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`);
  };


  // User Management Actions
  const addUserProfile = async (profile: Omit<UserProfile, 'id'>) => {
    const id = generateId();
    try {
      await setDoc(doc(db, 'userProfiles', id), profile);
      await addAuditLog('CREATE', 'USER', id, `Usuário criado: ${profile.email} (${profile.role})`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `userProfiles/${id}`);
    }
  };

  const updateUserProfile = async (id: string, updates: Partial<UserProfile>) => {
    try {
      await updateDoc(doc(db, 'userProfiles', id), updates);
      const user = userProfiles.find(u => u.id === id);
      await addAuditLog('UPDATE', 'USER', id, `Usuário atualizado: ${user?.email || id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `userProfiles/${id}`);
    }
  };

  const deleteUserProfile = async (id: string) => {
    try {
      const user = userProfiles.find(u => u.id === id);
      await deleteDoc(doc(db, 'userProfiles', id));
      await addAuditLog('DELETE', 'USER', id, `Usuário excluído: ${user?.email || id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `userProfiles/${id}`);
    }
  };

  // Backup and Restore
  const handleBackup = () => {
    const backupData = {
      productionLines,
      machines,
      production,
      downtime,
      downtimeReasons,
      userProfiles,
      config: { name: appName, description: appDescription }
    };
    
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup-filigrana-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRestore = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (window.confirm("Atenção: Isso irá sobrescrever todos os dados atuais pelos dados do backup. Deseja continuar?")) {
          // Restore each collection
          if (data.productionLines) {
            for (const item of data.productionLines) {
              await setDoc(doc(db, 'productionLines', item.id), item);
            }
          }
          if (data.machines) {
            for (const item of data.machines) {
              await setDoc(doc(db, 'machines', item.id), item);
            }
          }
          if (data.production) {
            for (const item of data.production) {
              await setDoc(doc(db, 'production', item.id), item);
            }
          }
          if (data.downtime) {
            for (const item of data.downtime) {
              await setDoc(doc(db, 'downtime', item.id), item);
            }
          }
          if (data.downtimeReasons) {
            for (const item of data.downtimeReasons) {
              await setDoc(doc(db, 'downtimeReasons', item.id), item);
            }
          }
          if (data.userProfiles) {
            for (const item of data.userProfiles) {
              await setDoc(doc(db, 'userProfiles', item.id), item);
            }
          }
          if (data.config) {
            await setDoc(doc(db, 'config', 'app'), data.config);
          }
          
          alert("Backup restaurado com sucesso! O aplicativo será atualizado.");
          window.location.reload();
        }
      } catch (error) {
        console.error("Erro ao restaurar backup:", error);
        alert("Erro ao processar o arquivo de backup. Verifique se o arquivo é válido.");
      }
    };
    reader.readAsText(file);
  };

  // Permission helpers
  const canEdit = isAdmin || (currentUserProfile?.canEdit ?? false);
  const canDelete = isAdmin || (currentUserProfile?.canDelete ?? false);

  const handleLogin = async (email: string) => {
    safeLocalStorage.setItem('isAuthenticated', 'true');
    safeLocalStorage.setItem('legacyUser', email);
    sessionStorage.setItem('showWelcome', 'true');
    
    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.warn("Anonymous sign in failed", e);
      }
    }
    
    setIsAuthenticated(true);
    setIsLoginModalOpen(false);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (e) {}
    safeLocalStorage.removeItem('isAuthenticated');
    safeLocalStorage.removeItem('legacyUser');
    setIsAuthenticated(false);
    setIsAdmin(false);
    setCurrentUserProfile(null);
  };

  const addAuditLog = async (action: AuditLog['action'], entityType: AuditLog['entityType'], entityId: string, details: string) => {
    const user = auth.currentUser;
    const legacyUser = safeLocalStorage.getItem('legacyUser');
    const userEmail = user?.email || legacyUser || 'unknown';
    
    const log: AuditLog = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      userId: user?.uid || 'legacy',
      userEmail: userEmail,
      action,
      entityType,
      entityId,
      details
    };
    try {
      await setDoc(doc(db, 'auditLogs', log.id), log);
    } catch (error) {
      console.error("Error saving audit log:", error);
    }
  };
  
  // Data Modification Functions
  const updateAppConfig = async (name: string, description: string, icon?: string, welcome?: string) => {
    if (!isAdmin) return;
    try {
      const config: any = { name, description };
      if (icon) config.icon = icon;
      if (welcome !== undefined) config.welcomeMessage = welcome;
      await setDoc(doc(db, 'config', 'app'), config);
      await addAuditLog('UPDATE', 'CONFIG', 'app', `Configuração do App: ${name}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'config/app');
    }
  };

  const saveProductionLine = async (line: ProductionLine) => {
    if (!isAdmin) {
      alert("Apenas o administrador pode salvar alterações no banco de dados.");
      return;
    }
    try {
      const isNew = !productionLines.find(l => l.id === line.id);
      await setDoc(doc(db, 'productionLines', line.id), line);
      await addAuditLog(isNew ? 'CREATE' : 'UPDATE', 'LINE', line.id, `Linha: ${line.name}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `productionLines/${line.id}`);
    }
  };

  const addProductionLine = async (name: string) => {
    const newLine: ProductionLine = { 
      id: generateId(), 
      name
    };
    await saveProductionLine(newLine);
  };

  const updateProductionLine = async (id: string, data: Partial<ProductionLine>) => {
    const line = productionLines.find(l => l.id === id);
    if (line) {
      await saveProductionLine({ ...line, ...data });
    }
  };

  const deleteProductionLine = async (id: string) => {
    if (!isAdmin) {
      alert("Apenas o administrador pode excluir dados.");
      return;
    }
    const line = productionLines.find(l => l.id === id);
    // Check if there are machines in this line
    const machinesInLine = machines.filter(m => m.productionLineId === id);
    if (machinesInLine.length > 0) {
      alert("Não é possível excluir uma linha de produção que possui máquinas vinculadas.");
      return;
    }
    try {
      await deleteDoc(doc(db, 'productionLines', id));
      await addAuditLog('DELETE', 'LINE', id, `Linha excluída: ${line?.name || id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `productionLines/${id}`);
    }
  };

  const resetData = async () => {
    if (!isAdmin) return;
    try {
      // Seed Lines
      for (const line of INITIAL_PRODUCTION_LINES) {
        await setDoc(doc(db, 'productionLines', line.id), line);
      }
      // Seed Machines
      for (const m of INITIAL_MACHINES) {
        await setDoc(doc(db, 'machines', m.id), m);
      }
      // Seed Reasons
      for (const reason of INITIAL_DOWNTIME_REASONS) {
        await setDoc(doc(db, 'downtimeReasons', reason.id), reason);
      }
      await addAuditLog('UPDATE', 'CONFIG', 'reset', 'Restauração de dados de fábrica');
      alert("Dados restaurados com sucesso!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'reset-data');
    }
  };

  const saveMachine = async (machine: Machine) => {
    if (!isAdmin) {
      alert("Apenas o administrador pode salvar alterações no banco de dados.");
      return;
    }
    try {
      const isNew = !machines.find(m => m.id === machine.id);
      await setDoc(doc(db, 'machines', machine.id), machine);
      await addAuditLog(isNew ? 'CREATE' : 'UPDATE', 'MACHINE', machine.id, `Máquina: ${machine.name}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `machines/${machine.id}`);
    }
  };

  const addMachine = async (name: string, productionLineId: string, theoretical: number, hourlyGoal: number) => {
    const newMachine: Machine = { 
      id: generateId(), 
      name,
      productionLineId,
      theoreticalProductionPerHour: theoretical,
      hourlyGoal
    };
    await saveMachine(newMachine);
  };

  const updateMachine = async (id: string, data: Partial<Machine>) => {
    const machine = machines.find(m => m.id === id);
    if (machine) {
      await saveMachine({ ...machine, ...data });
    }
  };

  const deleteMachine = async (id: string) => {
    if (!isAdmin) {
      alert("Apenas o administrador pode excluir dados.");
      return;
    }
    const machine = machines.find(m => m.id === id);
    try {
      await deleteDoc(doc(db, 'machines', id));
      await addAuditLog('DELETE', 'MACHINE', id, `Máquina excluída: ${machine?.name || id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `machines/${id}`);
    }
  };

  const saveDowntimeReason = async (reason: DowntimeReason) => {
    if (!isAdmin) {
      alert("Apenas o administrador pode salvar alterações.");
      throw new Error("Unauthorized");
    }
    try {
      const isNew = !downtimeReasons.find(r => r.id === reason.id);
      await setDoc(doc(db, 'downtimeReasons', reason.id), reason);
      await addAuditLog(isNew ? 'CREATE' : 'UPDATE', 'REASON', reason.id, `Motivo: ${reason.name}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `downtimeReasons/${reason.id}`);
    }
  };

  const addDowntimeReason = async (name: string, color: string) => {
    const newReason: DowntimeReason = { id: generateId(), name, color };
    await saveDowntimeReason(newReason);
  };

  const updateDowntimeReason = async (id: string, data: Partial<DowntimeReason>) => {
    const reason = downtimeReasons.find(r => r.id === id);
    if (reason) {
      await saveDowntimeReason({ ...reason, ...data });
    }
  };

  const deleteDowntimeReason = async (id: string) => {
    console.log("Attempting to delete downtime reason:", id);
    if (!isAdmin) {
      alert("Apenas o administrador pode excluir motivos de parada.");
      throw new Error("Unauthorized");
    }
    const reason = downtimeReasons.find(r => r.id === id);
    try {
      await deleteDoc(doc(db, 'downtimeReasons', id));
      await addAuditLog('DELETE', 'REASON', id, `Motivo excluído: ${reason?.name || id}`);
      console.log("Downtime reason deleted successfully from Firestore:", id);
      alert("Motivo excluído com sucesso!");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `downtimeReasons/${id}`);
    }
  };

  const saveProduction = async (data: Omit<ProductionRecord, 'id'>, id?: string) => {
    if (!isAuthenticated) {
      alert("Você precisa estar autenticado para salvar dados.");
      return;
    }
    
    // Get current user email robustly
    const userEmail = auth.currentUser?.email || safeLocalStorage.getItem('legacyUser') || 'Usuário Desconhecido';
    const now = new Date().toISOString();

    try {
      const recordId = id || generateId();
      // Find existing record in the full production list to preserve creation data
      const existing = production.find(p => p.id === id);
      
      const record: ProductionRecord = { 
        ...data, 
        id: recordId,
        createdBy: (existing?.createdBy && existing.createdBy !== '-') ? existing.createdBy : userEmail,
        createdAt: (existing?.createdAt && existing.createdAt !== '-') ? existing.createdAt : now,
        updatedBy: userEmail,
        updatedAt: now
      };
      
      await setDoc(doc(db, 'production', recordId), record);
      const machine = machines.find(m => m.id === data.machineId);
      await addAuditLog(id ? 'UPDATE' : 'CREATE', 'PRODUCTION', recordId, `Produção: ${data.quantity} unid. na máquina ${machine?.name || data.machineId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `production/${id || 'new'}`);
    }
  };

  const deleteProduction = async (id: string) => {
    if (!isAdmin) {
      alert("Apenas o administrador pode excluir dados.");
      throw new Error("Unauthorized");
    }
    const record = production.find(p => p.id === id);
    try {
      await deleteDoc(doc(db, 'production', id));
      const machine = machines.find(m => m.id === record?.machineId);
      await addAuditLog('DELETE', 'PRODUCTION', id, `Produção excluída: ${record?.quantity} unid. na máquina ${machine?.name || record?.machineId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `production/${id}`);
    }
  };

  const saveDowntime = async (data: Omit<DowntimeRecord, 'id'>, id?: string) => {
    if (!isAuthenticated) {
      alert("Você precisa estar autenticado para salvar dados.");
      return;
    }
    
    // Get current user email robustly
    const userEmail = auth.currentUser?.email || safeLocalStorage.getItem('legacyUser') || 'Usuário Desconhecido';
    const now = new Date().toISOString();

    try {
      const recordId = id || generateId();
      // Find existing record in the full downtime list to preserve creation data
      const existing = downtime.find(d => d.id === id);
      
      const record: DowntimeRecord = { 
        ...data, 
        id: recordId,
        createdBy: (existing?.createdBy && existing.createdBy !== '-') ? existing.createdBy : userEmail,
        createdAt: (existing?.createdAt && existing.createdAt !== '-') ? existing.createdAt : now,
        updatedBy: userEmail,
        updatedAt: now
      };

      await setDoc(doc(db, 'downtime', recordId), record);
      const machine = machines.find(m => m.id === data.machineId);
      await addAuditLog(id ? 'UPDATE' : 'CREATE', 'DOWNTIME', recordId, `Parada: ${data.type} na máquina ${machine?.name || data.machineId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `downtime/${id || 'new'}`);
    }
  };

  const deleteDowntime = async (id: string) => {
    if (!isAdmin) {
      alert("Apenas o administrador pode excluir dados.");
      throw new Error("Unauthorized");
    }
    const record = downtime.find(d => d.id === id);
    try {
      await deleteDoc(doc(db, 'downtime', id));
      const machine = machines.find(m => m.id === record?.machineId);
      await addAuditLog('DELETE', 'DOWNTIME', id, `Parada excluída: ${record?.type} na máquina ${machine?.name || record?.machineId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `downtime/${id}`);
    }
  };

  const startDowntime = (machineId: string, reasonName?: string) => {
    if (!canEdit) {
      alert("Você não tem permissão para realizar esta ação.");
      return;
    }
    const type = reasonName || 'Mecânica';
    const activeForReason = downtime.find(d => 
      d.machineId === machineId && 
      d.date === selectedDate && 
      d.type === type &&
      !d.endTime
    );

    if (activeForReason) return;

    saveDowntime({
      machineId,
      date: selectedDate,
      startTime: currentTime,
      type,
      observation: ''
    });
  };

  const finishDowntime = (machineId: string, reasonName?: string) => {
    if (!canEdit) {
      alert("Você não tem permissão para realizar esta ação.");
      return;
    }
    const active = downtime.filter(d => d.machineId === machineId && d.date === selectedDate && !d.endTime);
    
    if (reasonName) {
      const specific = active.find(d => d.type === reasonName);
      if (specific) {
        saveDowntime({ ...specific, endTime: currentTime }, specific.id);
      }
    } else {
      // If no reason specified, finish all (fallback)
      active.forEach(record => {
        saveDowntime({ ...record, endTime: currentTime }, record.id);
      });
    }
  };

  const deleteRecord = (type: 'production' | 'downtime', id: string) => {
    if (type === 'production') {
      deleteProduction(id);
    } else {
      deleteDowntime(id);
    }
  };

  const toggleLineFilter = (id: string) => {
    setSelectedLineIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAllLines = () => setSelectedLineIds((productionLines || []).map(l => l.id));
  const clearAllLines = () => setSelectedLineIds([]);

  const filteredLines = (productionLines || []).filter(l => l && selectedLineIds.includes(l.id));
  const filteredMachines = (machines || [])
    .filter(m => m && selectedLineIds.includes(m.productionLineId))
    .sort((a, b) => (a?.name || '').localeCompare(b?.name || '', undefined, { numeric: true, sensitivity: 'base' }));

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

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

  if (!isAuthenticated) {
    return (
      <LoginModal 
        isOpen={true} 
        onClose={() => {}} 
        users={userProfiles}
        isMandatory={true}
        onLogin={handleLogin} 
      />
    );
  }

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
              <h1 className="text-xl font-bold tracking-tight">{appName}</h1>
              <p className="text-xs text-slate-400">{appDescription}</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-2 bg-white/10 p-1 rounded-2xl">
            <div className="flex items-center gap-1 px-2 border-r border-white/10 mr-1">
              <button 
                onClick={() => setIsRangeMode(!isRangeMode)}
                className={cn(
                  "px-2 py-1 rounded-lg text-[10px] font-black uppercase transition-all",
                  !isRangeMode ? "bg-emerald-500 text-white" : "text-white/50 hover:text-white"
                )}
              >
                Dia
              </button>
              <button 
                onClick={() => setIsRangeMode(!isRangeMode)}
                className={cn(
                  "px-2 py-1 rounded-lg text-[10px] font-black uppercase transition-all",
                  isRangeMode ? "bg-emerald-500 text-white" : "text-white/50 hover:text-white"
                )}
              >
                Período
              </button>
            </div>

            <div className="flex items-center gap-1">
              {!isRangeMode && (
                <button 
                  onClick={() => setSelectedDate(format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    if (!isRangeMode) setSelectedEndDate(e.target.value);
                  }}
                  className="bg-transparent border-none text-xs font-bold focus:ring-0 cursor-pointer px-1 w-28"
                />
                {isRangeMode && (
                  <>
                    <span className="text-white/30 text-[10px] font-bold">até</span>
                    <input 
                      type="date" 
                      value={selectedEndDate}
                      onChange={(e) => setSelectedEndDate(e.target.value)}
                      className="bg-transparent border-none text-xs font-bold focus:ring-0 cursor-pointer px-1 w-28"
                    />
                  </>
                )}
              </div>
              {!isRangeMode && (
                <button 
                  onClick={() => setSelectedDate(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 mr-2">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <LogIn className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-white/40 uppercase leading-none">Usuário</span>
                <span className="text-[11px] font-bold text-white leading-tight">
                  {currentUserProfile?.name || currentUserProfile?.email || safeLocalStorage.getItem('legacyUser') || 'Visitante'}
                </span>
              </div>
            </div>

            <button 
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium transition-all shadow-lg shadow-emerald-900/20"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Relatórios</span>
            </button>

            {isAdmin && (
              <button 
                onClick={() => setIsSettingsModalOpen(true)}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-all"
                title="Configurações"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}

            {isAdmin && (
              <button 
                onClick={() => setIsLogsModalOpen(true)}
                className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all"
                title="Logs de Auditoria"
              >
                <Database className="w-5 h-5" />
              </button>
            )}

            {isAuthenticated ? (
              <button 
                onClick={handleLogout}
                className="p-2 bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 rounded-lg transition-all border border-rose-500/30"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
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
        
        {/* Welcome Banner */}
        <AnimatePresence>
          {showWelcomeBanner && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500 p-2 rounded-xl text-white">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900">Bem-vindo de volta!</h4>
                    <p className="text-xs text-emerald-700">{welcomeMessage}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowWelcomeBanner(false)}
                  className="p-2 hover:bg-emerald-100 rounded-full text-emerald-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Dashboard Switcher - Sticky */}
        <div className="sticky top-[72px] z-20 bg-slate-50/80 backdrop-blur-md py-2 -mx-2 px-2">
          {isLegacyAuthWarningOpen && !auth.currentUser && (
            <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-[10px] font-bold text-amber-800 leading-tight">
                  <strong>Aviso:</strong> Você está em modo de visualização local. Para salvar dados na nuvem, o administrador precisa habilitar o "Login Anônimo" no Firebase ou você deve entrar com o Google.
                </p>
              </div>
              <button 
                onClick={() => setIsLegacyAuthWarningOpen(false)}
                className="p-1 hover:bg-amber-100 rounded-lg text-amber-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="flex bg-slate-200/50 p-1 rounded-xl gap-1 border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setIsFilterModalOpen(true)}
              className={cn(
                "flex items-center justify-center px-3 rounded-lg transition-all shrink-0",
                selectedLineIds.length < productionLines.length 
                  ? "bg-emerald-100 text-emerald-600 shadow-sm" 
                  : "text-slate-500 hover:bg-slate-200"
              )}
              title="Filtrar Linhas"
            >
              <Filter className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCurrentDashboard('timeline')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-black transition-all uppercase tracking-wider whitespace-nowrap shrink-0",
                currentDashboard === 'timeline' ? "bg-white text-brand-primary shadow-md" : "text-slate-500 hover:bg-slate-200"
              )}
            >
              <Clock className="w-4 h-4" />
              <span>Timeline</span>
            </button>
            <button 
              onClick={() => setCurrentDashboard('summary')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-black transition-all uppercase tracking-wider whitespace-nowrap shrink-0",
                currentDashboard === 'summary' ? "bg-white text-brand-primary shadow-md" : "text-slate-500 hover:bg-slate-200"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Resumo</span>
            </button>
            <button 
              onClick={() => setCurrentDashboard('comparative')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-black transition-all uppercase tracking-wider whitespace-nowrap shrink-0",
                currentDashboard === 'comparative' ? "bg-white text-brand-primary shadow-md" : "text-slate-500 hover:bg-slate-200"
              )}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Comparativo</span>
            </button>
            <button 
              onClick={() => setCurrentDashboard('maintenance')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-black transition-all uppercase tracking-wider whitespace-nowrap shrink-0",
                currentDashboard === 'maintenance' ? "bg-white text-brand-primary shadow-md" : "text-slate-500 hover:bg-slate-200"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Visão Geral</span>
            </button>
            <button 
              onClick={() => setCurrentDashboard('operator')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-black transition-all uppercase tracking-wider whitespace-nowrap shrink-0",
                currentDashboard === 'operator' ? "bg-white text-brand-primary shadow-md" : "text-slate-500 hover:bg-slate-200"
              )}
            >
              <Monitor className="w-4 h-4" />
              <span>Líder</span>
            </button>
            <button 
              onClick={() => setCurrentDashboard('maintenance_ranking')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-black transition-all uppercase tracking-wider whitespace-nowrap shrink-0",
                currentDashboard === 'maintenance_ranking' ? "bg-white text-brand-primary shadow-md" : "text-slate-500 hover:bg-slate-200"
              )}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Ranking Paradas</span>
            </button>
            <button 
              onClick={() => setCurrentDashboard('active_maintenance')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-black transition-all uppercase tracking-wider whitespace-nowrap shrink-0",
                currentDashboard === 'active_maintenance' ? "bg-white text-brand-primary shadow-md" : "text-slate-500 hover:bg-slate-200"
              )}
            >
              <Wrench className="w-4 h-4" />
              <span>Em Manutenção</span>
            </button>
          </div>
        </div>

        {/* Quick Actions - Compact */}
        {canEdit && (
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
              <div className="space-y-8">
                {filteredLines.map((line, lineIdx) => (
                  <div key={`line-timeline-${line.id || `idx-${lineIdx}`}`} className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                      <div className="h-4 w-1 bg-emerald-500 rounded-full"></div>
                      <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">{line.name}</h2>
                    </div>
                    <div className="space-y-2">
                      {filteredMachines.filter(m => m.productionLineId === line.id).map((machine, idx) => (
                        <MachineRow 
                          key={`machine-row-${machine.id || `idx-${idx}`}`}
                          machine={machine}
                          selectedDate={selectedDate}
                          selectedEndDate={selectedEndDate}
                          currentTime={currentTime}
                          production={production}
                          downtime={downtime}
                          canEdit={canEdit}
                          onClick={setSelectedMachineForDetail}
                          onEditRecord={(type, record) => {
                            if (!canEdit) {
                              alert("Você não tem permissão para realizar esta ação.");
                              return;
                            }
                            setEditingRecord({ type, data: record });
                            if (type === 'production') setIsProductionModalOpen(true);
                            else setIsDowntimeModalOpen(true);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {filteredLines.length === 0 && (
                  <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <Filter className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-bold">Nenhuma linha de produção selecionada no filtro.</p>
                  </div>
                )}
              </div>
            )}

            {currentDashboard === 'summary' && (
              <div className="space-y-8">
                {filteredLines.map((line, lineIdx) => (
                  <div key={`line-summary-${line.id || `idx-${lineIdx}`}`} className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                      <div className="h-4 w-1 bg-emerald-500 rounded-full"></div>
                      <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">{line.name}</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredMachines.filter(m => m.productionLineId === line.id).map((machine, idx) => (
                        <MachineCard 
                          key={`machine-card-${machine.id || `idx-${idx}`}`}
                          machine={machine}
                          selectedDate={selectedDate}
                          selectedEndDate={selectedEndDate}
                          currentTime={currentTime}
                          production={production}
                          downtime={downtime}
                          canEdit={canEdit}
                          onStartDowntime={() => startDowntime(machine.id)}
                          onFinishDowntime={() => finishDowntime(machine.id)}
                          onClick={setSelectedMachineForDetail}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {filteredLines.length === 0 && (
                  <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <Filter className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-bold">Nenhuma linha de produção selecionada no filtro.</p>
                  </div>
                )}
              </div>
            )}

            {currentDashboard === 'comparative' && (
              <ComparativeDashboard 
                machines={filteredMachines}
                selectedDate={selectedDate}
                selectedEndDate={selectedEndDate}
                currentTime={currentTime}
                production={production}
                downtime={downtime}
              />
            )}

            {currentDashboard === 'maintenance' && (
              <OverviewDashboard 
                machines={filteredMachines}
                selectedDate={selectedDate}
                selectedEndDate={selectedEndDate}
                currentTime={currentTime}
                production={production}
                downtime={downtime}
              />
            )}

            {currentDashboard === 'operator' && (
              <OperatorDashboard 
                machines={filteredMachines}
                productionLines={productionLines}
                production={production}
                downtime={downtime}
                reasons={downtimeReasons}
                selectedDate={selectedDate}
                selectedEndDate={selectedEndDate}
                currentTime={currentTime}
                canEdit={canEdit}
                onStartDowntime={startDowntime}
                onFinishDowntime={(machineId, reasonName) => finishDowntime(machineId, reasonName)}
                onClick={setSelectedMachineForDetail}
              />
            )}

            {currentDashboard === 'maintenance_ranking' && (
              <MaintenanceRankingDashboard 
                machines={filteredMachines}
                selectedDate={selectedDate}
                selectedEndDate={selectedEndDate}
                currentTime={currentTime}
                production={production}
                downtime={downtime}
                reasons={downtimeReasons}
                onClick={setSelectedMachineForDetail}
              />
            )}

            {currentDashboard === 'active_maintenance' && (
              <ActiveMaintenanceDashboard 
                machines={filteredMachines}
                selectedDate={selectedDate}
                selectedEndDate={selectedEndDate}
                currentTime={currentTime}
                production={production}
                downtime={downtime}
                reasons={downtimeReasons}
                isAuthenticated={canEdit}
                onStartDowntime={startDowntime}
                onFinishDowntime={(machineId, reasonName) => finishDowntime(machineId, reasonName)}
                onClick={setSelectedMachineForDetail}
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
            key="login-modal"
            isOpen={isLoginModalOpen}
            onClose={() => setIsLoginModalOpen(false)}
            onLogin={handleLogin}
            users={userProfiles}
          />
        )}
        {selectedMachineForDetail && (
          <MachineDetailModal
            key={`detail-modal-${selectedMachineForDetail.id}`}
            isOpen={!!selectedMachineForDetail}
            onClose={() => setSelectedMachineForDetail(null)}
            machine={selectedMachineForDetail}
            production={production}
            downtime={downtime}
            date={selectedDate}
            endDate={selectedEndDate}
            onEditProduction={(p: any) => {
              if (!canEdit) return;
              setEditingRecord({ type: 'production', data: p });
              setIsProductionModalOpen(true);
            }}
            onDeleteProduction={(id: string) => {
              if (!canDelete) return;
              deleteRecord('production', id);
            }}
            onEditDowntime={(d: any) => {
              if (!canEdit) return;
              setEditingRecord({ type: 'downtime', data: d });
              setIsDowntimeModalOpen(true);
            }}
            onDeleteDowntime={(id: string) => {
              if (!canDelete) return;
              deleteRecord('downtime', id);
            }}
            onUpdateMachine={updateMachine}
            onAddProduction={(machineId: string) => {
              setPreSelectedMachineId(machineId);
              setEditingRecord(null);
              setIsProductionModalOpen(true);
            }}
            onAddDowntime={(machineId: string) => {
              setPreSelectedMachineId(machineId);
              setEditingRecord(null);
              setIsDowntimeModalOpen(true);
            }}
            isAuthenticated={canEdit}
          />
        )}
        {isLineModalOpen && (
          <ProductionLineManagementModal 
            key="line-mgmt-modal"
            isOpen={isLineModalOpen}
            lines={productionLines}
            onClose={() => setIsLineModalOpen(false)}
            onAdd={addProductionLine}
            onUpdate={updateProductionLine}
            onDelete={deleteProductionLine}
          />
        )}
        {isMachineModalOpen && (
          <MachineManagementModal 
            key="mgmt-modal"
            isOpen={isMachineModalOpen}
            machines={machines}
            productionLines={productionLines}
            onClose={() => setIsMachineModalOpen(false)}
            onAdd={addMachine}
            onUpdate={updateMachine}
            onDelete={deleteMachine}
          />
        )}
        {isProductionModalOpen && (
          <ProductionModal 
            key="prod-modal"
            isOpen={isProductionModalOpen}
            machines={machines}
            date={selectedDate}
            editingData={editingRecord?.type === 'production' ? editingRecord.data : null}
            initialMachineId={preSelectedMachineId}
            onClose={() => {
              setIsProductionModalOpen(false);
              setEditingRecord(null);
              setPreSelectedMachineId(null);
            }}
            onSave={saveProduction}
            onDelete={(id: string) => deleteRecord('production', id)}
          />
        )}
        {isDowntimeModalOpen && (
          <DowntimeModal 
            key="down-modal"
            isOpen={isDowntimeModalOpen}
            machines={machines}
            date={selectedDate}
            reasons={downtimeReasons}
            editingData={editingRecord?.type === 'downtime' ? editingRecord.data : null}
            initialMachineId={preSelectedMachineId}
            onClose={() => {
              setIsDowntimeModalOpen(false);
              setEditingRecord(null);
              setPreSelectedMachineId(null);
            }}
            onSave={saveDowntime}
            onDelete={(id: string) => deleteRecord('downtime', id)}
          />
        )}
        {isReportModalOpen && (
          <ReportModal
            key="report-modal"
            isOpen={isReportModalOpen}
            onClose={() => setIsReportModalOpen(false)}
            machines={machines}
            productionLines={productionLines}
            production={production}
            downtime={downtime}
            currentTime={currentTime}
          />
        )}
        <FilterModal 
          isOpen={isFilterModalOpen}
          lines={productionLines}
          selectedLineIds={selectedLineIds}
          onClose={() => setIsFilterModalOpen(false)}
          onToggleLine={toggleLineFilter}
          onSelectAll={selectAllLines}
          onClearAll={clearAllLines}
        />

        <SettingsModal
          key="settings-modal"
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onManageLines={() => setIsLineModalOpen(true)}
          onManageMachines={() => setIsMachineModalOpen(true)}
          onManageReasons={() => setIsReasonModalOpen(true)}
          onManageUsers={() => setIsUserModalOpen(true)}
          onDownloadExcel={exportToExcel}
          onResetData={resetData}
          onBackup={handleBackup}
          onRestore={handleRestore}
          isAuthenticated={isAuthenticated}
          isAdmin={isAdmin}
          appName={appName}
          appDescription={appDescription}
          appIcon={appIcon}
          welcomeMessage={welcomeMessage}
          onUpdateConfig={updateAppConfig}
        />

        <UserManagementModal 
          isOpen={isUserModalOpen}
          users={userProfiles}
          onClose={() => setIsUserModalOpen(false)}
          onAdd={addUserProfile}
          onUpdate={updateUserProfile}
          onDelete={deleteUserProfile}
        />

        <DowntimeReasonManagementModal 
          isOpen={isReasonModalOpen}
          reasons={downtimeReasons}
          onClose={() => setIsReasonModalOpen(false)}
          onAdd={addDowntimeReason}
          onUpdate={updateDowntimeReason}
          onDelete={deleteDowntimeReason}
        />

        <AuditLogModal 
          isOpen={isLogsModalOpen}
          onClose={() => setIsLogsModalOpen(false)}
          logs={auditLogs}
        />
      </AnimatePresence>

      <footer className="bg-white border-t border-slate-200 p-4 text-center text-xs text-slate-400">
        &copy; 2026 Filigrana Monitor - Sistema de Gestão Industrial
      </footer>
    </div>
  );
}
