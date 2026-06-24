export type Lang = 'ja' | 'en' | 'zh';

export interface Translations {
  appTitle: string;
  appSubtitle: string;
  footer: string;
  status: { not_started: string; active: string; blocked: string; waiting: string; unclear: string; too_big: string; completed: string };
  mentalLoad: { low: string; medium: string; high: string };
  energy: {
    selectorLabel: string;
    hintIdle: string;
    hintActivePrefix: string;
    hintActiveSuffix: string;
    recommendedTag: string;
    modalTitle: string;
    modalDesc: string;
    modalCancel: string;
    options: [
      { emoji: string; label: string; description: string },
      { emoji: string; label: string; description: string },
      { emoji: string; label: string; description: string },
    ];
  };
  modes: {
    quick: { label: string; description: string; subtaskCount: string };
    deep: { label: string; description: string; subtaskCount: string };
    overwhelmed: { label: string; description: string; subtaskCount: string };
    recovery: { label: string; description: string; subtaskCount: string };
  };
  loading: { diagnosis: string; subtasks: string };
  landing: {
    title: string;
    desc1: string;
    desc2: string;
    exampleLabel: string;
    examples: string[];
    placeholder: string;
    submitBtn: string;
    workspaceTitle: string;
    workspaceDesc: string;
  };
  diagnosis: {
    title: string;
    targetPrefix: string;
    tooBigTitle: string;
    whyHardTitle: string;
    stateTitle: string;
    questionsTitle: string;
    qPlaceholder: string;
    backBtn: string;
    nextBtn: string;
  };
  modeSelect: {
    title: string;
    aiRecommendsPrefix: string;
    aiRecommendsSuffix: string;
    recommendedTag: string;
    backBtn: string;
  };
  editing: {
    title: string;
    desc: string;
    addBtn: string;
    backBtn: string;
    saveBtn: string;
    newTitle: string;
    newWhy: string;
    newScope: string;
    newOutput: string;
    newQuestion: string;
    newPlaceholder: string;
  };
  parentDetail: {
    breadcrumb: string;
    progressTitle: string;
    contextTitle: string;
    contextWhere: string;
    contextClarified: string;
    contextConfusing: string;
    aiLabel: string;
    subtasksTitle: string;
    subtasksDesc: string;
    completedMsg: string;
    whyLabel: string;
    goodEnoughLabel: string;
    notesPrefix: string;
    notesSuffix: string;
    copyBtn: string;
    copiedBtn: string;
    homeBtn: string;
    deleteBtn: string;
  };
  workMode: {
    breadcrumb: string;
    backBtn: string;
    whyTitle: string;
    goodEnoughTitle: string;
    outputTitle: string;
    guideTitle: string;
    notesLabel: string;
    notesAutoSave: string;
    notesPlaceholder: string;
    timerComplete: string;
    timerStart: string;
    timerPause: string;
    timerReset: string;
    unstuckBtn: string;
    unstuckLoading: string;
    breakdownLoading: string;
    rethinkSaved: string;
    completeBtn: string;
    sidebarTitle: string;
    sidebarParentLabel: string;
    sidebarProgressLabel: string;
  };
  parkingLot: {
    title: string;
    subtitleDetail: string;
    subtitleWork: string;
    empty: string;
    placeholder: string;
    addBtn: string;
  };
  deleteModal: {
    title: string;
    desc: string;
    confirmBtn: string;
    cancelBtn: string;
  };
  copyPlan: {
    header: string;
    parentTask: string;
    aiDiagnosis: string;
    mode: string;
    createdAt: string;
    progress: string;
    subtasksList: string;
    output: string;
    notes: string;
    noNotes: string;
    footer: string;
  };
  alerts: {
    diagnosisFailed: string;
    subtasksFailed: string;
    unstuckFailed: string;
    rateLimited: string;
  };
  progress: {
    viewBtn: string;
    modalTitle: string;
    closeBtn: string;
    penguinLabel: string;
    stages: { egg: string; chick: string; explorer: string; adventure: string; wise: string };
    nextIn: string;
    maxStage: string;
    collectionTitle: string;
    tokensLabel: string;
    seedsLabel: string;
    starsLabel: string;
    calendarTitle: string;
    calendarLegend: string;
    insightsTitle: string;
    insightSessions: string;
    insightReturns: string;
    insightCompleted: string;
    insightDefault: string;
    dailyTitle: string;
    recoveryTitle: string;
    recoveryBody: string;
    recoveryReward: string;
    recoveryCta: string;
  };
}

