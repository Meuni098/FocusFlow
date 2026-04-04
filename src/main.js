/**
 * FocusFlow — Main Entry Point
 * Router, theme toggle, modals, and global handlers
 */
import * as storage from './services/storage.js';
import { askOpenRouter, getAiConfigStatus } from './services/ai.js';
import { showToast, formatCurrency, getGoalColor } from './utils/helpers.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderGoalsList } from './pages/goals.js';
import { renderGoalDetail } from './pages/goal-detail.js';
import { renderFileVault } from './pages/file-vault.js';
import { renderSettings } from './pages/settings.js';
import { renderTasks } from './pages/tasks.js';
import { renderFocusMode } from './pages/focus-mode.js';

// ─── State ───
let currentPage = 'dashboard';
let currentGoalId = null;
let notificationPanelOpen = false;
let floatingAiChatHistory = [];
let floatingAiBusy = false;
let isTransitioningHome = false;
let globalSearchResults = [];
let globalSearchActiveIndex = -1;

function getDismissedNotificationIds() {
  const settings = storage.getSettings();
  return settings.dismissedNotificationIds || [];
}

function setDismissedNotificationIds(ids) {
  storage.updateSettings({ dismissedNotificationIds: ids.slice(0, 80) });
}

function buildNotifications() {
  const notifications = [];
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tasks = storage.getTasks();
  const goals = storage.getGoals();
  const activeFocus = storage.getActiveFocusSession();

  const overdueTasks = tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < today);
  if (overdueTasks.length > 0) {
    notifications.push({
      id: 'tasks-overdue',
      icon: '⚠️',
      title: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`,
      body: 'Review and reschedule overdue tasks to stay on track.',
      actionLabel: 'Open Tasks',
      action: () => window.navigateTo('tasks'),
    });
  }

  const dueSoonGoals = goals.filter(g => {
    if (!g.targetDate || g.status !== 'active') return false;
    const d = new Date(g.targetDate);
    const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 7;
  });
  if (dueSoonGoals.length > 0) {
    notifications.push({
      id: 'goals-due-soon',
      icon: '🎯',
      title: `${dueSoonGoals.length} goal${dueSoonGoals.length > 1 ? 's are' : ' is'} due this week`,
      body: 'Check your active goals and update progress this week.',
      actionLabel: 'Open Goals',
      action: () => window.navigateTo('goals'),
    });
  }

  const pendingTasks = tasks.filter(t => !t.completed).length;
  if (pendingTasks > 0) {
    notifications.push({
      id: 'tasks-pending',
      icon: '📝',
      title: `${pendingTasks} pending task${pendingTasks > 1 ? 's' : ''}`,
      body: 'Keep momentum by finishing your highest-priority tasks first.',
      actionLabel: 'Plan Tasks',
      action: () => window.navigateTo('tasks'),
    });
  }

  if (activeFocus) {
    const elapsedMins = Math.floor((Date.now() - new Date(activeFocus.startedAt).getTime()) / (1000 * 60));
    notifications.push({
      id: 'focus-running',
      icon: '⏱️',
      title: 'Focus Mode is running',
      body: `Current session: ${elapsedMins} minute${elapsedMins !== 1 ? 's' : ''}.`,
      actionLabel: 'Open Focus Mode',
      action: () => window.navigateTo('focus'),
    });
  }

  const dismissed = new Set(getDismissedNotificationIds());
  return notifications.filter(n => !dismissed.has(n.id)).slice(0, 6);
}

function updateNotificationBadge() {
  const dot = document.querySelector('#notification-btn .notification-dot');
  if (!dot) return;
  dot.classList.toggle('hidden', buildNotifications().length === 0);
}

function closeNotificationPanel() {
  const panel = document.getElementById('notification-panel');
  if (panel) panel.remove();
  notificationPanelOpen = false;
}

function renderNotificationPanel() {
  closeNotificationPanel();

  const btn = document.getElementById('notification-btn');
  if (!btn) return;

  const notifications = buildNotifications();
  const panel = document.createElement('div');
  panel.id = 'notification-panel';
  panel.className = 'notification-panel';
  panel.innerHTML = `
    <div class="notification-panel-header">
      <h4>Notifications</h4>
      <button class="btn-ghost" style="height: 30px; padding: 0 10px; font-size: 12px;" onclick="window.clearNotifications()">Clear All</button>
    </div>
    <div class="notification-panel-list">
      ${notifications.length === 0 ? `
        <div class="notification-empty">You're all caught up.</div>
      ` : notifications.map(n => `
        <div class="notification-item">
          <div class="notification-icon">${n.icon}</div>
          <div class="notification-content">
            <div class="notification-title">${n.title}</div>
            <div class="notification-body">${n.body}</div>
            <div class="notification-actions">
              <button class="btn-ghost" style="height: 28px; padding: 0 10px; font-size: 12px;" onclick="window.openNotificationAction('${n.id}')">${n.actionLabel}</button>
              <button class="btn-ghost" style="height: 28px; padding: 0 10px; font-size: 12px;" onclick="window.dismissNotification('${n.id}')">Dismiss</button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  btn.parentElement.style.position = 'relative';
  btn.parentElement.appendChild(panel);
  notificationPanelOpen = true;
}

window.dismissNotification = function(id) {
  const ids = getDismissedNotificationIds();
  if (!ids.includes(id)) ids.push(id);
  setDismissedNotificationIds(ids);
  renderNotificationPanel();
  updateNotificationBadge();
};

window.clearNotifications = function() {
  const ids = buildNotifications().map(n => n.id);
  setDismissedNotificationIds(Array.from(new Set([...getDismissedNotificationIds(), ...ids])));
  renderNotificationPanel();
  updateNotificationBadge();
};

window.openNotificationAction = function(id) {
  const map = {
    'tasks-overdue': () => window.navigateTo('tasks'),
    'tasks-pending': () => window.navigateTo('tasks'),
    'goals-due-soon': () => window.navigateTo('goals'),
    'storage-high': () => window.navigateTo('files'),
    'focus-running': () => window.navigateTo('focus'),
  };
  window.dismissNotification(id);
  closeNotificationPanel();
  if (map[id]) map[id]();
};

// ─── Theme ───
function initTheme() {
  const settings = storage.getSettings();
  let theme = settings.theme || 'light';
  const colorTheme = settings.colorTheme || 'default';
  if (theme === 'system') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-color-theme', colorTheme);
}

window.setAppTheme = function(theme) {
  storage.updateSettings({ theme });
  if (theme === 'system') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
  // Re-render current page to update active states
  route();
};

window.setColorTheme = function(colorTheme) {
  storage.updateSettings({ colorTheme });
  document.documentElement.setAttribute('data-color-theme', colorTheme);
  // Re-render current page to reflect active palette selection in settings cards.
  route();
};

document.getElementById('theme-toggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  window.setAppTheme(next);
});

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  const settings = storage.getSettings();
  if (settings.theme === 'system') {
    document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
  }
});

// ─── Router ───
function setShellVisibility(page) {
  const isHome = page === 'home';
  document.body.classList.toggle('home-mode', isHome);

  if (isHome) {
    const landingPage = document.getElementById('landing-page');
    if (landingPage) {
      landingPage.classList.remove('is-entering-home');
      // Force reflow so repeated home transitions replay animation.
      void landingPage.offsetWidth;
      landingPage.classList.add('is-entering-home');
      setTimeout(() => landingPage.classList.remove('is-entering-home'), 420);
    }
  }
}

function route() {
  const hash = window.location.hash || '#home';
  const parts = hash.replace('#', '').split('/');
  const page = parts[0] || 'home';
  const param = parts[1] || null;

  currentPage = page;
  currentGoalId = null;

  setShellVisibility(page);

  // Update nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-page') === page ||
      (page === 'goal-detail' && item.getAttribute('data-page') === 'goals'));
  });

  // Update header title
  const titles = {
    home: 'FocusFlow',
    dashboard: 'Dashboard',
    tasks: 'Tasks',
    focus: 'Focus Mode',
    goals: 'Goals',
    'goal-detail': 'Goals',
    files: 'File Vault',
    settings: 'Settings',
  };
  document.getElementById('page-title').textContent = titles[page] || 'FocusFlow';

  // Render page
  switch (page) {
    case 'home':
      break;
    case 'dashboard':
      renderDashboard();
      break;
    case 'tasks':
      renderTasks();
      break;
    case 'focus':
      renderFocusMode();
      break;
    case 'goals':
      renderGoalsList();
      break;
    case 'goal-detail':
      currentGoalId = param;
      renderGoalDetail(param);
      break;
    case 'files':
      renderFileVault();
      break;
    case 'settings':
      renderSettings();
      break;
    default:
      renderDashboard();
  }

  updateNotificationBadge();
}

window.navigateTo = function(page, param) {
  window.location.hash = param ? `#${page}/${param}` : `#${page}`;
};

window.addEventListener('hashchange', route);

document.getElementById('notification-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  if (notificationPanelOpen) {
    closeNotificationPanel();
    return;
  }
  renderNotificationPanel();
});

document.addEventListener('click', (e) => {
  if (!notificationPanelOpen) return;
  const panel = document.getElementById('notification-panel');
  if (!panel) {
    notificationPanelOpen = false;
    return;
  }
  if (!panel.contains(e.target) && !document.getElementById('notification-btn').contains(e.target)) {
    closeNotificationPanel();
  }
});

// ─── Global Search ───
function scoreMatch(text, query) {
  const t = String(text || '').toLowerCase();
  if (!t || !query) return 0;
  if (t.startsWith(query)) return 6;
  if (t.includes(query)) return 3;
  return 0;
}

function buildGlobalSearchResults(rawQuery) {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];

  const results = [];

  const pageItems = [
    { page: 'dashboard', title: 'Dashboard', keywords: 'overview home workspace summary' },
    { page: 'tasks', title: 'Tasks', keywords: 'todo checklist priorities due' },
    { page: 'focus', title: 'Focus Mode', keywords: 'timer deep work session pomodoro' },
    { page: 'goals', title: 'Goals', keywords: 'targets milestones savings progress' },
    { page: 'files', title: 'File Vault', keywords: 'documents files uploads vault' },
    { page: 'settings', title: 'Settings', keywords: 'preferences appearance theme configuration' },
  ];

  for (const p of pageItems) {
    const score = scoreMatch(p.title, query) + scoreMatch(p.keywords, query);
    if (score > 0) {
      results.push({
        type: 'Page',
        title: p.title,
        subtitle: 'Navigate',
        score,
        action: () => window.navigateTo(p.page),
      });
    }
  }

  const goals = storage.getGoals();
  for (const g of goals) {
    const score =
      scoreMatch(g.title, query) +
      scoreMatch(g.description, query) +
      scoreMatch((g.tags || []).join(' '), query);
    if (score > 0) {
      results.push({
        type: 'Goal',
        title: g.title,
        subtitle: `${g.type || 'custom'} goal`,
        score: score + 2,
        action: () => window.navigateTo('goal-detail', g.id),
      });
    }
  }

  const tasks = storage.getTasks();
  for (const t of tasks) {
    const score = scoreMatch(t.title, query) + scoreMatch(t.note, query);
    if (score > 0) {
      results.push({
        type: 'Task',
        title: t.title,
        subtitle: t.completed ? 'Completed task' : 'Open in Tasks',
        score: score + (t.completed ? 0 : 2),
        action: () => window.navigateTo('tasks'),
      });
    }
  }

  const files = storage.getFiles();
  for (const f of files) {
    const score = scoreMatch(f.name, query) + scoreMatch((f.tags || []).join(' '), query);
    if (score > 0) {
      results.push({
        type: 'File',
        title: f.name,
        subtitle: `${(f.type || 'file').toUpperCase()} in File Vault`,
        score: score + 1,
        action: () => window.navigateTo('files'),
      });
    }
  }

  return results
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, 10);
}

