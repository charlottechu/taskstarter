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

  const langName = lang === 'en' ? 'English' : lang === 'zh' ? 'Simplified Chinese' : 'Japanese';
  const langInstruction = lang === 'en'
    ? '\n\nIMPORTANT: Write ALL string values in the JSON entirely in English. Do not use Japanese or Chinese.'
    : lang === 'zh'
    ? '\n\n重要：请将 JSON 中所有字符串值完全用简体中文书写，绝对不要使用日语或英语。'
    : '\n\n重要：JSON内のすべての文字列値を必ず日本語で記述してください。英語や中国語は使用しないでください。';

  const prompt = `You are a task-breakdown assistant supporting people who struggle with procrastination and attention difficulties. Write every string value in the output in ${langName}.

Target task: "${task}"

Analyze this task and respond ONLY with JSON in the following format. Never include any text outside the JSON. (The field descriptions below are in English, but the VALUES you produce must be written in ${langName}.)

{
  "taskDiagnosis": "why this task feels hard (1-2 sentences)",
  "userStateDiagnosis": "diagnosis of the user's current mental state (1-2 sentences)",
  "userStatePattern": "a short label for the state pattern (e.g. perfectionism, no visible structure)",
  "isTooBig": false,
  "tooBigNarrowingPrompt": "only when isTooBig is true, a question that narrows the scope; otherwise an empty string",
  "questions": ["3-4 questions that help plan the task more concretely"],
  "recommendedMode": "quick",
  "reframingMessage": "an encouraging reframing message for the user (1 sentence)"
}

How to choose recommendedMode:
- "overwhelmed": physical tasks such as cleaning, tidying, or organizing, or when the user seems exhausted
- "deep": complex projects such as reports, research, or job hunting
- "quick": relatively simple tasks
- "recovery": when there is context of resuming, "it's been a while", or continuing something

Rules for questions:
- The FIRST question MUST confirm the concrete content of the task the user entered, clarifying vague wording at high resolution. For example, for a task like "clean my room", ask whether it means cleaning/disinfecting/wet areas, or sorting and decluttering possessions.
- The remaining questions must draw out the concrete information needed for planning: scope, deadline, obstacles, environment, and so on.
- Every question must be fully specific to "${task}". Generic questions are forbidden.

Use a warm, non-judgmental tone.${langInstruction}`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
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
