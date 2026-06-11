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

const MODE_DESCRIPTIONS: Record<string, string> = {
  quick: 'ちょうど3ステップ。今すぐ始められる最低限の手順のみ。',
  deep: '5〜8ステップ。全体のエリア・カテゴリを網羅する詳細な手順。',
  overwhelmed: '2ステップのみ。極限まで小さく、今すぐできる物理的行動。心理的ハードルゼロ。',
  recovery: '3〜4ステップ。まず前回の文脈を回復してから再開する流れ。',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { task, answers, mode, lang } = req.body as { task: string; answers: string[]; mode: string; lang?: string };
  if (!task || !mode) return res.status(400).json({ error: 'task and mode are required' });

  const langInstruction = lang === 'en'
    ? '\n\nIMPORTANT: Write ALL values in the JSON array entirely in English. Do not use Japanese.'
    : lang === 'zh'
    ? '\n\n重要：请将JSON数组中的所有内容完全用简体中文书写，不要使用日语。'
    : '';

  const answersText = (answers || []).map((a, i) => `回答${i + 1}: ${a}`).join('\n');

  const prompt = `あなたは先延ばし癖・注意力の問題を抱える人を支援するタスク分解アシスタントです。

【重要な前提】
ユーザーが「${task}」のような大きなタスクを入力し、質問への回答で特定の部分（例：浴室の清掃）を挙げた場合、以下の方針で手順を作成してください：
1. まず全体のタスクを複数のエリア／カテゴリに分解する（例：①浴室の清掃 ②机の整理 ③床の掃除）
2. ユーザーが「一番辛い」「最初にやりたい」と答えた部分を最初に・最も詳細に分解する
3. 残りのエリアも省略せず、簡潔な手順として必ず含める
4. 各手順のtitleの先頭に【エリア名】を付ける（例：【浴室】シンクを中性洗剤で磨く）

【ユーザーの入力】
元のタスク: 「${task}」
質問への回答:
${answersText || '（なし）'}

⚠️ 上記の回答に具体的な内容が含まれている場合、その内容を必ず尊重すること。回答に書かれていないエリアや作業を勝手に追加・置換してはいけない。

選択モード: ${mode}（${MODE_DESCRIPTIONS[mode] || ''}）

このタスクをモードに合わせて分解し、以下のJSON配列のみで返してください。JSON以外のテキストは絶対に含めないでください。

[
  {
    "title": "【エリア名】手順のタイトル（具体的で行動的な表現）",
    "whyItMatters": "なぜこの手順が必要か（1文）",
    "goodEnoughScope": "最低限これができればOKという基準（1文）",
    "mentalLoad": "low",
    "estimatedTime": "5分",
    "concreteOutput": "この手順完了時に手元にある具体的な成果物",
    "interactiveSteps": [
      {
        "question": "この手順を進める上でユーザーに考えてもらうガイド質問",
        "placeholder": "回答の例"
      }
    ]
  }
]

重要なルール:
- 全ての文字列は日本語
- 手順の内容はユーザーの回答に書かれた具体的な内容に完全に特化すること。汎用的・抽象的な内容は禁止
- タスク全体のスコープを網羅し、どのエリアも省略しないこと
- overwhelmedモード: 2手順のみ。「立つ」「1つ取り出す」レベルの極小物理行動
- quickモード: ちょうど3手順
- deepモード: 5〜8手順（エリアが多い場合は上限まで使ってよい）
- recoveryモード: 3〜4手順、最初の手順は必ず現状確認から
- mentalLoadは "low" | "medium" | "high" のいずれか
- interactiveStepsは各手順に1〜2個
- 温かく、ユーザーを責めないトーン${langInstruction}`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const response = await model.generateContent(prompt);
    const text = response.response.text();
    const subtasks = JSON.parse(extractJSON(text.trim()));

    const withIds = subtasks.map((s: Record<string, unknown>, i: number) => ({
      ...s,
      id: `api-${Date.now()}-${i}`,
      status: 'not_started',
      notes: '',
      interactiveAnswers: [],
    }));

    return res.status(200).json(withIds);
  } catch (error) {
    console.error('Generate subtasks error:', error);
    return res.status(500).json({ error: 'Failed to generate subtasks' });
  }
}
