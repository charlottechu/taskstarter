import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const client = new Anthropic();

function extractJSON(text: string): string {
  const codeBlock = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
  if (codeBlock) return codeBlock[1];
  const jsonObj = text.match(/(\{[\s\S]*\})/);
  if (jsonObj) return jsonObj[1];
  return text;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { task } = req.body as { task: string };
  if (!task) return res.status(400).json({ error: 'task is required' });

  const prompt = `あなたは先延ばし癖・注意力の問題を抱える人を支援するタスク分解アシスタントです。

対象タスク: 「${task}」

このタスクを分析し、以下のJSON形式のみで回答してください。JSON以外のテキストは絶対に含めないでください。

{
  "taskDiagnosis": "このタスクが難しく感じる理由（1〜2文）",
  "userStateDiagnosis": "ユーザーの今の精神状態の診断（1〜2文）",
  "userStatePattern": "状態パターンのラベル（例：完璧主義、構造が見えない）",
  "isTooBig": false,
  "tooBigNarrowingPrompt": "isTooBigがtrueの場合のみスコープを絞る問いかけ、falseなら空文字",
  "questions": ["タスクをより具体的に計画するための質問を3〜4つ"],
  "recommendedMode": "quick",
  "reframingMessage": "ユーザーを励ますリフレーミングメッセージ（1文）"
}

recommendedModeの選び方:
- "overwhelmed": 掃除・片付け・整理など物理的なタスク、またはユーザーが疲弊している場合
- "deep": レポート・研究・就活など複雑なプロジェクト系
- "quick": 比較的シンプルなタスク
- "recovery": 「再開」「久しぶり」「続き」などの文脈がある場合

questionsはタスクの内容に完全に特化した具体的な質問にしてください。全ての文字列は日本語で。温かく非批判的なトーンで。`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const result = JSON.parse(extractJSON(text.trim()));
    return res.status(200).json(result);
  } catch (error) {
    console.error('Diagnose error:', error);
    return res.status(500).json({ error: 'Failed to diagnose task' });
  }
}