const ja: Translations = {
  appTitle: 'FirstStep Keeper',
  appSubtitle: '優しく伴走するタスク分解パートナー',
  footer: '温かく自分のペースで歩みを進めましょう。',
  status: { not_started: '未着手', active: '進行中', blocked: 'ブロック中', waiting: '待機中', unclear: 'やり方不明', too_big: '細分化が必要', completed: '完了' },
  mentalLoad: { low: '負荷小', medium: '負荷中', high: '負荷大' },
  energy: {
    selectorLabel: '🔋 今日の元気レベル',
    hintIdle: '← 選ぶと最適な手順をハイライトします',
    hintActivePrefix: '',
    hintActiveSuffix: 'に合った手順を提案中',
    recommendedTag: '👉 今のあなたにおすすめ',
    modalTitle: '🔋 今日の元気レベルは？',
    modalDesc: '今のあなたの状態を教えてください。それに合わせて取り組みやすい手順を提案します。',
    modalCancel: 'キャンセル',
    options: [
      { emoji: '😴', label: '低い', description: '今日はしんどい' },
      { emoji: '😐', label: '普通', description: 'いつも通り' },
      { emoji: '⚡', label: '高い', description: 'やる気ある！' },
    ],
  },
  modes: {
    quick: { label: 'Quickスタート', description: '比較的シンプルなタスク向け。すぐ始められる最低限の手順だけを抽出します。', subtaskCount: '3ステップで完結' },
    deep: { label: 'ディープ分析', description: 'レポート・研究・就活など複雑なプロジェクト系タスク向け。全体像を包括的にカバーします。', subtaskCount: '5〜8ステップで網羅' },
    overwhelmed: { label: '今すぐ始める', description: '掃除・整理など物理的なタスク、または頭が疲弊している時向け。極限まで小さく分解します。', subtaskCount: '2ステップのみ' },
    recovery: { label: '再起動モード', description: '途中で止まったタスクを再開する時向け。文脈を回復しながら無理なく再スタートできます。', subtaskCount: '3〜4ステップで再開' },
  },
  loading: { diagnosis: 'タスクを診断中...', subtasks: '手順を生成中...' },
  landing: {
    title: '🧠 新しいタスクを分解する',
    desc1: 'タスクが巨大で圧倒されそうなとき、どこから手をつければいいか見えず動けないとき。',
    desc2: 'あなたの頭の中を優しく整理し、心理的負担のない具体的なサブタスクへ分解します。',
    exampleLabel: '💡 試してみる（クリックで入力されます）:',
    examples: ['ゼミの発表を準備したい', '就活の自己PRを書きたい', '研究計画を整理したい', '部屋を片付けたい', 'レポートを書き始めたい'],
    placeholder: '例：ゼミの発表準備を始めたいけど、何からやればいいか分からない...',
    submitBtn: '✨ タスクの分解プロセスを始める',
    workspaceTitle: '💼 マイ・ワークスペース',
    workspaceDesc: 'これまでに分解した計画の一覧です。いつでも開いて作業を再開できます。',
  },
  diagnosis: {
    title: '🔍 パートナーによるタスク診断',
    targetPrefix: '対象タスク：',
    tooBigTitle: '⚠️ このタスクはまだ広すぎるかもしれません',
    whyHardTitle: '⚡ なぜこのタスクが難しく感じるのか？',
    stateTitle: '🧠 あなたの今の状態',
    questionsTitle: '💬 より解像度の高い計画を作るための質問',
    qPlaceholder: '例：まだ明確に決まっていません / 10分程度です',
    backBtn: 'やり直す',
    nextBtn: '✨ この回答でモードを選ぶ',
  },
  modeSelect: {
    title: '🎯 今日のサポートモードを選ぶ',
    aiRecommendsPrefix: 'AIが診断した結果、あなたには',
    aiRecommendsSuffix: 'モードがおすすめです。もちろん自分で選んでも構いません。',
    recommendedTag: 'おすすめ',
    backBtn: '質問に戻る',
  },
  editing: {
    title: '🛠️ 分解手順の確認と編集',
    desc: 'AIが自動生成した手順です。タイトルの編集、追加、削除、順序の並び替えができます。',
    addBtn: '➕ 新しい手順を手動で追加する',
    backBtn: 'モード選択に戻る',
    saveBtn: '🚀 この計画を保存してワークスペースを開く',
    newTitle: '新しい手順（タイトルを編集してください）',
    newWhy: 'この手順を実行することで、タスクをより小さな要素から着実に進めることができます。',
    newScope: '最低限これが完了すれば十分です。',
    newOutput: '手順を1つ完了した記録',
    newQuestion: 'この手順で最初にやることを1行で書いてください。',
    newPlaceholder: '例：まず〇〇をする',
  },
  parentDetail: {
    breadcrumb: '📂 親タスク詳細ワークスペース',
    progressTitle: '🎯 全体進捗',
    contextTitle: '🔄 前回の作業の文脈を復元しました',
    contextWhere: '📍 どこまで進んでいたか：',
    contextClarified: '✅ 明確になったこと：',
    contextConfusing: '❓ 迷っていたこと：',
    aiLabel: '🤖 AIの作戦診断：',
    subtasksTitle: '🗺️ 分解された手順（クリックして集中作業モードを開始）',
    subtasksDesc: 'どこから始めても構いません。やりやすい手順を選択すると、その手順専用のタイマーと作業画面が開きます。',
    completedMsg: '🎉 この手順は完了しました。',
    whyLabel: '💡 なぜやるか：',
    goodEnoughLabel: '✅ これで十分：',
    notesPrefix: '✏️ 保存されたメモあり (',
    notesSuffix: '文字)',
    copyBtn: '📋 計画書をコピー',
    copiedBtn: '✅ コピー完了！',
    homeBtn: '🏠 計画一覧（ホーム）に戻る',
    deleteBtn: '🗑️ この計画を削除する',
  },
  workMode: {
    breadcrumb: '🔥 個別手順フォーカス空間',
    backBtn: '⬅️ 計画ワークスペースに戻る',
    whyTitle: '💡 なぜこの手順が必要か？',
    goodEnoughTitle: '✅ これで十分（Good Enough）',
    outputTitle: '📦 目標の成果物',
    guideTitle: '🗣️ 手順ガイド（記入することで思考が整理されます）',
    notesLabel: '✏️ ワークスペース（メモ・思考の下書き）',
    notesAutoSave: '✓ 自動保存されます',
    notesPlaceholder: 'ここに自由に考えやアウトライン、メモを書き殴ってください。入力内容は自動的に保存されます。',
    timerComplete: '🎉 素晴らしい！5分間向き合えました。自分のペースでメモを完成させ、完了ボタンを押してくださいね。',
    timerStart: '▶️ スタート',
    timerPause: '⏸️ 一時停止',
    timerReset: '🔄 リセット',
    unstuckBtn: '😵 つまずいた。助けて！',
    unstuckLoading: '🤔 考え中...',
    breakdownLoading: '🔪 さらに細かく分けています...',
    rethinkSaved: '💡 別のアプローチをメモに追加しました',
    completeBtn: '🏆 この手順を完了して計画に戻る',
    sidebarTitle: '📁 親計画情報',
    sidebarParentLabel: '親タスク:',
    sidebarProgressLabel: '進捗:',
  },
  parkingLot: {
    title: '🚗 Parking Lot (気が散り避難所)',
    subtitleDetail: 'このタスクの進行中に一時退避した雑念のリストです。',
    subtitleWork: 'セッション中、「今すぐやらなくていいこと」を思いついたらここに退避させてください。',
    empty: '退避した雑念はありません。',
    placeholder: '例: あ、別の用事を思い出した...',
    addBtn: '退避する',
  },
  deleteModal: {
    title: '🗑️ 計画を削除しますか？',
    desc: 'このタスク計画および関連するすべての手順の進捗、メモ、Parking Lot のデータが完全に消去されます。元に戻すことはできません。',
    confirmBtn: 'はい、計画を完全に削除します',
    cancelBtn: 'いいえ、削除しません',
  },
  copyPlan: {
    header: '【FirstStep Keeper 計画書】',
    parentTask: '■ 親タスク: ',
    aiDiagnosis: '■ AI診断: ',
    mode: '■ モード: ',
    createdAt: '■ 作成日時: ',
    progress: '■ 進捗度: ',
    subtasksList: '■ 分解された手順リスト:',
    output: '   └ 成果物: ',
    notes: '   └ メモ: ',
    noNotes: '記述なし',
    footer: 'FirstStep Keeper より温かい応援を込めて',
  },
  alerts: {
    diagnosisFailed: '診断に失敗しました。\n\n',
    subtasksFailed: '手順の生成に失敗しました。もう一度お試しください。',
    unstuckFailed: 'サポートの取得に失敗しました。\n',
    rateLimited: 'AIの利用上限に達しました。少し時間をおいてからもう一度お試しください。',
  },
  progress: {
    viewBtn: '🐧 成長記録',
    modalTitle: '🐧 やさしい成長記録',
    closeBtn: '閉じる',
    penguinLabel: '相棒のペンギン',
    stages: { egg: '🥚 タマゴ', chick: '🐤 ちびペンギン', explorer: '🐧 探検ペンギン', adventure: '🏔️ 冒険ペンギン', wise: '✨ 賢者ペンギン' },
    nextIn: 'あと{n}🐣で成長します',
    maxStage: '最高の状態に到達しました ✨',
    collectionTitle: 'コレクション',
    tokensLabel: '🐣 最初の一歩トークン',
    seedsLabel: '🌱 回復の種',
    starsLabel: '⭐ 達成マイルストーン',
    calendarTitle: '🌿 28日間の活動記録',
    calendarLegend: '🐣 開始  🐤 小目標  ⭐ 大目標  🌱 復帰  💬 集中',
    insightsTitle: '💬 あなたの活動',
    insightSessions: '今週{n}回、作業セッションを開始しました。',
    insightReturns: '今週{n}回、中断していたタスクに戻れました。それは勇気です。',
    insightCompleted: 'これまでに{n}個のタスクを完走しました。',
    insightDefault: '小さな一歩を積み重ねています。今日も十分です。',
    dailyTitle: '今日の活動',
    recoveryTitle: 'おかえり。',
    recoveryBody: '{days}日ぶりに戻ってきてくれました。\nまた来てくれてありがとう。',
    recoveryReward: '🌱 回復の種 +1',
    recoveryCta: 'ありがとう、始めます',
  },
};

