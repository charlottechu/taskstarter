import type { DiagnosisResult, Subtask, SupportMode, ParentTask, ContextRecovery } from './mockGenerator';
import { generateContextRecovery as localGenerateContextRecovery } from './mockGenerator';

async function apiFetch(path: string, body: unknown) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`[${res.status}] ${path}: ${text}`);
  }
  return res.json();
}

export async function getDiagnosis(task: string): Promise<DiagnosisResult> {
  return apiFetch('/api/diagnose', { task });
}

export async function generateSubtasks(
  task: string,
  answers: string[],
  mode: SupportMode
): Promise<Subtask[]> {
  return apiFetch('/api/generate-subtasks', { task, answers, mode });
}

export function generateContextRecovery(parentTask: ParentTask): ContextRecovery {
  return localGenerateContextRecovery(parentTask);
}
