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
// ユーザー状態パターン（10種）
// ============================================================

interface UserStatePattern {
  id: string;
  label: string;
  diagnosis: string;
}

const USER_STATE_PATTERNS: UserStatePattern[] = [
  { id: "unclear_structure", label: "構造が見えない", diagnosis: "今の状態は、\"やる気不足\"というより、『どこから始めればいいか分からない』ことによる停止に近そうです。全体の構造が見えてくれば、自然と手が動き始めるはずです。" },
  { id: "perfectionism", label: "完璧主義", diagnosis: "\"ちゃんとやらなきゃ\"という感覚が強く、最初の一歩が重くなっている可能性があります。まずは『雑で不完全な版』を作ることを自分に許してあげましょう。" },
  { id: "too_many_unknowns", label: "未知が多い", diagnosis: "やること自体は分かっているけれど、『どうやるか』の部分に未知が多く、脳が不安で固まっている状態かもしれません。" },
  { id: "fear_of_evaluation", label: "評価への不安", diagnosis: "「これで合っているのか」「怒られないか」という評価への不安が、着手のブレーキになっている可能性があります。まずは自分だけのメモとして始めれば、誰にも見せなくて大丈夫です。" },
  { id: "emotional_resistance", label: "感情的な抵抗", diagnosis: "このタスクに対して、漠然とした嫌悪感や不安を感じている状態です。それは自然な反応であり、あなたの怠慢ではありません。" },
  { id: "low_energy", label: "エネルギー不足", diagnosis: "今日は脳のバッテリーが低い状態のようです。大きなことをやろうとせず、極小の一歩だけで十分です。自分を責めないでくださいね。" },
  { id: "attention_drift", label: "注意の分散", diagnosis: "やることが多すぎるというより、\"何を優先すべきか\"が曖昧になっている状態かもしれません。1つだけに焦点を絞ることで、脳の回転が戻ります。" },
  { id: "decision_fatigue", label: "決断疲れ", diagnosis: "「何をすればいいか選ぶこと」自体に疲れてしまっている状態です。今は自分で決めなくて大丈夫。こちらが最初の一歩を提案しますね。" },
  { id: "task_too_large", label: "タスクが巨大", diagnosis: "タスク全体が大きすぎて、脳が処理しきれずにフリーズしています。今日は全体の1%だけ進めれば完璧です。" },
  { id: "unclear_success", label: "完了条件が不明", diagnosis: "『何をもって終わりとするか』が曖昧なため、終わりのないトンネルに入っている感覚になっています。まずは今日の『10点ライン（これで最低限OK）』を仮決めしましょう。" }
];

// ============================================================
// リフレーミングメッセージ
// ============================================================