function getSearchTypeBadge(type) {
  const map = {
    Page: 'PAGE',
    Goal: 'GOAL',
    Task: 'TASK',
    File: 'FILE',
  };
  return map[type] || 'ITEM';
}

function setGlobalSearchActiveIndex(index) {
  const panel = document.getElementById('global-search-results');
  if (!panel) return;
  const items = panel.querySelectorAll('.global-search-item');
  if (items.length === 0) {
    globalSearchActiveIndex = -1;
    return;
  }

  const bounded = Math.max(0, Math.min(index, items.length - 1));
  globalSearchActiveIndex = bounded;
  items.forEach((el, i) => el.classList.toggle('active', i === bounded));
}

function closeGlobalSearchPanel() {
  const panel = document.getElementById('global-search-results');
  if (!panel) return;
  panel.classList.add('hidden');
  panel.innerHTML = '';
  globalSearchResults = [];
  globalSearchActiveIndex = -1;
}

function openGlobalSearchResult(result) {
  if (!result || typeof result.action !== 'function') return;
  result.action();

  const input = document.getElementById('global-search');
  if (input) input.value = '';
  closeGlobalSearchPanel();
}

function renderGlobalSearchPanel(rawQuery) {
  const panel = document.getElementById('global-search-results');
  if (!panel) return;

  const query = rawQuery.trim();
  if (!query) {
    closeGlobalSearchPanel();
    return;
  }

  globalSearchResults = buildGlobalSearchResults(query);
  if (globalSearchResults.length === 0) {
    panel.innerHTML = '<div class="global-search-empty">No results found.</div>';
    panel.classList.remove('hidden');
    globalSearchActiveIndex = -1;
    return;
  }

  panel.innerHTML = globalSearchResults.map((r, i) => `
    <button class="global-search-item ${i === 0 ? 'active' : ''}" data-index="${i}">
      <span class="global-search-type">${getSearchTypeBadge(r.type)}</span>
      <span class="global-search-texts">
        <span class="global-search-title">${r.title.replace(/</g, '&lt;')}</span>
        <span class="global-search-sub">${r.subtitle.replace(/</g, '&lt;')}</span>
      </span>
    </button>
  `).join('');

  panel.classList.remove('hidden');
  globalSearchActiveIndex = 0;
}

