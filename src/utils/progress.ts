export type EarnEventType =
  | 'plan_created'      // +1 🐣: saving a new plan
  | 'session_start'     // +1 🐣: entering work_mode
  | 'subtask_complete'  // +3 🐣: completing a subtask
  | 'task_complete'     // +10 🐣 + ⭐: all subtasks done
  | 'return'            // +2 🐣: returning to a task with prior progress
  | 'reflection';       // +1 🐣: 5-min timer completes

export const EARN_AMOUNTS: Record<EarnEventType, number> = {
  plan_created: 1,
  session_start: 1,
  subtask_complete: 3,
  task_complete: 10,
  return: 2,
  reflection: 1,
};

export interface ActivityEntry {
  date: string;      // "YYYY-MM-DD"
  type: EarnEventType;
  taskId?: string;   // for return-event deduplication
}

export interface ProgressData {
  firstStepTokens: number;  // 🐣 cumulative total
  recoverySeeds: number;    // 🌱 cumulative total
  milestoneStars: number;   // ⭐ cumulative total
  lastActiveDate: string | null;
  activityLog: ActivityEntry[];
}

const STORAGE_KEY = 'firststep_progress';
const MAX_LOG = 200;

const DEFAULT: ProgressData = {
  firstStepTokens: 0,
  recoverySeeds: 0,
  milestoneStars: 0,
  lastActiveDate: null,
  activityLog: [],
};

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function daysBetween(a: string, b: string): number {
  return Math.abs(
    Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
  );
}

export function loadProgress(): ProgressData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT };
}

export function saveProgress(data: ProgressData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function appendActivity(data: ProgressData, entry: ActivityEntry): ProgressData {
  return {
    ...data,
    activityLog: [...data.activityLog, entry].slice(-MAX_LOG),
    lastActiveDate: entry.date,
  };
}

export function canGrantReturn(data: ProgressData, taskId: string): boolean {
  const today = todayISO();
  return !data.activityLog.some(
    e => e.type === 'return' && e.taskId === taskId && e.date === today
  );
}

export interface PenguinStage {
  emoji: string;
  nameKey: string;
  minTokens: number;
  nextTokens: number | null;
}

export const PENGUIN_STAGES: readonly PenguinStage[] = [
  { emoji: '🥚', nameKey: 'egg',       minTokens: 0,  nextTokens: 5  },
  { emoji: '🐤', nameKey: 'chick',     minTokens: 5,  nextTokens: 15 },
  { emoji: '🐧', nameKey: 'explorer',  minTokens: 15, nextTokens: 30 },
  { emoji: '🏔️', nameKey: 'adventure', minTokens: 30, nextTokens: 60 },
  { emoji: '✨', nameKey: 'wise',       minTokens: 60, nextTokens: null },
];

export function getPenguinStage(tokens: number): PenguinStage {
  for (let i = PENGUIN_STAGES.length - 1; i >= 0; i--) {
    if (tokens >= PENGUIN_STAGES[i].minTokens) return PENGUIN_STAGES[i];
  }
  return PENGUIN_STAGES[0];
}

export const ACTIVITY_ICONS: Record<EarnEventType, string> = {
  plan_created: '🐣',
  session_start: '🐣',
  subtask_complete: '🐤',
  task_complete: '⭐',
  return: '🌱',
  reflection: '💬',
};

export function getCalendarDays(log: ActivityEntry[], days = 28): Array<{
  date: string;
  dayNum: number;
  types: Set<EarnEventType>;
}> {
  const result = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayEntries = log.filter(e => e.date === dateStr);
    const types = new Set(dayEntries.map(e => e.type)) as Set<EarnEventType>;
    result.push({ date: dateStr, dayNum: d.getDate(), types });
  }
  return result;
}

export interface WeeklyStats {
  sessions: number;
  returns: number;
  completedTasks: number;
}

export function getWeeklyStats(log: ActivityEntry[]): WeeklyStats {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  const weekAgo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const recent = log.filter(e => e.date >= weekAgo);
  return {
    sessions: recent.filter(e => e.type === 'session_start' || e.type === 'plan_created').length,
    returns: recent.filter(e => e.type === 'return').length,
    completedTasks: log.filter(e => e.type === 'task_complete').length,
  };
}
