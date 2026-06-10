import { GoogleGenerativeAI } from '@google/generative-ai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function extractJSON(text: string): string {
  const codeBlock = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
  if (codeBlock) return codeBlock[1];
  const jsonObj = text.match(/(\{[\s\S]*\})/);
  if (jsonObj) return jsonObj[1];
  return text;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { parentTitle, subtaskTitle, whyItMatters, notes } = req.body as {
    parentTitle: string;
    subtaskTitle: string;
    whyItMatters: string;
    notes: string;
  };
  if (!parentTitle || !subtaskTitle) return res.status(400).json({ error: 'parentTitle and subtaskTitle are required' });

  const prompt = `あなたは先延ばし癖・注意力の問題を抱える人を優しく支援するタスクコーチです。

親タスク: 「${parentTitle}」
今やろうとしている手順: 「${subtaskTitle}」
この手順が必要な理由: ${whyItMatters}
ユーザーが書いたメモ: ${notes || '（まだ何も書いていません）'}

このユーザーは今この手順で「カタマって（スタックして）」います。
温かく、批判せずに、以下のJSON形式で3つの選択肢を提案してください。JSON以外のテキストは絶対に含めないでください。

{
  "empathyMessage": "ユーザーの状況に共感する一言（1文、温かく、責めない）",
  "options": [
    {
      "emoji": "🔪",
      "label": "もっと細かく分ける",
      "description": "この手順をさらに小さく分解するための具体的な提案（1〜2文）"
    },
    {
      "emoji": "🔄",
      "label": "別のアプローチを試す",
      "description": "違う切り口や方法を試す具体的な提案（1〜2文）"
    },
    {
      "emoji": "⏭️",
      "label": "いったんスキップして次へ",
      "description": "今は飛ばして次に進むことを許可するメッセージ（1〜2文）"
    }
  ]
}

全ての文字列は日本語。温かく非批判的なトーンで。`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const response = await model.generateContent(prompt);
    const text = response.response.text();
    const result = JSON.parse(extractJSON(text.trim()));
    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Unstuck error:', message);
    return res.status(500).json({ error: message });
  }
}