const en: Translations = {
  appTitle: 'FirstStep Keeper',
  appSubtitle: 'Your gentle companion for task decomposition',
  footer: 'Move forward at your own pace, one step at a time.',
  status: { not_started: 'Not started', active: 'In progress', blocked: 'Blocked', waiting: 'Waiting', unclear: 'Unclear how', too_big: 'Needs breakdown', completed: 'Completed' },
  mentalLoad: { low: 'Easy', medium: 'Medium', high: 'Heavy' },
  energy: {
    selectorLabel: '🔋 Today\'s energy level',
    hintIdle: '← Select to highlight suitable steps',
    hintActivePrefix: 'Showing suggestions for ',
    hintActiveSuffix: ' energy',
    recommendedTag: '👉 Recommended for you now',
    modalTitle: '🔋 What\'s your energy level today?',
    modalDesc: 'Tell us how you\'re feeling. We\'ll highlight steps that match your energy.',
    modalCancel: 'Cancel',
    options: [
      { emoji: '😴', label: 'Low', description: 'Feeling drained today' },
      { emoji: '😐', label: 'Normal', description: 'Just the usual' },
      { emoji: '⚡', label: 'High', description: 'Feeling motivated!' },
    ],
  },
  modes: {
    quick: { label: 'Quick Start', description: 'For simpler tasks. Extracts only the minimum steps you can begin right now.', subtaskCount: '3 steps' },
    deep: { label: 'Deep Dive', description: 'For complex projects like reports, research, or job hunting. Covers the full picture.', subtaskCount: '5–8 steps' },
    overwhelmed: { label: 'Just Begin', description: 'For physical tasks or when your brain is overloaded. Broken into the tiniest possible actions.', subtaskCount: '2 steps only' },
    recovery: { label: 'Resume Mode', description: 'For picking up a task you\'d stopped. Gently restores context before restarting.', subtaskCount: '3–4 steps' },
  },
  loading: { diagnosis: 'Analyzing your task...', subtasks: 'Generating steps...' },
  landing: {
    title: '🧠 Break down a new task',
    desc1: 'When a task feels overwhelming or you don\'t know where to start,',
    desc2: 'we gently organize your thoughts and break it into manageable steps.',
    exampleLabel: '💡 Try one of these (click to fill):',
    examples: ['Prepare a seminar presentation', 'Write a job-hunting self-introduction', 'Organize a research plan', 'Tidy up my room', 'Start writing a report'],
    placeholder: 'e.g. I want to start preparing for my presentation but I don\'t know where to begin...',
    submitBtn: '✨ Start the task breakdown',
    workspaceTitle: '💼 My Workspace',
    workspaceDesc: 'Your saved plans. Open any of them to resume work anytime.',
  },
  diagnosis: {
    title: '🔍 Task Diagnosis',
    targetPrefix: 'Task: ',
    tooBigTitle: '⚠️ This task might be too broad',
    whyHardTitle: '⚡ Why does this task feel difficult?',
    stateTitle: '🧠 Your current state',
    questionsTitle: '💬 Questions to build a clearer plan',
    qPlaceholder: 'e.g. Not decided yet / About 10 minutes',
    backBtn: 'Start over',
    nextBtn: '✨ Choose a mode with these answers',
  },
  modeSelect: {
    title: '🎯 Choose your support mode',
    aiRecommendsPrefix: 'Based on the analysis, we recommend the',
    aiRecommendsSuffix: 'mode. Feel free to choose any mode you like.',
    recommendedTag: 'Recommended',
    backBtn: 'Back to questions',
  },
  editing: {
    title: '🛠️ Review and edit your steps',
    desc: 'These steps were generated by AI. You can edit titles, add, delete, or reorder them.',
    addBtn: '➕ Add a step manually',
    backBtn: 'Back to mode selection',
    saveBtn: '🚀 Save this plan and open workspace',
    newTitle: 'New step (click to edit title)',
    newWhy: 'Completing this step will help you make steady progress on the task.',
    newScope: 'This is good enough to count as done.',
    newOutput: 'Record of one completed step',
    newQuestion: 'Write in one line what you\'ll do first in this step.',
    newPlaceholder: 'e.g. First, I\'ll...',
  },
  parentDetail: {
    breadcrumb: '📂 Task Workspace',
    progressTitle: '🎯 Overall Progress',
    contextTitle: '🔄 Restored context from last session',
    contextWhere: '📍 Where you left off: ',
    contextClarified: '✅ What became clear: ',
    contextConfusing: '❓ What you were unsure about: ',
    aiLabel: '🤖 AI Strategy:',
    subtasksTitle: '🗺️ Broken-down steps (click to start focused work)',
    subtasksDesc: 'You can start anywhere. Clicking a step opens a dedicated timer and workspace for it.',
    completedMsg: '🎉 This step is completed.',
    whyLabel: '💡 Why: ',
    goodEnoughLabel: '✅ Good enough: ',
    notesPrefix: '✏️ Notes saved (',
    notesSuffix: ' chars)',
    copyBtn: '📋 Copy plan',
    copiedBtn: '✅ Copied!',
    homeBtn: '🏠 Back to home',
    deleteBtn: '🗑️ Delete this plan',
  },
  workMode: {
    breadcrumb: '🔥 Focused Work Space',
    backBtn: '⬅️ Back to workspace',
    whyTitle: '💡 Why is this step important?',
    goodEnoughTitle: '✅ Good Enough',
    outputTitle: '📦 Target output',
    guideTitle: '🗣️ Step guide (writing helps clarify your thinking)',
    notesLabel: '✏️ Workspace (notes & drafts)',
    notesAutoSave: '✓ Auto-saved',
    notesPlaceholder: 'Jot down your thoughts, outline, or anything here. Changes are saved automatically.',
    timerComplete: '🎉 Great job! You focused for 5 minutes. Finish your notes and click Complete when ready.',
    timerStart: '▶️ Start',
    timerPause: '⏸️ Pause',
    timerReset: '🔄 Reset',
    unstuckBtn: '😵 I\'m stuck. Help me!',
    unstuckLoading: '🤔 Thinking...',
    breakdownLoading: '🔪 Breaking it down further...',
    rethinkSaved: '💡 Added the alternative approach to your notes',
    completeBtn: '🏆 Complete this step and return to plan',
    sidebarTitle: '📁 Plan info',
    sidebarParentLabel: 'Parent task:',
    sidebarProgressLabel: 'Progress:',
  },
  parkingLot: {
    title: '🚗 Parking Lot (distraction refuge)',
    subtitleDetail: 'Thoughts parked here while working on this task.',
    subtitleWork: 'If something unrelated crosses your mind during the session, park it here.',
    empty: 'No parked thoughts yet.',
    placeholder: 'e.g. Oh, I just remembered something...',
    addBtn: 'Park it',
  },
  deleteModal: {
    title: '🗑️ Delete this plan?',
    desc: 'This will permanently delete the plan and all its progress, notes, and Parking Lot data. This cannot be undone.',
    confirmBtn: 'Yes, delete permanently',
    cancelBtn: 'No, keep it',
  },
  copyPlan: {
    header: '[FirstStep Keeper Plan]',
    parentTask: '■ Task: ',
    aiDiagnosis: '■ AI Analysis: ',
    mode: '■ Mode: ',
    createdAt: '■ Created: ',
    progress: '■ Progress: ',
    subtasksList: '■ Step list:',
    output: '   └ Output: ',
    notes: '   └ Notes: ',
    noNotes: 'None',
    footer: 'With warm encouragement from FirstStep Keeper',
  },
  alerts: {
    diagnosisFailed: 'Diagnosis failed.\n\n',
    subtasksFailed: 'Failed to generate steps. Please try again.',
    unstuckFailed: 'Failed to get support.\n',
    rateLimited: 'The AI usage limit has been reached. Please wait a little while and try again.',
  },
  progress: {
    viewBtn: '🐧 Progress',
    modalTitle: '🐧 Gentle Progress Log',
    closeBtn: 'Close',
    penguinLabel: 'Your Penguin Companion',
    stages: { egg: '🥚 Egg', chick: '🐤 Little Penguin', explorer: '🐧 Explorer Penguin', adventure: '🏔️ Adventure Penguin', wise: '✨ Wise Penguin' },
    nextIn: '{n} more 🐣 to evolve',
    maxStage: 'Reached the highest stage ✨',
    collectionTitle: 'Collection',
    tokensLabel: '🐣 First Step Tokens',
    seedsLabel: '🌱 Recovery Seeds',
    starsLabel: '⭐ Milestones',
    calendarTitle: '🌿 28-Day Activity Log',
    calendarLegend: '🐣 Session  🐤 Subtask  ⭐ Task  🌱 Return  💬 Focus',
    insightsTitle: '💬 Your Activity',
    insightSessions: 'You started {n} work session(s) this week.',
    insightReturns: 'You returned to paused tasks {n} time(s) this week. That takes courage.',
    insightCompleted: 'You\'ve completed {n} task(s) in total.',
    insightDefault: 'You\'re building momentum, one small step at a time.',
    dailyTitle: "Today's Activity",
    recoveryTitle: 'Welcome back.',
    recoveryBody: 'You\'ve been away for {days} days.\nThank you for coming back.',
    recoveryReward: '🌱 Recovery Seed +1',
    recoveryCta: 'Thanks, let\'s begin',
  },
};

