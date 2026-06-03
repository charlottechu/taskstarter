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
