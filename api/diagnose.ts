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

  const { task, lang } = req.body as { task: string; lang?: string };
  if (!task) return res.status(400).json({ error: 'task is required' });

  const langInstruction = lang === 'en'
    ? '\n\nIMPORTANT: Write ALL values in the JSON entirely in English. Do not use Japanese.'
    : lang === 'zh'
    ? '\n\n重要：请将JSON中的所有内容完全用简体中文书写，不要使用日语或英语。'
    : '';

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

questionsのルール:
- 必ず最初の質問は「ユーザーが入力したタスクの具体的な中身を確認する」質問にすること。例：「『部屋の掃除』とのことですが、掃除・除菌・水回りの清掃ですか？それとも物の整理・断捨離ですか？」のように、曖昧な言葉を解像度高く確認する
- 残りの質問はタスクの範囲・期限・障壁・環境など、計画に必要な具体情報を引き出すものにする
- 全て「${task}」に完全に特化した具体的な質問にすること。汎用的な質問は禁止
温かく非批判的なトーンで。${langInstruction}`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const response = await model.generateContent(prompt);
    const text = response.response.text();
    const result = JSON.parse(extractJSON(text.trim()));
    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Diagnose error:', message);
    return res.status(500).json({ error: message });
  }
}
