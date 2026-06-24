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

// Rule-based fallback for breakdown: a generic 3-step decomposition built from the step title.
function mockBreakdown(subtaskTitle: string, lang?: string): Subtask[] {
  const t = (i: number): { title: string; why: string; scope: string; out: string; q: string; ph: string } => {
    const tables: Record<string, ReturnType<typeof t>[]> = {
      ja: [
        { title: `「${subtaskTitle}」の準備をする（道具・場所を整える）`, why: '取りかかる前のハードルを下げるため', scope: '必要なものを1つ手元に用意できればOK', out: '作業の準備が整った状態', q: 'まず何を手に取りますか？', ph: '例: スマホを手に取る' },
        { title: `「${subtaskTitle}」の最初のひとつだけやる`, why: '勢いをつけて動き出すため', scope: '最初の1アクションだけで十分', out: '最初の一歩が完了した状態', q: '最初の30秒でできることは？', ph: '例: 1枚だけ撮る' },
        { title: `「${subtaskTitle}」を区切りのいいところまで進める`, why: '今日のぶんを終えて達成感を得るため', scope: 'キリのいいところで止めてOK', out: 'この手順の主要部分が終わった状態', q: 'どこまでできたら一区切り？', ph: '例: 全体が写るまで' },
      ],
      en: [
        { title: `Prepare for "${subtaskTitle}" (gather tools / set up)`, why: 'Lowers the barrier to starting', scope: 'OK if you just get one thing ready', out: 'Ready to start the work', q: 'What will you pick up first?', ph: 'e.g. grab my phone' },
        { title: `Do just the first piece of "${subtaskTitle}"`, why: 'Builds momentum to get moving', scope: 'Just the first single action is enough', out: 'The first step is done', q: 'What can you do in the first 30 seconds?', ph: 'e.g. take one photo' },
        { title: `Carry "${subtaskTitle}" to a natural stopping point`, why: "To finish today's part and feel the win", scope: 'Stop at any good breakpoint', out: 'The main part of this step is done', q: 'What counts as a good stopping point?', ph: 'e.g. once the whole thing is captured' },
      ],
      zh: [
        { title: `为「${subtaskTitle}」做准备（备好工具/场地）`, why: '降低开始前的心理门槛', scope: '只要备好一样东西就算 OK', out: '已准备好开始', q: '你会先拿起什么？', ph: '例：拿起手机' },
        { title: `只做「${subtaskTitle}」的第一小步`, why: '先动起来，建立惯性', scope: '只做第一个动作就够了', out: '完成了第一步', q: '最开始 30 秒能做什么？', ph: '例：先拍一张' },
        { title: `把「${subtaskTitle}」推进到一个段落`, why: '完成今天的部分，获得成就感', scope: '到一个合适的地方停下就行', out: '这步的主要部分已完成', q: '做到哪算告一段落？', ph: '例：拍到全貌为止' },
      ],
    };
    return (tables[lang ?? 'ja'] ?? tables.ja)[i];
  };
  return [0, 1, 2].map((i) => {
    const s = t(i);
    return {
      id: `breakdown-mock-${i}-${subtaskTitle.length}`,
      title: s.title,
      whyItMatters: s.why,
      goodEnoughScope: s.scope,
      mentalLoad: 'low' as const,
      estimatedTime: lang === 'en' ? '1 min' : lang === 'zh' ? '1 分钟' : '1分',
      concreteOutput: s.out,
      status: 'not_started' as const,
      notes: '',
      interactiveSteps: [{ question: s.q, placeholder: s.ph }],
      interactiveAnswers: [],
    };
  });
}

export async function breakdownSubtask(
  parentTitle: string,
  subtask: Pick<Subtask, 'title' | 'whyItMatters' | 'notes'>,
  lang?: string
): Promise<Subtask[]> {
  try {
    const res = await fetch('/api/breakdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentTitle,
        subtaskTitle: subtask.title,
        whyItMatters: subtask.whyItMatters,
        notes: subtask.notes,
        lang,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Breakdown API failed');
    }
    const data = (await res.json()) as Subtask[];
    if (!Array.isArray(data) || data.length === 0) throw new Error('Empty breakdown result');
    return data;
  } catch (err) {
    // API failed (quota/429/network/etc.) — fall back to a rule-based decomposition.
    console.warn('Breakdown API failed, using rule-based fallback:', err);
    return mockBreakdown(subtask.title, lang);
  }
}
