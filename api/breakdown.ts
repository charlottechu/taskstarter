import { GoogleGenerativeAI } from '@google/generative-ai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function extractJSON(text: string): string {
  const codeBlock = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
  if (codeBlock) return codeBlock[1];
  const jsonArr = text.match(/(\[[\s\S]*\])/);
  if (jsonArr) return jsonArr[1];
  return text;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { parentTitle, subtaskTitle, whyItMatters, notes, lang } = req.body as {
    parentTitle: string;
    subtaskTitle: string;
    whyItMatters: string;
    notes: string;
    lang?: string;
  };
  if (!parentTitle || !subtaskTitle) return res.status(400).json({ error: 'parentTitle and subtaskTitle are required' });

  const langInstruction = lang === 'en'
    ? '\n\nIMPORTANT: Write ALL values in the JSON array entirely in English. Do not use Japanese.'
    : lang === 'zh'
    ? '\n\n重要：请将JSON数组中的所有内容完全用简体中文书写，不要使用日语。'
    : '';

  const prompt = `あなたは先延ばし癖・注意力の問題を抱える人を支援するタスク分解アシスタントです。
ユーザーは今、ある手順で「つまずいて」動けなくなっています。その手順を、心理的ハードルが限りなくゼロになるまで、さらに細かい手順に分解してください。

親タスク: 「${parentTitle}」
つまずいている手順: 「${subtaskTitle}」
この手順が必要な理由: ${whyItMatters}
ユーザーが書いたメモ: ${notes || '（まだ何も書いていません）'}

この1つの手順だけを、3〜5個の「もっと小さい手順」に分解してください。各手順は「立つ」「1つ手に取る」「アプリを開く」レベルの、今すぐできる極小の物理的・具体的行動にしてください。以下のJSON配列のみで返してください。JSON以外のテキストは絶対に含めないでください。

[
  {
    "title": "極小の手順タイトル（具体的で行動的な表現）",
    "whyItMatters": "なぜこの手順が必要か（1文）",
    "goodEnoughScope": "最低限これができればOKという基準（1文）",
    "mentalLoad": "low",
    "estimatedTime": "1分",
    "concreteOutput": "この手順完了時に手元にある具体的な成果物または状態",
    "interactiveSteps": [
      { "question": "この手順を進める上でユーザーに考えてもらうガイド質問", "placeholder": "回答の例" }
    ]
  }
]

重要なルール:
- 全ての文字列は日本語
- 元の手順「${subtaskTitle}」の範囲だけを分解すること。新しい作業を勝手に追加しない
- 3〜5個の手順。最初の手順は「最初の30秒でできること」にする
- mentalLoadはほぼ全て "low"
- interactiveStepsは各手順に1個
- 温かく、ユーザーを責めないトーン${langInstruction}`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    const response = await model.generateContent(prompt);
    const text = response.response.text();
    const subtasks = JSON.parse(extractJSON(text.trim()));

    const withIds = subtasks.map((s: Record<string, unknown>, i: number) => ({
      ...s,
      id: `breakdown-${Date.now()}-${i}`,
      status: 'not_started',
      notes: '',
      interactiveAnswers: [],
    }));

    return res.status(200).json(withIds);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Breakdown error:', message);
    return res.status(500).json({ error: message });
  }
}
