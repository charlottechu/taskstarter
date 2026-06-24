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

// Rule-based fallback used when the unstuck API is unavailable (e.g. Gemini quota / 429).
// The app keeps working with these canned, localized suggestions instead of breaking.
const MOCK_UNSTUCK: Record<string, UnstuckResult> = {
  ja: {
    empathyMessage: '一度立ち止まっても大丈夫。あなたのペースで進めましょう。',
    options: [
      { emoji: '🔪', label: 'もっと細かく分ける', description: 'この手順を「最初の30秒でできること」まで小さく分けてみましょう。たとえば道具を1つ手に取るだけでもOKです。' },
      { emoji: '🔄', label: '別のアプローチを試す', description: '完璧を目指さず、ざっくり下書きや仮の形で進めてみましょう。後から直せます。' },
      { emoji: '⏭️', label: 'いったんスキップして次へ', description: 'ここは今飛ばして大丈夫。先に進める手順から手をつけて、あとで戻ってきましょう。' },
    ],
  },
  en: {
    empathyMessage: "It's okay to pause. Let's move forward at your own pace.",
    options: [
      { emoji: '🔪', label: 'Break it down smaller', description: 'Shrink this step to "what you can do in the first 30 seconds" — even just picking up one tool counts.' },
      { emoji: '🔄', label: 'Try another approach', description: 'Drop the pressure to be perfect — make a rough draft or placeholder. You can fix it later.' },
      { emoji: '⏭️', label: 'Skip it for now', description: "It's fine to skip this for now. Start with a step you can move on, then come back to it." },
    ],
  },
  zh: {
    empathyMessage: '停下来歇一会儿没关系，按你自己的节奏来就好。',
    options: [
      { emoji: '🔪', label: '拆得更小一点', description: '把这一步缩小到「最开始 30 秒能做的事」，哪怕只是拿起一件工具也算数。' },
      { emoji: '🔄', label: '换个方法试试', description: '别追求完美，先做个草稿或临时版本，之后还能改。' },
      { emoji: '⏭️', label: '先跳过，做下一个', description: '现在跳过这步没关系，先从能推进的步骤入手，回头再来。' },
    ],
  },
};

function mockUnstuck(lang?: string): UnstuckResult {
  return MOCK_UNSTUCK[lang ?? 'ja'] ?? MOCK_UNSTUCK.ja;
}

export async function getUnstuckHelp(
  parentTitle: string,
  subtaskTitle: string,
  whyItMatters: string,
  notes: string,
  lang?: string
): Promise<UnstuckResult> {
  try {
    const res = await fetch('/api/unstuck', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentTitle, subtaskTitle, whyItMatters, notes, lang }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Unstuck API failed');
    }
    return await res.json();
  } catch (err) {
    // API failed (quota/429/network/etc.) — fall back to rule-based suggestions so the app keeps working.
    console.warn('Unstuck API failed, using rule-based fallback:', err);
    return mockUnstuck(lang);
  }
}
