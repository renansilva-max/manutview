import { format, parse } from 'date-fns';
import { ProductionRecord, DowntimeRecord, TimelineSegment, Machine, MachineStats } from './types';

export const DAY_START = '05:00';
export const DAY_END = '23:00';

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const calculateSeconds = (start: string, end: string) => {
  try {
    const sParts = start.split(':');
    const eParts = end.split(':');
    
    // Ensure we have HH:mm:ss or HH:mm
    const s = `${sParts[0].padStart(2, '0')}:${sParts[1].padStart(2, '0')}:${(sParts[2] || '00').padStart(2, '0')}`;
    const e = `${eParts[0].padStart(2, '0')}:${eParts[1].padStart(2, '0')}:${(eParts[2] || '00').padStart(2, '0')}`;
    
    const startDate = parse(s, 'HH:mm:ss', new Date());
    const endDate = parse(e, 'HH:mm:ss', new Date());
    
    let diffInMs = endDate.getTime() - startDate.getTime();
    
    if (diffInMs < 0) return 0;
    
    return Math.floor(diffInMs / 1000);
  } catch (e) {
    return 0;
  }
};

export const formatChronometer = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const formatTotalTime = (totalSeconds: number) => {
  const totalMinutes = Math.round(totalSeconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}h${m.toString().padStart(2, '0')}`;
};

export const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export function timeToMinutes(time: string): number {
  if (!time) return 0;
  const parts = time.split(':').map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  // Ignore seconds for consistency as requested
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function getTimelineSegments(
  date: string,
  production: ProductionRecord[],
  downtime: DowntimeRecord[],
  currentTime?: string
): TimelineSegment[] {
  const startMin = timeToMinutes(DAY_START);
  const endMin = timeToMinutes(DAY_END);
  
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const currentMin = currentTime ? timeToMinutes(currentTime) : timeToMinutes(format(now, 'HH:mm'));

  // Filter records for the specific date
  const dayProd = production.filter(p => p.date === date);
  const dayDown = downtime.filter(d => d.date === date);

  const segments: TimelineSegment[] = [];
  
  // Effective end time for open-ended records
  const getDownEnd = (d: DowntimeRecord) => {
    if (d.endTime) return timeToMinutes(d.endTime);
    if (d.date === todayStr) return Math.min(endMin, currentMin);
    return endMin;
  };

  const boundaries = new Set<number>([startMin, endMin]);
  dayProd.forEach(p => {
    boundaries.add(Math.max(startMin, Math.min(endMin, timeToMinutes(p.startTime))));
    boundaries.add(Math.max(startMin, Math.min(endMin, timeToMinutes(p.endTime))));
  });
  dayDown.forEach(d => {
    boundaries.add(Math.max(startMin, Math.min(endMin, timeToMinutes(d.startTime))));
    boundaries.add(Math.max(startMin, Math.min(endMin, getDownEnd(d))));
  });

  const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);

  for (let i = 0; i < sortedBoundaries.length - 1; i++) {
    const s = sortedBoundaries[i];
    const e = sortedBoundaries[i + 1];
    if (s === e) continue;

    const mid = s + (e - s) / 2;
    
    // Check if mid point is in any downtime (Priority 1)
    const activeDown = dayDown.find(d => {
      const ds = timeToMinutes(d.startTime);
      const de = getDownEnd(d);
      return mid >= ds && mid <= de;
    });

    if (activeDown) {
      segments.push({
        id: activeDown.id,
        type: 'downtime',
        startTime: minutesToTime(s),
        endTime: minutesToTime(e),
        durationMinutes: e - s,
        record: activeDown
      });
      continue;
    }

    // Check if mid point is in any production (Priority 2)
    const activeProd = dayProd.find(p => {
      const ps = timeToMinutes(p.startTime);
      const pe = timeToMinutes(p.endTime);
      return mid >= ps && mid <= pe;
    });

    if (activeProd) {
      segments.push({
        id: activeProd.id,
        type: 'production',
        startTime: minutesToTime(s),
        endTime: minutesToTime(e),
        durationMinutes: e - s,
        record: activeProd
      });
      continue;
    }

    // Otherwise empty
    segments.push({
      id: `empty-${s}-${e}`,
      type: 'empty',
      startTime: minutesToTime(s),
      endTime: minutesToTime(e),
      durationMinutes: e - s
    });
  }

  return segments;
}

export function calculateStats(
  machine: Machine,
  production: ProductionRecord[],
  downtime: DowntimeRecord[],
  currentTime: string,
  dateFilter?: { start: string; end: string }
): MachineStats {
  const machineProduction = production.filter(p => p.machineId === machine.id);
  const machineDowntime = downtime.filter(d => d.machineId === machine.id);

  const filteredProduction = dateFilter
    ? machineProduction.filter(p => p.date >= dateFilter.start && p.date <= dateFilter.end)
    : machineProduction;
  const filteredDowntime = dateFilter
    ? machineDowntime.filter(d => d.date >= dateFilter.start && d.date <= dateFilter.end)
    : machineDowntime;

  let totalOperationalMinutes = 0;
  let totalDowntimeMinutes = 0;
  let totalProduction = 0;
  let totalScrap = 0;

  filteredProduction.forEach(p => {
    const start = timeToMinutes(p.startTime);
    const end = timeToMinutes(p.endTime);
    totalOperationalMinutes += Math.max(0, end - start);
    totalProduction += p.quantity || 0;
    totalScrap += p.scrapQuantity || 0;
  });

  filteredDowntime.forEach(d => {
    const start = timeToMinutes(d.startTime);
    const end = d.endTime ? timeToMinutes(d.endTime) : timeToMinutes(currentTime);
    totalDowntimeMinutes += Math.max(0, end - start);
  });

  const totalAvailableMinutes = totalOperationalMinutes + totalDowntimeMinutes;

  // Availability = Operating Time / Available Time
  const availability = totalAvailableMinutes > 0 ? totalOperationalMinutes / totalAvailableMinutes : 0;

  // Performance = Real Production / Theoretical Production
  const theoreticalProduction = (totalOperationalMinutes / 60) * machine.theoreticalProductionPerHour;
  const performance = theoreticalProduction > 0 ? totalProduction / theoreticalProduction : 0;

  // Quality = Good Pieces / Total Produced
  const totalProducedWithScrap = totalProduction + totalScrap;
  const quality = totalProducedWithScrap > 0 ? totalProduction / totalProducedWithScrap : 1;

  // OEE = Availability * Performance * Quality
  const oee = availability * performance * quality;

  const productionPerHour = totalOperationalMinutes > 0 ? (totalProduction / (totalOperationalMinutes / 60)) : 0;

  return {
    totalOperationalMinutes,
    totalDowntimeMinutes,
    totalAvailableMinutes,
    totalProduction,
    totalScrap,
    availability: Math.min(1, availability),
    performance: Math.min(1, performance),
    quality: Math.min(1, quality),
    oee: Math.min(1, oee),
    productionPerHour,
  };
}
