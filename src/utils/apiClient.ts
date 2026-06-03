import type { DiagnosisResult, Subtask, SupportMode, ParentTask, ContextRecovery } from './mockGenerator';
import { generateContextRecovery as localGenerateContextRecovery } from './mockGenerator';

export async function getDiagnosis(task: string): Promise<DiagnosisResult> {
  const res = await fetch('/api/diagnose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task }),
  });
  if (!res.ok) throw new Error('診断に失敗しました');
  return res.json();
}

export async function generateSubtasks(
  task: string,
  answers: string[],
  mode: SupportMode
): Promise<Subtask[]> {
  const res = await fetch('/api/generate-subtasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, answers, mode }),
  });
  if (!res.ok) throw new Error('手順の生成に失敗しました');
  return res.json();
}

export function generateContextRecovery(parentTask: ParentTask): ContextRecovery {
  return localGenerateContextRecovery(parentTask);
}
