import React, { useState, useEffect, useRef } from "react";
import {
  getStatusAdvice,
  SUPPORT_MODES,
  type Subtask,
  type DiagnosisResult,
  type ParentTask,
  type ParkingThought,
  type SupportMode,
  type SubtaskStatus,
} from "./utils/mockGenerator";
import { getDiagnosis, generateSubtasks, generateContextRecovery } from "./utils/apiClient";

type AppStep =
  | "landing"
  | "diagnosis"
  | "mode_select"
  | "editing"
  | "parent_detail"
  | "work_mode";

const STATUS_LABELS: Record<SubtaskStatus, string> = {
  not_started: "未着手",
  active: "進行中",
  blocked: "ブロック中",
  waiting: "待機中",
  unclear: "やり方不明",
  too_big: "細分化が必要",
  completed: "完了",
};

const STATUS_COLORS: Record<SubtaskStatus, string> = {
  not_started: "#94a3b8",
  active: "var(--primary)",
  blocked: "#ef4444",
  waiting: "#f59e0b",
  unclear: "#f97316",
  too_big: "#f97316",
  completed: "var(--primary)",
};

const MENTAL_LOAD_COLORS: Record<string, string> = {
  low: "#4ade80",
  medium: "#facc15",
  high: "#f87171",
};
const MENTAL_LOAD_LABELS: Record<string, string> = {
  low: "負荷小",
  medium: "負荷中",
  high: "負荷大",
};