const REFRAMING_MESSAGES: string[] = [
  "そのタスク、本当に今日全部終わらせる必要がありますか？今日は「方向性を決めるだけ」でも十分です。",
  "まず\"雑な版\"を作ることを目標にしても大丈夫です。完璧は後から磨けます。",
  "今必要なのは\"完成\"ではなく、\"着手したという事実\"かもしれません。",
  "「1文字でも書いたら今日の自分は100点」というルールにしてみませんか？",
  "このタスク、あなたが思っているより小さく分けられます。一緒に分解してみましょう。",
  "途中で止まっても全く問題ありません。止まった場所を記録しておけば、次はそこから再開できます。"
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
// 1. タスク診断 ＆ ユーザー状態診断
// ============================================================

export function getDiagnosis(task: string): DiagnosisResult {
  const t = task.toLowerCase();

  // --- タスク肥大化検知 ---
  const vague = ["就活を進めたい", "研究を頑張りたい", "人生を整理したい", "将来を考えたい", "全部やりたい"];
  const isTooBig = vague.some(v => t.includes(v.toLowerCase())) ||
    (t.length < 12 && !t.includes("を") && !t.includes("する") && !t.includes("たい"));

  const tooBigNarrowingPrompt = isTooBig
    ? "このタスクはまだ広すぎるかもしれません。\nまず「どの期間の話か」「何をもって完了とするか」「今一番困っていること」を決めましょう。"
    : "";

  // --- ユーザー状態診断 ---
  let patternIdx = 0;
  if (t.includes("ちゃんと") || t.includes("完璧") || t.includes("しっかり")) patternIdx = 1;
  else if (t.includes("分からない") || t.includes("わからない") || t.includes("方法")) patternIdx = 2;
  else if (t.includes("発表") || t.includes("提出") || t.includes("評価")) patternIdx = 3;
  else if (t.includes("嫌") || t.includes("やりたくない") || t.includes("面倒")) patternIdx = 4;
  else if (t.includes("疲れ") || t.includes("しんどい") || t.includes("無理")) patternIdx = 5;
  else if (t.includes("いろいろ") || t.includes("たくさん") || t.includes("色々")) patternIdx = 6;
  else if (t.includes("どれ") || t.includes("選べない") || t.includes("迷う")) patternIdx = 7;
  else if (isTooBig || t.length > 40) patternIdx = 8;
  else if (t.includes("終わり") || t.includes("いつまで") || t.includes("ゴール")) patternIdx = 9;
  else patternIdx = Math.floor(Math.random() * 3); // 0,1,2 のどれか

  const userPattern = USER_STATE_PATTERNS[patternIdx];

  // --- タスク自体の診断 ---
  let taskDiagnosis: string;
  let questions: string[];
  let recommendedMode: SupportMode = "quick";

  if (t.includes("ゼミ") || t.includes("発表") || t.includes("スライド") || t.includes("プレゼン") || t.includes("準備")) {
    taskDiagnosis = "これは\"発表内容の構造化\"と\"資料収集\"が必要なタスクです。構造（何をどの順番で話すか）が見えれば、自然とスライドも手が動き始めます。";
    questions = ["発表テーマはもう決まっていますか？", "発表時間は何分ですか？", "先生から指定された条件や評価ポイントはありますか？", "一番不安に感じている部分はどこですか？"];
  } else if (t.includes("就活") || t.includes("自己pr") || t.includes("面接") || t.includes("履歴書") || t.includes("es")) {
    taskDiagnosis = "これは\"具体的な経験の掘り起こし\"と\"相手（企業）が求める像との接続\"が必要なタスクです。完璧に書こうとすると手が止まるので、まず素材を集めることから。";
    questions = ["アピールしたい具体的なエピソードは決まっていますか？", "志望業界や求める人物像は分かっていますか？", "文字数の指定はありますか？", "一番書きにくいと感じるのはどの部分ですか？"];
  } else if (t.includes("研究") || t.includes("論文") || t.includes("卒論") || t.includes("計画")) {
    taskDiagnosis = "これは\"リサーチクエスチョンの明確化\"と\"実行可能なスケジュール設計\"が必要なタスクです。問いが鋭くなれば、手法やスケジュールも自然に定まります。";
    questions = ["解決したい研究上の「問い」は決まっていますか？", "研究アプローチ（調査法、分析法）は決まっていますか？", "提出期限はいつですか？", "今一番迷っている点は何ですか？"];
  } else if (t.includes("掃除") || t.includes("片付け") || t.includes("部屋") || t.includes("整理")) {
    taskDiagnosis = "これは\"視界に入る情報量が多すぎて、脳が何から処理すべきか迷子になっている\"状態です。エリアを極小に絞ることが鍵です。";
    questions = ["一番ストレスを感じているエリアはどこですか？", "仕分け道具（ゴミ袋、段ボール等）は手元にありますか？", "今日使える時間は何分くらいですか？"];
    recommendedMode = "overwhelmed";
  } else if (t.includes("レポート") || t.includes("課題") || t.includes("書く")) {
    taskDiagnosis = "これは\"文章のハードル\"が高くなっている状態です。構成の枠組みを先に仮決めし、最初の1文だけ置くことで脳のエンジンが動き出します。";
    questions = ["レポートのテーマは明確ですか？", "必要文字数はどのくらいですか？", "基礎資料は手元に揃っていますか？", "一番書きにくい部分はどこですか？"];
  } else {
    taskDiagnosis = "これは\"全体像が大きすぎて、認知資源が浪費されている\"状態です。まずは複雑性を下げて小さな部品へ切り出しましょう。";
    questions = ["このタスクで一番心理的ハードルが高い箇所はどこですか？", "今日の「10点（これで最低限OK）」の目標はどんな状態ですか？", "今すぐ使える道具は何ですか？"];
  }

  if (patternIdx >= 4 && patternIdx <= 6) recommendedMode = "overwhelmed";
  if (patternIdx === 1 || patternIdx === 2) recommendedMode = "deep";

  const reframingMessage = REFRAMING_MESSAGES[Math.floor(Math.random() * REFRAMING_MESSAGES.length)];

  return {
    taskDiagnosis,
    userStateDiagnosis: userPattern.diagnosis,
    userStatePattern: userPattern.label,
    isTooBig,
    tooBigNarrowingPrompt,
    questions,
    recommendedMode,
    reframingMessage
  };
}

// ============================================================
// 2. モード別サブタスク生成
// ============================================================

export function generateSubtasks(task: string, answers: string[], mode: SupportMode): Subtask[] {
  const t = task.toLowerCase();
  const prefix = Date.now().toString() + "-";

  const isPresentation = t.includes("ゼミ") || t.includes("発表") || t.includes("スライド") || t.includes("プレゼン");
  const isCareer = t.includes("就活") || t.includes("自己pr") || t.includes("面接") || t.includes("es");
  const isResearch = t.includes("研究") || t.includes("論文") || t.includes("卒論") || t.includes("計画");

  // --- Overwhelmed Mode: 極小の2ステップだけ ---
  if (mode === "overwhelmed") {
    if (isPresentation) {
      return [
        makeSub(prefix+"1", "伝えたいことを「雑な1文」で書き殴る", "方向性の種を1つ置くだけで脳が動き始めます", "きれいな文章でなくて良い。メモの端に走り書きレベルで100点", "low", "3分", "伝えたいことの走り書き1文",
          [{ question: "今回の発表で「これだけは言いたい」ことを、雑で良いので1文で書いてください。", placeholder: "例：この手法で作業時間が半減することを伝えたい" }]),
        makeSub(prefix+"2", "発表に使えそうな資料を「1つだけ」ブックマークする", "完璧なリサーチは不要。1つの取っ掛かりがあれば十分", "1つ見つけてブックマークするだけで完了", "low", "5分", "ブックマーク1件",
          [{ question: "テーマに関連しそうな資料やWebページを1つ見つけて、URLかタイトルをメモしてください。", placeholder: "例：〇〇に関する総説論文（Google Scholarで発見）" }])
      ];
    }
    return [
      makeSub(prefix+"1", "このタスクの「10点ライン（最低限これでOK）」を1行で書く", "終わりが見えないから動けない。極小のゴールを仮決めするだけで気持ちが軽くなります", "紙の端やメモアプリに1行書くだけで完了", "low", "2分", "10点ラインの1行メモ",
        [{ question: "今日「ここまでやれば自分を褒めていい」という極小の目標を、1行で書いてみてください。", placeholder: "例：ファイルを新規作成してタイトルだけ入力する" }]),
      makeSub(prefix+"2", "必要な道具を「1つだけ」目の前に出す", "環境の準備は脳の暖気運転です。1つだけで十分", "ノートでもPCでも、1つの道具が目の前にあれば100点", "low", "1分", "道具1つが机の上にある状態",
        [{ question: "タスクに必要な道具を1つだけ手元に用意して、何を出したか教えてください。", placeholder: "例：お気に入りのノートとペン" }])
    ];
  }

  // --- Quick Mode: 3ステップ ---
  if (mode === "quick") {
    if (isPresentation) {
      return [
        makeSub(prefix+"1", "発表の中心メッセージを1文で仮決定する", "方向性が決まれば後の作業が全て軽くなります", "きれいな文でなくてOK。「〇〇について話す」レベルで100点", "low", "5分", "中心メッセージの仮1文",
          [{ question: "この発表で一番伝えたいことを、雑で良いので1文で書いてください。", placeholder: "例：新しい分析手法の有効性を示したい" },
           { question: "聞き手が理解するために最低限必要な背景を、3つだけ箇条書きにしてください。", placeholder: "例：1.現状の課題 2.提案手法 3.期待効果" }]),
        makeSub(prefix+"2", "発表構成を「背景 ➔ 主張 ➔ まとめ」の3部に分ける", "骨組みがあれば中身は後から埋められます", "3行の見出しが並んでいれば完了", "medium", "10分", "3部構成の見出しリスト",
          [{ question: "背景・主張・まとめの3つに、それぞれ何を話すか1行ずつ書いてみましょう。", placeholder: "例：背景→現在の手作業の非効率さ、主張→自動化ツールの成果、まとめ→今後の展望" }]),
        makeSub(prefix+"3", "参考資料を「3つだけ」選んでメモする", "無限の調査は沼です。3つに絞る勇気を", "3つの資料名やURLがメモにあれば完了", "medium", "10分", "参考資料3件のメモ",
          [{ question: "テーマに関連する資料を3つだけ選んで、タイトルをメモしてください。", placeholder: "例：1.〇〇の論文 2.教科書の第X章 3.△△のWebページ" }])
      ];
    }
    if (isCareer) {
      return [
        makeSub(prefix+"1", "アピールしたいエピソードの「事実だけ」を3行で書く", "感情や評価を加えず、まず事実の素材を集めます", "箇条書きで状況・行動・結果の3行あれば完了", "low", "5分", "エピソードの3行メモ",
          [{ question: "アピールしたいエピソードの「いつ・何をしたか・どうなったか」を3行で書いてください。", placeholder: "例：1.大学2年のゼミで 2.チームの進捗管理を担当 3.発表が学科内で評価された" }]),
        makeSub(prefix+"2", "企業が求める人物像のキーワードを1つ選ぶ", "切り口を1つに絞ると文章が一気に書きやすくなります", "「主体性」「協調性」など1語をメモすれば完了", "low", "5分", "キーワード1語",
          [{ question: "志望先が求める人物像で最も自分に近いキーワードを1つだけ選んでください。", placeholder: "例：主体性" }]),
        makeSub(prefix+"3", "STAR形式で4行の骨子を作る", "構成が決まれば文章化は作業になります", "S・T・A・Rの各1行、計4行の箇条書きが完了ライン", "medium", "10分", "STAR4行の骨子メモ",
          [{ question: "Situation(状況)・Task(課題)・Action(行動)・Result(結果)を各1行で書いてください。", placeholder: "例：S:ゼミの共同研究 T:メンバーの意見が割れた A:1on1で全員の意見を聞いた R:全員合意の方針が決まった" }])
      ];
    }
    // 汎用 quick
    return [
      makeSub(prefix+"1", "今日の「10点ライン」を1文で仮決定する", "ゴールが見えれば脳が安心します", "紙やメモに1文書ければ完了", "low", "3分", "10点ラインの1文メモ",
        [{ question: "「今日ここまで進めば自分を褒めていい」という極小の目標を1文で書いてください。", placeholder: "例：企画書のタイトルだけ決める" }]),
      makeSub(prefix+"2", "タスクに関連するキーワードを3つ書き出す", "脳の暖気運転です。まず言葉にするだけで思考が動きます", "3つの名詞が紙にあれば完了", "low", "5分", "キーワード3語",
        [{ question: "このタスクに関連する言葉を、思いつくまま3つだけ書いてください。", placeholder: "例：予算、スケジュール、チーム" }]),
      makeSub(prefix+"3", "3つのキーワードのうち1つについて1行だけ肉付けする", "1行だけ書けば脳のエンジンが温まります", "1行の走り書きがあれば完了", "low", "5分", "1行の肉付けメモ",
        [{ question: "3つのキーワードの中で一番気になるものについて、1行だけ考えを書いてみてください。", placeholder: "例：予算→まず昨年の実績データを確認する必要がある" }])
    ];
  }

  // --- Deep Mode: 5〜6ステップ ---
  if (mode === "deep") {
    if (isPresentation) {
      const minutes = answers[1] || "指定時間";
      return [
        makeSub(prefix+"1", `発表の中心メッセージを明確な1文にする`, "方向性の核がすべてのスライドを導きます", "「〇〇を〇〇に伝える」形式の1文が書ければ完了", "medium", "10分", "中心メッセージ1文",
          [{ question: "「聞き手にこれだけは持って帰ってほしいこと」を1文にしてください。", placeholder: "例：この新手法で開発効率が2倍になることを示したい" }], ["聞き手の注意を引く導入", "データや根拠の提示", "まとめと次への提案"]),
        makeSub(prefix+"2", `聞き手に必要な背景知識を3つに整理する`, "背景が整理されると主張の説得力が格段に増します", "3つの箇条書きができれば完了", "medium", "10分", "背景3項目のリスト",
          [{ question: "聞き手が主張を理解するために必要な前提知識を3つだけ書いてください。", placeholder: "例：1.現行プロセスの問題点 2.新手法の仕組み 3.比較データの存在" }]),
        makeSub(prefix+"3", `「背景 ➔ 主張 ➔ まとめ」の3部構成を具体化する`, "骨組みが見えれば中身を埋める作業になります", "各部に2〜3行の内容メモが書ければ完了", "medium", "15分", "3部構成のメモ",
          [{ question: "背景・主張・まとめのそれぞれに何を話すか、2行ずつ書いてみましょう。", placeholder: "例：背景→現状の手間と課題、主張→新手法の結果と考察、まとめ→今後の課題" }]),
        makeSub(prefix+"4", `想定時間（${minutes}）に合わせたスライド枚数を決定する`, "時間感覚があると安心して構成できます", "目標枚数と各パートの配分が書ければ完了", "low", "5分", "スライド枚数計画メモ",
          [{ question: "「1スライド1〜2分」の原則で、何枚構成にするか書いてください。", placeholder: "例：10分 → 表紙含め7枚（背景2枚・主張3枚・まとめ1枚）" }]),
        makeSub(prefix+"5", `参考資料を3つだけ選んでブックマーク or 保存する`, "調査の沼を防ぎ、代表的な素材だけ手元に置きます", "3件の資料がリスト化されていれば完了", "medium", "15分", "参考資料3件リスト",
          [{ question: "テーマに関連する資料を3件だけ選び、タイトルかURLを記録してください。", placeholder: "例：1.〇〇(2024)の論文 2.教科書第5章 3.△△の解説ブログ" }]),
        makeSub(prefix+"6", `白紙スライドにタイトルと見出しだけ入力する`, "デザインは後。テキストだけ載せた白スライドが最強の第一歩です", "白地に黒文字でタイトルと見出しが入っていれば完了", "low", "10分", "タイトル＋見出し入りの白スライド",
          [{ question: "スライドソフトを開いて、タイトルと各スライドの見出しだけを入力してください。完了したら「入力した」と書いてください。", placeholder: "例：PowerPointを開いてタイトルと見出し5つを入力した" }])
      ];
    }
    if (isResearch) {
      return [
        makeSub(prefix+"1", "研究の核となる「問い」を1文で書き下す", "問いが鋭いほど手法もスケジュールも自然に定まります", "「〜は〜か？」形式の疑問文1つが書ければ完了", "high", "15分", "リサーチクエスチョン1文",
          [{ question: "この研究で最も明らかにしたいことを「〇〇は〇〇か？」形式で書いてください。", placeholder: "例：手法Aは従来法Bより精度が高いか？" }]),
        makeSub(prefix+"2", "研究手法を3フェーズに分解する", "巨大な手法も分ければ1つずつ片付けられます", "3つのフェーズ名が書ければ完了", "medium", "10分", "手法の3フェーズ分解",
          [{ question: "研究の手法を「データ収集→分析→検証」のように3つのフェーズに分けてください。", placeholder: "例：1.アンケート設計・配布 2.回答の集計・分析 3.考察・検証" }]),
        makeSub(prefix+"3", "提出期限から逆算した月別マイルストーンを作る", "期限直前のパニックを防ぎます", "月ごとの目標が1行ずつ書ければ完了", "medium", "10分", "月別マイルストーン表",
          [{ question: "提出期限から逆算して、各月にやるべきことを1行ずつ書いてください。", placeholder: "例：6月→先行研究レビュー、7月→データ収集、8月→分析と執筆" }]),
        makeSub(prefix+"4", "指導教員への相談用メモ（A4 1枚分）を作成する", "早めの相談で方向修正コストを下げます", "タイトル・背景・目的・手法の見出しが書ければ完了", "medium", "15分", "相談用メモ1枚",
          [{ question: "「タイトル」「背景」「目的」「手法」の見出しに各2行ずつ書いてメモを作りましょう。", placeholder: "例：タイトル→〇〇の効果検証、背景→先行研究では△△が未解明..." }])
      ];
    }
    // 汎用 deep
    return [
      makeSub(prefix+"1", "タスクの「最終成果物のイメージ」を1文で書く", "ゴールが見えれば逆算で手順が見えます", "「〇〇が完成した状態」と1文書ければ完了", "medium", "5分", "最終成果物の1文定義",
        [{ question: "このタスクが完了した時、何が出来上がっているか1文で書いてください。", placeholder: "例：企画書のドラフト版が共有フォルダにある状態" }]),
      makeSub(prefix+"2", "成果物を3〜4つのパーツに分解する", "パーツごとに取り組めば巨大さが消えます", "3〜4つのパーツ名の箇条書きが完了ライン", "medium", "10分", "パーツ分解リスト",
        [{ question: "成果物を構成するパーツを3〜4つの名前で書き出してください。", placeholder: "例：1.表紙 2.現状分析 3.提案内容 4.スケジュール" }]),
      makeSub(prefix+"3", "各パーツに「Good Enough（これで十分）」基準を定義する", "完璧を手放すための安全弁です", "各パーツに1行の基準があれば完了", "low", "5分", "Good Enough基準メモ",
        [{ question: "各パーツについて「最低限これがあればOK」の基準を1行ずつ書いてください。", placeholder: "例：現状分析→箇条書きで3点あればOK、提案→1ページの概要があればOK" }]),
      makeSub(prefix+"4", "最も取り組みやすいパーツから、見出しだけ作成する", "最もハードルが低いところから着手が鉄則です", "見出しが1つでも書ければ完了", "low", "10分", "最初のパーツの見出し",
        [{ question: "一番簡単そうなパーツを選び、その中の見出しだけを書いてみましょう。", placeholder: "例：「提案内容」の見出し→提案の概要、実施方法、期待効果" }]),
      makeSub(prefix+"5", "全パーツの見出しを並べて全体の流れを確認する", "俯瞰することで足りないパーツや順序の問題に気づけます", "全見出しを一覧にして眺められれば完了", "medium", "10分", "全体の見出し一覧",
        [{ question: "これまでに書いた見出しを全て並べ、流れに違和感がないか確認して感想を1行書いてください。", placeholder: "例：全体の流れは自然だが、データ部分が薄い気がする" }])
    ];
  }

  // --- Recovery Mode: 3〜4ステップ ---
  return [
    makeSub(prefix+"1", "前回やったことを30秒で思い出してメモする", "文脈の回復が最優先。細かいことは思い出さなくて大丈夫", "「前回は〇〇をした」と1行書ければ完了", "low", "3分", "前回のやったことメモ1行",
      [{ question: "前回このタスクで何をしたか、覚えている範囲で1行書いてください。", placeholder: "例：発表のテーマだけ仮決めした気がする" }]),
    makeSub(prefix+"2", "前回止まっていた理由を1つだけ特定する", "何で止まっていたか分かれば、再開ポイントが見えます", "「〇〇が分からなくて止まっていた」と書ければ完了", "low", "3分", "停止理由の1行メモ",
      [{ question: "なぜ前回止まったのか、一番の理由を1つだけ書いてください。", placeholder: "例：参考文献が多すぎて何を読めばいいか分からなくなった" }]),
    makeSub(prefix+"3", "今日の極小ゴールを1つだけ決める", "中断後の再開は「小さすぎるゴール」が最良の薬です", "「今日は〇〇だけやる」と書ければ完了", "low", "2分", "今日のミニゴール1行",
      [{ question: "今日はこれだけやれば十分、という極小のゴールを1つ書いてください。", placeholder: "例：参考文献を3つだけ選ぶ" }]),
    makeSub(prefix+"4", "極小ゴールの最初の5分だけ手を動かす", "5分間だけ試す。気分が乗れば続けて良いし、乗らなければここで終わっても100点", "5分間手を動かした事実があれば完了", "low", "5分", "5分間の作業痕跡",
      [{ question: "タイマーを5分にセットして手を動かしてみてください。何をしたか教えてください。", placeholder: "例：Google Scholarで3つの論文タイトルをメモした" }])
  ];
}

// ============================================================
// 3. コンテキスト復元メッセージ生成
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

// ============================================================
// ヘルパー: Subtask オブジェクト生成
// ============================================================

function makeSub(
  id: string, title: string, whyItMatters: string, goodEnoughScope: string,
  mentalLoad: MentalLoad, estimatedTime: string, concreteOutput: string,
  interactiveSteps: InteractiveStep[], children?: string[]
): Subtask {
  return {
    id, title, whyItMatters, goodEnoughScope, mentalLoad, estimatedTime, concreteOutput,
    status: "not_started", notes: "", interactiveSteps, interactiveAnswers: [],
    children
  };
}