function initGlobalSearch() {
  const input = document.getElementById('global-search');
  const searchBar = document.querySelector('.search-bar');
  if (!input || !searchBar) return;

  let panel = document.getElementById('global-search-results');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'global-search-results';
    panel.className = 'global-search-results hidden';
    searchBar.appendChild(panel);
  }

  input.addEventListener('input', () => {
    renderGlobalSearchPanel(input.value);
  });

  input.addEventListener('focus', () => {
    if (input.value.trim()) renderGlobalSearchPanel(input.value);
  });

  input.addEventListener('keydown', (e) => {
    const hasResults = globalSearchResults.length > 0;
    if (e.key === 'Escape') {
      closeGlobalSearchPanel();
      return;
    }

    if (!hasResults) {
      if (e.key === 'Enter' && input.value.trim()) {
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = globalSearchActiveIndex < 0 ? 0 : (globalSearchActiveIndex + 1) % globalSearchResults.length;
      setGlobalSearchActiveIndex(next);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = globalSearchActiveIndex <= 0 ? globalSearchResults.length - 1 : globalSearchActiveIndex - 1;
      setGlobalSearchActiveIndex(next);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const picked = globalSearchResults[globalSearchActiveIndex] || globalSearchResults[0];
      openGlobalSearchResult(picked);
    }
  });

  panel.addEventListener('mousedown', (e) => {
    const btn = e.target.closest('.global-search-item');
    if (!btn) return;
    e.preventDefault();
    const index = Number(btn.getAttribute('data-index'));
    openGlobalSearchResult(globalSearchResults[index]);
  });

  document.addEventListener('click', (e) => {
    if (!searchBar.contains(e.target)) closeGlobalSearchPanel();
  });
}

// ─── Modals ───
window.closeModal = function() {
  const overlay = document.getElementById('modal-overlay');

  const isFloatingAiOverlay = overlay.classList.contains('floating-ai-overlay');
  const floatingAiModal = overlay.querySelector('.floating-ai-modal');

  if (isFloatingAiOverlay && floatingAiModal && !floatingAiModal.classList.contains('is-closing')) {
    floatingAiModal.classList.add('is-closing');
    setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.classList.remove('floating-ai-overlay');
      overlay.onclick = null;
      overlay.innerHTML = '';
    }, 200);
    return;
  }

  overlay.classList.add('hidden');
  overlay.classList.remove('floating-ai-overlay');
  overlay.onclick = null;
  overlay.innerHTML = '';
};

// Close on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') window.closeModal();
});

// ─── Floating AI Assistant ───
function renderFloatingAiMessages() {
  const container = document.getElementById('floating-ai-messages');
  if (!container) return;

  if (floatingAiChatHistory.length === 0) {
    container.innerHTML = '<div class="floating-ai-empty">Start chatting with FocusFlow AI.</div>';
    return;
  }

  container.innerHTML = floatingAiChatHistory.map(msg => {
    const safeContent = msg.content.replace(/</g, '&lt;');
    const time = new Date(msg.at || Date.now()).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const cls = msg.role === 'user' ? 'from-user' : 'from-ai';
    return `
      <div class="floating-ai-msg ${cls}">
        ${msg.role === 'assistant' ? '<div class="floating-ai-avatar">AI</div>' : ''}
        <div class="floating-ai-msg-body">
          <div class="floating-ai-bubble">${safeContent}</div>
          <div class="floating-ai-time">${time}</div>
        </div>
      </div>
    `;
  }).join('') + (floatingAiBusy
    ? '<div class="floating-ai-msg from-ai"><div class="floating-ai-avatar">AI</div><div class="floating-ai-msg-body"><div class="floating-ai-bubble typing">Typing...</div></div></div>'
    : '');

  container.scrollTop = container.scrollHeight;
}

