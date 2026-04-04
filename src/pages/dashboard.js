/** Dashboard Page — Command Center */
import * as storage from '../services/storage.js';
import { formatCurrency, getGreeting, getGoalProgress, getGoalColor, getGoalColorDim, getGoalIcon, daysUntil, formatRelativeDate, formatFileSize, getFileTypeInfo } from '../utils/helpers.js';

export function renderDashboard() {
  const goals = storage.getGoals();
  const tasks = storage.getTasks();
  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  const files = storage.getFiles();
  const txns = storage.getTransactions();

  // Calculate total savings across all savings goals
  const savingsGoals = goals.filter(g => g.type === 'savings');
  const totalSaved = savingsGoals.reduce((sum, g) => sum + (g.currentValue || 0), 0);
  const totalTarget = savingsGoals.reduce((sum, g) => sum + (g.targetValue || 0), 0);
  const savingsPercent = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  // Recent transactions (last 3)
  const recentTxns = txns.slice(0, 3);
  // Recent files (last 5)
  const recentFiles = files.slice(0, 5);
  // Count approaching deadlines
  const approaching = activeGoals.filter(g => { const d = daysUntil(g.targetDate); return d !== null && d >= 0 && d <= 14; }).length;

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page" id="dashboard-page">
      <!-- Greeting -->
      <div class="dashboard-greeting">
        <h1>${getGreeting()}, Eunice</h1>
        <p>You have <span class="highlight">${pendingTasks.length} pending task${pendingTasks.length !== 1 ? 's' : ''}</span> and <span class="highlight">${activeGoals.length} active goal${activeGoals.length !== 1 ? 's' : ''}</span>.</p>
      </div>

      <!-- Stats Row -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">PENDING TASKS <span class="stat-icon">✅</span></div>
          <div class="stat-value">${pendingTasks.length}<span class="stat-badge">${completedTasks.length} done</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">ACTIVE GOALS <span class="stat-icon">📈</span></div>
          <div class="stat-value">${activeGoals.length}<span class="stat-badge">+${goals.filter(g => { const d = new Date(g.createdAt); const now = new Date(); return (now - d) < 7 * 24 * 60 * 60 * 1000; }).length} this week</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">TOTAL SAVINGS <span class="stat-icon">✨</span></div>
          <div class="stat-value mono accent">${formatCurrency(totalSaved)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">FILES <span class="stat-icon">📁</span></div>
          <div class="stat-value">${files.length}</div>
        </div>
      </div>

      <!-- Body: Tasks + Goals Left, Savings Widget Right -->
      <div class="dashboard-body">
        <div class="dashboard-body-left">
          <!-- Tasks To Do -->
          <div class="section-header">
            <h2>Tasks to Do</h2>
            <a href="#tasks" class="section-link">View All →</a>
          </div>
          <div class="dashboard-tasks-list mb-24">
            ${pendingTasks.slice(0, 5).map(task => renderDashboardTask(task)).join('')}
            ${pendingTasks.length === 0 ? `
              <div class="card" style="text-align: center; padding: 32px;">
                <p style="font-size: 15px; color: var(--text-secondary); margin-bottom: 12px;">No pending tasks 🎉</p>
                <button class="btn-primary" onclick="window.openCreateTask()">+ Add a Task</button>
              </div>` : ''}
          </div>

          <!-- Active Goals -->
          <div class="section-header">
            <h2>Goals</h2>
            <a href="#goals" class="section-link">View All →</a>
          </div>
          <div class="goals-grid mb-24">
            ${activeGoals.slice(0, 4).map(goal => renderGoalCard(goal)).join('')}
            ${activeGoals.length === 0 ? `
              <div class="card" style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <p style="font-size: 15px; color: var(--text-secondary); margin-bottom: 12px;">No active goals yet</p>
                <button class="btn-primary" onclick="window.openCreateGoal()">+ Create Your First Goal</button>
              </div>` : ''}
          </div>

          <!-- Recent Files -->
          <div class="section-header">
            <h2>Recent Files</h2>
            <a href="#files" class="section-link">File Vault →</a>
          </div>
          <div class="files-row">
            ${recentFiles.map(f => renderFileCard(f)).join('')}
            ${recentFiles.length === 0 ? `
              <div class="card" style="min-width: 300px; text-align: center; padding: 32px;">
                <p style="font-size: 14px; color: var(--text-muted);">No files uploaded yet</p>
              </div>` : ''}
          </div>
        </div>

        <!-- Savings Overview Widget -->
        <div>
          <div class="savings-widget">
            <h3>Savings Overview</h3>
            <div class="savings-ring-container">
              <div class="savings-ring">
                <svg width="180" height="180" viewBox="0 0 180 180">
                  <circle cx="90" cy="90" r="75" stroke="var(--bg-surface-elevated)" stroke-width="12" fill="none"/>
                  <circle cx="90" cy="90" r="75" stroke="url(#savingsGrad)" stroke-width="12" fill="none"
                    stroke-linecap="round"
                    stroke-dasharray="${2 * Math.PI * 75}"
                    stroke-dashoffset="${2 * Math.PI * 75 * (1 - savingsPercent / 100)}"
                    style="transition: stroke-dashoffset 0.8s ease"/>
                  <defs>
                    <linearGradient id="savingsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="var(--accent-primary)"/>
                      <stop offset="100%" stop-color="var(--accent-secondary)"/>
                    </linearGradient>
                  </defs>
                </svg>
                <div class="savings-ring-text">
                  <span class="savings-ring-percent">${savingsPercent}%</span>
                  <span class="savings-ring-label">GOAL FILL</span>
                </div>
              </div>
            </div>
            <div class="savings-amounts">
              <div class="amount">${formatCurrency(totalSaved)}</div>
              <div class="target">saved of ${formatCurrency(totalTarget)} target</div>
            </div>

            <div class="recent-activity-label">RECENT ACTIVITY</div>
            ${recentTxns.map(t => `
              <div class="activity-item">
                <div class="activity-icon ${t.type}">${t.type === 'deposit' ? '+' : '−'}</div>
                <div class="activity-name">${t.note || (t.type === 'deposit' ? 'Deposit' : 'Withdrawal')}</div>
                <div class="activity-amount ${t.type === 'deposit' ? 'positive' : 'negative'}">${t.type === 'deposit' ? '+' : '-'}${formatCurrency(t.amount)}</div>
              </div>
            `).join('')}
            ${recentTxns.length === 0 ? '<p style="font-size: 13px; color: var(--text-muted); padding: 8px 0;">No transactions yet</p>' : ''}

            <button class="btn-primary mt-16" style="width: 100%; justify-content: center;" onclick="window.openSavingsGoals()">View</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function getPriorityColor(priority) {
  const map = { critical: 'var(--color-danger)', high: 'var(--color-warning)', medium: 'var(--color-info)', low: 'var(--text-muted)' };
  return map[priority] || 'var(--text-muted)';
}

function renderDashboardTask(task) {
  const priorityColor = getPriorityColor(task.priority);
  const isOverdue = task.dueDate && !task.completed && new Date(task.dueDate) < new Date();
  const dueDateText = task.dueDate
    ? (isOverdue ? 'Overdue' : new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
    : '';

  return `
    <div class="dashboard-task-item">
      <button class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="window.toggleTask('${task.id}'); setTimeout(() => window.navigateTo('dashboard'), 300);" style="--check-color: ${priorityColor};">
        ${task.completed ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
      </button>
      <div class="dashboard-task-content">
        <span class="dashboard-task-title">${task.title}</span>
        <div class="dashboard-task-meta">
          ${task.priority && task.priority !== 'medium' ? `<span class="task-priority-dot" style="background: ${priorityColor};"></span>` : ''}
          ${dueDateText ? `<span class="dashboard-task-due ${isOverdue ? 'overdue' : ''}">${dueDateText}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

function renderGoalCard(goal) {
  const progress = getGoalProgress(goal);
  const days = daysUntil(goal.targetDate);
  const daysText = days !== null ? (days < 0 ? 'Overdue' : days === 0 ? 'Due today' : `${days} days left`) : '';

  let subtitleText = '';
  if (goal.type === 'savings') subtitleText = `${formatCurrency(goal.currentValue)} / ${formatCurrency(goal.targetValue)}`;
  else if (goal.type === 'habit') subtitleText = `${goal.currentValue}/${goal.targetValue} day streak`;
  else if (goal.type === 'milestone') subtitleText = `${goal.currentValue} / ${goal.targetValue} tasks done`;
  else subtitleText = `Manual progress log`;

  const priorityMap = { high: 'HIGH PRIORITY', critical: 'CRITICAL', medium: '', low: '' };

  return `
    <div class="goal-card" onclick="window.navigateTo('goal-detail', '${goal.id}')">
      <div class="goal-card-top">
        <div class="goal-type-badge">
          <span class="goal-type-dot" style="background: ${getGoalColor(goal.type)}"></span>
          <span class="chip chip-${goal.type}" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em;">${goal.type}</span>
        </div>
        ${priorityMap[goal.priority] ? `<span class="priority-badge priority-${goal.priority}">${priorityMap[goal.priority]}</span>` : ''}
      </div>
      <div class="goal-card-title">${goal.title}</div>
      <div class="goal-card-subtitle">${subtitleText}</div>
      <div class="goal-card-progress">
        <div class="progress-bar">
          <div class="progress-bar-fill" style="width: ${progress}%; background: ${getGoalColor(goal.type)}"></div>
        </div>
      </div>
      <div class="goal-card-footer">
        <span class="completion">${progress}% Complete</span>
        <span>${daysText}</span>
      </div>
    </div>
  `;
}

function renderFileCard(file) {
  const info = getFileTypeInfo(file.type, file.name);
  const isImage = info.category === 'image';
  return `
    <div class="file-card">
      <div class="file-card-preview">
        ${isImage && file.data ? `<img src="${file.data}" alt="${file.name}"/>` : `
          <span style="font-size: 36px; color: var(--text-muted);">📄</span>
        `}
        ${info.badge ? `<span class="file-type-badge ${info.category}" style="background: ${info.color}">${info.badge}</span>` : ''}
      </div>
      <div class="file-card-info">
        <div class="file-card-name">${file.name}</div>
        <div class="file-card-meta">${formatFileSize(file.size)} · ${formatRelativeDate(file.createdAt)}</div>
      </div>
    </div>
  `;
}

export { renderGoalCard };
