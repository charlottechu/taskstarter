// ============================================================
// 型定義
// ============================================================

export type SubtaskStatus =
  | "not_started"
  | "active"
  | "blocked"
  | "waiting"
  | "unclear"
  | "too_big"
  | "completed";

export type SupportMode = "quick" | "deep" | "overwhelmed" | "recovery";
export type MentalLoad = "low" | "medium" | "high";

export interface InteractiveStep {
  question: string;
  placeholder: string;
}

export interface Subtask {
  id: string;
  title: string;
  whyItMatters: string;
  goodEnoughScope: string;
  mentalLoad: MentalLoad;
  estimatedTime: string;
  concreteOutput: string;
  status: SubtaskStatus;
  notes: string;
  interactiveSteps: InteractiveStep[];
  interactiveAnswers: string[];
  children?: string[]; // tree visualization 用: 子タスクタイトル
}

export interface ParkingThought {
  id: string;
  text: string;
  timestamp: string;
}

export interface ContextRecovery {
  whereStopped: string;
  whatClarified: string;
  whatConfusing: string;
  recommendedRestart: string;
}

export interface ParentTask {
  id: string;
  title: string;
  diagnosis: string;
  userStateDiagnosis: string;
  supportMode: SupportMode;
  subtasks: Subtask[];
  parkingThoughts: ParkingThought[];
  contextRecovery: ContextRecovery | null;
  isTooBig: boolean;
  reframingMessage: string;
  createdAt: string;
}

export interface DiagnosisResult {
  taskDiagnosis: string;
  userStateDiagnosis: string;
  userStatePattern: string;
  isTooBig: boolean;
  tooBigNarrowingPrompt: string;
  questions: string[];
  recommendedMode: SupportMode;
  reframingMessage: string;
}

export interface ModeInfo {
  id: SupportMode;
  label: string;
  emoji: string;
  description: string;
  subtaskCount: string;
  tone: string;
}

// ============================================================
// モード定義
// ============================================================

export const SUPPORT_MODES: ModeInfo[] = [
  {
    id: "quick",
    label: "すぐ始める",
    emoji: "⚡",
    description: "考えすぎずに最初の一歩を踏み出したい方向け。必要最小限の3つのステップから。",
    subtaskCount: "3つのシンプルなステップ",
    tone: "軽やかで前向き"
  },
  {
    id: "deep",
    label: "しっかり計画する",
    emoji: "🗺️",
    description: "全体構造を見通して安心したい方向け。詳細なタスクツリーを作ります。",
    subtaskCount: "5〜6の詳細ステップ",
    tone: "構造的で見通しのある"
  },
  {
    id: "overwhelmed",
    label: "今日は余裕がない",
    emoji: "🌿",
    description: "頭がいっぱいで何もできない気がする時に。極小の2ステップだけ。",
    subtaskCount: "2つの極小ステップのみ",
    tone: "極限に優しく穏やか"
  },
  {
    id: "recovery",
    label: "久しぶりに再開する",
    emoji: "🔄",
    description: "中断してしまったタスクに戻ってきた方向け。文脈の回復からサポート。",
    subtaskCount: "3〜4の復帰ステップ",
    tone: "戻ってきたことを温かく歓迎"
  }
];


// ============================================================
// ステータスに応じたAIアドバイス
// ============================================================

export function getStatusAdvice(status: SubtaskStatus): string | null {
  switch (status) {
    case "blocked":
      return "このタスクは\"進んでいない\"というより、\"情報不足\"で止まっている可能性があります。必要な情報を1つだけ特定して、それだけ調べてみましょう。";
    case "unclear":
      return "やり方が見えない時は、まず「誰かに聞く」「参考例を1つ探す」だけで視界が開けることがあります。";
    case "too_big":
      return "このステップはまだ大きすぎるかもしれません。さらに小さなパーツに分けてみましょう。「最初の5分で何をするか」だけ決めれば大丈夫です。";
    case "waiting":
      return "他の人や情報を待っている状態ですね。待っている間は、別の小さなステップに手をつけてみるのも良い方法です。";
    default:
      return null;
  }
}

// ============================================================
// コンテキスト復元メッセージ生成
// ============================================================

export function generateContextRecovery(parentTask: ParentTask): ContextRecovery {
  const completedCount = parentTask.subtasks.filter(s => s.status === "completed").length;
  const total = parentTask.subtasks.length;
  const activeOrBlocked = parentTask.subtasks.find(s => s.status === "active" || s.status === "blocked");
  const hasNotes = parentTask.subtasks.some(s => s.notes.length > 0);
  const unclearSub = parentTask.subtasks.find(s => s.status === "unclear" || s.status === "too_big");
  const nextNotStarted = parentTask.subtasks.find(s => s.status === "not_started");

  const whereStopped = activeOrBlocked
    ? `「${activeOrBlocked.title}」に取り組んでいる途中${activeOrBlocked.status === "blocked" ? "（情報不足で一時停止中）" : ""}でした。`
    : completedCount > 0
      ? `${total}個中${completedCount}個のステップを完了した状態です。`
      : "まだ着手前の状態です。最初のステップから始めましょう。";

  const whatClarified = completedCount > 0
    ? `これまでに${completedCount}つのステップを完了し、${hasNotes ? "メモも記録されています" : "タスクの方向性が少しずつ見えてきています"}。`
    : "まだ具体的に明確になったことはありませんが、ここに戻ってきたこと自体が大きな前進です。";

  const whatConfusing = unclearSub
    ? `「${unclearSub.title}」が${unclearSub.status === "unclear" ? "やり方が見えない" : "まだ大きすぎる"}状態で止まっています。`
    : activeOrBlocked && activeOrBlocked.status === "blocked"
      ? `「${activeOrBlocked.title}」が情報不足で止まっていました。`
      : "特に詰まっている箇所はありませんでした。";

  const recommendedRestart = activeOrBlocked
    ? `「${activeOrBlocked.title}」の続きから再開するのがおすすめです。`
    : nextNotStarted
      ? `次のステップ「${nextNotStarted.title}」から始めるのが自然な流れです。`
      : "すべてのステップが完了しています！素晴らしい成果です。";

  return { whereStopped, whatClarified, whatConfusing, recommendedRestart };
}