function buildFloatingAiPrompt(userMessage) {
  const recent = floatingAiChatHistory.slice(-12);
  const transcript = recent
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const goals = storage.getGoals();
  const tasks = storage.getTasks();
  const activeFocus = storage.getActiveFocusSession();

  const savingsGoals = goals.filter(g => g.type === 'savings');
  const totalSaved = savingsGoals.reduce((sum, g) => sum + (Number(g.currentValue) || 0), 0);
  const totalTarget = savingsGoals.reduce((sum, g) => sum + (Number(g.targetValue) || 0), 0);
  const savingsPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  const pendingTasks = tasks.filter(t => !t.completed);
  const overdueTasks = pendingTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date());

  const topActiveGoals = goals
    .filter(g => g.status === 'active')
    .slice(0, 5)
    .map(g => {
      const target = Number(g.targetValue) || 0;
      const current = Number(g.currentValue) || 0;
      const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
      return `- ${g.title} (${g.type}) ${pct}% ${g.targetDate ? `| target date ${g.targetDate}` : ''}`;
    })
    .join('\n') || '- None';

  const topPendingTasks = pendingTasks
    .slice(0, 8)
    .map(t => `- ${t.title} | priority ${t.priority || 'medium'} ${t.dueDate ? `| due ${t.dueDate}` : '| no due date'}`)
    .join('\n') || '- None';

  const appContext = [
    'Current FocusFlow app context:',
    `- Savings goals: ${savingsGoals.length}`,
    `- Total savings progress: ${totalSaved} / ${totalTarget} (${savingsPct}%)`,
    `- Active goals: ${goals.filter(g => g.status === 'active').length}`,
    `- Pending tasks: ${pendingTasks.length}`,
    `- Overdue tasks: ${overdueTasks.length}`,
    `- Focus session running: ${activeFocus ? 'yes' : 'no'}`,
    '- Top active goals:',
    topActiveGoals,
    '- Top pending tasks:',
    topPendingTasks,
  ].join('\n');

  return [
    'You are FocusFlow AI assistant. Keep answers concise, practical, and supportive.',
    'Use the provided app context as source of truth when user asks about their savings, goals, tasks, or focus progress.',
    'If numbers are in context, cite them clearly in your response.',
    '',
    appContext,
    '',
    transcript,
    `User: ${userMessage}`,
  ].join('\n');
}

window.openFloatingAiAssistant = function() {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;

  overlay.classList.remove('hidden');
  overlay.classList.add('floating-ai-overlay');
  overlay.innerHTML = `
    <div class="modal floating-ai-modal" style="max-width: 460px; padding: 0; overflow: hidden;">
      <div class="floating-ai-topbar">
        <div class="floating-ai-top-left">
          <div class="floating-ai-stack-avatars">
            <span>A</span><span>I</span>
          </div>
          <div>
            <div class="floating-ai-top-title">AI Assistant</div>
            <div class="floating-ai-top-sub">Active now</div>
          </div>
        </div>
        <div class="floating-ai-top-actions">
          <button class="floating-ai-text-btn" onclick="window.clearFloatingAiChat()">New chat</button>
          <button class="modal-close" onclick="window.closeModal()">✕</button>
        </div>
      </div>
      <div class="floating-ai-chatbox">
        <div id="floating-ai-messages" class="floating-ai-messages"></div>
        <div class="floating-ai-composer">
          <textarea id="floating-ai-prompt" class="form-input form-textarea floating-ai-input" placeholder="Write a reply..."></textarea>
          <div class="floating-ai-composer-row">
            <button class="floating-ai-send" onclick="window.submitFloatingAiPrompt()">Send</button>
          </div>
        </div>
      </div>
    </div>
  `;

  renderFloatingAiMessages();

  const input = document.getElementById('floating-ai-prompt');
  if (input) {
    input.focus();
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        window.submitFloatingAiPrompt();
      }
    });
  }

  const status = getAiConfigStatus();
  if (!status.configured && floatingAiChatHistory.length === 0) {
    floatingAiChatHistory.push({
      role: 'assistant',
      content: 'OpenRouter is not configured. Add VITE_OPENROUTER_API_KEY in .env then restart Vite.',
      at: Date.now(),
    });
    renderFloatingAiMessages();
  }
};

window.clearFloatingAiChat = function() {
  floatingAiChatHistory = [];
  renderFloatingAiMessages();
};

window.submitFloatingAiPrompt = async function() {
  const input = document.getElementById('floating-ai-prompt');
  if (!input || floatingAiBusy) return;

  const userMessage = input.value.trim();
  if (!userMessage) {
    showToast('Type a message first.', 'info');
    return;
  }

  const status = getAiConfigStatus();
  if (!status.configured) {
    floatingAiChatHistory.push({
      role: 'assistant',
      content: 'OpenRouter is not configured. Add VITE_OPENROUTER_API_KEY in .env and restart Vite.',
      at: Date.now(),
    });
    renderFloatingAiMessages();
    showToast('OpenRouter is not configured.', 'error');
    return;
  }

  floatingAiChatHistory.push({ role: 'user', content: userMessage, at: Date.now() });
  input.value = '';
  floatingAiBusy = true;
  renderFloatingAiMessages();

  try {
    const result = await askOpenRouter(buildFloatingAiPrompt(userMessage));
    floatingAiChatHistory.push({ role: 'assistant', content: result.text, at: Date.now() });
  } catch (error) {
    floatingAiChatHistory.push({ role: 'assistant', content: `Error: ${error.message}`, at: Date.now() });
    showToast('Failed to get AI response.', 'error');
  } finally {
    floatingAiBusy = false;
    renderFloatingAiMessages();
  }
};