export default function App() {
  const [appStep, setAppStep] = useState<AppStep>("landing");
  const [savedTasks, setSavedTasks] = useState<ParentTask[]>([]);
  const [originalTask, setOriginalTask] = useState("");
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [followUpAnswers, setFollowUpAnswers] = useState<string[]>([]);
  const [selectedMode, setSelectedMode] = useState<SupportMode>("quick");
  const [editingSubtasks, setEditingSubtasks] = useState<Subtask[]>([]);
  const [selectedParentTaskId, setSelectedParentTaskId] = useState<string | null>(null);
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(300);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [currentThought, setCurrentThought] = useState("");
  const [interactiveAnswers, setInteractiveAnswers] = useState<string[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);
  const [deleteConfirmTaskId, setDeleteConfirmTaskId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("firststep_tasks");
      if (stored) setSavedTasks(JSON.parse(stored));
    } catch (e) {
      console.error("Failed to load saved tasks from localStorage", e);
    }
  }, []);

  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setIsTimerRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTimerRunning, timeLeft]);

  const saveTasksToStorage = (tasks: ParentTask[]) => {
    setSavedTasks(tasks);
    localStorage.setItem("firststep_tasks", JSON.stringify(tasks));
  };

  const handleExampleChipClick = (exampleText: string) => {
    setOriginalTask(exampleText);
    document.getElementById("task-input")?.focus();
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originalTask.trim()) return;
    setIsLoading(true);
    setLoadingMessage("タスクを診断中...");
    try {
      const result = await getDiagnosis(originalTask);
      setDiagnosisResult(result);
      setFollowUpAnswers(new Array(result.questions.length).fill(""));
      setSelectedMode(result.recommendedMode);
      setAppStep("diagnosis");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Diagnosis failed:', msg);
      alert(`診断に失敗しました。\n\n${msg}`);
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const handleDiagnosisAnswersSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppStep("mode_select");
  };

  const handleModeSelect = async (mode: SupportMode) => {
    setIsLoading(true);
    setLoadingMessage("手順を生成中...");
    try {
      const generated = await generateSubtasks(originalTask, followUpAnswers, mode);
      setSelectedMode(mode);
      setEditingSubtasks(generated);
      setAppStep("editing");
    } catch (err) {
      console.error(err);
      alert("手順の生成に失敗しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const handleAnswerChange = (index: number, val: string) => {
    const updated = [...followUpAnswers];
    updated[index] = val;
    setFollowUpAnswers(updated);
  };

  const handleSubtaskTitleChange = (index: number, title: string) => {
    const updated = [...editingSubtasks];
    updated[index] = { ...updated[index], title };
    setEditingSubtasks(updated);
  };

  const moveSubtaskUp = (index: number) => {
    if (index === 0) return;
    const updated = [...editingSubtasks];
    [updated[index], updated[index - 1]] = [updated[index - 1], updated[index]];
    setEditingSubtasks(updated);
  };

  const moveSubtaskDown = (index: number) => {
    if (index === editingSubtasks.length - 1) return;
    const updated = [...editingSubtasks];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setEditingSubtasks(updated);
  };

  const deleteSubtask = (index: number) => {
    setEditingSubtasks(editingSubtasks.filter((_, i) => i !== index));
  };

  const addBlankSubtask = () => {
    const newSub: Subtask = {
      id: "manual-" + Date.now().toString() + "-" + Math.random().toString(36).substr(2, 5),
      title: "新しい手順（タイトルを編集してください）",
      whyItMatters: "この手順を実行することで、タスクをより小さな要素から着実に進めることができます。",
      goodEnoughScope: "最低限これが完了すれば十分です。",
      mentalLoad: "low",
      estimatedTime: "5〜10分",
      concreteOutput: "手順を1つ完了した記録",
      status: "not_started",
      notes: "",
      interactiveSteps: [
        { question: "この手順で最初にやることを1行で書いてください。", placeholder: "例：まず〇〇をする" }
      ],
      interactiveAnswers: [],
    };
    setEditingSubtasks([...editingSubtasks, newSub]);
  };

  const handleApproveAndSave = () => {
    if (!diagnosisResult) return;
    const newParentTask: ParentTask = {
      id: "parent-" + Date.now().toString(),
      title: originalTask,
      diagnosis: diagnosisResult.taskDiagnosis,
      userStateDiagnosis: diagnosisResult.userStateDiagnosis,
      supportMode: selectedMode,
      subtasks: editingSubtasks,
      parkingThoughts: [],
      contextRecovery: null,
      isTooBig: diagnosisResult.isTooBig,
      reframingMessage: diagnosisResult.reframingMessage,
      createdAt: new Date().toLocaleString("ja-JP", { hour12: false }),
    };
    const updated = [newParentTask, ...savedTasks];
    saveTasksToStorage(updated);
    setSelectedParentTaskId(newParentTask.id);
    setAppStep("parent_detail");
    setOriginalTask("");
    setDiagnosisResult(null);
    setFollowUpAnswers([]);
    setEditingSubtasks([]);
  };

  const currentParentTask = savedTasks.find(t => t.id === selectedParentTaskId) || null;

  const getProgressPercentage = (task: ParentTask) => {
    if (task.subtasks.length === 0) return 0;
    const completed = task.subtasks.filter(s => s.status === "completed").length;
    return Math.round((completed / task.subtasks.length) * 100);
  };

  const handleDeleteParentTask = (id: string) => {
    saveTasksToStorage(savedTasks.filter(t => t.id !== id));
    setDeleteConfirmTaskId(null);
    setAppStep("landing");
  };

  const handleOpenParentTask = (taskId: string) => {
    const task = savedTasks.find(t => t.id === taskId);
    if (task) {
      const recovery = generateContextRecovery(task);
      saveTasksToStorage(savedTasks.map(t => t.id === taskId ? { ...t, contextRecovery: recovery } : t));
    }
    setSelectedParentTaskId(taskId);
    setAppStep("parent_detail");
  };


  const currentSubtask = currentParentTask?.subtasks.find(s => s.id === selectedSubtaskId) || null;

  const updateSubtaskField = (subtaskId: string, updates: Partial<Subtask>) => {
    if (!currentParentTask) return;
    const updatedSubtasks = currentParentTask.subtasks.map(s =>
      s.id === subtaskId ? { ...s, ...updates } : s
    );
    saveTasksToStorage(savedTasks.map(t =>
      t.id === currentParentTask.id ? { ...t, subtasks: updatedSubtasks } : t
    ));
  };

  const handleStartSubtaskWork = (subtaskId: string) => {
    if (!currentParentTask) return;
    const sub = currentParentTask.subtasks.find(s => s.id === subtaskId);
    if (!sub) return;
    setSelectedSubtaskId(subtaskId);
    setInteractiveAnswers(
      sub.interactiveAnswers.length > 0
        ? [...sub.interactiveAnswers]
        : new Array(sub.interactiveSteps.length).fill("")
    );
    if (sub.status === "not_started") updateSubtaskField(subtaskId, { status: "active" });
    setTimeLeft(300);
    setIsTimerRunning(true);
    setAppStep("work_mode");
  };

  const handleNotesChange = (text: string) => {
    if (!selectedSubtaskId) return;
    updateSubtaskField(selectedSubtaskId, { notes: text });
  };

  const handleInteractiveAnswerChange = (index: number, val: string) => {
    const updated = [...interactiveAnswers];
    updated[index] = val;
    setInteractiveAnswers(updated);
  };

  const handleAddParkingThought = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentThought.trim() || !currentParentTask) return;
    const newThought: ParkingThought = {
      id: Date.now().toString(),
      text: currentThought.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    saveTasksToStorage(savedTasks.map(t =>
      t.id === currentParentTask.id
        ? { ...t, parkingThoughts: [newThought, ...(t.parkingThoughts || [])] }
        : t
    ));
    setCurrentThought("");
  };

  const handleCompleteSubtask = () => {
    if (!currentParentTask || !selectedSubtaskId) return;
    updateSubtaskField(selectedSubtaskId, { status: "completed", interactiveAnswers });
    setIsTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setAppStep("parent_detail");
    setSelectedSubtaskId(null);
  };

  const handleCopyEntirePlan = () => {
    if (!currentParentTask) return;
    const modeLabel = SUPPORT_MODES.find(m => m.id === currentParentTask.supportMode)?.label ?? currentParentTask.supportMode;
    const subtasksText = currentParentTask.subtasks
      .map((s, idx) => `${idx + 1}. 【${STATUS_LABELS[s.status]}】 ${s.title}\n   └ 成果物: ${s.concreteOutput}\n   └ メモ: ${s.notes || "記述なし"}`)
      .join("\n\n");
    const textToCopy = `【FirstStep Keeper 計画書】
■ 親タスク: ${currentParentTask.title}
■ AI診断: ${currentParentTask.diagnosis}
■ モード: ${modeLabel}
■ 作成日時: ${currentParentTask.createdAt}
■ 進捗度: ${getProgressPercentage(currentParentTask)}%

■ 分解された手順リスト:
${subtasksText}

FirstStep Keeper より温かい応援を込めて`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const toggleTimer = () => setIsTimerRunning(!isTimerRunning);
  const resetTimer = () => { setIsTimerRunning(false); setTimeLeft(300); };
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <header>
        <div className="app-logo" onClick={() => setAppStep("landing")} style={{ cursor: "pointer" }}>FirstStep Keeper</div>
        <div className="app-subtitle">優しく伴走するタスク分解パートナー</div>
      </header>

      <main className="container" style={{ maxWidth: appStep === "landing" && savedTasks.length === 0 ? "720px" : "1080px" }}>

        {/* ===== 1. ホーム画面 ===== */}
        {appStep === "landing" && (
          <div className="landing-layout fade-in" style={{ display: "flex", gap: "2rem", flexDirection: savedTasks.length > 0 ? "row" : "column", alignItems: "stretch" }}>
            <div className="landing-main card" style={{ flex: 1.2 }}>
              <h2 style={{ marginBottom: "1.5rem" }}>🧠 新しいタスクを分解する</h2>
              <p style={{ marginBottom: "2rem", fontSize: "0.95rem" }}>
                タスクが巨大で圧倒されそうなとき、どこから手をつければいいか見えず動けないとき。<br />
                あなたの頭の中を優しく整理し、心理的負担のない具体的なサブタスクへ分解します。
              </p>

              <div style={{ marginBottom: "1.5rem" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--text-muted)", display: "block", marginBottom: "0.5rem" }}>
                  💡 試してみる（クリックで入力されます）:
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {["ゼミの発表を準備したい", "就活の自己PRを書きたい", "研究計画を整理したい", "部屋を片付けたい", "レポートを書き始めたい"].map((example, i) => (
                    <button key={i} type="button" onClick={() => handleExampleChipClick(example)} className="example-chip"
                      style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem", borderRadius: "9999px", border: "1px solid var(--primary-light)", backgroundColor: "var(--primary-light)", color: "var(--primary)", cursor: "pointer", fontWeight: "500", transition: "var(--transition-smooth)" }}>
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleTaskSubmit} className="input-group">
                <textarea id="task-input" className="input-field" rows={4}
                  placeholder="例：ゼミの発表準備を始めたいけど、何からやればいいか分からない..."
                  value={originalTask} onChange={(e) => setOriginalTask(e.target.value)}
                  style={{ resize: "none" }} required />
                <button type="submit" className="btn btn-primary" style={{ marginTop: "1rem" }}>
                  <span>✨</span> タスクの分解プロセスを始める
                </button>
              </form>
            </div>

            {savedTasks.length > 0 && (
              <div className="landing-sidebar" style={{ flex: 1.1, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div className="sidebar-card" style={{ height: "100%", maxHeight: "550px", display: "flex", flexDirection: "column" }}>
                  <h3 style={{ borderBottom: "2px solid var(--accent-light)", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
                    💼 マイ・ワークスペース
                  </h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                    これまでに分解した計画の一覧です。いつでも開いて作業を再開できます。
                  </p>
                  <div className="saved-task-list" style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1rem", paddingRight: "0.25rem" }}>
                    {savedTasks.map((task) => {
                      const progress = getProgressPercentage(task);
                      const modeInfo = SUPPORT_MODES.find(m => m.id === task.supportMode);
                      return (
                        <div key={task.id} className="saved-task-card"
                          onClick={() => handleOpenParentTask(task.id)}
                          style={{ padding: "1.15rem", border: "1px solid var(--border)", borderRadius: "1rem", backgroundColor: "#ffffff", cursor: "pointer", transition: "var(--transition-smooth)", position: "relative" }}>
                          <h4 style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text-main)", marginBottom: "0.35rem", paddingRight: "3rem" }}>
                            {task.title}
                          </h4>
                          {modeInfo && (
                            <span style={{ fontSize: "0.72rem", color: "var(--primary)", fontWeight: "600", display: "inline-block", marginBottom: "0.4rem" }}>
                              {modeInfo.emoji} {modeInfo.label}
                            </span>
                          )}
                          <span style={{ fontSize: "0.75rem", color: "var(--text-light)", display: "block", marginBottom: "0.75rem" }}>
                            📅 {task.createdAt}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div style={{ flex: 1, height: "6px", backgroundColor: "var(--bg-base)", borderRadius: "3px", overflow: "hidden" }}>
                              <div style={{ width: `${progress}%`, height: "100%", backgroundColor: "var(--primary)" }} />
                            </div>
                            <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--primary)" }}>{progress}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== 2. 診断＆深掘り質問画面 ===== */}
        {appStep === "diagnosis" && diagnosisResult && (
          <div className="card fade-in">
            <h2 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              🔍 パートナーによるタスク診断
            </h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
              対象タスク：<strong style={{ color: "var(--text-main)" }}>「{originalTask}」</strong>
            </p>

            {diagnosisResult.isTooBig && (
              <div style={{ padding: "1.25rem 1.5rem", backgroundColor: "var(--accent-light)", borderLeft: "6px solid var(--accent)", borderRadius: "1.25rem", marginBottom: "1.5rem" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--accent-hover)", marginBottom: "0.4rem" }}>
                  ⚠️ このタスクはまだ広すぎるかもしれません
                </h3>
                <p style={{ fontSize: "0.9rem", color: "var(--text-main)", lineHeight: "1.6", whiteSpace: "pre-line" }}>
                  {diagnosisResult.tooBigNarrowingPrompt}
                </p>
              </div>
            )}

            <div className="diagnosis-box" style={{ padding: "1.5rem 1.75rem", backgroundColor: "var(--primary-light)", borderLeft: "6px solid var(--primary)", borderRadius: "1.25rem", marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--primary-hover)", marginBottom: "0.5rem" }}>
                ⚡ なぜこのタスクが難しく感じるのか？
              </h3>
              <p style={{ fontSize: "1.05rem", color: "var(--text-main)", lineHeight: "1.6" }}>
                {diagnosisResult.taskDiagnosis}
              </p>
            </div>

            <div style={{ padding: "1.25rem 1.5rem", backgroundColor: "#fff8f0", borderLeft: "4px solid var(--accent)", borderRadius: "1rem", marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--accent-hover)", marginBottom: "0.35rem" }}>
                🧠 あなたの今の状態
              </h3>
              <p style={{ fontSize: "0.95rem", color: "var(--text-main)", lineHeight: "1.6" }}>
                {diagnosisResult.userStateDiagnosis}
              </p>
            </div>

            <div className="encouraging-card" style={{ marginBottom: "2rem" }}>
              💬 {diagnosisResult.reframingMessage}
            </div>

            <form onSubmit={handleDiagnosisAnswersSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ padding: "1.5rem", border: "1.5px solid var(--border)", borderRadius: "1.5rem", backgroundColor: "#ffffff" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-main)", marginBottom: "1.25rem" }}>
                  💬 より解像度の高い計画を作るための質問
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {diagnosisResult.questions.map((question, i) => (
                    <div key={i} className="input-group" style={{ gap: "0.5rem" }}>
                      <label className="input-label" style={{ fontSize: "0.95rem" }}>{question}</label>
                      <input type="text" className="input-field"
                        placeholder="例：まだ明確に決まっていません / 10分程度です"
                        value={followUpAnswers[i] || ""} onChange={(e) => handleAnswerChange(i, e.target.value)}
                        style={{ padding: "0.75rem 1rem", fontSize: "0.95rem" }} required />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" onClick={() => setAppStep("landing")} className="btn btn-secondary" style={{ flex: 1 }}>
                  やり直す
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  ✨ この回答でモードを選ぶ
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ===== 3. サポートモード選択画面 ===== */}
        {appStep === "mode_select" && diagnosisResult && (
          <div className="card fade-in">
            <h2 style={{ marginBottom: "0.75rem" }}>🎯 今日のサポートモードを選ぶ</h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
              AIが診断した結果、あなたには
              <strong style={{ color: "var(--primary)" }}>
                {" "}{SUPPORT_MODES.find(m => m.id === diagnosisResult.recommendedMode)?.emoji}{" "}
                {SUPPORT_MODES.find(m => m.id === diagnosisResult.recommendedMode)?.label}
              </strong>
              {" "}モードがおすすめです。もちろん自分で選んでも構いません。
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", margin: "1.5rem 0" }}>
              {SUPPORT_MODES.map((mode) => {
                const isRecommended = mode.id === diagnosisResult.recommendedMode;
                return (
                  <button key={mode.id} onClick={() => handleModeSelect(mode.id)}
                    style={{
                      padding: "1.5rem", borderRadius: "1.25rem", textAlign: "left", cursor: "pointer", transition: "var(--transition-smooth)",
                      border: isRecommended ? "2.5px solid var(--primary)" : "1.5px solid var(--border)",
                      backgroundColor: isRecommended ? "var(--primary-light)" : "#ffffff",
                      boxShadow: isRecommended ? "0 6px 20px var(--primary-glow)" : "var(--shadow-soft)",
                      position: "relative", fontFamily: "var(--font-family)"
                    }}>
                    {isRecommended && (
                      <span style={{ position: "absolute", top: "0.75rem", right: "0.75rem", fontSize: "0.7rem", fontWeight: "700", backgroundColor: "var(--primary)", color: "#fff", padding: "0.2rem 0.5rem", borderRadius: "9999px" }}>
                        おすすめ
                      </span>
                    )}
                    <div style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>{mode.emoji}</div>
                    <div style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-main)", marginBottom: "0.5rem" }}>{mode.label}</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: "1.5", marginBottom: "0.75rem" }}>{mode.description}</div>
                    <div style={{ fontSize: "0.78rem", fontWeight: "600", color: "var(--primary)" }}>📋 {mode.subtaskCount}</div>
                  </button>
                );
              })}
            </div>

            <button onClick={() => setAppStep("diagnosis")} className="btn btn-secondary" style={{ width: "100%", marginTop: "0.5rem" }}>
              質問に戻る
            </button>
          </div>
        )}

        {/* ===== 4. サブタスク承認・編集画面 ===== */}
        {appStep === "editing" && (
          <div className="card fade-in">
            <h2 style={{ marginBottom: "0.5rem" }}>🛠️ 分解手順の確認と編集</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
              AIが自動生成した手順です。タイトルの編集、追加、削除、順序の並び替えができます。
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
              {editingSubtasks.map((sub, index) => (
                <div key={sub.id} className="edit-subtask-item"
                  style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem", border: "1px solid var(--border)", borderRadius: "1rem", backgroundColor: "#ffffff" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: "700", flexShrink: 0 }}>
                    {index + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input type="text" value={sub.title} onChange={(e) => handleSubtaskTitleChange(index, e.target.value)}
                      className="input-field" style={{ padding: "0.6rem 0.85rem", fontSize: "0.95rem", margin: 0, width: "100%" }} required />
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "9999px", backgroundColor: MENTAL_LOAD_COLORS[sub.mentalLoad] + "33", color: "#555", fontWeight: "600" }}>
                        {MENTAL_LOAD_LABELS[sub.mentalLoad]}
                      </span>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>⏱ {sub.estimatedTime}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.35rem", flexShrink: 0 }}>
                    <button type="button" onClick={() => moveSubtaskUp(index)} disabled={index === 0} className="btn-icon" style={{ padding: "0.4rem 0.6rem" }} title="上へ移動">▲</button>
                    <button type="button" onClick={() => moveSubtaskDown(index)} disabled={index === editingSubtasks.length - 1} className="btn-icon" style={{ padding: "0.4rem 0.6rem" }} title="下へ移動">▼</button>
                    <button type="button" onClick={() => deleteSubtask(index)} className="btn-icon" style={{ padding: "0.4rem 0.6rem", borderColor: "var(--accent)", color: "var(--accent-hover)" }} title="削除">🗑️</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <button type="button" onClick={addBlankSubtask} className="btn btn-secondary" style={{ borderStyle: "dashed", width: "100%", padding: "0.85rem" }}>
                ➕ 新しい手順を手動で追加する
              </button>
              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button onClick={() => setAppStep("mode_select")} className="btn btn-secondary" style={{ flex: 1 }}>
                  モード選択に戻る
                </button>
                <button onClick={handleApproveAndSave} className="btn btn-primary" style={{ flex: 2 }}>
                  🚀 この計画を保存してワークスペースを開く
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== 5. 親タスク詳細画面 ===== */}
        {appStep === "parent_detail" && currentParentTask && (
          <div className="session-layout fade-in">
            <div className="session-main card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", gap: "1rem" }}>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-light)", textTransform: "uppercase", fontWeight: "700" }}>
                    📂 親タスク詳細ワークスペース
                  </span>
                  <h2 style={{ fontSize: "1.6rem", marginTop: "0.25rem", color: "var(--text-main)" }}>
                    {currentParentTask.title}
                  </h2>
                </div>
                <button onClick={handleCopyEntirePlan} className="btn btn-secondary" style={{ fontSize: "0.85rem", padding: "0.5rem 1rem", whiteSpace: "nowrap" }}>
                  {copySuccess ? "✅ コピー完了！" : "📋 計画書をコピー"}
                </button>
              </div>

              {/* 全体進捗 */}
              <div style={{ background: "var(--bg-base)", padding: "1.25rem 1.5rem", borderRadius: "1.25rem", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-main)" }}>🎯 全体進捗</span>
                  <span style={{ fontSize: "0.95rem", fontWeight: "800", color: "var(--primary)" }}>{getProgressPercentage(currentParentTask)}%</span>
                </div>
                <div style={{ height: "10px", backgroundColor: "#e2e8f0", borderRadius: "5px", overflow: "hidden" }}>
                  <div style={{ width: `${getProgressPercentage(currentParentTask)}%`, height: "100%", backgroundColor: "var(--primary)", transition: "width 0.6s ease" }} />
                </div>
              </div>

              {/* コンテキスト復元カード */}
              {currentParentTask.contextRecovery && (
                <div style={{ padding: "1.25rem 1.5rem", backgroundColor: "#f0f7ff", borderLeft: "4px solid #3b82f6", borderRadius: "1rem", marginBottom: "1.5rem" }}>
                  <h3 style={{ fontSize: "0.9rem", fontWeight: "700", color: "#1e40af", marginBottom: "0.75rem" }}>
                    🔄 前回の作業の文脈を復元しました
                  </h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-main)", marginBottom: "0.4rem" }}>
                    <strong>📍 どこまで進んでいたか：</strong> {currentParentTask.contextRecovery.whereStopped}
                  </p>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-main)", marginBottom: "0.4rem" }}>
                    <strong>✅ 明確になったこと：</strong> {currentParentTask.contextRecovery.whatClarified}
                  </p>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-main)", marginBottom: "0.4rem" }}>
                    <strong>❓ 迷っていたこと：</strong> {currentParentTask.contextRecovery.whatConfusing}
                  </p>
                  <p style={{ fontSize: "0.85rem", color: "#1e40af", fontWeight: "600" }}>
                    ➡️ {currentParentTask.contextRecovery.recommendedRestart}
                  </p>
                </div>
              )}

              {/* AI診断要約 */}
              <div style={{ padding: "1.25rem", backgroundColor: "var(--primary-light)", borderRadius: "1rem", marginBottom: "2rem", borderLeft: "4px solid var(--primary)" }}>
                <p style={{ fontSize: "0.9rem", color: "var(--text-main)", lineHeight: "1.5" }}>
                  <strong>🤖 AIの作戦診断：</strong> {currentParentTask.diagnosis}
                </p>
              </div>

              {/* サブタスク一覧 */}
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "0.5rem", color: "var(--text-main)" }}>
                  🗺️ 分解された手順（クリックして集中作業モードを開始）
                </h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
                  どこから始めても構いません。やりやすい手順を選択すると、その手順専用のタイマーと作業画面が開きます。
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {currentParentTask.subtasks.map((sub) => {
                    const isCompleted = sub.status === "completed";
                    const advice = getStatusAdvice(sub.status);
                    return (
                      <div key={sub.id}
                        onClick={() => !isCompleted && handleStartSubtaskWork(sub.id)}
                        className={`checklist-item ${isCompleted ? "checked" : ""}`}
                        style={{ padding: "1.25rem", cursor: isCompleted ? "default" : "pointer", opacity: isCompleted ? 0.7 : 1, backgroundColor: isCompleted ? "var(--primary-light)" : "#ffffff", border: "1px solid var(--border)", borderRadius: "1.25rem", transition: "var(--transition-smooth)", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                        <div style={{ width: "22px", height: "22px", borderRadius: "5px", border: "2px solid var(--primary)", backgroundColor: isCompleted ? "var(--primary)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontSize: "0.75rem", fontWeight: "bold", flexShrink: 0, marginTop: "2px" }}>
                          {isCompleted && "✓"}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
                            <span className="checklist-text" style={{ fontSize: "1.05rem", fontWeight: "700", color: "var(--text-main)", textDecoration: isCompleted ? "line-through" : "none" }}>
                              {sub.title}
                            </span>
                            <span style={{ fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "9999px", backgroundColor: STATUS_COLORS[sub.status] + "22", color: STATUS_COLORS[sub.status], fontWeight: "700", border: `1px solid ${STATUS_COLORS[sub.status]}44` }}>
                              {STATUS_LABELS[sub.status]}
                            </span>
                            <span style={{ fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "9999px", backgroundColor: MENTAL_LOAD_COLORS[sub.mentalLoad] + "33", color: "#555", fontWeight: "600" }}>
                              {MENTAL_LOAD_LABELS[sub.mentalLoad]}
                            </span>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>⏱ {sub.estimatedTime}</span>
                          </div>
                          {!isCompleted && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.4" }}>
                                💡 <strong>なぜやるか：</strong> {sub.whyItMatters}
                              </p>
                              <p style={{ fontSize: "0.85rem", color: "var(--accent-hover)", fontWeight: "600", lineHeight: "1.4" }}>
                                ✅ <strong>これで十分：</strong> {sub.goodEnoughScope}
                              </p>
                            </div>
                          )}
                          {isCompleted && (
                            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                              🎉 この手順は完了しました。
                            </p>
                          )}
                          {advice && (
                            <div style={{ marginTop: "0.5rem", padding: "0.5rem 0.75rem", backgroundColor: "var(--accent-light)", borderRadius: "6px", fontSize: "0.82rem", color: "var(--accent-hover)", lineHeight: "1.4" }}>
                              💬 {advice}
                            </div>
                          )}
                          {sub.notes && (
                            <div style={{ marginTop: "0.5rem", padding: "0.5rem 0.75rem", backgroundColor: "rgba(255,255,255,0.7)", borderRadius: "6px", fontSize: "0.8rem", color: "var(--text-main)", fontStyle: "italic", border: "1px solid var(--border)" }}>
                              ✏️ 保存されたメモあり ({sub.notes.length}文字)
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* サイドバー */}
            <div className="session-sidebar">
              <div className="sidebar-card" style={{ padding: "1.25rem" }}>
                <button onClick={() => setAppStep("landing")} className="btn btn-secondary" style={{ width: "100%", fontSize: "0.9rem", padding: "0.75rem" }}>
                  🏠 計画一覧（ホーム）に戻る
                </button>
                <button onClick={() => setDeleteConfirmTaskId(currentParentTask.id)} className="btn btn-text" style={{ width: "100%", color: "var(--accent-hover)", marginTop: "0.5rem", fontSize: "0.85rem" }}>
                  🗑️ この計画を削除する
                </button>
              </div>

              <div className="parking-lot-section" style={{ marginTop: "0" }}>
                <div className="parking-title"><span>🚗</span> Parking Lot (気が散り避難所)</div>
                <p className="parking-subtitle" style={{ marginBottom: "1rem" }}>
                  このタスクの進行中に一時退避した雑念のリストです。
                </p>
                {(currentParentTask.parkingThoughts || []).length > 0 ? (
                  <div className="parking-list" style={{ maxHeight: "250px" }}>
                    {currentParentTask.parkingThoughts.map((thought) => (
                      <div key={thought.id} className="parking-item" style={{ backgroundColor: "#ffffff" }}>
                        <span>{thought.text}</span>
                        <span className="badge" style={{ fontSize: "0.7rem" }}>{thought.timestamp}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", padding: "1rem 0" }}>
                    退避した雑念はありません。
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== 6. サブタスク個別作業モード ===== */}
        {appStep === "work_mode" && currentParentTask && currentSubtask && (
          <div className="session-layout fade-in">
            <div className="session-main card">
              <button onClick={() => { setAppStep("parent_detail"); setSelectedSubtaskId(null); setIsTimerRunning(false); }}
                className="btn btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
                ⬅️ 計画ワークスペースに戻る
              </button>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--accent)", textTransform: "uppercase", fontWeight: "700" }}>
                    🔥 個別手順フォーカス空間
                  </span>
                  <span style={{ fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "9999px", backgroundColor: MENTAL_LOAD_COLORS[currentSubtask.mentalLoad] + "33", color: "#555", fontWeight: "600" }}>
                    {MENTAL_LOAD_LABELS[currentSubtask.mentalLoad]}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>⏱ {currentSubtask.estimatedTime}</span>
                </div>
                <h2 style={{ fontSize: "1.4rem", color: "var(--text-main)", marginBottom: "1rem" }}>
                  {currentSubtask.title}
                </h2>
              </div>

              {/* なぜ重要か */}
              <div style={{ padding: "1.15rem", backgroundColor: "var(--primary-light)", borderRadius: "1rem", marginBottom: "1.25rem", borderLeft: "4px solid var(--primary)" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--primary)", display: "block", marginBottom: "0.25rem" }}>
                  💡 なぜこの手順が必要か？
                </span>
                <p style={{ fontSize: "0.95rem", color: "var(--text-main)", lineHeight: "1.5" }}>{currentSubtask.whyItMatters}</p>
              </div>

              {/* Good Enough スコープ と 成果物 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <div style={{ padding: "1rem", backgroundColor: "var(--accent-light)", borderRadius: "1rem", borderLeft: "3px solid var(--accent)" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--accent-hover)", display: "block", marginBottom: "0.25rem" }}>
                    ✅ これで十分（Good Enough）
                  </span>
                  <p style={{ fontSize: "0.88rem", color: "var(--text-main)", lineHeight: "1.4" }}>{currentSubtask.goodEnoughScope}</p>
                </div>
                <div style={{ padding: "1rem", backgroundColor: "#f0f7ff", borderRadius: "1rem", borderLeft: "3px solid #3b82f6" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "#1e40af", display: "block", marginBottom: "0.25rem" }}>
                    📦 目標の成果物
                  </span>
                  <p style={{ fontSize: "0.88rem", color: "var(--text-main)", lineHeight: "1.4" }}>{currentSubtask.concreteOutput}</p>
                </div>
              </div>

              {/* ミニタイマー */}
              <div className="session-timer-mini" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1.5rem", background: "var(--bg-base)", padding: "1rem 2rem", borderRadius: "1.5rem", marginBottom: "2rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "1.4rem" }}>⏱️</span>
                  <span style={{ fontSize: "2rem", fontWeight: "700", fontFeatureSettings: "'tnum'" }}>{formatTime(timeLeft)}</span>
                </div>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button onClick={toggleTimer} className="btn btn-primary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.9rem", borderRadius: "0.75rem" }}>
                    {isTimerRunning ? "⏸️ 一時停止" : "▶️ スタート"}
                  </button>
                  <button onClick={resetTimer} className="btn btn-secondary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.9rem", borderRadius: "0.75rem" }}>
                    🔄 リセット
                  </button>
                </div>
              </div>

              {timeLeft === 0 && (
                <div className="encouraging-card" style={{ backgroundColor: "var(--primary-light)", color: "var(--primary-hover)", borderLeftColor: "var(--primary)", marginBottom: "1.5rem" }}>
                  🎉 素晴らしい！5分間向き合えました。自分のペースでメモを完成させ、完了ボタンを押してくださいね。
                </div>
              )}

              {/* インタラクティブステップ（ガイド付き質問） */}
              {currentSubtask.interactiveSteps.length > 0 && (
                <div style={{ marginBottom: "2rem" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "0.75rem", color: "var(--text-main)" }}>
                    🗣️ 手順ガイド（記入することで思考が整理されます）
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {currentSubtask.interactiveSteps.map((step, idx) => (
                      <div key={idx} className="input-group" style={{ gap: "0.4rem" }}>
                        <label className="input-label" style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>
                          Q{idx + 1}. {step.question}
                        </label>
                        <input type="text" className="input-field"
                          placeholder={step.placeholder}
                          value={interactiveAnswers[idx] || ""}
                          onChange={(e) => handleInteractiveAnswerChange(idx, e.target.value)}
                          style={{ padding: "0.65rem 1rem", fontSize: "0.9rem" }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* メモ帳エリア */}
              <div className="input-group" style={{ marginBottom: "2.5rem" }}>
                <label className="input-label" htmlFor="notes-area" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>✏️ ワークスペース（メモ・思考の下書き）</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: "500" }}>✓ 自動保存されます</span>
                </label>
                <textarea id="notes-area" className="input-field" rows={6}
                  placeholder="ここに自由に考えやアウトライン、メモを書き殴ってください。入力内容は自動的に保存されます。"
                  value={currentSubtask.notes} onChange={(e) => handleNotesChange(e.target.value)}
                  style={{ resize: "none", fontFamily: "var(--font-family)" }} />
              </div>

              <button onClick={handleCompleteSubtask} className="btn btn-primary animate-pulse" style={{ width: "100%", padding: "1.1rem", fontSize: "1.1rem" }}>
                🏆 この手順を完了して計画に戻る
              </button>
            </div>

            {/* サイドバー */}
            <div className="session-sidebar">
              <div className="sidebar-card" style={{ padding: "1.25rem" }}>
                <h3>📁 親計画情報</h3>
                <div className="sidebar-info-item">
                  <span className="label">親タスク:</span>
                  <p>{currentParentTask.title}</p>
                </div>
                <div className="sidebar-info-item">
                  <span className="label">進捗:</span>
                  <p style={{ color: "var(--primary)", fontWeight: "700" }}>{getProgressPercentage(currentParentTask)}%</p>
                </div>
              </div>

              <div className="parking-lot-section" style={{ marginTop: "0" }}>
                <div className="parking-title"><span>🚗</span> Parking Lot (気が散り避難所)</div>
                <p className="parking-subtitle" style={{ marginBottom: "0.75rem" }}>
                  セッション中、「今すぐやらなくていいこと」を思いついたらここに退避させてください。
                </p>
                <form onSubmit={handleAddParkingThought} style={{ display: "flex", gap: "0.5rem" }}>
                  <input type="text" className="input-field"
                    placeholder="例: あ、別の用事を思い出した..."
                    value={currentThought} onChange={(e) => setCurrentThought(e.target.value)}
                    style={{ padding: "0.5rem 0.85rem", fontSize: "0.85rem", borderRadius: "0.75rem" }} />
                  <button type="submit" className="btn btn-accent" style={{ padding: "0.5rem 1rem", borderRadius: "0.75rem", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                    退避する
                  </button>
                </form>
                {(currentParentTask.parkingThoughts || []).length > 0 && (
                  <div className="parking-list" style={{ maxHeight: "250px", marginTop: "1rem" }}>
                    {currentParentTask.parkingThoughts.map((thought) => (
                      <div key={thought.id} className="parking-item" style={{ padding: "0.6rem 0.85rem", fontSize: "0.85rem" }}>
                        <span>{thought.text}</span>
                        <span className="badge" style={{ fontSize: "0.7rem" }}>{thought.timestamp}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== 7. 計画削除確認モーダル ===== */}
        {deleteConfirmTaskId && (
          <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
            <div className="card fade-in" style={{ maxWidth: "500px", width: "100%", padding: "2rem", boxShadow: "0 20px 48px rgba(0,0,0,0.15)" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1rem", color: "var(--accent-hover)" }}>
                🗑️ 計画を削除しますか？
              </h3>
              <p style={{ fontSize: "0.95rem", color: "var(--text-main)", marginBottom: "1.5rem", lineHeight: "1.6" }}>
                このタスク計画および関連するすべての手順の進捗、メモ、Parking Lot のデータが完全に消去されます。元に戻すことはできません。
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <button onClick={() => handleDeleteParentTask(deleteConfirmTaskId)} className="btn btn-accent" style={{ padding: "0.85rem" }}>
                  はい、計画を完全に削除します
                </button>
                <button onClick={() => setDeleteConfirmTaskId(null)} className="btn btn-secondary" style={{ padding: "0.85rem" }}>
                  いいえ、削除しません
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer>
        &copy; {new Date().getFullYear()} FirstStep Keeper. 温かく自分のペースで歩みを進めましょう。
      </footer>

      {isLoading && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.85)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ width: "48px", height: "48px", border: "4px solid var(--primary-light)", borderTop: "4px solid var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: "1rem" }} />
          <p style={{ fontSize: "1rem", color: "var(--primary)", fontWeight: "600" }}>{loadingMessage}</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </>
  );
}
