import type { DiagnosisResult, Subtask, SupportMode, ParentTask, ContextRecovery } from './mockGenerator';
import {
  getDiagnosis as mockGetDiagnosis,
  generateSubtasks as mockGenerateSubtasks,
  generateContextRecovery as mockGenerateContextRecovery,
} from './mockGenerator';

export async function getDiagnosis(task: string): Promise<DiagnosisResult> {
  return mockGetDiagnosis(task);
}

export async function generateSubtasks(
  task: string,
  answers: string[],
  mode: SupportMode
): Promise<Subtask[]> {
  return mockGenerateSubtasks(task, answers, mode);
}

export function generateContextRecovery(parentTask: ParentTask): ContextRecovery {
  return mockGenerateContextRecovery(parentTask);
}

export interface UnstuckResult {
  empathyMessage: string;
  options: Array<{
    emoji: string;
    label: string;
    description: string;
  }>;
}

export async function getUnstuckHelp(
  parentTitle: string,
  subtaskTitle: string,
  whyItMatters: string,
  notes: string
): Promise<UnstuckResult> {
  const res = await fetch('/api/unstuck', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parentTitle, subtaskTitle, whyItMatters, notes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Unstuck API failed');
  }
  return res.json();
}
