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
import { getDiagnosis, generateSubtasks, generateContextRecovery, getUnstuckHelp, type UnstuckResult } from "./utils/apiClient";
import { getT, type Lang } from "./utils/i18n";

type AppStep =
  | "landing"
  | "diagnosis"
  | "mode_select"
  | "editing"
  | "parent_detail"
  | "work_mode";

type EnergyLevel = "low" | "normal" | "high";

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

const LANG_META: Record<Lang, { flag: string; label: string }> = {
  ja: { flag: "🇯🇵", label: "日本語" },
  en: { flag: "🇺🇸", label: "English" },
  zh: { flag: "🇨🇳", label: "中文" },
};

export default function App() {
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem("firststep_lang") as Lang) || "ja";
  });
  const T = getT(lang);

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
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | null>(null);
  const [showEnergyModal, setShowEnergyModal] = useState(false);
  const [pendingSubtaskId, setPendingSubtaskId] = useState<string | null>(null);
  const [unstuckResult, setUnstuckResult] = useState<UnstuckResult | null>(null);
  const [isUnstuckLoading, setIsUnstuckLoading] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

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

  useEffect(() => {
    setEnergyLevel(null);
    setUnstuckResult(null);
  }, [selectedParentTaskId]);

  const handleLangChange = (l: Lang) => {
    setLang(l);
    localStorage.setItem("firststep_lang", l);
    setShowLangMenu(false);
  };

  const handleExampleChipClick = (exampleText: string) => {
    setOriginalTask(exampleText);
    document.getElementById("task-input")?.focus();
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originalTask.trim()) return;
    setIsLoading(true);
    setLoadingMessage(T.loading.diagnosis);
    try {
      const result = await getDiagnosis(originalTask);
      setDiagnosisResult(result);
      setFollowUpAnswers(new Array(result.questions.length).fill(""));
      setSelectedMode(result.recommendedMode);
      setAppStep("diagnosis");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Diagnosis failed:', msg);
      alert(T.alerts.diagnosisFailed + msg);
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
    setLoadingMessage(T.loading.subtasks);
    try {
      const generated = await generateSubtasks(originalTask, followUpAnswers, mode);
      setSelectedMode(mode);
      setEditingSubtasks(generated);
      setAppStep("editing");
    } catch (err) {
      console.error(err);
      alert(T.alerts.subtasksFailed);
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
      title: T.editing.newTitle,
      whyItMatters: T.editing.newWhy,
      goodEnoughScope: T.editing.newScope,
      mentalLoad: "low",
      estimatedTime: "5〜10分",
      concreteOutput: T.editing.newOutput,
      status: "not_started",
      notes: "",
      interactiveSteps: [
        { question: T.editing.newQuestion, placeholder: T.editing.newPlaceholder }
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

  const recommendedSubtaskIds: Set<string> = (() => {
    if (!currentParentTask || !energyLevel || energyLevel === "normal") return new Set<string>();
    const targetLoad = energyLevel === "low" ? "low" : "high";
    return new Set(
      currentParentTask.subtasks
        .filter(s => s.status !== "completed" && s.mentalLoad === targetLoad)
        .map(s => s.id)
    );
  })();

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

  const startSubtaskWorkImpl = (subtaskId: string) => {
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
    setUnstuckResult(null);
    setAppStep("work_mode");
  };

  const handleStartSubtaskWork = (subtaskId: string) => {
    if (energyLevel === null) {
      setPendingSubtaskId(subtaskId);
      setShowEnergyModal(true);
    } else {
      startSubtaskWorkImpl(subtaskId);
    }
  };

  const handleEnergySelect = (level: EnergyLevel) => {
    setEnergyLevel(level);
    setShowEnergyModal(false);
    if (pendingSubtaskId) {
      startSubtaskWorkImpl(pendingSubtaskId);
      setPendingSubtaskId(null);
    }
  };

  const handleUnstuckClick = async () => {
    if (!currentParentTask || !currentSubtask) return;
    setIsUnstuckLoading(true);
    try {
      const result = await getUnstuckHelp(
        currentParentTask.title,
        currentSubtask.title,
        currentSubtask.whyItMatters,
        currentSubtask.notes,
        lang
      );
      setUnstuckResult(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(T.alerts.unstuckFailed + msg);
    } finally {
      setIsUnstuckLoading(false);
    }
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
    const modeKey = currentParentTask.supportMode as keyof typeof T.modes;
    const modeLabel = T.modes[modeKey]?.label ?? currentParentTask.supportMode;
    const modeEmoji = SUPPORT_MODES.find(m => m.id === currentParentTask.supportMode)?.emoji ?? "";
    const subtasksText = currentParentTask.subtasks
      .map((s, idx) => `${idx + 1}. 【${T.status[s.status]}】 ${s.title}\n${T.copyPlan.output}${s.concreteOutput}\n${T.copyPlan.notes}${s.notes || T.copyPlan.noNotes}`)
      .join("\n\n");
    const textToCopy = `${T.copyPlan.header}
${T.copyPlan.parentTask}${currentParentTask.title}
${T.copyPlan.aiDiagnosis}${currentParentTask.diagnosis}
${T.copyPlan.mode}${modeEmoji} ${modeLabel}
${T.copyPlan.createdAt}${currentParentTask.createdAt}
${T.copyPlan.progress}${getProgressPercentage(currentParentTask)}%

${T.copyPlan.subtasksList}
${subtasksText}

${T.copyPlan.footer}`;
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

  const currentEnergyOpt = T.energy.options.find((_, i) => (["low","normal","high"] as EnergyLevel[])[i] === energyLevel);

  return (
    <>
      <header>
        <div className="app-logo" onClick={() => setAppStep("landing")} style={{ cursor: "pointer" }}>{T.appTitle}</div>
        <div className="app-subtitle">{T.appSubtitle}</div>
      </header>

      <main className="container" style={{ maxWidth: appStep === "landing" && savedTasks.length === 0 ? "720px" : "1080px" }}>

        {/* ===== 1. Landing ===== */}
        {appStep === "landing" && (
          <div className="landing-layout fade-in" style={{ display: "flex", gap: "2rem", flexDirection: savedTasks.length > 0 ? "row" : "column", alignItems: "stretch" }}>
            <div className="landing-main card" style={{ flex: 1.2 }}>
              <h2 style={{ marginBottom: "1.5rem" }}>{T.landing.title}</h2>
              <p style={{ marginBottom: "2rem", fontSize: "0.95rem" }}>
                {T.landing.desc1}<br />{T.landing.desc2}
              </p>

              <div style={{ marginBottom: "1.5rem" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--text-muted)", display: "block", marginBottom: "0.5rem" }}>
                  {T.landing.exampleLabel}
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {T.landing.examples.map((example, i) => (
                    <button key={i} type="button" onClick={() => handleExampleChipClick(example)} className="example-chip"
                      style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem", borderRadius: "9999px", border: "1px solid var(--primary-light)", backgroundColor: "var(--primary-light)", color: "var(--primary)", cursor: "pointer", fontWeight: "500", transition: "var(--transition-smooth)" }}>
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleTaskSubmit} className="input-group">
                <textarea id="task-input" className="input-field" rows={4}
                  placeholder={T.landing.placeholder}
                  value={originalTask} onChange={(e) => setOriginalTask(e.target.value)}
                  style={{ resize: "none" }} required />
                <button type="submit" className="btn btn-primary" style={{ marginTop: "1rem" }}>
                  <span>✨</span> {T.landing.submitBtn}
                </button>
              </form>
            </div>

            {savedTasks.length > 0 && (
              <div className="landing-sidebar" style={{ flex: 1.1, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div className="sidebar-card" style={{ height: "100%", maxHeight: "550px", display: "flex", flexDirection: "column" }}>
                  <h3 style={{ borderBottom: "2px solid var(--accent-light)", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
                    {T.landing.workspaceTitle}
                  </h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                    {T.landing.workspaceDesc}
                  </p>
                  <div className="saved-task-list" style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1rem", paddingRight: "0.25rem" }}>
                    {savedTasks.map((task) => {
                      const progress = getProgressPercentage(task);
                      const modeInfo = SUPPORT_MODES.find(m => m.id === task.supportMode);
                      const modeLabel = T.modes[task.supportMode as keyof typeof T.modes]?.label;
                      return (
                        <div key={task.id} className="saved-task-card"
                          onClick={() => handleOpenParentTask(task.id)}
                          style={{ padding: "1.15rem", border: "1px solid var(--border)", borderRadius: "1rem", backgroundColor: "#ffffff", cursor: "pointer", transition: "var(--transition-smooth)", position: "relative" }}>
                          <h4 style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text-main)", marginBottom: "0.35rem", paddingRight: "3rem" }}>
                            {task.title}
                          </h4>
                          {modeInfo && (
                            <span style={{ fontSize: "0.72rem", color: "var(--primary)", fontWeight: "600", display: "inline-block", marginBottom: "0.4rem" }}>
                              {modeInfo.emoji} {modeLabel ?? modeInfo.label}
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

        {/* ===== 2. Diagnosis ===== */}
        {appStep === "diagnosis" && diagnosisResult && (
          <div className="card fade-in">
            <h2 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {T.diagnosis.title}
            </h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
              {T.diagnosis.targetPrefix}<strong style={{ color: "var(--text-main)" }}>「{originalTask}」</strong>
            </p>

            {diagnosisResult.isTooBig && (
              <div style={{ padding: "1.25rem 1.5rem", backgroundColor: "var(--accent-light)", borderLeft: "6px solid var(--accent)", borderRadius: "1.25rem", marginBottom: "1.5rem" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--accent-hover)", marginBottom: "0.4rem" }}>
                  {T.diagnosis.tooBigTitle}
                </h3>
                <p style={{ fontSize: "0.9rem", color: "var(--text-main)", lineHeight: "1.6", whiteSpace: "pre-line" }}>
                  {diagnosisResult.tooBigNarrowingPrompt}
                </p>
              </div>
            )}

            <div className="diagnosis-box" style={{ padding: "1.5rem 1.75rem", backgroundColor: "var(--primary-light)", borderLeft: "6px solid var(--primary)", borderRadius: "1.25rem", marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--primary-hover)", marginBottom: "0.5rem" }}>
                {T.diagnosis.whyHardTitle}
              </h3>
              <p style={{ fontSize: "1.05rem", color: "var(--text-main)", lineHeight: "1.6" }}>
                {diagnosisResult.taskDiagnosis}
              </p>
            </div>

            <div style={{ padding: "1.25rem 1.5rem", backgroundColor: "#fff8f0", borderLeft: "4px solid var(--accent)", borderRadius: "1rem", marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--accent-hover)", marginBottom: "0.35rem" }}>
                {T.diagnosis.stateTitle}
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
                  {T.diagnosis.questionsTitle}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {diagnosisResult.questions.map((question, i) => (
                    <div key={i} className="input-group" style={{ gap: "0.5rem" }}>
                      <label className="input-label" style={{ fontSize: "0.95rem" }}>{question}</label>
                      <input type="text" className="input-field"
                        placeholder={T.diagnosis.qPlaceholder}
                        value={followUpAnswers[i] || ""} onChange={(e) => handleAnswerChange(i, e.target.value)}
                        style={{ padding: "0.75rem 1rem", fontSize: "0.95rem" }} required />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" onClick={() => setAppStep("landing")} className="btn btn-secondary" style={{ flex: 1 }}>
                  {T.diagnosis.backBtn}
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  {T.diagnosis.nextBtn}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ===== 3. Mode Select ===== */}
        {appStep === "mode_select" && diagnosisResult && (
          <div className="card fade-in">
            <h2 style={{ marginBottom: "0.75rem" }}>{T.modeSelect.title}</h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
              {T.modeSelect.aiRecommendsPrefix}
              <strong style={{ color: "var(--primary)" }}>
                {" "}{SUPPORT_MODES.find(m => m.id === diagnosisResult.recommendedMode)?.emoji}{" "}
                {T.modes[diagnosisResult.recommendedMode as keyof typeof T.modes]?.label}
              </strong>
              {" "}{T.modeSelect.aiRecommendsSuffix}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", margin: "1.5rem 0" }}>
              {SUPPORT_MODES.map((mode) => {
                const isRecommended = mode.id === diagnosisResult.recommendedMode;
                const modeT = T.modes[mode.id as keyof typeof T.modes];
                return (
                  <button key={mode.id} onClick={() => handleModeSelect(mode.id as SupportMode)}
                    style={{
                      padding: "1.5rem", borderRadius: "1.25rem", textAlign: "left", cursor: "pointer", transition: "var(--transition-smooth)",
                      border: isRecommended ? "2.5px solid var(--primary)" : "1.5px solid var(--border)",
                      backgroundColor: isRecommended ? "var(--primary-light)" : "#ffffff",
                      boxShadow: isRecommended ? "0 6px 20px var(--primary-glow)" : "var(--shadow-soft)",
                      position: "relative", fontFamily: "var(--font-family)"
                    }}>
                    {isRecommended && (
                      <span style={{ position: "absolute", top: "0.75rem", right: "0.75rem", fontSize: "0.7rem", fontWeight: "700", backgroundColor: "var(--primary)", color: "#fff", padding: "0.2rem 0.5rem", borderRadius: "9999px" }}>
                        {T.modeSelect.recommendedTag}
                      </span>
                    )}
                    <div style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>{mode.emoji}</div>
                    <div style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-main)", marginBottom: "0.5rem" }}>{modeT?.label ?? mode.label}</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: "1.5", marginBottom: "0.75rem" }}>{modeT?.description ?? mode.description}</div>
                    <div style={{ fontSize: "0.78rem", fontWeight: "600", color: "var(--primary)" }}>📋 {modeT?.subtaskCount ?? mode.subtaskCount}</div>
                  </button>
                );
              })}
            </div>

            <button onClick={() => setAppStep("diagnosis")} className="btn btn-secondary" style={{ width: "100%", marginTop: "0.5rem" }}>
              {T.modeSelect.backBtn}
            </button>
          </div>
        )}

        {/* ===== 4. Editing ===== */}
        {appStep === "editing" && (
          <div className="card fade-in">
            <h2 style={{ marginBottom: "0.5rem" }}>{T.editing.title}</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
              {T.editing.desc}
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
                        {T.mentalLoad[sub.mentalLoad as keyof typeof T.mentalLoad]}
                      </span>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>⏱ {sub.estimatedTime}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.35rem", flexShrink: 0 }}>
                    <button type="button" onClick={() => moveSubtaskUp(index)} disabled={index === 0} className="btn-icon" style={{ padding: "0.4rem 0.6rem" }}>▲</button>
                    <button type="button" onClick={() => moveSubtaskDown(index)} disabled={index === editingSubtasks.length - 1} className="btn-icon" style={{ padding: "0.4rem 0.6rem" }}>▼</button>
                    <button type="button" onClick={() => deleteSubtask(index)} className="btn-icon" style={{ padding: "0.4rem 0.6rem", borderColor: "var(--accent)", color: "var(--accent-hover)" }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <button type="button" onClick={addBlankSubtask} className="btn btn-secondary" style={{ borderStyle: "dashed", width: "100%", padding: "0.85rem" }}>
                {T.editing.addBtn}
              </button>
              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button onClick={() => setAppStep("mode_select")} className="btn btn-secondary" style={{ flex: 1 }}>
                  {T.editing.backBtn}
                </button>
                <button onClick={handleApproveAndSave} className="btn btn-primary" style={{ flex: 2 }}>
                  {T.editing.saveBtn}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== 5. Parent Detail ===== */}
        {appStep === "parent_detail" && currentParentTask && (
          <div className="session-layout fade-in">
            <div className="session-main card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", gap: "1rem" }}>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-light)", textTransform: "uppercase", fontWeight: "700" }}>
                    {T.parentDetail.breadcrumb}
                  </span>
                  <h2 style={{ fontSize: "1.6rem", marginTop: "0.25rem", color: "var(--text-main)" }}>
                    {currentParentTask.title}
                  </h2>
                </div>
                <button onClick={handleCopyEntirePlan} className="btn btn-secondary" style={{ fontSize: "0.85rem", padding: "0.5rem 1rem", whiteSpace: "nowrap" }}>
                  {copySuccess ? T.parentDetail.copiedBtn : T.parentDetail.copyBtn}
                </button>
              </div>

              {/* Progress */}
              <div style={{ background: "var(--bg-base)", padding: "1.25rem 1.5rem", borderRadius: "1.25rem", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-main)" }}>{T.parentDetail.progressTitle}</span>
                  <span style={{ fontSize: "0.95rem", fontWeight: "800", color: "var(--primary)" }}>{getProgressPercentage(currentParentTask)}%</span>
                </div>
                <div style={{ height: "10px", backgroundColor: "#e2e8f0", borderRadius: "5px", overflow: "hidden" }}>
                  <div style={{ width: `${getProgressPercentage(currentParentTask)}%`, height: "100%", backgroundColor: "var(--primary)", transition: "width 0.6s ease" }} />
                </div>
              </div>

              {/* Energy selector */}
              <div className="energy-selector-bar">
                <span className="energy-selector-label">{T.energy.selectorLabel}</span>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {T.energy.options.map((opt, i) => {
                    const lvl = (["low","normal","high"] as EnergyLevel[])[i];
                    return (
                      <button key={lvl} onClick={() => setEnergyLevel(lvl)}
                        className={`energy-option-btn${energyLevel === lvl ? " selected" : ""}`}>
                        {opt.emoji} {opt.label}
                      </button>
                    );
                  })}
                </div>
                {!energyLevel && (
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                    {T.energy.hintIdle}
                  </span>
                )}
                {energyLevel && energyLevel !== "normal" && currentEnergyOpt && (
                  <span style={{ fontSize: "0.78rem", color: "var(--primary)", fontWeight: "600" }}>
                    {T.energy.hintActivePrefix}{currentEnergyOpt.description}{T.energy.hintActiveSuffix}
                  </span>
                )}
              </div>

              {/* Context recovery */}
              {currentParentTask.contextRecovery && (
                <div style={{ padding: "1.25rem 1.5rem", backgroundColor: "#f0f7ff", borderLeft: "4px solid #3b82f6", borderRadius: "1rem", marginBottom: "1.5rem" }}>
                  <h3 style={{ fontSize: "0.9rem", fontWeight: "700", color: "#1e40af", marginBottom: "0.75rem" }}>
                    {T.parentDetail.contextTitle}
                  </h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-main)", marginBottom: "0.4rem" }}>
                    <strong>{T.parentDetail.contextWhere}</strong> {currentParentTask.contextRecovery.whereStopped}
                  </p>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-main)", marginBottom: "0.4rem" }}>
                    <strong>{T.parentDetail.contextClarified}</strong> {currentParentTask.contextRecovery.whatClarified}
                  </p>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-main)", marginBottom: "0.4rem" }}>
                    <strong>{T.parentDetail.contextConfusing}</strong> {currentParentTask.contextRecovery.whatConfusing}
                  </p>
                  <p style={{ fontSize: "0.85rem", color: "#1e40af", fontWeight: "600" }}>
                    ➡️ {currentParentTask.contextRecovery.recommendedRestart}
                  </p>
                </div>
              )}

              {/* AI diagnosis */}
              <div style={{ padding: "1.25rem", backgroundColor: "var(--primary-light)", borderRadius: "1rem", marginBottom: "2rem", borderLeft: "4px solid var(--primary)" }}>
                <p style={{ fontSize: "0.9rem", color: "var(--text-main)", lineHeight: "1.5" }}>
                  <strong>{T.parentDetail.aiLabel}</strong> {currentParentTask.diagnosis}
                </p>
              </div>

              {/* Subtask list */}
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "0.5rem", color: "var(--text-main)" }}>
                  {T.parentDetail.subtasksTitle}
                </h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
                  {T.parentDetail.subtasksDesc}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {currentParentTask.subtasks.map((sub) => {
                    const isCompleted = sub.status === "completed";
                    const isRecommended = recommendedSubtaskIds.has(sub.id);
                    const advice = getStatusAdvice(sub.status);
                    return (
                      <div key={sub.id}
                        onClick={() => !isCompleted && handleStartSubtaskWork(sub.id)}
                        className={`checklist-item ${isCompleted ? "checked" : ""}${isRecommended ? " recommended" : ""}`}
                        style={{ padding: "1.25rem", cursor: isCompleted ? "default" : "pointer", opacity: isCompleted ? 0.7 : 1, backgroundColor: isCompleted ? "var(--primary-light)" : "#ffffff", border: isRecommended ? "2px solid var(--accent)" : "1px solid var(--border)", borderRadius: "1.25rem", transition: "var(--transition-smooth)", display: "flex", gap: "1rem", alignItems: "flex-start", boxShadow: isRecommended ? "0 4px 16px var(--accent-glow)" : "none" }}>
                        <div style={{ width: "22px", height: "22px", borderRadius: "5px", border: "2px solid var(--primary)", backgroundColor: isCompleted ? "var(--primary)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontSize: "0.75rem", fontWeight: "bold", flexShrink: 0, marginTop: "2px" }}>
                          {isCompleted && "✓"}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
                            <span className="checklist-text" style={{ fontSize: "1.05rem", fontWeight: "700", color: "var(--text-main)", textDecoration: isCompleted ? "line-through" : "none" }}>
                              {sub.title}
                            </span>
                            {isRecommended && (
                              <span style={{ fontSize: "0.72rem", padding: "0.2rem 0.6rem", borderRadius: "9999px", backgroundColor: "var(--accent)", color: "#fff", fontWeight: "700" }}>
                                {T.energy.recommendedTag}
                              </span>
                            )}
                            <span style={{ fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "9999px", backgroundColor: STATUS_COLORS[sub.status] + "22", color: STATUS_COLORS[sub.status], fontWeight: "700", border: `1px solid ${STATUS_COLORS[sub.status]}44` }}>
                              {T.status[sub.status]}
                            </span>
                            <span style={{ fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "9999px", backgroundColor: MENTAL_LOAD_COLORS[sub.mentalLoad] + "33", color: "#555", fontWeight: "600" }}>
                              {T.mentalLoad[sub.mentalLoad as keyof typeof T.mentalLoad]}
                            </span>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>⏱ {sub.estimatedTime}</span>
                          </div>
                          {!isCompleted && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.4" }}>
                                <strong>{T.parentDetail.whyLabel}</strong> {sub.whyItMatters}
                              </p>
                              <p style={{ fontSize: "0.85rem", color: "var(--accent-hover)", fontWeight: "600", lineHeight: "1.4" }}>
                                <strong>{T.parentDetail.goodEnoughLabel}</strong> {sub.goodEnoughScope}
                              </p>
                            </div>
                          )}
                          {isCompleted && (
                            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                              {T.parentDetail.completedMsg}
                            </p>
                          )}
                          {advice && (
                            <div style={{ marginTop: "0.5rem", padding: "0.5rem 0.75rem", backgroundColor: "var(--accent-light)", borderRadius: "6px", fontSize: "0.82rem", color: "var(--accent-hover)", lineHeight: "1.4" }}>
                              💬 {advice}
                            </div>
                          )}
                          {sub.notes && (
                            <div style={{ marginTop: "0.5rem", padding: "0.5rem 0.75rem", backgroundColor: "rgba(255,255,255,0.7)", borderRadius: "6px", fontSize: "0.8rem", color: "var(--text-main)", fontStyle: "italic", border: "1px solid var(--border)" }}>
                              {T.parentDetail.notesPrefix}{sub.notes.length}{T.parentDetail.notesSuffix}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="session-sidebar">
              <div className="sidebar-card" style={{ padding: "1.25rem" }}>
                <button onClick={() => setAppStep("landing")} className="btn btn-secondary" style={{ width: "100%", fontSize: "0.9rem", padding: "0.75rem" }}>
                  {T.parentDetail.homeBtn}
                </button>
                <button onClick={() => setDeleteConfirmTaskId(currentParentTask.id)} className="btn btn-text" style={{ width: "100%", color: "var(--accent-hover)", marginTop: "0.5rem", fontSize: "0.85rem" }}>
                  {T.parentDetail.deleteBtn}
                </button>
              </div>

              <div className="parking-lot-section" style={{ marginTop: "0" }}>
                <div className="parking-title"><span>🚗</span> {T.parkingLot.title}</div>
                <p className="parking-subtitle" style={{ marginBottom: "1rem" }}>
                  {T.parkingLot.subtitleDetail}
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
                    {T.parkingLot.empty}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== 6. Work Mode ===== */}
        {appStep === "work_mode" && currentParentTask && currentSubtask && (
          <div className="session-layout fade-in">
            <div className="session-main card">
              <button onClick={() => { setAppStep("parent_detail"); setSelectedSubtaskId(null); setIsTimerRunning(false); }}
                className="btn btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
                {T.workMode.backBtn}
              </button>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--accent)", textTransform: "uppercase", fontWeight: "700" }}>
                    {T.workMode.breadcrumb}
                  </span>
                  <span style={{ fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "9999px", backgroundColor: MENTAL_LOAD_COLORS[currentSubtask.mentalLoad] + "33", color: "#555", fontWeight: "600" }}>
                    {T.mentalLoad[currentSubtask.mentalLoad as keyof typeof T.mentalLoad]}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>⏱ {currentSubtask.estimatedTime}</span>
                </div>
                <h2 style={{ fontSize: "1.4rem", color: "var(--text-main)", marginBottom: "1rem" }}>
                  {currentSubtask.title}
                </h2>
              </div>

              <div style={{ padding: "1.15rem", backgroundColor: "var(--primary-light)", borderRadius: "1rem", marginBottom: "1.25rem", borderLeft: "4px solid var(--primary)" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--primary)", display: "block", marginBottom: "0.25rem" }}>
                  {T.workMode.whyTitle}
                </span>
                <p style={{ fontSize: "0.95rem", color: "var(--text-main)", lineHeight: "1.5" }}>{currentSubtask.whyItMatters}</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <div style={{ padding: "1rem", backgroundColor: "var(--accent-light)", borderRadius: "1rem", borderLeft: "3px solid var(--accent)" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--accent-hover)", display: "block", marginBottom: "0.25rem" }}>
                    {T.workMode.goodEnoughTitle}
                  </span>
                  <p style={{ fontSize: "0.88rem", color: "var(--text-main)", lineHeight: "1.4" }}>{currentSubtask.goodEnoughScope}</p>
                </div>
                <div style={{ padding: "1rem", backgroundColor: "#f0f7ff", borderRadius: "1rem", borderLeft: "3px solid #3b82f6" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "#1e40af", display: "block", marginBottom: "0.25rem" }}>
                    {T.workMode.outputTitle}
                  </span>
                  <p style={{ fontSize: "0.88rem", color: "var(--text-main)", lineHeight: "1.4" }}>{currentSubtask.concreteOutput}</p>
                </div>
              </div>

              {/* Timer */}
              <div className="session-timer-mini" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1.5rem", background: "var(--bg-base)", padding: "1rem 2rem", borderRadius: "1.5rem", marginBottom: "2rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "1.4rem" }}>⏱️</span>
                  <span style={{ fontSize: "2rem", fontWeight: "700", fontFeatureSettings: "'tnum'" }}>{formatTime(timeLeft)}</span>
                </div>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button onClick={toggleTimer} className="btn btn-primary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.9rem", borderRadius: "0.75rem" }}>
                    {isTimerRunning ? T.workMode.timerPause : T.workMode.timerStart}
                  </button>
                  <button onClick={resetTimer} className="btn btn-secondary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.9rem", borderRadius: "0.75rem" }}>
                    {T.workMode.timerReset}
                  </button>
                </div>
              </div>

              {timeLeft === 0 && (
                <div className="encouraging-card" style={{ backgroundColor: "var(--primary-light)", color: "var(--primary-hover)", borderLeftColor: "var(--primary)", marginBottom: "1.5rem" }}>
                  {T.workMode.timerComplete}
                </div>
              )}

              {/* Interactive guide */}
              {currentSubtask.interactiveSteps.length > 0 && (
                <div style={{ marginBottom: "2rem" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "0.75rem", color: "var(--text-main)" }}>
                    {T.workMode.guideTitle}
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

              {/* Notes */}
              <div className="input-group" style={{ marginBottom: "2.5rem" }}>
                <label className="input-label" htmlFor="notes-area" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{T.workMode.notesLabel}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: "500" }}>{T.workMode.notesAutoSave}</span>
                </label>
                <textarea id="notes-area" className="input-field" rows={6}
                  placeholder={T.workMode.notesPlaceholder}
                  value={currentSubtask.notes} onChange={(e) => handleNotesChange(e.target.value)}
                  style={{ resize: "none", fontFamily: "var(--font-family)" }} />
              </div>

              {/* Unstuck */}
              <div style={{ marginBottom: "1.5rem" }}>
                <button onClick={handleUnstuckClick} disabled={isUnstuckLoading}
                  className="btn btn-secondary"
                  style={{ width: "100%", borderColor: "var(--accent)", color: "var(--accent-hover)", fontSize: "0.95rem" }}>
                  {isUnstuckLoading ? T.workMode.unstuckLoading : T.workMode.unstuckBtn}
                </button>
                {unstuckResult && (
                  <div className="unstuck-card fade-in">
                    <p style={{ fontSize: "0.95rem", color: "var(--accent-hover)", fontWeight: "600", marginBottom: "1.25rem", lineHeight: "1.6" }}>
                      💬 {unstuckResult.empathyMessage}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {unstuckResult.options.map((opt, i) => (
                        <div key={i} className="unstuck-option">
                          <div style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-main)", marginBottom: "0.3rem" }}>
                            {opt.emoji} {opt.label}
                          </div>
                          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.5" }}>
                            {opt.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button onClick={handleCompleteSubtask} className="btn btn-primary animate-pulse" style={{ width: "100%", padding: "1.1rem", fontSize: "1.1rem" }}>
                {T.workMode.completeBtn}
              </button>
            </div>

            {/* Sidebar */}
            <div className="session-sidebar">
              <div className="sidebar-card" style={{ padding: "1.25rem" }}>
                <h3>{T.workMode.sidebarTitle}</h3>
                <div className="sidebar-info-item">
                  <span className="label">{T.workMode.sidebarParentLabel}</span>
                  <p>{currentParentTask.title}</p>
                </div>
                <div className="sidebar-info-item">
                  <span className="label">{T.workMode.sidebarProgressLabel}</span>
                  <p style={{ color: "var(--primary)", fontWeight: "700" }}>{getProgressPercentage(currentParentTask)}%</p>
                </div>
              </div>

              <div className="parking-lot-section" style={{ marginTop: "0" }}>
                <div className="parking-title"><span>🚗</span> {T.parkingLot.title}</div>
                <p className="parking-subtitle" style={{ marginBottom: "0.75rem" }}>
                  {T.parkingLot.subtitleWork}
                </p>
                <form onSubmit={handleAddParkingThought} style={{ display: "flex", gap: "0.5rem" }}>
                  <input type="text" className="input-field"
                    placeholder={T.parkingLot.placeholder}
                    value={currentThought} onChange={(e) => setCurrentThought(e.target.value)}
                    style={{ padding: "0.5rem 0.85rem", fontSize: "0.85rem", borderRadius: "0.75rem" }} />
                  <button type="submit" className="btn btn-accent" style={{ padding: "0.5rem 1rem", borderRadius: "0.75rem", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                    {T.parkingLot.addBtn}
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

        {/* ===== 7. Energy Modal ===== */}
        {showEnergyModal && (
          <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
            <div className="card fade-in" style={{ maxWidth: "480px", width: "100%", padding: "2rem", boxShadow: "0 20px 48px rgba(0,0,0,0.15)" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.5rem", color: "var(--text-main)" }}>
                {T.energy.modalTitle}
              </h3>
              <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "1.75rem", lineHeight: "1.6" }}>
                {T.energy.modalDesc}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
                {T.energy.options.map((opt, i) => {
                  const lvl = (["low","normal","high"] as EnergyLevel[])[i];
                  return (
                    <button key={lvl} onClick={() => handleEnergySelect(lvl)}
                      className="btn btn-secondary energy-modal-option">
                      <span style={{ fontSize: "1.5rem" }}>{opt.emoji}</span>
                      <span>
                        <strong>{opt.label}</strong>
                        <span style={{ fontSize: "0.85rem", fontWeight: "400", color: "var(--text-muted)", marginLeft: "0.5rem" }}>— {opt.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setShowEnergyModal(false)} className="btn btn-text" style={{ width: "100%", fontSize: "0.85rem" }}>
                {T.energy.modalCancel}
              </button>
            </div>
          </div>
        )}

        {/* ===== 8. Delete Modal ===== */}
        {deleteConfirmTaskId && (
          <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
            <div className="card fade-in" style={{ maxWidth: "500px", width: "100%", padding: "2rem", boxShadow: "0 20px 48px rgba(0,0,0,0.15)" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1rem", color: "var(--accent-hover)" }}>
                {T.deleteModal.title}
              </h3>
              <p style={{ fontSize: "0.95rem", color: "var(--text-main)", marginBottom: "1.5rem", lineHeight: "1.6" }}>
                {T.deleteModal.desc}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <button onClick={() => handleDeleteParentTask(deleteConfirmTaskId)} className="btn btn-accent" style={{ padding: "0.85rem" }}>
                  {T.deleteModal.confirmBtn}
                </button>
                <button onClick={() => setDeleteConfirmTaskId(null)} className="btn btn-secondary" style={{ padding: "0.85rem" }}>
                  {T.deleteModal.cancelBtn}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer>
        &copy; {new Date().getFullYear()} {T.appTitle}. {T.footer}
      </footer>

      {/* Language selector (bottom right) */}
      <div className="lang-selector">
        <button className="lang-trigger" onClick={() => setShowLangMenu(v => !v)} aria-label="Select language">
          <span>{LANG_META[lang].flag}</span>
          <span className="lang-trigger-label">{LANG_META[lang].label}</span>
        </button>
        {showLangMenu && (
          <div className="lang-menu">
            {(Object.keys(LANG_META) as Lang[]).map(l => (
              <button key={l} onClick={() => handleLangChange(l)}
                className={`lang-menu-item${lang === l ? " active" : ""}`}>
                <span>{LANG_META[l].flag}</span>
                <span>{LANG_META[l].label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

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