// ─── Create Goal Modal ───
window.openCreateGoal = function() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>Create New Goal</h3>
        <button class="modal-close" onclick="window.closeModal()">✕</button>
      </div>
      <form id="create-goal-form" onsubmit="event.preventDefault(); window.submitCreateGoal();">
        <div class="form-group">
          <label class="form-label">Title</label>
          <input type="text" class="form-input" id="goal-title" placeholder="e.g., Save for MacBook Pro" required maxlength="100" />
        </div>
        <div class="form-group">
          <label class="form-label">Type</label>
          <div class="type-chips" id="goal-type-chips">
            ${['savings', 'milestone', 'habit', 'project', 'custom'].map((t, i) => `
              <div class="type-chip ${i === 0 ? 'selected' : ''}" data-type="${t}"
                style="${i === 0 ? `background: ${getGoalColor(t)}; color: white;` : ''}"
                onclick="window.selectGoalType('${t}')">
                ${t.charAt(0).toUpperCase() + t.slice(1)}
              </div>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Target Value</label>
          <input type="number" class="form-input" id="goal-target" placeholder="e.g., 50000" min="1" required />
        </div>
        <div class="form-group">
          <label class="form-label">Target Date</label>
          <input type="date" class="form-input" id="goal-date" />
        </div>
        <div class="form-group">
          <label class="form-label">Priority</label>
          <div class="type-chips" id="priority-chips">
            ${['low', 'medium', 'high', 'critical'].map((p, i) => `
              <div class="type-chip ${i === 1 ? 'selected' : ''}" data-priority="${p}"
                style="${i === 1 ? 'background: var(--color-info); color: white;' : ''}"
                onclick="window.selectPriority('${p}')">
                ${p.charAt(0).toUpperCase() + p.slice(1)}
              </div>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Description (optional)</label>
          <textarea class="form-input form-textarea" id="goal-desc" placeholder="What's this goal about?" maxlength="500"></textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-ghost" onclick="window.closeModal()">Cancel</button>
          <button type="submit" class="btn-primary">Create Goal</button>
        </div>
      </form>
    </div>
  `;
  overlay.onclick = (e) => { if (e.target === overlay) window.closeModal(); };

  // Set default date to 30 days from now
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 30);
  document.getElementById('goal-date').value = defaultDate.toISOString().slice(0, 10);
};

let selectedGoalType = 'savings';
let selectedPriority = 'medium';

window.selectGoalType = function(type) {
  selectedGoalType = type;
  document.querySelectorAll('#goal-type-chips .type-chip').forEach(chip => {
    const isSelected = chip.getAttribute('data-type') === type;
    chip.classList.toggle('selected', isSelected);
    chip.style.background = isSelected ? getGoalColor(type) : '';
    chip.style.color = isSelected ? 'white' : '';
  });
};

window.selectPriority = function(priority) {
  selectedPriority = priority;
  const colors = { low: 'var(--text-muted)', medium: 'var(--color-info)', high: 'var(--color-warning)', critical: 'var(--color-danger)' };
  document.querySelectorAll('#priority-chips .type-chip').forEach(chip => {
    const isSelected = chip.getAttribute('data-priority') === priority;
    chip.classList.toggle('selected', isSelected);
    chip.style.background = isSelected ? colors[priority] : '';
    chip.style.color = isSelected ? 'white' : '';
  });
};

window.submitCreateGoal = function() {
  const title = document.getElementById('goal-title').value.trim();
  const target = document.getElementById('goal-target').value;
  const date = document.getElementById('goal-date').value;
  const desc = document.getElementById('goal-desc').value.trim();

  if (!title) { showToast('Please enter a goal title', 'error'); return; }
  if (!target || Number(target) <= 0) { showToast('Please enter a valid target value', 'error'); return; }

  storage.createGoal({
    title,
    type: selectedGoalType,
    targetValue: Number(target),
    targetDate: date || null,
    priority: selectedPriority,
    description: desc,
  });

  showToast('Goal created! 🎯', 'success');
  window.closeModal();
  selectedGoalType = 'savings';
  selectedPriority = 'medium';
  route();
};

// ─── Log Transaction Modal ───
window.openLogTransaction = function(goalId) {
  // If no goalId, show a goal selector
  const savingsGoals = storage.getGoals().filter(g => g.type === 'savings' && g.status === 'active');
  const preselected = goalId || (savingsGoals[0]?.id || '');

  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <div class="modal" style="max-width: 440px;">
      <div class="modal-header">
        <h3>Log Transaction</h3>
        <button class="modal-close" onclick="window.closeModal()">✕</button>
      </div>
      <form onsubmit="event.preventDefault(); window.submitTransaction();">
        ${!goalId ? `
        <div class="form-group">
          <label class="form-label">Savings Goal</label>
          <select class="form-input form-select" id="txn-goal">
            ${savingsGoals.map(g => `<option value="${g.id}" ${g.id === preselected ? 'selected' : ''}>${g.title} (${formatCurrency(g.currentValue)} / ${formatCurrency(g.targetValue)})</option>`).join('')}
          </select>
        </div>` : `<input type="hidden" id="txn-goal" value="${goalId}" />`}
        <div class="form-group">
          <label class="form-label">Type</label>
          <div class="type-chips" id="txn-type-chips">
            <div class="type-chip selected" data-txntype="deposit" style="background: var(--color-success); color: white;" onclick="window.selectTxnType('deposit')">↑ Deposit</div>
            <div class="type-chip" data-txntype="withdrawal" onclick="window.selectTxnType('withdrawal')">↓ Withdrawal</div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Amount (₱)</label>
          <input type="number" class="form-input" id="txn-amount" placeholder="0" min="1" required style="font-family: 'JetBrains Mono', monospace;" />
        </div>
        <div class="form-group">
          <label class="form-label">Note (optional)</label>
          <input type="text" class="form-input" id="txn-note" placeholder="e.g., Freelance payment" maxlength="200" />
        </div>
        <div class="form-group">
          <label class="form-label">Date</label>
          <input type="date" class="form-input" id="txn-date" value="${new Date().toISOString().slice(0, 10)}" />
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-ghost" onclick="window.closeModal()">Cancel</button>
          <button type="submit" class="btn-primary">Log Transaction</button>
        </div>
      </form>
    </div>
  `;
  overlay.onclick = (e) => { if (e.target === overlay) window.closeModal(); };
};

let selectedTxnType = 'deposit';
window.selectTxnType = function(type) {
  selectedTxnType = type;
  document.querySelectorAll('#txn-type-chips .type-chip').forEach(chip => {
    const isSelected = chip.getAttribute('data-txntype') === type;
    chip.classList.toggle('selected', isSelected);
    if (type === 'deposit') {
      chip.style.background = isSelected ? 'var(--color-success)' : '';
    } else {
      chip.style.background = isSelected ? 'var(--color-danger)' : '';
    }
    chip.style.color = isSelected ? 'white' : '';
  });
};

window.submitTransaction = function() {
  const goalId = document.getElementById('txn-goal').value;
  const amount = document.getElementById('txn-amount').value;
  const note = document.getElementById('txn-note').value.trim();
  const date = document.getElementById('txn-date').value;

  if (!goalId) { showToast('Please select a goal', 'error'); return; }
  if (!amount || Number(amount) <= 0) { showToast('Please enter a valid amount', 'error'); return; }

  // Check withdrawal doesn't exceed balance
  if (selectedTxnType === 'withdrawal') {
    const goal = storage.getGoalById(goalId);
    if (goal && Number(amount) > goal.currentValue) {
      showToast('Insufficient balance for withdrawal', 'error');
      return;
    }
  }

  storage.addTransaction({
    goalId,
    type: selectedTxnType,
    amount: Number(amount),
    note,
    date: date || new Date().toISOString().slice(0, 10),
  });

  const goal = storage.getGoalById(goalId);
  if (goal && goal.type === 'savings' && goal.status === 'completed') {
    showToast('🎉 Goal completed! Congratulations!', 'success');
  } else {
    showToast(`Transaction logged: ${selectedTxnType === 'deposit' ? '+' : '-'}${formatCurrency(Number(amount))}`, 'success');
  }

  selectedTxnType = 'deposit';
  window.closeModal();
  route();
};

// ─── Goal Menu (Edit/Archive/Delete) ───
window.openGoalMenu = function(goalId) {
  const goal = storage.getGoalById(goalId);
  if (!goal) return;

  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <div class="modal" style="max-width: 340px; padding: 24px;">
      <div class="modal-header" style="margin-bottom: 16px;">
        <h3 style="font-size: 18px;">Goal Options</h3>
        <button class="modal-close" onclick="window.closeModal()">✕</button>
      </div>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <button class="btn-ghost" style="justify-content: flex-start; width: 100%;" onclick="window.openEditGoal('${goalId}')">
          ✏️ Edit Goal
        </button>
        <button class="btn-ghost" style="justify-content: flex-start; width: 100%;" onclick="window.closeModal(); window.navigateTo('goal-detail', '${goalId}')">
          📋 View Details
        </button>
        ${goal.status === 'active' ? `
          <button class="btn-ghost" style="justify-content: flex-start; width: 100%;" onclick="window.archiveGoal('${goalId}')">
            📦 Archive Goal
          </button>
          <button class="btn-ghost" style="justify-content: flex-start; width: 100%;" onclick="window.completeGoal('${goalId}')">
            ✅ Mark as Complete
          </button>
        ` : ''}
        ${goal.status === 'archived' ? `
          <button class="btn-ghost" style="justify-content: flex-start; width: 100%;" onclick="window.reactivateGoal('${goalId}')">
            🔄 Reactivate
          </button>
        ` : ''}
        <button class="btn-ghost" style="justify-content: flex-start; width: 100%; color: var(--color-danger);" onclick="window.deleteGoalById('${goalId}')">
          🗑 Delete Goal
        </button>
      </div>
    </div>
  `;
  overlay.onclick = (e) => { if (e.target === overlay) window.closeModal(); };
};

window.openEditGoal = function(goalId) {
  const goal = storage.getGoalById(goalId);
  if (!goal) return;

  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <div class="modal" style="max-width: 520px;">
      <div class="modal-header">
        <h3>Edit Goal</h3>
        <button class="modal-close" onclick="window.closeModal()">✕</button>
      </div>
      <form onsubmit="event.preventDefault(); window.submitEditGoal('${goalId}');">
        <div class="form-group">
          <label class="form-label">Title</label>
          <input type="text" class="form-input" id="edit-goal-title" value="${goal.title.replace(/"/g, '&quot;')}" required maxlength="100" />
        </div>
        <div class="form-group">
          <label class="form-label">Type</label>
          <input type="text" class="form-input" value="${goal.type.charAt(0).toUpperCase() + goal.type.slice(1)}" disabled />
        </div>
        <div class="form-group">
          <label class="form-label">Target Value</label>
          <input type="number" class="form-input" id="edit-goal-target" value="${Number(goal.targetValue) || 0}" min="1" required />
        </div>
        <div class="form-group">
          <label class="form-label">Target Date</label>
          <input type="date" class="form-input" id="edit-goal-date" value="${goal.targetDate || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Priority</label>
          <select class="form-input form-select" id="edit-goal-priority">
            ${['low', 'medium', 'high', 'critical'].map(p => `<option value="${p}" ${goal.priority === p ? 'selected' : ''}>${p.charAt(0).toUpperCase() + p.slice(1)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Description (optional)</label>
          <textarea class="form-input form-textarea" id="edit-goal-desc" maxlength="500">${(goal.description || '').replace(/</g, '&lt;')}</textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-ghost" onclick="window.closeModal()">Cancel</button>
          <button type="submit" class="btn-primary">Save Changes</button>
        </div>
      </form>
    </div>
  `;
  overlay.onclick = (e) => { if (e.target === overlay) window.closeModal(); };
};

window.submitEditGoal = function(goalId) {
  const title = document.getElementById('edit-goal-title').value.trim();
  const targetRaw = document.getElementById('edit-goal-target').value;
  const targetDate = document.getElementById('edit-goal-date').value;
  const priority = document.getElementById('edit-goal-priority').value;
  const description = document.getElementById('edit-goal-desc').value.trim();

  if (!title) {
    showToast('Please enter a goal title', 'error');
    return;
  }

  const targetValue = Number(targetRaw);
  if (!targetRaw || Number.isNaN(targetValue) || targetValue <= 0) {
    showToast('Please enter a valid target value', 'error');
    return;
  }

  storage.updateGoal(goalId, {
    title,
    targetValue,
    targetDate: targetDate || null,
    priority,
    description,
  });

  showToast('Goal updated successfully', 'success');
  window.closeModal();
  route();
};

window.openSavingsGoals = function() {
  window.navigateTo('goals');
  setTimeout(() => {
    if (window.setTypeFilter) window.setTypeFilter('savings');
    if (window.setGoalFilter) window.setGoalFilter('all');
  }, 0);
};

window.archiveGoal = function(id) {
  storage.updateGoal(id, { status: 'archived' });
  showToast('Goal archived', 'info');
  window.closeModal();
  route();
};

window.completeGoal = function(id) {
  storage.updateGoal(id, { status: 'completed' });
  showToast('🎉 Goal marked as complete!', 'success');
  window.closeModal();
  route();
};

window.reactivateGoal = function(id) {
  storage.updateGoal(id, { status: 'active' });
  showToast('Goal reactivated', 'success');
  window.closeModal();
  route();
};

window.deleteGoalById = function(id) {
  if (confirm('Delete this goal? This cannot be undone.')) {
    storage.deleteGoal(id);
    showToast('Goal deleted', 'info');
    window.closeModal();
    window.location.hash = '#goals';
  }
};

// Quick delete from goal card (no modal, just confirm)
window.quickDeleteGoal = function(id) {
  const goal = storage.getGoalById(id);
  if (!goal) return;
  if (confirm(`Delete "${goal.title}"? This cannot be undone.`)) {
    storage.deleteGoal(id);
    showToast('Goal deleted 🗑', 'info');
    route();
  }
};

// ─── Quick Add Button ───
document.getElementById('quick-add-btn').addEventListener('click', () => {
  window.openQuickAddMenu();
});

document.getElementById('floating-ai-btn').addEventListener('click', (e) => {
  const overlay = document.getElementById('modal-overlay');
  const isFloatingAiOpen = overlay && !overlay.classList.contains('hidden') && overlay.classList.contains('floating-ai-overlay');

  if (isFloatingAiOpen) {
    window.closeModal();
    return;
  }

  e.currentTarget.classList.remove('is-pressed');
  // Restart the press animation each click.
  void e.currentTarget.offsetWidth;
  e.currentTarget.classList.add('is-pressed');
  window.openFloatingAiAssistant();
});

// ─── Quick Add Menu (Task vs Goal) ───
window.openQuickAddMenu = function() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <div class="modal" style="max-width: 380px; padding: 28px;">
      <div class="modal-header" style="margin-bottom: 20px;">
        <h3 style="font-size: 20px;">Quick Add</h3>
        <button class="modal-close" onclick="window.closeModal()">✕</button>
      </div>
      <div style="display: flex; gap: 12px;">
        <button class="quick-add-option" onclick="window.closeModal(); window.openCreateTask();">
          <span style="font-size: 28px; margin-bottom: 8px;">✅</span>
          <span style="font-size: 15px; font-weight: 600; color: var(--text-primary);">New Task</span>
          <span style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Something to do</span>
        </button>
        <button class="quick-add-option" onclick="window.closeModal(); window.openCreateGoal();">
          <span style="font-size: 28px; margin-bottom: 8px;">🎯</span>
          <span style="font-size: 15px; font-weight: 600; color: var(--text-primary);">New Goal</span>
          <span style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Something to achieve</span>
        </button>
      </div>
    </div>
  `;
  overlay.onclick = (e) => { if (e.target === overlay) window.closeModal(); };
};

// ─── Create Task Modal ───
window.openCreateTask = function() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <div class="modal" style="max-width: 480px;">
      <div class="modal-header">
        <h3>Create New Task</h3>
        <button class="modal-close" onclick="window.closeModal()">✕</button>
      </div>
      <form id="create-task-form" onsubmit="event.preventDefault(); window.submitCreateTask();">
        <div class="form-group">
          <label class="form-label">What needs to be done?</label>
          <input type="text" class="form-input" id="task-title" placeholder="e.g., Review project proposal" required maxlength="200" />
        </div>
        <div class="form-group">
          <label class="form-label">Priority</label>
          <div class="type-chips" id="task-priority-chips">
            ${['low', 'medium', 'high', 'critical'].map((p, i) => `
              <div class="type-chip ${i === 1 ? 'selected' : ''}" data-priority="${p}"
                style="${i === 1 ? 'background: var(--color-info); color: white;' : ''}"
                onclick="window.selectTaskPriority('${p}')">
                ${p.charAt(0).toUpperCase() + p.slice(1)}
              </div>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Due Date (optional)</label>
          <input type="date" class="form-input" id="task-due-date" />
        </div>
        <div class="form-group">
          <label class="form-label">Note (optional)</label>
          <textarea class="form-input form-textarea" id="task-note" placeholder="Add any extra details..." maxlength="500"></textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-ghost" onclick="window.closeModal()">Cancel</button>
          <button type="submit" class="btn-primary">Create Task</button>
        </div>
      </form>
    </div>
  `;
  overlay.onclick = (e) => { if (e.target === overlay) window.closeModal(); };
};

let selectedTaskPriority = 'medium';

window.selectTaskPriority = function(priority) {
  selectedTaskPriority = priority;
  const colors = { low: 'var(--text-muted)', medium: 'var(--color-info)', high: 'var(--color-warning)', critical: 'var(--color-danger)' };
  document.querySelectorAll('#task-priority-chips .type-chip').forEach(chip => {
    const isSelected = chip.getAttribute('data-priority') === priority;
    chip.classList.toggle('selected', isSelected);
    chip.style.background = isSelected ? colors[priority] : '';
    chip.style.color = isSelected ? 'white' : '';
  });
};

window.submitCreateTask = function() {
  const title = document.getElementById('task-title').value.trim();
  const dueDate = document.getElementById('task-due-date').value;
  const note = document.getElementById('task-note').value.trim();

  if (!title) { showToast('Please enter a task title', 'error'); return; }

  storage.createTask({
    title,
    priority: selectedTaskPriority,
    dueDate: dueDate || null,
    note,
  });

  showToast('Task added! ✅', 'success');
  window.closeModal();
  selectedTaskPriority = 'medium';
  route();
};

// ─── Edit Task Modal ───
window.openEditTask = function(id) {
  const task = storage.getTaskById(id);
  if (!task) return;

  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <div class="modal" style="max-width: 480px;">
      <div class="modal-header">
        <h3>Edit Task</h3>
        <button class="modal-close" onclick="window.closeModal()">✕</button>
      </div>
      <form onsubmit="event.preventDefault(); window.submitEditTask('${id}');">
        <div class="form-group">
          <label class="form-label">Title</label>
          <input type="text" class="form-input" id="edit-task-title" value="${task.title.replace(/"/g, '&quot;')}" required maxlength="200" />
        </div>
        <div class="form-group">
          <label class="form-label">Priority</label>
          <div class="type-chips" id="edit-task-priority-chips">
            ${['low', 'medium', 'high', 'critical'].map(p => `
              <div class="type-chip ${task.priority === p ? 'selected' : ''}" data-priority="${p}"
                style="${task.priority === p ? `background: ${{low:'var(--text-muted)',medium:'var(--color-info)',high:'var(--color-warning)',critical:'var(--color-danger)'}[p]}; color: white;` : ''}"
                onclick="window.selectEditTaskPriority('${p}')">
                ${p.charAt(0).toUpperCase() + p.slice(1)}
              </div>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Due Date</label>
          <input type="date" class="form-input" id="edit-task-due" value="${task.dueDate || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Note</label>
          <textarea class="form-input form-textarea" id="edit-task-note" maxlength="500">${task.note || ''}</textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-ghost" onclick="window.closeModal()">Cancel</button>
          <button type="submit" class="btn-primary">Save Changes</button>
        </div>
      </form>
    </div>
  `;
  overlay.onclick = (e) => { if (e.target === overlay) window.closeModal(); };

  // Track priority for edit
  window._editTaskPriority = task.priority;
};

window.selectEditTaskPriority = function(priority) {
  window._editTaskPriority = priority;
  const colors = { low: 'var(--text-muted)', medium: 'var(--color-info)', high: 'var(--color-warning)', critical: 'var(--color-danger)' };
  document.querySelectorAll('#edit-task-priority-chips .type-chip').forEach(chip => {
    const isSelected = chip.getAttribute('data-priority') === priority;
    chip.classList.toggle('selected', isSelected);
    chip.style.background = isSelected ? colors[priority] : '';
    chip.style.color = isSelected ? 'white' : '';
  });
};

window.submitEditTask = function(id) {
  const title = document.getElementById('edit-task-title').value.trim();
  const dueDate = document.getElementById('edit-task-due').value;
  const note = document.getElementById('edit-task-note').value.trim();

  if (!title) { showToast('Please enter a task title', 'error'); return; }

  storage.updateTask(id, {
    title,
    priority: window._editTaskPriority || 'medium',
    dueDate: dueDate || null,
    note,
  });

  showToast('Task updated!', 'success');
  window.closeModal();
  route();
};

// ─── Seed Data (first-time setup) ───
function seedDemoData() {
  if (storage.getGoals().length > 0) return; // Already has data

  // Create sample goals (aspirational / wish-based)
  const g1 = storage.createGoal({
    title: 'Save for MacBook Pro',
    type: 'savings',
    targetValue: 50000,
    targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    priority: 'high',
    description: 'Saving up for the M4 MacBook Pro with 64GB Unified Memory and 2TB SSD. This is essential for my high-fidelity rendering work and video production.',
    tags: ['tech', 'personal'],
  });

  // Sample transactions for the savings goal
  const now = Date.now();
  storage.addTransaction({ goalId: g1.id, type: 'deposit', amount: 5000, note: 'Initial monthly allocation', date: new Date(now - 28 * 86400000).toISOString().slice(0, 10) });
  storage.addTransaction({ goalId: g1.id, type: 'deposit', amount: 8950, note: 'Freelance payment', date: new Date(now - 21 * 86400000).toISOString().slice(0, 10) });
  storage.addTransaction({ goalId: g1.id, type: 'deposit', amount: 3000, note: 'Side project income', date: new Date(now - 14 * 86400000).toISOString().slice(0, 10) });
  storage.addTransaction({ goalId: g1.id, type: 'withdrawal', amount: 1500, note: 'Emergency expense', date: new Date(now - 7 * 86400000).toISOString().slice(0, 10) });
  storage.addTransaction({ goalId: g1.id, type: 'deposit', amount: 5000, note: 'Monthly deposit', date: new Date(now - 3 * 86400000).toISOString().slice(0, 10) });
  storage.addTransaction({ goalId: g1.id, type: 'deposit', amount: 3000, note: 'Freelance bonus', date: new Date(now - 1 * 86400000).toISOString().slice(0, 10) });

  // Sample tasks (actionable to-do items)
  storage.createTask({ title: 'Review project proposal', priority: 'high', dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), note: 'Check the budget section' });
  storage.createTask({ title: 'Buy groceries', priority: 'medium', dueDate: new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10) });
  storage.createTask({ title: 'Submit assignment', priority: 'critical', dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), note: 'Module 4 final paper' });
  storage.createTask({ title: 'Call the dentist', priority: 'low' });
  const doneTask = storage.createTask({ title: 'Set up development environment', priority: 'high' });
  storage.updateTask(doneTask.id, { completed: true, completedAt: new Date().toISOString() });

  // Sample folders
  storage.createFolder('Documents');
  storage.createFolder('Receipts');
  storage.createFolder('Work');
  storage.createFolder('Images');
  storage.createFolder('Projects');
}

