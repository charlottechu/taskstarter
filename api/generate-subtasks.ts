import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const client = new Anthropic();

function extractJSON(text: string): string {
  const codeBlock = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
  if (codeBlock) return codeBlock[1];
  const jsonArr = text.match(/(\[[\s\S]*\])/);
  if (jsonArr) return jsonArr[1];
  return text;
}

const MODE_DESCRIPTIONS: Record<string, string> = {
  quick: 'ちょうど3ステップ。今すぐ始められる最低限の手順のみ。',
  deep: '5〜6ステップ。全体をカバーする詳細な手順。',
  overwhelmed: '2ステップのみ。極限まで小さく、今すぐできる物理的行動。心理的ハードルゼロ。',
  recovery: '3〜4ステップ。まず前回の文脈を回復してから再開する流れ。',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { task, answers, mode } = req.body as { task: string; answers: string[]; mode: string };
  if (!task || !mode) return res.status(400).json({ error: 'task and mode are required' });

  const answersText = (answers || []).map((a, i) => `回答${i + 1}: ${a}`).join('\n');

  const prompt = `あなたは先延ばし癖・注意力の問題を抱える人を支援するタスク分解アシスタントです。

タスク: 「${task}」
ユーザーの回答:
${answersText || '（なし）'}
選択モード: ${mode}（${MODE_DESCRIPTIONS[mode] || ''}）

このタスクをモードに合わせて分解し、以下のJSON配列のみで返してください。JSON以外のテキストは絶対に含めないでください。

[
  {
    "title": "手順のタイトル（具体的で行動的な表現）",
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
- 手順の内容は「${task}」に完全に特化すること。汎用的・抽象的な内容は禁止
- overwhelmedモード: 2手順のみ。「立つ」「1つ取り出す」レベルの極小物理行動
- quickモード: ちょうど3手順
- deepモード: 5〜6手順
- recoveryモード: 3〜4手順、最初の手順は必ず現状確認から
- mentalLoadは "low" | "medium" | "high" のいずれか
- interactiveStepsは各手順に1〜2個
- 温かく、ユーザーを責めないトーン`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
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