const zh: Translations = {
  appTitle: 'FirstStep Keeper',
  appSubtitle: '温柔陪伴你拆解任务的伙伴',
  footer: '以自己的节奏，温和地前行。',
  status: { not_started: '未开始', active: '进行中', blocked: '受阻中', waiting: '等待中', unclear: '不知如何做', too_big: '需要细分', completed: '已完成' },
  mentalLoad: { low: '轻松', medium: '适中', high: '较重' },
  energy: {
    selectorLabel: '🔋 今天的精力状态',
    hintIdle: '← 选择后会高亮适合的步骤',
    hintActivePrefix: '正在展示适合「',
    hintActiveSuffix: '」的步骤',
    recommendedTag: '👉 现在最适合你',
    modalTitle: '🔋 你今天的精力如何？',
    modalDesc: '告诉我们你现在的状态，我们会推荐最适合你的步骤。',
    modalCancel: '取消',
    options: [
      { emoji: '😴', label: '低', description: '今天有点累' },
      { emoji: '😐', label: '普通', description: '和平时差不多' },
      { emoji: '⚡', label: '高', description: '很有干劲！' },
    ],
  },
  modes: {
    quick: { label: '快速启动', description: '适合较简单的任务。只提取最少的、现在就能开始的步骤。', subtaskCount: '3个步骤' },
    deep: { label: '深度分析', description: '适合报告、研究、求职等复杂项目。全面覆盖整体流程。', subtaskCount: '5～8个步骤' },
    overwhelmed: { label: '立刻开始', description: '适合打扫等体力任务，或大脑疲惫时。拆解到极小的物理行动。', subtaskCount: '仅2个步骤' },
    recovery: { label: '重启模式', description: '适合重新开始中断的任务。先恢复上次的进度，再温和地重新出发。', subtaskCount: '3～4个步骤' },
  },
  loading: { diagnosis: '正在分析任务...', subtasks: '正在生成步骤...' },
  landing: {
    title: '🧠 拆解一个新任务',
    desc1: '当任务感觉很庞大、不知道从哪里开始时，',
    desc2: '我们帮你轻柔地整理思路，拆解成可操作的小步骤。',
    exampleLabel: '💡 试试这些示例（点击填入）：',
    examples: ['准备研讨会演讲', '写求职自我介绍', '整理研究计划', '整理房间', '开始写报告'],
    placeholder: '例如：我想开始准备演讲，但不知道从哪里入手...',
    submitBtn: '✨ 开始任务拆解',
    workspaceTitle: '💼 我的工作台',
    workspaceDesc: '已保存的计划列表。随时打开继续工作。',
  },
  diagnosis: {
    title: '🔍 任务诊断',
    targetPrefix: '目标任务：',
    tooBigTitle: '⚠️ 这个任务可能范围太广了',
    whyHardTitle: '⚡ 为什么这个任务感觉很难？',
    stateTitle: '🧠 你目前的状态',
    questionsTitle: '💬 帮助制定更清晰计划的问题',
    qPlaceholder: '例如：还没确定 / 大概10分钟',
    backBtn: '重新开始',
    nextBtn: '✨ 用这些回答选择模式',
  },
  modeSelect: {
    title: '🎯 选择支持模式',
    aiRecommendsPrefix: '根据分析，我们为你推荐',
    aiRecommendsSuffix: '模式。当然你也可以自己选择。',
    recommendedTag: '推荐',
    backBtn: '返回问题',
  },
  editing: {
    title: '🛠️ 确认并编辑步骤',
    desc: 'AI自动生成的步骤。你可以编辑标题、添加、删除或调整顺序。',
    addBtn: '➕ 手动添加新步骤',
    backBtn: '返回模式选择',
    saveBtn: '🚀 保存计划并打开工作台',
    newTitle: '新步骤（请点击编辑标题）',
    newWhy: '完成这个步骤可以让你稳步推进任务。',
    newScope: '完成这个就已经足够好了。',
    newOutput: '完成一个步骤的记录',
    newQuestion: '请用一行写下这个步骤你首先要做的事。',
    newPlaceholder: '例如：首先，我会...',
  },
  parentDetail: {
    breadcrumb: '📂 任务工作台',
    progressTitle: '🎯 整体进度',
    contextTitle: '🔄 已恢复上次工作的进度',
    contextWhere: '📍 上次停在哪里：',
    contextClarified: '✅ 已经明确的事：',
    contextConfusing: '❓ 当时困惑的事：',
    aiLabel: '🤖 AI策略：',
    subtasksTitle: '🗺️ 拆解后的步骤（点击开始专注工作）',
    subtasksDesc: '从哪里开始都可以。点击某个步骤会打开专属计时器和工作区。',
    completedMsg: '🎉 这个步骤已完成。',
    whyLabel: '💡 为什么要做：',
    goodEnoughLabel: '✅ 做到这里就够了：',
    notesPrefix: '✏️ 有保存的笔记 (',
    notesSuffix: ' 字)',
    copyBtn: '📋 复制计划',
    copiedBtn: '✅ 已复制！',
    homeBtn: '🏠 返回首页',
    deleteBtn: '🗑️ 删除这个计划',
  },
  workMode: {
    breadcrumb: '🔥 专注工作区',
    backBtn: '⬅️ 返回工作台',
    whyTitle: '💡 为什么这个步骤很重要？',
    goodEnoughTitle: '✅ 做到这里就够了',
    outputTitle: '📦 目标成果',
    guideTitle: '🗣️ 步骤引导（写下来有助于整理思路）',
    notesLabel: '✏️ 工作区（笔记与草稿）',
    notesAutoSave: '✓ 自动保存',
    notesPlaceholder: '在这里自由记录你的想法、大纲或笔记。内容会自动保存。',
    timerComplete: '🎉 太棒了！你专注了5分钟。完成笔记后点击完成按钮吧。',
    timerStart: '▶️ 开始',
    timerPause: '⏸️ 暂停',
    timerReset: '🔄 重置',
    unstuckBtn: '😵 卡住了，帮帮我！',
    unstuckLoading: '🤔 思考中...',
    breakdownLoading: '🔪 正在拆得更细...',
    rethinkSaved: '💡 已把另一种方法加入备忘',
    completeBtn: '🏆 完成这个步骤，返回计划',
    sidebarTitle: '📁 计划信息',
    sidebarParentLabel: '父任务：',
    sidebarProgressLabel: '进度：',
  },
  parkingLot: {
    title: '🚗 临时停车场（分心避难所）',
    subtitleDetail: '工作过程中临时停放的杂念列表。',
    subtitleWork: '专注中如果想到不相关的事，可以停放在这里。',
    empty: '还没有停放的杂念。',
    placeholder: '例如：哦，我刚想起另一件事...',
    addBtn: '停放',
  },
  deleteModal: {
    title: '🗑️ 删除这个计划？',
    desc: '这将永久删除该计划及所有步骤的进度、笔记和临时停车场数据。此操作无法撤销。',
    confirmBtn: '是的，永久删除',
    cancelBtn: '不，保留它',
  },
  copyPlan: {
    header: '【FirstStep Keeper 计划书】',
    parentTask: '■ 任务：',
    aiDiagnosis: '■ AI分析：',
    mode: '■ 模式：',
    createdAt: '■ 创建时间：',
    progress: '■ 进度：',
    subtasksList: '■ 拆解步骤列表：',
    output: '   └ 成果：',
    notes: '   └ 笔记：',
    noNotes: '无',
    footer: '来自 FirstStep Keeper 的温暖鼓励',
  },
  alerts: {
    diagnosisFailed: '诊断失败。\n\n',
    subtasksFailed: '生成步骤失败，请重试。',
    unstuckFailed: '获取支持失败。\n',
    rateLimited: 'AI 使用次数已达上限，请稍后再试。',
  },
  progress: {
    viewBtn: '🐧 成长记录',
    modalTitle: '🐧 温柔的成长记录',
    closeBtn: '关闭',
    penguinLabel: '你的企鹅伙伴',
    stages: { egg: '🥚 企鹅蛋', chick: '🐤 小企鹅', explorer: '🐧 探险企鹅', adventure: '🏔️ 冒险企鹅', wise: '✨ 智慧企鹅' },
    nextIn: '再{n}个🐣就能成长',
    maxStage: '已达到最高阶段 ✨',
    collectionTitle: '收藏',
    tokensLabel: '🐣 第一步代币',
    seedsLabel: '🌱 回归之种',
    starsLabel: '⭐ 里程碑',
    calendarTitle: '🌿 28天活动记录',
    calendarLegend: '🐣 专注  🐤 小目标  ⭐ 大目标  🌱 回归  💬 反思',
    insightsTitle: '💬 你的活动',
    insightSessions: '本周你开始了{n}次工作专注。',
    insightReturns: '本周你{n}次回到了暂停的任务。这需要勇气。',
    insightCompleted: '你总共完成了{n}个任务。',
    insightDefault: '你在一步一步地积累前进的力量。',
    dailyTitle: '今天的活动',
    recoveryTitle: '欢迎回来。',
    recoveryBody: '你已经离开了{days}天。\n谢谢你回来了。',
    recoveryReward: '🌱 回归之种 +1',
    recoveryCta: '谢谢，开始吧',
  },
};

export const translations: Record<Lang, Translations> = { ja, en, zh };
export const getT = (lang: Lang): Translations => translations[lang];
