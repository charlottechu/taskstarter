// ============================================================
// Deadline (DDL) urgency — turns a plain date into a meaningful,
// emotionally-tuned signal. Used by the dashboard, task detail,
// and to adjust the encouragement tone by how close the DDL is.
// ============================================================

export type Urgency = 'none' | 'relaxed' | 'soon' | 'near' | 'today' | 'overdue';

// Colored dots per the v6 spec: 🟢 far away, 🟡 a week, 🟠 a few days, 🔴 today/overdue.
const URGENCY_DOT: Record<Urgency, string> = {
  none: '⚪',
  relaxed: '🟢',
  soon: '🟡',
  near: '🟠',
  today: '🔴',
  overdue: '🔴',
};

// Whole days from local-today to the deadline. Negative = past.
// Deadlines are stored as "YYYY-MM-DD"; parse as LOCAL time to avoid TZ drift.
export function daysUntil(deadlineISO: string): number {
  const [y, m, d] = deadlineISO.split('-').map(Number);
  if (!y || !m || !d) return 0;
  const target = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86400000);
}

export function urgencyOf(daysLeft: number | null): Urgency {
  if (daysLeft === null) return 'none';
  if (daysLeft < 0) return 'overdue';
  if (daysLeft === 0) return 'today';
  if (daysLeft <= 3) return 'near';
  if (daysLeft <= 7) return 'soon';
  return 'relaxed';
}

export interface DeadlineInfo {
  daysLeft: number | null;
  urgency: Urgency;
  dot: string;
}

export function deadlineInfo(deadlineISO: string | null | undefined): DeadlineInfo {
  if (!deadlineISO) return { daysLeft: null, urgency: 'none', dot: URGENCY_DOT.none };
  const daysLeft = daysUntil(deadlineISO);
  const urgency = urgencyOf(daysLeft);
  return { daysLeft, urgency, dot: URGENCY_DOT[urgency] };
}

// Sort key for "Today's Focus" — nearest deadline first, undated tasks last.
// Lower is more urgent. Undated tasks get Infinity so they rank after any dated task.
export function urgencyRank(deadlineISO: string | null | undefined): number {
  if (!deadlineISO) return Number.POSITIVE_INFINITY;
  return daysUntil(deadlineISO);
}
