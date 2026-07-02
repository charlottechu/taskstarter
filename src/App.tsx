import React, { useState, useEffect, useRef } from "react";
import {
  type ProgressData,
  type EarnEventType,
  loadProgress,
  saveProgress,
  canGrantReturn,
  getPenguinStage,
  getCalendarDays,
  getWeeklyStats,
  todayISO,
  daysBetween,
  EARN_AMOUNTS,
  appendActivity,
} from "./utils/progress";
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
import { getDiagnosis, generateSubtasks, generateContextRecovery, getUnstuckHelp, breakdownSubtask, type UnstuckResult } from "./utils/apiClient";
import { getT, type Lang } from "./utils/i18n";
import { deadlineInfo, urgencyRank, type Urgency } from "./utils/deadline";

type AppStep =
  | "landing"
  | "diagnosis"
  | "mode_select"
  | "editing"
  | "parent_detail"
  | "work_mode"
  | "celebration"
  | "victory_wall";

type EnergyLevel = "low" | "normal" | "high";

// Gemini returns 429 / "Too Many Requests" / "quota" when the API usage limit is hit.
// Surface a friendly message instead of dumping the raw error stack.
const isRateLimitError = (msg: string): boolean =>
  /429|too many requests|quota|rate.?limit/i.test(msg);

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
  const [isBreakingDown, setIsBreakingDown] = useState(false);

  // AI Reality Check — keep users pointed at today's real goal
  const [todaysGoalInput, setTodaysGoalInput] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalEditValue, setGoalEditValue] = useState("");
  const [realityChoice, setRealityChoice] = useState<null | "progress" | "prep" | "avoid">(null);
  const [driftNudgeIndex, setDriftNudgeIndex] = useState(0);
  const [subtaskSwitches, setSubtaskSwitches] = useState(0);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [reflectDistance, setReflectDistance] = useState<null | "closer" | "same" | "unsure">(null);
  const [reflectMoved, setReflectMoved] = useState("");
  const [reflectNext, setReflectNext] = useState("");
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Gentle Progress System
  const [progressData, setProgressData] = useState<ProgressData>(() => loadProgress());
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryDaysAway, setRecoveryDaysAway] = useState(0);
  const [tokenToast, setTokenToast] = useState<{ amount: number; text: string } | null>(null);
  const [timerBonusGranted, setTimerBonusGranted] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // v6 — Celebrate Progress
  const [deadlineInput, setDeadlineInput] = useState<string>(""); // "YYYY-MM-DD" while creating a task
  const [celebrationTaskId, setCelebrationTaskId] = useState<string | null>(null);
  const [celebrationReflection, setCelebrationReflection] = useState<string>("");

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

  const earnProgress = (type: EarnEventType, taskId?: string) => {
    if (type === 'return' && taskId && !canGrantReturn(progressData, taskId)) return;
    const amount = EARN_AMOUNTS[type];
    const today = todayISO();
    setProgressData(prev => {
      const entry = { date: today, type, ...(taskId ? { taskId } : {}) };
      const newData: ProgressData = {
        ...appendActivity(prev, entry),
        firstStepTokens: prev.firstStepTokens + amount,
        milestoneStars: type === 'task_complete' ? prev.milestoneStars + 1 : prev.milestoneStars,
      };
      saveProgress(newData);
      return newData;
    });
    const text = type === 'task_complete' ? `+${amount} 🐣 ⭐` : `+${amount} 🐣`;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setTokenToast({ amount, text });
    toastTimerRef.current = setTimeout(() => setTokenToast(null), 2500);
  };

  useEffect(() => {
    setEnergyLevel(null);
    setUnstuckResult(null);
    setSubtaskSwitches(0);
    setRealityChoice(null);
    setEditingGoal(false);
  }, [selectedParentTaskId]);

  // Recovery check on first load
  useEffect(() => {
    const data = loadProgress();
    const today = todayISO();
    if (data.lastActiveDate && daysBetween(data.lastActiveDate, today) >= 5) {
      const days = daysBetween(data.lastActiveDate, today);
      setRecoveryDaysAway(days);
      setShowRecoveryModal(true);
      const updated = { ...data, recoverySeeds: data.recoverySeeds + 1, lastActiveDate: today };
      saveProgress(updated);
      setProgressData(updated);
    } else if (!data.lastActiveDate || data.lastActiveDate !== today) {
      const updated = { ...data, lastActiveDate: today };
      saveProgress(updated);
      setProgressData(updated);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Timer bonus — once per session when 5-min timer completes
  useEffect(() => {
    if (timeLeft === 0 && !timerBonusGranted && appStep === 'work_mode') {
      setTimerBonusGranted(true);
      earnProgress('reflection');
    }
  }, [timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const result = await getDiagnosis(originalTask, lang);
      setDiagnosisResult(result);
      setFollowUpAnswers(new Array(result.questions.length).fill(""));
      setSelectedMode(result.recommendedMode);
      setAppStep("diagnosis");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Diagnosis failed:', msg);
      alert(isRateLimitError(msg) ? T.alerts.rateLimited : T.alerts.diagnosisFailed + msg);
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
      const msg = err instanceof Error ? err.message : String(err);
      console.error(err);
      alert(isRateLimitError(msg) ? T.alerts.rateLimited : T.alerts.subtasksFailed);
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
      todaysRealGoal: todaysGoalInput.trim(),
      supportMode: selectedMode,
      subtasks: editingSubtasks,
      parkingThoughts: [],
      contextRecovery: null,
      isTooBig: diagnosisResult.isTooBig,
      reframingMessage: diagnosisResult.reframingMessage,
      createdAt: new Date().toLocaleString("ja-JP", { hour12: false }),
      deadline: deadlineInput || null,
      completedAt: null,
      reflection: "",
    };
    const updated = [newParentTask, ...savedTasks];
    saveTasksToStorage(updated);
    earnProgress('plan_created', newParentTask.id);
    setSelectedParentTaskId(newParentTask.id);
    setAppStep("parent_detail");
    setOriginalTask("");
    setDiagnosisResult(null);
    setFollowUpAnswers([]);
    setEditingSubtasks([]);
    setTodaysGoalInput("");
    setDeadlineInput("");
  };

  // Update a saved task's deadline in place (used from the task-detail screen).
  const setTaskDeadline = (taskId: string, deadline: string | null) => {
    saveTasksToStorage(savedTasks.map(t => t.id === taskId ? { ...t, deadline } : t));
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

  const isTaskDone = (task: ParentTask) =>
    task.subtasks.length > 0 && task.subtasks.every(s => s.status === "completed");

  const nextIncompleteSubtask = (task: ParentTask): Subtask | null =>
    task.subtasks.find(s => s.status !== "completed") ?? null;

  // Urgency-tuned encouragement — the tone adapts to how close the deadline is.
  // Declared here (before the dashboard derived consts) so `focusTone` can use it.
  const deadlineToneMessage = (deadline: string | null | undefined): string | null => {
    const { urgency } = deadlineInfo(deadline);
    if (urgency === "none") return null;
    return T.deadline.tone[urgency];
  };

  // ----- v6 dashboard-derived views -----
  // Active tasks (not yet fully done), ordered by nearest deadline; undated tasks fall to the end.
  const activeTasks = savedTasks
    .filter(t => !isTaskDone(t))
    .sort((a, b) => urgencyRank(a.deadline) - urgencyRank(b.deadline));
  const focusTask: ParentTask | null = activeTasks[0] ?? null;
  const tomorrowTask: ParentTask | null = activeTasks[1] ?? null;
  const focusNext = focusTask ? nextIncompleteSubtask(focusTask) : null;
  const focusProgress = focusTask ? getProgressPercentage(focusTask) : 0;
  const focusTone = focusTask ? deadlineToneMessage(focusTask.deadline) : null;

  // Recently completed subtasks across all tasks, newest first (for "Recent Progress").
  const recentCompletedSubtasks = savedTasks
    .flatMap(t => t.subtasks.filter(s => s.status === "completed" && s.completedAt).map(s => ({ sub: s, task: t })))
    .sort((a, b) => (b.sub.completedAt! > a.sub.completedAt! ? 1 : -1))
    .slice(0, 4);

  // Completed tasks for the Victory Wall, newest first.
  const completedTasks = savedTasks
    .filter(t => !!t.completedAt)
    .sort((a, b) => (b.completedAt! > a.completedAt! ? 1 : -1));

  const tokensEarnedToday = progressData.activityLog
    .filter(e => e.date === todayISO())
    .reduce((sum, e) => sum + EARN_AMOUNTS[e.type], 0);

  const celebrationTask = savedTasks.find(t => t.id === celebrationTaskId) || null;

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
      const hasProgress = task.subtasks.some(s => s.status === 'completed');
      if (hasProgress) earnProgress('return', taskId);
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

  const updateGoal = (goal: string) => {
    if (!currentParentTask) return;
    saveTasksToStorage(savedTasks.map(t =>
      t.id === currentParentTask.id ? { ...t, todaysRealGoal: goal } : t
    ));
  };

  const startGoalEdit = () => {
    setGoalEditValue(currentParentTask?.todaysRealGoal || "");
    setEditingGoal(true);
  };

  const saveGoalEdit = () => {
    updateGoal(goalEditValue.trim());
    setEditingGoal(false);
  };

  // Reality Check — self-awareness only, never scored. ②/③ gently nudge back to the goal.
  const handleRealityChoice = (choice: "progress" | "prep" | "avoid") => {
    setRealityChoice(choice);
    if (choice !== "progress") setDriftNudgeIndex(i => i + 1);
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
    setTimerBonusGranted(false);
    setUnstuckResult(null);
    setRealityChoice(null);
    // Count focus switches this session — many starts without a completion may signal drift.
    setSubtaskSwitches(c => c + 1);
    earnProgress('session_start', subtaskId);
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
      alert(isRateLimitError(msg) ? T.alerts.rateLimited : T.alerts.unstuckFailed + msg);
    } finally {
      setIsUnstuckLoading(false);
    }
  };

  // The three unstuck options always come back in a fixed order:
  // 0 = break down smaller, 1 = try another approach, 2 = skip for now.
  const handleUnstuckOption = async (index: number) => {
    if (!currentParentTask || !currentSubtask) return;

    // 0: break it down — ask the AI for smaller sub-steps and replace this step with them.
    if (index === 0) {
      if (isBreakingDown) return;
      setIsBreakingDown(true);
      try {
        const smaller = await breakdownSubtask(currentParentTask.title, currentSubtask, lang);
        // Carry over any notes from the original step into the first smaller step.
        if (smaller[0] && currentSubtask.notes) {
          smaller[0] = { ...smaller[0], notes: currentSubtask.notes };
        }
        const idx = currentParentTask.subtasks.findIndex(s => s.id === currentSubtask.id);
        const newSubtasks = [...currentParentTask.subtasks];
        newSubtasks.splice(idx === -1 ? newSubtasks.length : idx, idx === -1 ? 0 : 1, ...smaller);
        saveTasksToStorage(savedTasks.map(t =>
          t.id === currentParentTask.id ? { ...t, subtasks: newSubtasks } : t
        ));
        setIsTimerRunning(false);
        if (timerRef.current) clearInterval(timerRef.current);
        setUnstuckResult(null);
        setSelectedSubtaskId(null);
        setAppStep("parent_detail");
      } finally {
        setIsBreakingDown(false);
      }
      return;
    }

    // 1: try another approach — append the suggestion to the workspace notes.
    if (index === 1) {
      const opt = unstuckResult?.options[1];
      if (!opt) return;
      const addition = `💡 ${opt.label}: ${opt.description}`;
      const existing = currentSubtask.notes?.trim();
      updateSubtaskField(currentSubtask.id, {
        notes: existing ? `${existing}\n\n${addition}` : addition,
      });
      setUnstuckResult(null);
      alert(T.workMode.rethinkSaved);
      return;
    }

    // 2: skip for now — leave this step and go back to the plan.
    if (index === 2) {
      setIsTimerRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setUnstuckResult(null);
      setSelectedSubtaskId(null);
      setAppStep("parent_detail");
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

  // Completing now opens a goal-oriented reflection first (progress over completion).
  const handleCompleteSubtask = () => {
    if (!currentParentTask || !selectedSubtaskId) return;
    setReflectDistance(null);
    setReflectMoved("");
    setReflectNext("");
    setIsTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setShowReflectionModal(true);
  };

  const finalizeSubtaskCompletion = () => {
    if (!currentParentTask || !selectedSubtaskId) return;
    const nowISO = new Date().toISOString();
    // Build the updated subtasks + parent completion in a single save so the two
    // writes don't race on the same `savedTasks` snapshot.
    const updatedSubtasks = currentParentTask.subtasks.map(s =>
      s.id === selectedSubtaskId
        ? { ...s, status: "completed" as const, interactiveAnswers, completedAt: nowISO }
        : s
    );
    const willCompleteAll = updatedSubtasks.every(s => s.status === 'completed');
    const updatedTask: ParentTask = {
      ...currentParentTask,
      subtasks: updatedSubtasks,
      completedAt: willCompleteAll ? (currentParentTask.completedAt || nowISO) : (currentParentTask.completedAt ?? null),
    };
    saveTasksToStorage(savedTasks.map(t => t.id === updatedTask.id ? updatedTask : t));
    earnProgress('subtask_complete', selectedSubtaskId);
    setShowReflectionModal(false);
    setSubtaskSwitches(0);
    setRealityChoice(null);
    setSelectedSubtaskId(null);
    if (willCompleteAll) {
      // Reward, then take the user to a dedicated celebration — never straight home.
      setTimeout(() => earnProgress('task_complete', updatedTask.id), 700);
      setCelebrationTaskId(updatedTask.id);
      setCelebrationReflection(updatedTask.reflection || "");
      setAppStep("celebration");
    } else {
      setAppStep("parent_detail");
    }
  };

  // Persist the reflection typed on the celebration screen, then leave the screen.
  const leaveCelebration = (dest: AppStep) => {
    if (celebrationTaskId) {
      const text = celebrationReflection.trim();
      saveTasksToStorage(savedTasks.map(t => t.id === celebrationTaskId ? { ...t, reflection: text } : t));
    }
    setCelebrationTaskId(null);
    setCelebrationReflection("");
    setSelectedParentTaskId(null);
    setAppStep(dest);
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
  const resetTimer = () => { setIsTimerRunning(false); setTimeLeft(300); setTimerBonusGranted(false); };
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const currentEnergyOpt = T.energy.options.find((_, i) => (["low","normal","high"] as EnergyLevel[])[i] === energyLevel);

  const URGENCY_TEXT_COLOR: Record<Urgency, string> = {
    none: "#94a3b8", relaxed: "#16a34a", soon: "#ca8a04", near: "#ea580c", today: "#dc2626", overdue: "#dc2626",
  };

  // Colored DDL pill — 🟢🟡🟠🔴 + a human phrase. Returns null when no deadline is set.
  const renderDeadlineBadge = (deadline: string | null | undefined, size: "sm" | "md" = "sm") => {
    const info = deadlineInfo(deadline);
    if (info.daysLeft === null) return null;
    const text =
      info.urgency === "today" ? T.deadline.today
      : info.urgency === "overdue" ? T.deadline.overdue
      : T.deadline.daysLeft.replace("{n}", String(info.daysLeft));
    const color = URGENCY_TEXT_COLOR[info.urgency];
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: size === "md" ? "0.9rem" : "0.75rem", fontWeight: 700, color, backgroundColor: `${color}18`, padding: size === "md" ? "0.3rem 0.75rem" : "0.2rem 0.55rem", borderRadius: "9999px", whiteSpace: "nowrap" }}>
        <span>{info.dot}</span>{text}
      </span>
    );
  };

  // Persistent "Today's Real Goal" banner. editable=true (plan view) allows inline editing.
  const renderGoalBanner = (editable: boolean) => {
    const goal = currentParentTask?.todaysRealGoal || "";
    if (editingGoal && editable) {
      return (
        <div className="goal-banner goal-banner-editing">
          <input type="text" className="input-field" autoFocus
            placeholder={T.realityCheck.goalPlaceholder}
            value={goalEditValue} onChange={(e) => setGoalEditValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveGoalEdit(); }}
            style={{ margin: 0, flex: 1, minWidth: 0 }} />
          <button onClick={saveGoalEdit} className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
            {T.realityCheck.saveBtn}
          </button>
          <button onClick={() => setEditingGoal(false)} className="btn btn-text" style={{ padding: "0.5rem", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
            {T.realityCheck.cancelBtn}
          </button>
        </div>
      );
    }
    return (
      <div className="goal-banner">
        <span className="goal-banner-label">{T.realityCheck.bannerLabel}</span>
        <span className="goal-banner-text" style={{ fontStyle: goal ? "normal" : "italic", opacity: goal ? 1 : 0.7 }}>
          {goal || T.realityCheck.bannerEmpty}
        </span>
        {editable && (
          <button onClick={startGoalEdit} className="goal-banner-edit" aria-label="edit goal">
            {T.realityCheck.editBtn}
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <header>
        <div className="app-logo" onClick={() => setAppStep("landing")} style={{ cursor: "pointer" }}>{T.appTitle}</div>
        <div className="app-subtitle">{T.appSubtitle}</div>
      </header>

      <main className="container" style={{ maxWidth: appStep === "landing" && savedTasks.length === 0 ? "720px" : "1080px" }}>

        {/* ===== 1. Landing / Dashboard ===== */}
        {appStep === "landing" && savedTasks.length === 0 && (
          <div className="landing-layout fade-in" style={{ display: "flex", gap: "2rem", flexDirection: "column", alignItems: "stretch" }}>
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
          </div>
        )}

        {appStep === "landing" && savedTasks.length > 0 && (
          <div className="landing-layout fade-in" style={{ display: "flex", gap: "2rem", flexDirection: "row", alignItems: "flex-start" }}>

            {/* ----- Main column ----- */}
            <div style={{ flex: 1.4, display: "flex", flexDirection: "column", gap: "1.5rem", minWidth: 0 }}>

              {/* Welcome */}
              <div>
                <h2 style={{ marginBottom: "0.25rem" }}>👋 {T.dashboard.welcome}</h2>
              </div>

              {/* Today's Focus — the single highlighted task */}
              <div className="card" style={{ padding: "1.75rem", background: "linear-gradient(135deg, var(--primary-light), #ffffff)", border: "2px solid var(--primary)", boxShadow: "0 8px 28px var(--accent-glow, rgba(0,0,0,0.06))" }}>
                <h3 style={{ fontSize: "1rem", color: "var(--primary-hover)", marginBottom: "1rem" }}>{T.dashboard.focusTitle}</h3>
                {focusTask ? (
                  <>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                      <h4 style={{ fontSize: "1.35rem", fontWeight: "800", color: "var(--text-main)", lineHeight: 1.3 }}>⭐ {focusTask.title}</h4>
                      {renderDeadlineBadge(focusTask.deadline, "md")}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                      <span>🧭 {T.dashboard.nextStepLabel}: <strong style={{ color: "var(--text-main)" }}>{focusNext ? focusNext.title : "—"}</strong></span>
                      <span>⏱️ {focusNext?.estimatedTime || T.dashboard.noEstimate}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: focusTone ? "1rem" : "1.25rem" }}>
                      <div style={{ flex: 1, height: "8px", backgroundColor: "#ffffff", borderRadius: "4px", overflow: "hidden", border: "1px solid var(--border)" }}>
                        <div style={{ width: `${focusProgress}%`, height: "100%", backgroundColor: "var(--primary)" }} />
                      </div>
                      <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--primary)" }}>{focusProgress}%</span>
                    </div>
                    {focusTone && (
                      <p style={{ fontSize: "0.85rem", color: "var(--text-main)", lineHeight: 1.6, backgroundColor: "#ffffffaa", borderRadius: "0.75rem", padding: "0.6rem 0.85rem", borderLeft: "3px solid var(--primary)", marginBottom: "1.25rem" }}>
                        {focusTone}
                      </p>
                    )}
                    <button onClick={() => handleOpenParentTask(focusTask.id)} className="btn btn-primary" style={{ width: "100%", padding: "1rem", fontSize: "1.05rem" }}>
                      ▶ {T.dashboard.continueBtn}
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "1rem 0" }}>
                    <p style={{ fontSize: "1.05rem", fontWeight: "700", color: "var(--text-main)", marginBottom: "0.5rem" }}>{T.dashboard.focusEmpty}</p>
                    <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>{T.dashboard.focusEmptyBody}</p>
                  </div>
                )}
              </div>

              {/* Recent Progress */}
              <div className="card" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1rem", marginBottom: "1rem" }}>{T.dashboard.recentTitle}</h3>
                {recentCompletedSubtasks.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {recentCompletedSubtasks.map(({ sub, task }) => (
                      <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: "0.65rem", fontSize: "0.9rem" }}>
                        <span style={{ color: "var(--primary)", fontWeight: "700" }}>✓</span>
                        <span style={{ color: "var(--text-main)", textDecoration: "line-through", opacity: 0.85 }}>{sub.title}</span>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-light)", marginLeft: "auto", whiteSpace: "nowrap" }}>{task.title}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: "0.88rem", color: "var(--text-muted)" }}>{T.dashboard.recentEmpty}</p>
                )}
              </div>

              {/* Create a new task */}
              <div className="card" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1rem", marginBottom: "1rem" }}>{T.dashboard.createTitle}</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
                  {T.landing.examples.map((example, i) => (
                    <button key={i} type="button" onClick={() => handleExampleChipClick(example)} className="example-chip"
                      style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem", borderRadius: "9999px", border: "1px solid var(--primary-light)", backgroundColor: "var(--primary-light)", color: "var(--primary)", cursor: "pointer", fontWeight: "500", transition: "var(--transition-smooth)" }}>
                      {example}
                    </button>
                  ))}
                </div>
                <form onSubmit={handleTaskSubmit} className="input-group">
                  <textarea id="task-input" className="input-field" rows={3}
                    placeholder={T.landing.placeholder}
                    value={originalTask} onChange={(e) => setOriginalTask(e.target.value)}
                    style={{ resize: "none" }} required />
                  <button type="submit" className="btn btn-primary" style={{ marginTop: "1rem" }}>
                    <span>✨</span> {T.landing.submitBtn}
                  </button>
                </form>
              </div>
            </div>

            {/* ----- Sidebar ----- */}
            <div className="landing-sidebar" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.5rem", minWidth: 0 }}>

              {/* Penguin Companion */}
              {(() => {
                const stage = getPenguinStage(progressData.firstStepTokens);
                return (
                  <div className="sidebar-card" style={{ padding: "1.25rem", cursor: "pointer" }} onClick={() => setShowProgressModal(true)}>
                    <h3 style={{ borderBottom: "2px solid var(--primary-light)", paddingBottom: "0.5rem", marginBottom: "0.85rem" }}>
                      {T.dashboard.companionTitle}
                    </h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                      <span className="penguin-idle" style={{ fontSize: "2.6rem", lineHeight: 1 }}>{stage.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "700", color: "var(--primary)", fontSize: "0.95rem" }}>
                          {T.progress.stages[stage.nameKey as keyof typeof T.progress.stages]}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                          {T.progress.tokensLabel}: {progressData.firstStepTokens}
                        </div>
                      </div>
                      {tokensEarnedToday > 0 && (
                        <span style={{ fontSize: "0.9rem", fontWeight: "800", color: "var(--accent-hover)", backgroundColor: "var(--accent-light)", padding: "0.3rem 0.7rem", borderRadius: "9999px" }}>
                          🐣 +{tokensEarnedToday}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.75rem" }}>
                      {tokensEarnedToday > 0 ? `${T.dashboard.earnedToday}: +${tokensEarnedToday} 🐣` : T.dashboard.noTokensToday}
                    </p>
                  </div>
                );
              })()}

              {/* Tomorrow / Up next preview */}
              <div className="sidebar-card" style={{ padding: "1.25rem" }}>
                <h3 style={{ borderBottom: "2px solid var(--accent-light)", paddingBottom: "0.5rem", marginBottom: "0.85rem" }}>{T.dashboard.tomorrowTitle}</h3>
                {tomorrowTask ? (
                  <div onClick={() => handleOpenParentTask(tomorrowTask.id)} style={{ cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text-main)" }}>{tomorrowTask.title}</h4>
                      {renderDeadlineBadge(tomorrowTask.deadline)}
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{T.dashboard.tomorrowEmpty}</p>
                )}
              </div>

              {/* Victory Wall entry */}
              <button className="btn btn-secondary" onClick={() => setAppStep("victory_wall")}
                style={{ padding: "0.95rem", fontSize: "0.95rem", fontWeight: "700" }}>
                {T.dashboard.victoryWallBtn}
              </button>

              {/* All tasks */}
              <div className="sidebar-card" style={{ display: "flex", flexDirection: "column", maxHeight: "360px" }}>
                <h3 style={{ borderBottom: "2px solid var(--accent-light)", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
                  {T.dashboard.allTasksTitle}
                </h3>
                <div className="saved-task-list" style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "0.85rem", paddingRight: "0.25rem" }}>
                  {savedTasks.map((task) => {
                    const progress = getProgressPercentage(task);
                    const modeInfo = SUPPORT_MODES.find(m => m.id === task.supportMode);
                    const modeLabel = T.modes[task.supportMode as keyof typeof T.modes]?.label;
                    const done = isTaskDone(task);
                    return (
                      <div key={task.id} className="saved-task-card"
                        onClick={() => handleOpenParentTask(task.id)}
                        style={{ padding: "1rem", border: "1px solid var(--border)", borderRadius: "1rem", backgroundColor: done ? "var(--primary-light)" : "#ffffff", cursor: "pointer", transition: "var(--transition-smooth)", position: "relative" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
                          <h4 style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-main)", marginBottom: "0.35rem" }}>
                            {done ? "✓ " : ""}{task.title}
                          </h4>
                          {renderDeadlineBadge(task.deadline)}
                        </div>
                        {modeInfo && (
                          <span style={{ fontSize: "0.7rem", color: "var(--primary)", fontWeight: "600", display: "inline-block", marginBottom: "0.4rem" }}>
                            {modeInfo.emoji} {modeLabel ?? modeInfo.label}
                          </span>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <div style={{ flex: 1, height: "5px", backgroundColor: "var(--bg-base)", borderRadius: "3px", overflow: "hidden" }}>
                            <div style={{ width: `${progress}%`, height: "100%", backgroundColor: "var(--primary)" }} />
                          </div>
                          <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--primary)" }}>{progress}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
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

            {/* Today's Real Goal — captured right after diagnosis + subtask generation */}
            <div style={{ padding: "1.25rem 1.5rem", backgroundColor: "#fff8f0", border: "1.5px solid var(--accent-light)", borderRadius: "1.25rem", marginBottom: "2rem" }}>
              <label htmlFor="goal-input" style={{ display: "block", fontSize: "0.95rem", fontWeight: "800", color: "var(--accent-hover)", marginBottom: "0.4rem" }}>
                {T.realityCheck.goalSectionTitle}
              </label>
              <p style={{ fontSize: "0.9rem", color: "var(--text-main)", marginBottom: "0.75rem", lineHeight: "1.5" }}>
                {T.realityCheck.goalQuestion}
              </p>
              <input id="goal-input" type="text" className="input-field"
                placeholder={T.realityCheck.goalPlaceholder}
                value={todaysGoalInput} onChange={(e) => setTodaysGoalInput(e.target.value)}
                style={{ margin: 0, width: "100%" }} />
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.5rem", fontStyle: "italic" }}>
                {T.realityCheck.goalHint}
              </p>
            </div>

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
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", padding: "0.85rem 1rem", border: "1px solid var(--border)", borderRadius: "1rem", backgroundColor: "var(--bg-base)" }}>
                <label htmlFor="create-deadline" style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-main)" }}>📅 {T.deadline.optional}</label>
                <input id="create-deadline" type="date" className="input-field" value={deadlineInput}
                  onChange={(e) => setDeadlineInput(e.target.value)}
                  style={{ margin: 0, flex: 1, minWidth: "160px" }} />
                {deadlineInput && (
                  <button type="button" onClick={() => setDeadlineInput("")} className="btn btn-text" style={{ fontSize: "0.8rem" }}>{T.deadline.clearBtn}</button>
                )}
              </div>
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

              {/* Deadline row — badge + inline date editor + urgency-tuned tone */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-muted)" }}>📅 {T.deadline.label}</span>
                {renderDeadlineBadge(currentParentTask.deadline, "md") ?? (
                  <span style={{ fontSize: "0.85rem", color: "var(--text-light)" }}>{T.deadline.none}</span>
                )}
                <input type="date" className="input-field" value={currentParentTask.deadline || ""}
                  onChange={(e) => setTaskDeadline(currentParentTask.id, e.target.value || null)}
                  style={{ margin: 0, width: "auto", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }} />
                {currentParentTask.deadline && (
                  <button type="button" onClick={() => setTaskDeadline(currentParentTask.id, null)} className="btn btn-text" style={{ fontSize: "0.8rem" }}>{T.deadline.clearBtn}</button>
                )}
              </div>
              {deadlineToneMessage(currentParentTask.deadline) && (
                <p style={{ fontSize: "0.85rem", color: "var(--text-main)", lineHeight: 1.6, backgroundColor: "var(--primary-light)", borderRadius: "0.75rem", padding: "0.6rem 0.85rem", borderLeft: "3px solid var(--primary)", marginBottom: "1rem" }}>
                  {deadlineToneMessage(currentParentTask.deadline)}
                </p>
              )}

              {/* Today's Real Goal banner (editable) */}
              {renderGoalBanner(true)}

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

              {/* Persistent goal reminder so the bigger purpose stays visible inside a subtask */}
              {renderGoalBanner(false)}

              {/* Gentle drift hint after many focus switches without completing */}
              {subtaskSwitches >= 3 && (
                <div className="drift-banner">
                  {T.realityCheck.driftBanner}
                </div>
              )}

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

              {/* Reality Check — self-awareness, not scoring */}
              <div className="reality-check-card">
                <div className="reality-check-title">{T.realityCheck.cardTitle}</div>
                <p className="reality-check-q">{T.realityCheck.cardQuestion}</p>
                <p className="reality-check-subq">{T.realityCheck.cardSubQuestion}</p>
                <div className="reality-check-choices">
                  {([
                    ["progress", T.realityCheck.choiceProgress],
                    ["prep", T.realityCheck.choicePrep],
                    ["avoid", T.realityCheck.choiceAvoid],
                  ] as const).map(([key, label]) => (
                    <button key={key} type="button"
                      className={`reality-choice${realityChoice === key ? " selected-" + key : ""}`}
                      onClick={() => handleRealityChoice(key)}>
                      {label}
                    </button>
                  ))}
                </div>
                {realityChoice && (
                  <p className={`reality-feedback reality-feedback-${realityChoice}`}>
                    {realityChoice === "progress"
                      ? T.realityCheck.feedbackProgress
                      : realityChoice === "prep"
                      ? T.realityCheck.feedbackPrep
                      : T.realityCheck.driftPrompts[driftNudgeIndex % T.realityCheck.driftPrompts.length]}
                  </p>
                )}
                <p className="reality-check-note">{T.realityCheck.cardNote}</p>
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
                        <button
                          key={i}
                          type="button"
                          className="unstuck-option"
                          onClick={() => handleUnstuckOption(i)}
                          disabled={isBreakingDown}
                          aria-busy={i === 0 && isBreakingDown}>
                          <div style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-main)", marginBottom: "0.3rem" }}>
                            {i === 0 && isBreakingDown ? T.workMode.breakdownLoading : `${opt.emoji} ${opt.label}`}
                          </div>
                          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.5" }}>
                            {opt.description}
                          </p>
                        </button>
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

        {/* ===== 6b. Celebration ===== */}
        {appStep === "celebration" && celebrationTask && (() => {
          const msgIdx = celebrationTask.title.length % T.celebration.messages.length;
          const stage = getPenguinStage(progressData.firstStepTokens);
          const confettiColors = ["#f9a8d4", "#fcd34d", "#86efac", "#93c5fd", "#c4b5fd", "#fdba74"];
          return (
            <div className="celebration-screen fade-in" style={{ position: "relative", overflow: "hidden" }}>
              {/* Soft confetti */}
              <div className="confetti-layer" aria-hidden="true">
                {Array.from({ length: 16 }).map((_, i) => (
                  <span key={i} className="confetti-piece" style={{
                    left: `${(i * 6.25 + 3) % 100}%`,
                    backgroundColor: confettiColors[i % confettiColors.length],
                    animationDelay: `${(i % 8) * 0.18}s`,
                    animationDuration: `${2.6 + (i % 4) * 0.35}s`,
                  }} />
                ))}
              </div>

              <div className="card" style={{ maxWidth: "560px", margin: "0 auto", padding: "2.5rem 2rem", textAlign: "center", position: "relative", zIndex: 1 }}>
                <div className="penguin-celebrate" style={{ fontSize: "4.5rem", lineHeight: 1, marginBottom: "0.5rem" }}>{stage.emoji}</div>
                <h2 style={{ fontSize: "1.8rem", color: "var(--primary-hover)", marginBottom: "1.25rem" }}>{T.celebration.congrats}</h2>

                <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>{T.celebration.youCompleted}</p>
                <p style={{ fontSize: "1.35rem", fontWeight: "800", color: "var(--text-main)", marginBottom: "1.5rem", lineHeight: 1.3 }}>{celebrationTask.title}</p>

                {/* Rewards */}
                <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
                  <div style={{ backgroundColor: "var(--accent-light)", borderRadius: "1rem", padding: "0.85rem 1.25rem" }}>
                    <div style={{ fontSize: "1.5rem" }}>🐣</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--accent-hover)" }}>{T.celebration.tokensReward.replace("{n}", String(EARN_AMOUNTS.task_complete))}</div>
                  </div>
                  <div style={{ backgroundColor: "var(--primary-light)", borderRadius: "1rem", padding: "0.85rem 1.25rem" }}>
                    <div style={{ fontSize: "1.5rem" }}>⭐</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--primary)" }}>{T.celebration.milestoneStar}</div>
                  </div>
                </div>

                <p style={{ fontSize: "1rem", color: "var(--text-main)", lineHeight: 1.7, marginBottom: "1.75rem", fontWeight: "600" }}>
                  {T.celebration.messages[msgIdx]}
                </p>

                {/* Reflection */}
                <div style={{ textAlign: "left", marginBottom: "1.75rem" }}>
                  <label className="input-label" style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>{T.celebration.reflectionPrompt}</label>
                  <textarea className="input-field" rows={2}
                    placeholder={T.celebration.reflectionPlaceholder}
                    value={celebrationReflection} onChange={(e) => setCelebrationReflection(e.target.value)}
                    style={{ marginTop: "0.4rem", width: "100%", resize: "none" }} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  <button onClick={() => leaveCelebration("victory_wall")} className="btn btn-primary" style={{ padding: "0.95rem", fontSize: "1rem" }}>
                    {T.celebration.toVictoryWall}
                  </button>
                  <button onClick={() => leaveCelebration("landing")} className="btn btn-text" style={{ fontSize: "0.9rem" }}>
                    {T.celebration.backHome}
                  </button>
                </div>
              </div>

              <style>{`
                @keyframes confettiFall { 0% { transform: translateY(-20px) rotate(0deg); opacity: 0; } 15% { opacity: 1; } 100% { transform: translateY(90vh) rotate(320deg); opacity: 0; } }
                @keyframes penguinCelebrate { 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-14px) rotate(4deg); } }
                .confetti-layer { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
                .confetti-piece { position: absolute; top: -20px; width: 9px; height: 14px; border-radius: 2px; opacity: 0; animation-name: confettiFall; animation-timing-function: ease-in; animation-iteration-count: infinite; }
                .penguin-celebrate { display: inline-block; animation: penguinCelebrate 1.1s ease-in-out infinite; }
                @media (prefers-reduced-motion: reduce) { .confetti-piece, .penguin-celebrate { animation: none; } .confetti-piece { display: none; } }
              `}</style>
            </div>
          );
        })()}

        {/* ===== 6c. Victory Wall ===== */}
        {appStep === "victory_wall" && (() => {
          const dateLocale = lang === "ja" ? "ja-JP" : lang === "zh" ? "zh-CN" : "en-US";
          const byYear = new Map<string, ParentTask[]>();
          for (const t of completedTasks) {
            const year = (t.completedAt || "").slice(0, 4) || "—";
            if (!byYear.has(year)) byYear.set(year, []);
            byYear.get(year)!.push(t);
          }
          const years = Array.from(byYear.keys()).sort((a, b) => (b > a ? 1 : -1));
          return (
            <div className="victory-wall fade-in" style={{ maxWidth: "760px", margin: "0 auto" }}>
              <button onClick={() => setAppStep("landing")} className="btn btn-text" style={{ marginBottom: "1rem" }}>{T.victoryWall.backBtn}</button>
              <div className="card" style={{ padding: "2rem" }}>
                <h2 style={{ fontSize: "1.6rem", marginBottom: "0.35rem" }}>{T.victoryWall.title}</h2>
                <p style={{ fontSize: "0.92rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>{T.victoryWall.subtitle}</p>
                {completedTasks.length > 0 && (
                  <p style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--primary)", marginBottom: "1.5rem" }}>
                    ⭐ {T.victoryWall.countLabel.replace("{n}", String(completedTasks.length))}
                  </p>
                )}

                {completedTasks.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>🏔️</div>
                    <p style={{ fontSize: "1.05rem", fontWeight: "700", color: "var(--text-main)", marginBottom: "0.5rem" }}>{T.victoryWall.empty}</p>
                    <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>{T.victoryWall.emptyBody}</p>
                  </div>
                ) : (
                  years.map((year) => (
                    <div key={year} style={{ marginBottom: "1.75rem" }}>
                      <h3 style={{ fontSize: "1.1rem", color: "var(--primary-hover)", borderBottom: "2px solid var(--primary-light)", paddingBottom: "0.4rem", marginBottom: "1rem" }}>{year}</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {byYear.get(year)!.map((t) => {
                          const doneCount = t.subtasks.filter(s => s.status === "completed").length;
                          const dateStr = t.completedAt ? new Date(t.completedAt).toLocaleDateString(dateLocale, { year: "numeric", month: "short", day: "numeric" }) : "";
                          return (
                            <div key={t.id} style={{ padding: "1.15rem 1.25rem", border: "1px solid var(--border)", borderRadius: "1rem", backgroundColor: "var(--bg-base)" }}>
                              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                                <h4 style={{ fontSize: "1.05rem", fontWeight: "800", color: "var(--text-main)" }}>✓ {t.title}</h4>
                                <span style={{ fontSize: "0.78rem", color: "var(--text-light)", whiteSpace: "nowrap" }}>{T.victoryWall.completedOn}: {dateStr}</span>
                              </div>
                              <p style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: "600", marginTop: "0.35rem" }}>
                                {T.victoryWall.stepsSummary.replace("{n}", String(doneCount))}
                              </p>
                              {t.reflection && (
                                <p style={{ fontSize: "0.88rem", color: "var(--text-main)", lineHeight: 1.6, marginTop: "0.6rem", fontStyle: "italic", borderLeft: "3px solid var(--primary-light)", paddingLeft: "0.75rem" }}>
                                  <span style={{ fontStyle: "normal", fontWeight: "700", color: "var(--text-muted)", fontSize: "0.75rem", display: "block", marginBottom: "0.2rem" }}>{T.victoryWall.reflectionLabel}</span>
                                  {t.reflection}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })()}

        {/* ===== 7. Recovery Modal ===== */}
        {showRecoveryModal && (
          <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "1rem" }}>
            <div className="card fade-in" style={{ maxWidth: "420px", width: "100%", padding: "2.5rem", textAlign: "center", boxShadow: "0 24px 56px rgba(0,0,0,0.12)" }}>
              <div style={{ fontSize: "3.5rem", marginBottom: "0.75rem", lineHeight: 1 }}>🌱</div>
              <h3 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1rem", color: "var(--text-main)" }}>
                {T.progress.recoveryTitle}
              </h3>
              <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", lineHeight: "1.75", whiteSpace: "pre-line", marginBottom: "1.5rem" }}>
                {T.progress.recoveryBody.replace('{days}', String(recoveryDaysAway))}
              </p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 1.25rem", backgroundColor: "var(--primary-light)", borderRadius: "9999px", fontSize: "1rem", fontWeight: "700", color: "var(--primary-hover)", marginBottom: "1.75rem" }}>
                {T.progress.recoveryReward}
              </div>
              <button onClick={() => setShowRecoveryModal(false)} className="btn btn-primary" style={{ width: "100%", padding: "1rem" }}>
                {T.progress.recoveryCta}
              </button>
            </div>
          </div>
        )}

        {/* ===== 7b. Progress Modal ===== */}
        {showProgressModal && (() => {
          const stage = getPenguinStage(progressData.firstStepTokens);
          const progressPct = stage.nextTokens
            ? Math.round(((progressData.firstStepTokens - stage.minTokens) / (stage.nextTokens - stage.minTokens)) * 100)
            : 100;
          const calDays = getCalendarDays(progressData.activityLog);
          const stats = getWeeklyStats(progressData.activityLog);
          const insights: string[] = [];
          if (stats.sessions > 0) insights.push(T.progress.insightSessions.replace('{n}', String(stats.sessions)));
          if (stats.returns > 0) insights.push(T.progress.insightReturns.replace('{n}', String(stats.returns)));
          if (stats.completedTasks > 0) insights.push(T.progress.insightCompleted.replace('{n}', String(stats.completedTasks)));
          if (insights.length === 0) insights.push(T.progress.insightDefault);
          return (
            <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1050, padding: "1rem" }}>
              <div className="card fade-in" style={{ maxWidth: "560px", width: "100%", padding: "2rem", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 24px 56px rgba(0,0,0,0.14)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--text-main)" }}>{T.progress.modalTitle}</h3>
                  <button onClick={() => setShowProgressModal(false)} className="btn btn-text" style={{ fontSize: "0.9rem" }}>{T.progress.closeBtn}</button>
                </div>

                {/* Penguin Stage */}
                <div style={{ textAlign: "center", padding: "1.25rem", backgroundColor: "var(--bg-base)", borderRadius: "1.25rem", marginBottom: "1.25rem" }}>
                  <div style={{ fontSize: "3.5rem", lineHeight: 1, marginBottom: "0.5rem" }}>{stage.emoji}</div>
                  <div style={{ fontWeight: "700", fontSize: "1.05rem", color: "var(--primary-hover)", marginBottom: "0.75rem" }}>
                    {T.progress.stages[stage.nameKey as keyof typeof T.progress.stages]}
                  </div>
                  <div className="penguin-progress-bar" style={{ margin: "0 auto", maxWidth: "240px" }}>
                    <div className="penguin-progress-fill" style={{ width: `${progressPct}%` }} />
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                    {stage.nextTokens ? T.progress.nextIn.replace('{n}', String(stage.nextTokens - progressData.firstStepTokens)) : T.progress.maxStage}
                  </div>
                </div>

                {/* Collection */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <h4 style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.75rem" }}>{T.progress.collectionTitle}</h4>
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    {[
                      { label: T.progress.tokensLabel, count: progressData.firstStepTokens },
                      { label: T.progress.seedsLabel, count: progressData.recoverySeeds },
                      { label: T.progress.starsLabel, count: progressData.milestoneStars },
                    ].map(({ label, count }) => (
                      <div key={label} className="collection-stat">
                        <span style={{ fontSize: "1.35rem", lineHeight: 1 }}>{label.split(' ')[0]}</span>
                        <span style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--primary)" }}>{count}</span>
                        <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textAlign: "center", lineHeight: 1.3 }}>{label.split(' ').slice(1).join(' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 28-day Calendar */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <h4 style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.75rem" }}>{T.progress.calendarTitle}</h4>
                  <div className="activity-calendar">
                    {calDays.map((day, i) => {
                      const hasAct = day.types.size > 0;
                      const icons: string[] = [];
                      if (day.types.has('task_complete')) icons.push('⭐');
                      else if (day.types.has('subtask_complete')) icons.push('🐤');
                      if ((day.types.has('session_start') || day.types.has('plan_created')) && icons.length < 2) icons.push('🐣');
                      if (day.types.has('return') && icons.length < 2) icons.push('🌱');
                      if (day.types.has('reflection') && icons.length < 2) icons.push('💬');
                      return (
                        <div key={i} className={`calendar-cell ${hasAct ? 'calendar-cell-active' : 'calendar-cell-empty'}`}>
                          <span style={{ fontSize: "0.6rem", color: hasAct ? "var(--primary)" : "var(--text-light)", fontWeight: hasAct ? "700" : "400" }}>
                            {day.dayNum}
                          </span>
                          {hasAct && icons.length > 0 && (
                            <span style={{ fontSize: "0.7rem", lineHeight: 1 }}>{icons.slice(0, 2).join('')}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>{T.progress.calendarLegend}</p>
                </div>

                {/* Insights */}
                <div>
                  <h4 style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.75rem" }}>{T.progress.insightsTitle}</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {insights.map((msg, i) => (
                      <p key={i} style={{ fontSize: "0.9rem", color: "var(--text-main)", lineHeight: "1.6", padding: "0.6rem 0.85rem", backgroundColor: "var(--primary-light)", borderRadius: "0.75rem", borderLeft: "3px solid var(--primary)" }}>
                        {msg}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ===== 8. Energy Modal ===== */}
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

        {/* ===== 9. Progress Reflection (goal-oriented, on completion) ===== */}
        {showReflectionModal && (
          <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "1rem" }}>
            <div className="card fade-in" style={{ maxWidth: "520px", width: "100%", padding: "2rem", boxShadow: "0 20px 48px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.5rem", color: "var(--text-main)" }}>
                {T.realityCheck.reflectTitle}
              </h3>
              {currentParentTask?.todaysRealGoal && (
                <p style={{ fontSize: "0.82rem", color: "var(--accent-hover)", fontWeight: "600", marginBottom: "1.5rem" }}>
                  {T.realityCheck.bannerLabel}: {currentParentTask.todaysRealGoal}
                </p>
              )}

              <label className="input-label" style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>{T.realityCheck.reflectQ1}</label>
              <input type="text" className="input-field" placeholder={T.realityCheck.reflectQ1Placeholder}
                value={reflectMoved} onChange={(e) => setReflectMoved(e.target.value)}
                style={{ marginTop: "0.4rem", marginBottom: "1.25rem", width: "100%" }} />

              <label className="input-label" style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>{T.realityCheck.reflectQ2}</label>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
                {([
                  ["closer", T.realityCheck.reflectQ2Closer],
                  ["same", T.realityCheck.reflectQ2Same],
                  ["unsure", T.realityCheck.reflectQ2Unsure],
                ] as const).map(([key, label]) => (
                  <button key={key} type="button"
                    className={`reality-choice${reflectDistance === key ? " selected-progress" : ""}`}
                    style={{ flex: 1, minWidth: "100px" }}
                    onClick={() => setReflectDistance(key)}>
                    {label}
                  </button>
                ))}
              </div>

              <label className="input-label" style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>{T.realityCheck.reflectQ3}</label>
              <input type="text" className="input-field" placeholder={T.realityCheck.reflectQ3Placeholder}
                value={reflectNext} onChange={(e) => setReflectNext(e.target.value)}
                style={{ marginTop: "0.4rem", marginBottom: "1.75rem", width: "100%" }} />

              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <button onClick={finalizeSubtaskCompletion} className="btn btn-primary" style={{ padding: "0.95rem", fontSize: "1rem" }}>
                  {T.realityCheck.reflectDoneBtn}
                </button>
                <button onClick={finalizeSubtaskCompletion} className="btn btn-text" style={{ fontSize: "0.85rem" }}>
                  {T.realityCheck.reflectSkipBtn}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer>
        &copy; {new Date().getFullYear()} {T.appTitle}. {T.footer}
      </footer>

      {/* Progress selector (bottom left) */}
      <div className="progress-selector">
        <button className="progress-trigger" onClick={() => setShowProgressModal(true)} aria-label={T.progress.viewBtn}>
          <span>{getPenguinStage(progressData.firstStepTokens).emoji}</span>
          <span style={{ fontSize: "0.8rem" }}>{progressData.firstStepTokens}</span>
        </button>
      </div>

      {/* Token toast */}
      {tokenToast && (
        <div className="token-toast">{tokenToast.text}</div>
      )}

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
