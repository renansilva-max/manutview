export type ProductionLine = {
  id: string;
  name: string;
};

export type Machine = {
  id: string;
  name: string;
  productionLineId: string;
  theoreticalProductionPerHour: number; // For Performance calculation
  hourlyGoal?: number; // Target production per hour
};

export type ProductionRecord = {
  id: string;
  machineId: string;
  date: string; // ISO string YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  quantity?: number;
  scrapQuantity?: number; // For Quality calculation
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
};

export type DowntimeType = 'Mecânica' | 'Elétrica' | 'Outros';

export type DowntimeReason = {
  id: string;
  name: string;
  color: string;
};

export type DowntimeRecord = {
  id: string;
  machineId: string;
  date: string; // ISO string YYYY-MM-DD
  startTime: string; // HH:mm
  endTime?: string; // HH:mm
  type: DowntimeType | string;
  observation?: string;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
};

export type TimelineSegment = {
  id: string;
  type: 'production' | 'downtime' | 'empty';
  startTime: string;
  endTime: string;
  durationMinutes: number;
  record?: ProductionRecord | DowntimeRecord;
};

export type MachineStats = {
  totalOperationalMinutes: number;
  totalDowntimeMinutes: number;
  totalAvailableMinutes: number;
  totalProduction: number;
  totalScrap: number;
  availability: number; // 0 to 1
  performance: number; // 0 to 1
  quality: number; // 0 to 1
  oee: number; // 0 to 1
  productionPerHour: number;
};

export type UserProfile = {
  id: string;
  email: string;
  name?: string;
  password?: string;
  canEdit: boolean;
  canDelete: boolean;
  role: 'admin' | 'user' | 'viewer';
};

export type AuditLog = {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'PRODUCTION' | 'DOWNTIME' | 'MACHINE' | 'LINE' | 'REASON' | 'USER' | 'CONFIG';
  entityId: string;
  details: string;
};
