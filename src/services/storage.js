/**
 * StorageService — Abstraction layer over localStorage.
 * All data access goes through here so we can swap to IndexedDB/Supabase in V1.1.
 */

const KEYS = {
  goals: 'focusflow_goals',
  tasks: 'focusflow_tasks',
  transactions: 'focusflow_transactions',
  files: 'focusflow_files',
  folders: 'focusflow_folders',
  settings: 'focusflow_settings',
  focusSessions: 'focusflow_focus_sessions',
  focusActive: 'focusflow_focus_active',
};

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getItem(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage error:', e);
  }
}

// — Goals —
export function getGoals() { return getItem(KEYS.goals) || []; }
export function saveGoals(goals) { setItem(KEYS.goals, goals); }

export function createGoal(goalData) {
  const goals = getGoals();
  const goal = {
    id: generateId(),
    title: goalData.title,
    type: goalData.type || 'custom',
    description: goalData.description || '',
    targetValue: Number(goalData.targetValue) || 0,
    currentValue: 0,
    targetDate: goalData.targetDate || null,
    priority: goalData.priority || 'medium',
    status: 'active',
    color: goalData.color || null,
    attachedFileIds: [],
    tags: goalData.tags || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  goals.unshift(goal);
  saveGoals(goals);
  return goal;
}

export function updateGoal(id, updates) {
  const goals = getGoals();
  const idx = goals.findIndex(g => g.id === id);
  if (idx === -1) return null;
  goals[idx] = { ...goals[idx], ...updates, updatedAt: new Date().toISOString() };
  saveGoals(goals);
  return goals[idx];
}

export function deleteGoal(id) {
  const goals = getGoals().filter(g => g.id !== id);
  saveGoals(goals);
  // Also remove related transactions
  const txns = getTransactions().filter(t => t.goalId !== id);
  saveTransactions(txns);
}

export function getGoalById(id) {
  return getGoals().find(g => g.id === id) || null;
}

// — Tasks —
export function getTasks() { return getItem(KEYS.tasks) || []; }
export function saveTasks(tasks) { setItem(KEYS.tasks, tasks); }

export function createTask(taskData) {
  const tasks = getTasks();
  const task = {
    id: generateId(),
    title: taskData.title,
    note: taskData.note || '',
    priority: taskData.priority || 'medium',
    dueDate: taskData.dueDate || null,
    completed: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tasks.unshift(task);
  saveTasks(tasks);
  return task;
}

export function updateTask(id, updates) {
  const tasks = getTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return null;
  tasks[idx] = { ...tasks[idx], ...updates, updatedAt: new Date().toISOString() };
  saveTasks(tasks);
  return tasks[idx];
}

export function deleteTask(id) {
  const tasks = getTasks().filter(t => t.id !== id);
  saveTasks(tasks);
}

export function getTaskById(id) {
  return getTasks().find(t => t.id === id) || null;
}

// — Transactions —
export function getTransactions() { return getItem(KEYS.transactions) || []; }
export function saveTransactions(txns) { setItem(KEYS.transactions, txns); }

export function getTransactionsForGoal(goalId) {
  return getTransactions().filter(t => t.goalId === goalId).sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function addTransaction(txnData) {
  const txns = getTransactions();
  const txn = {
    id: generateId(),
    goalId: txnData.goalId,
    type: txnData.type, // 'deposit' | 'withdrawal'
    amount: Math.abs(Number(txnData.amount)),
    note: txnData.note || '',
    date: txnData.date || new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
  };
  txns.unshift(txn);
  saveTransactions(txns);

  // Update goal's currentValue
  const goal = getGoalById(txnData.goalId);
  if (goal) {
    const goalTxns = getTransactionsForGoal(goal.id);
    let balance = 0;
    for (const t of goalTxns) {
      balance += t.type === 'deposit' ? t.amount : -t.amount;
    }
    balance = Math.max(0, balance);
    updateGoal(goal.id, { currentValue: balance });
    if (goal.type === 'savings' && balance >= goal.targetValue && goal.targetValue > 0) {
      updateGoal(goal.id, { status: 'completed', currentValue: balance });
    }
  }
  return txn;
}

// — Files —
export function getFiles() { return getItem(KEYS.files) || []; }
export function saveFiles(files) { setItem(KEYS.files, files); }

export function addFile(fileData) {
  const files = getFiles();
  const file = {
    id: generateId(),
    name: fileData.name,
    type: fileData.type,
    size: fileData.size,
    folderId: fileData.folderId || null,
    tags: fileData.tags || [],
    data: fileData.data, // base64
    goalId: fileData.goalId || null,
    createdAt: new Date().toISOString(),
  };
  files.unshift(file);
  saveFiles(files);
  return file;
}

export function deleteFile(id) {
  const files = getFiles().filter(f => f.id !== id);
  saveFiles(files);
  // Remove base64 data
  try { localStorage.removeItem(`focusflow_file_data_${id}`); } catch {}
}

export function getFilesInFolder(folderId) {
  return getFiles().filter(f => f.folderId === (folderId || null));
}

// — Folders —
export function getFolders() { return getItem(KEYS.folders) || []; }
export function saveFolders(folders) { setItem(KEYS.folders, folders); }

export function createFolder(name, parentId = null) {
  const folders = getFolders();
  const folder = {
    id: generateId(),
    name,
    parentId,
    createdAt: new Date().toISOString(),
  };
  folders.push(folder);
  saveFolders(folders);
  return folder;
}

export function deleteFolder(id) {
  const folders = getFolders().filter(f => f.id !== id && f.parentId !== id);
  saveFolders(folders);
  // Move files in that folder to root
  const files = getFiles().map(f => f.folderId === id ? { ...f, folderId: null } : f);
  saveFiles(files);
}

// — Settings —
export function getSettings() {
  const saved = getItem(KEYS.settings) || {};
  return {
    theme: 'light',
    colorTheme: 'default',
    currency: 'PHP',
    sidebarCollapsed: false,
    ...saved,
  };
}
export function saveSettings(settings) { setItem(KEYS.settings, settings); }
export function updateSettings(updates) {
  const settings = { ...getSettings(), ...updates };
  saveSettings(settings);
  return settings;
}

// — Focus Mode —
export function getFocusSessions() {
  return (getItem(KEYS.focusSessions) || []).sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
}

export function saveFocusSessions(sessions) {
  setItem(KEYS.focusSessions, sessions);
}

export function getActiveFocusSession() {
  return getItem(KEYS.focusActive);
}

export function startFocusSession(startedAt = new Date().toISOString()) {
  const existing = getActiveFocusSession();
  if (existing) return existing;

  const session = {
    id: generateId(),
    startedAt,
  };
  setItem(KEYS.focusActive, session);
  return session;
}

export function stopFocusSession(endedAt = new Date().toISOString()) {
  const active = getActiveFocusSession();
  if (!active) return null;

  const durationSeconds = Math.max(1, Math.floor((new Date(endedAt).getTime() - new Date(active.startedAt).getTime()) / 1000));
  const dateKey = active.startedAt.slice(0, 10);
  const sessions = getFocusSessions();

  const completed = {
    id: active.id,
    startedAt: active.startedAt,
    endedAt,
    durationSeconds,
    dateKey,
    createdAt: new Date().toISOString(),
  };

  sessions.unshift(completed);
  saveFocusSessions(sessions);
  localStorage.removeItem(KEYS.focusActive);
  return completed;
}

// — Storage Usage —
export function getStorageUsage() {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('focusflow_')) {
      total += (localStorage.getItem(key) || '').length * 2; // chars → bytes (UTF-16)
    }
  }
  return total;
}
export function getStorageUsageMB() {
  return (getStorageUsage() / (1024 * 1024)).toFixed(1);
}
export function getStorageLimitMB() { return null; }

// — Export/Import —
export function exportAllData() {
  return JSON.stringify({
    goals: getGoals(),
    tasks: getTasks(),
    transactions: getTransactions(),
    files: getFiles().map(f => ({ ...f, data: undefined })), // skip binary
    folders: getFolders(),
    settings: getSettings(),
    focusSessions: getFocusSessions(),
    focusActive: getActiveFocusSession(),
    exportedAt: new Date().toISOString(),
  }, null, 2);
}

export function importData(jsonString) {
  const data = JSON.parse(jsonString);
  if (data.goals) saveGoals(data.goals);
  if (data.tasks) saveTasks(data.tasks);
  if (data.transactions) saveTransactions(data.transactions);
  if (data.folders) saveFolders(data.folders);
  if (data.settings) saveSettings(data.settings);
  if (data.focusSessions) saveFocusSessions(data.focusSessions);
  if (data.focusActive) setItem(KEYS.focusActive, data.focusActive);
}

export function clearAllData() {
  Object.values(KEYS).forEach(key => localStorage.removeItem(key));
  // Also clear file data entries
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('focusflow_')) toRemove.push(key);
  }
  toRemove.forEach(k => localStorage.removeItem(k));
}

export { generateId };