function cleanupNonSavingsDemoGoals() {
  const demoGoalTitles = new Set([
    'Learn TypeScript',
    'Complete Portfolio Site',
    'Complete Portpolio Site',
    'Read 30 mins daily',
    '30 minutes daily',
  ]);

  storage.getGoals().forEach(goal => {
    if (goal.type !== 'savings' && demoGoalTitles.has(goal.title)) {
      storage.deleteGoal(goal.id);
    }
  });
}

// ─── Live Clock ───
function initLiveClock() {
  function updateClock() {
    const now = new Date();
    const dateEl = document.getElementById('live-date');
    const timeEl = document.getElementById('live-time');
    const secondsEl = document.getElementById('live-seconds');
    const ampmEl = document.getElementById('live-ampm');
    
    if (!dateEl || !timeEl) return;

    // Format date: "Thursday, April 2, 2026"
    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    dateEl.textContent = dateStr;

    // Format time: "11:45"
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    timeEl.textContent = `${hours}:${minutes}`;
    secondsEl.textContent = `:${seconds}`;
    ampmEl.textContent = ampm;
  }

  updateClock();
  setInterval(updateClock, 1000);
}

// ─── Init ───
function init() {
  initTheme();
  initGlobalSearch();
  initLiveClock();
  seedDemoData();
  cleanupNonSavingsDemoGoals();

  const sidebarHomeLink = document.getElementById('sidebar-home-link');
  if (sidebarHomeLink) {
    sidebarHomeLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (isTransitioningHome || currentPage === 'home') return;

      isTransitioningHome = true;
      sidebarHomeLink.classList.remove('is-pressing');
      // Force reflow to restart animation on repeated clicks.
      void sidebarHomeLink.offsetWidth;
      sidebarHomeLink.classList.add('is-pressing');

      const app = document.getElementById('app');
      if (app) {
        app.classList.remove('is-exiting-home');
        void app.offsetWidth;
        app.classList.add('is-exiting-home');
      }

      setTimeout(() => {
        window.location.hash = '#home';
        setTimeout(() => {
          if (app) app.classList.remove('is-exiting-home');
          isTransitioningHome = false;
        }, 260);
      }, 220);
    });
  }

  const enterWorkspaceBtn = document.getElementById('enter-workspace-btn');
  if (enterWorkspaceBtn) {
    enterWorkspaceBtn.addEventListener('click', () => {
      window.location.hash = '#dashboard';
    });
  }
  route();
}

init();
