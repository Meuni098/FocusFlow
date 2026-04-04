/** Tasks Page — Task To Do List with Split Calendar View */
import * as storage from '../services/storage.js';
import { formatRelativeDate, showToast } from '../utils/helpers.js';

let currentTaskFilter = 'all';
let calendarDate = new Date();
let selectedCalDate = ''; // Default set in renderTasks via local date helper
let tasksLiveRefreshTimer = null;

function getTodayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function ensureTasksLiveRefresh() {
  if (tasksLiveRefreshTimer) return;

  tasksLiveRefreshTimer = setInterval(() => {
    // Keep this lightweight and only refresh when user is on Tasks page.
    if (!window.location.hash.startsWith('#tasks')) {
      clearInterval(tasksLiveRefreshTimer);
      tasksLiveRefreshTimer = null;
      return;
    }
    renderTasks();
  }, 60000);
}

export function renderTasks() {
  ensureTasksLiveRefresh();

  if (!selectedCalDate) selectedCalDate = getTodayISO();

  const tasks = storage.getTasks();
  const filtered = filterTasks(tasks);
  const completedCount = tasks.filter(t => t.completed).length;
  const pendingCount = tasks.filter(t => !t.completed).length;

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page" id="tasks-page">
      <!-- Stats strip -->
      <div class="tasks-stats-strip">
        <div class="tasks-stat">
          <span class="tasks-stat-value">${pendingCount}</span>
          <span class="tasks-stat-label">Pending</span>
        </div>
        <div class="tasks-stat">
          <span class="tasks-stat-value accent">${completedCount}</span>
          <span class="tasks-stat-label">Completed</span>
        </div>
        <div class="tasks-stat">
          <span class="tasks-stat-value">${tasks.length}</span>
          <span class="tasks-stat-label">Total</span>
        </div>
      </div>

      <!-- Split Calendar + Day Detail -->
      ${renderCalendarSplit(tasks)}

      <!-- Toolbar -->
      <div class="goals-toolbar">
        <div class="filter-pills">
          ${['all', 'pending', 'completed'].map(f => `
            <div class="filter-pill ${currentTaskFilter === f ? 'active' : ''}" onclick="window.setTaskFilter('${f}')">${f.charAt(0).toUpperCase() + f.slice(1)}</div>
          `).join('')}
        </div>
        <div class="goals-toolbar-right">
          <button class="btn-primary" onclick="window.openCreateTask()">+ New Task</button>
        </div>
      </div>

      <!-- Tasks List -->
      <div class="tasks-list">
        ${filtered.map(task => renderTaskItem(task)).join('')}
      </div>

      ${filtered.length === 0 ? `
        <div style="text-align:center; padding: 60px 20px;">
          <div style="font-size: 48px; margin-bottom: 12px; opacity: 0.3;">✅</div>
          <p style="font-size: 16px; color: var(--text-secondary); margin-bottom: 4px;">No ${currentTaskFilter !== 'all' ? currentTaskFilter : ''} tasks found</p>
          <p style="font-size: 14px; color: var(--text-muted);">Add a new task to get started</p>
        </div>` : ''}
    </div>
  `;
}

function renderCalendarSplit(tasks) {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = getTodayISO();

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Build task map by date
  const taskMap = {};
  tasks.forEach(task => {
    if (!task.dueDate) return;
    if (!taskMap[task.dueDate]) taskMap[task.dueDate] = [];
    taskMap[task.dueDate].push(task);
  });

  // Calendar grid cells
  let dayCells = '';

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    dayCells += `<div class="tcal-day other-month"><span class="tcal-day-num">${day}</span></div>`;
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cellDate = new Date(year, month, d);
    cellDate.setHours(0, 0, 0, 0);
    const isToday = dateStr === todayStr;
    const isSelected = selectedCalDate === dateStr;
    const dayTasks = taskMap[dateStr] || [];
    const hasTasks = dayTasks.length > 0;
    const hasOverdue = dayTasks.some(t => !t.completed && cellDate < today);
    const allCompleted = hasTasks && dayTasks.every(t => t.completed);

    let classes = 'tcal-day';
    if (isToday) classes += ' today';
    if (isSelected) classes += ' selected';
    if (hasTasks) classes += ' has-tasks';
    if (hasOverdue) classes += ' has-overdue';
    if (allCompleted) classes += ' all-done';

    // Dots + count for tasks
    let dots = '';
    if (hasTasks) {
      const maxDots = Math.min(dayTasks.length, 3);
      dots = '<div class="tcal-dots">';
      for (let i = 0; i < maxDots; i++) {
        const t = dayTasks[i];
        const isOD = !t.completed && cellDate < today;
        const cls = t.completed ? 'done' : (isOD ? 'overdue' : 'pending');
        dots += `<div class="tcal-dot ${cls}"></div>`;
      }
      if (dayTasks.length > 3) dots += `<span class="tcal-dot-more">+${dayTasks.length - 3}</span>`;
      dots += '</div>';
    }

    const taskCountBadge = hasTasks ? `<span class="tcal-day-count">${dayTasks.length}</span>` : '';

    dayCells += `<div class="${classes}" onclick="window.selectCalendarDate('${dateStr}')">
      <span class="tcal-day-num">${d}</span>${dots}${taskCountBadge}
    </div>`;
  }

  // Next month trailing
  const totalCells = firstDay + daysInMonth;
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remaining; i++) {
    dayCells += `<div class="tcal-day other-month"><span class="tcal-day-num">${i}</span></div>`;
  }

  // Right panel — current date detail + optional selected date detail
  const todayTasks = taskMap[todayStr] || [];
  const unscheduledTodayTasks = tasks.filter(t => !t.dueDate && !t.completed);

  const selDate = new Date(selectedCalDate + 'T00:00:00');
  const isSelToday = selectedCalDate === todayStr;
  const selDayName = selDate.toLocaleDateString('en-US', { weekday: 'long' });
  const selMonthDay = selDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const selTasks = taskMap[selectedCalDate] || [];

  const priorityColors = { critical: 'var(--color-danger)', high: 'var(--color-warning)', medium: 'var(--color-info)', low: 'var(--text-muted)' };
  const priorityLabels = { critical: 'CRITICAL', high: 'HIGH', medium: 'MED', low: 'LOW' };

  let rightPanel = `
    <div class="tcal-detail">
      <div class="tcal-detail-header">
        <div class="tcal-detail-badge today-badge">📍 Current Date</div>
        <div class="tcal-detail-date">${new Date(todayStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
      </div>

      <div class="tcal-detail-body">
  `;

  // Scheduled tasks for current date
  rightPanel += `<div class="tcal-task-group-label">Today\'s Tasks <span class="tcal-task-count">${todayTasks.length}</span></div>`;
  if (todayTasks.length === 0) {
    rightPanel += `
      <div class="tcal-empty" style="padding: 22px 12px;">
        <p class="tcal-empty-text">No tasks for current date</p>
      </div>
    `;
  } else {
    todayTasks.forEach(t => {
      const pColor = priorityColors[t.priority] || priorityColors.medium;
      const pLabel = priorityLabels[t.priority] || 'MED';
      const isOverdue = !t.completed && new Date(todayStr + 'T00:00:00') < today;
      const statusIcon = t.completed ? '✅' : (isOverdue ? '⚠️' : '⏳');
      rightPanel += `
        <div class="tcal-task-card ${t.completed ? 'is-done' : ''} ${isOverdue ? 'is-overdue' : ''}" onclick="window.openEditTask('${t.id}')">
          <button class="task-checkbox ${t.completed ? 'checked' : ''}" onclick="event.stopPropagation(); window.toggleTask('${t.id}')" style="--check-color: ${pColor};">
            ${t.completed ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
          </button>
          <div class="tcal-task-info">
            <div class="tcal-task-title">${t.title}</div>
            <div class="tcal-task-badges">
              <span class="tcal-priority-pill" style="color: ${pColor}; border-color: ${pColor};">${pLabel}</span>
              <span class="tcal-status-icon">${statusIcon}</span>
              ${t.note ? '<span class="tcal-note-icon">💬</span>' : ''}
            </div>
          </div>
          <button class="task-delete-btn" style="opacity: 1;" onclick="event.stopPropagation(); window.deleteTask('${t.id}')" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      `;
    });
  }

  // Unscheduled tasks for current date section
  rightPanel += `<div class="tcal-task-group-label" style="margin-top: 16px;">No Due Date <span class="tcal-task-count">${unscheduledTodayTasks.length}</span></div>`;
  if (unscheduledTodayTasks.length === 0) {
    rightPanel += `
      <div class="tcal-empty" style="padding: 22px 12px;">
        <p class="tcal-empty-text">No unscheduled tasks</p>
      </div>
    `;
  } else {
    unscheduledTodayTasks.forEach(t => {
      const pColor = priorityColors[t.priority] || priorityColors.medium;
      const pLabel = priorityLabels[t.priority] || 'MED';
      rightPanel += `
        <div class="tcal-task-card" onclick="window.openEditTask('${t.id}')">
          <button class="task-checkbox ${t.completed ? 'checked' : ''}" onclick="event.stopPropagation(); window.toggleTask('${t.id}')" style="--check-color: ${pColor};">
            ${t.completed ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
          </button>
          <div class="tcal-task-info">
            <div class="tcal-task-title">${t.title}</div>
            <div class="tcal-task-badges">
              <span class="tcal-priority-pill" style="color: ${pColor}; border-color: ${pColor};">${pLabel}</span>
              ${t.note ? '<span class="tcal-note-icon">💬</span>' : ''}
            </div>
          </div>
        </div>
      `;
    });
  }

  // If user selected another date, always show that date's tasks section
  if (!isSelToday) {
    rightPanel += `
      <div class="tcal-task-group-label" style="margin-top: 16px;">Selected Date: ${selDayName}, ${selMonthDay} <span class="tcal-task-count">${selTasks.length}</span></div>
    `;

    if (selTasks.length === 0) {
      rightPanel += `
        <div class="tcal-empty" style="padding: 22px 12px;">
          <p class="tcal-empty-text">No tasks on selected date</p>
        </div>
      `;
    } else {
      selTasks.forEach(t => {
        const pColor = priorityColors[t.priority] || priorityColors.medium;
        const pLabel = priorityLabels[t.priority] || 'MED';
        const isOverdue = !t.completed && selDate < today;
        const statusIcon = t.completed ? '✅' : (isOverdue ? '⚠️' : '⏳');
        rightPanel += `
          <div class="tcal-task-card ${t.completed ? 'is-done' : ''} ${isOverdue ? 'is-overdue' : ''}" onclick="window.openEditTask('${t.id}')">
            <button class="task-checkbox ${t.completed ? 'checked' : ''}" onclick="event.stopPropagation(); window.toggleTask('${t.id}')" style="--check-color: ${pColor};">
              ${t.completed ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
            </button>
            <div class="tcal-task-info">
              <div class="tcal-task-title">${t.title}</div>
              <div class="tcal-task-badges">
                <span class="tcal-priority-pill" style="color: ${pColor}; border-color: ${pColor};">${pLabel}</span>
                <span class="tcal-status-icon">${statusIcon}</span>
                ${t.note ? '<span class="tcal-note-icon">💬</span>' : ''}
              </div>
            </div>
            <button class="task-delete-btn" style="opacity: 1;" onclick="event.stopPropagation(); window.deleteTask('${t.id}')" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        `;
      });
    }
  }

  rightPanel += `
      </div>
    </div>
  `;

  return `
    <div class="tcal-split">
      <!-- Left: Calendar -->
      <div class="tcal-calendar">
        <div class="tcal-header">
          <div class="tcal-title">📅 Calendar</div>
          <div class="tcal-nav">
            <button class="tcal-nav-btn" onclick="window.calendarPrev()">‹</button>
            <span class="tcal-month-label">${monthNames[month]} ${year}</span>
            <button class="tcal-nav-btn" onclick="window.calendarNext()">›</button>
            <button class="tcal-nav-btn tcal-today-btn" onclick="window.calendarToday()">Today</button>
          </div>
        </div>
        <div class="tcal-grid">
          ${dayLabels.map(d => `<div class="tcal-day-label">${d}</div>`).join('')}
          ${dayCells}
        </div>
        <div class="tcal-legend">
          <div class="tcal-legend-item"><div class="tcal-legend-dot today-l"></div> Today</div>
          <div class="tcal-legend-item"><div class="tcal-legend-dot pending-l"></div> Pending</div>
          <div class="tcal-legend-item"><div class="tcal-legend-dot done-l"></div> Done</div>
          <div class="tcal-legend-item"><div class="tcal-legend-dot overdue-l"></div> Overdue</div>
        </div>
      </div>

      <!-- Right: Day Detail -->
      ${rightPanel}
    </div>
  `;
}

function filterTasks(tasks) {
  if (currentTaskFilter === 'pending') return tasks.filter(t => !t.completed);
  if (currentTaskFilter === 'completed') return tasks.filter(t => t.completed);
  return tasks;
}

function getPriorityColor(priority) {
  const map = { critical: 'var(--color-danger)', high: 'var(--color-warning)', medium: 'var(--color-info)', low: 'var(--text-muted)' };
  return map[priority] || 'var(--text-muted)';
}

function getPriorityLabel(priority) {
  const map = { critical: 'CRITICAL', high: 'HIGH', medium: 'MED', low: 'LOW' };
  return map[priority] || '';
}

function renderTaskItem(task) {
  const priorityColor = getPriorityColor(task.priority);
  const isOverdue = task.dueDate && !task.completed && new Date(task.dueDate) < new Date();
  const dueDateText = task.dueDate
    ? (isOverdue ? 'Overdue' : `Due ${new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`)
    : '';

  return `
    <div class="task-item ${task.completed ? 'completed' : ''}" id="task-${task.id}">
      <button class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="event.stopPropagation(); window.toggleTask('${task.id}')" style="--check-color: ${priorityColor};">
        ${task.completed ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
      </button>
      <div class="task-content" onclick="window.openEditTask('${task.id}')">
        <div class="task-title">${task.title}</div>
        <div class="task-meta">
          ${task.priority && task.priority !== 'medium' ? `<span class="task-priority-badge" style="color: ${priorityColor}; border-color: ${priorityColor};">${getPriorityLabel(task.priority)}</span>` : ''}
          ${dueDateText ? `<span class="task-due ${isOverdue ? 'overdue' : ''}">${isOverdue ? '⚠' : '📅'} ${dueDateText}</span>` : ''}
          ${task.note ? `<span class="task-note-hint">💬</span>` : ''}
        </div>
      </div>
      <button class="task-delete-btn" onclick="event.stopPropagation(); window.deleteTask('${task.id}')" title="Delete task">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
      </button>
    </div>
  `;
}

// Exposed handlers
window.setTaskFilter = function(filter) {
  currentTaskFilter = filter;
  renderTasks();
};

window.toggleTask = function(id) {
  const task = storage.getTaskById(id);
  if (!task) return;
  storage.updateTask(id, { completed: !task.completed, completedAt: !task.completed ? new Date().toISOString() : null });
  if (!task.completed) {
    showToast('Task completed! ✅', 'success');
  }
  renderTasks();
};

window.deleteTask = function(id) {
  storage.deleteTask(id);
  showToast('Task deleted', 'info');
  renderTasks();
};

// Calendar navigation
window.calendarPrev = function() {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderTasks();
};

window.calendarNext = function() {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderTasks();
};

window.calendarToday = function() {
  calendarDate = new Date();
  selectedCalDate = getTodayISO();
  renderTasks();
};

window.selectCalendarDate = function(dateStr) {
  selectedCalDate = dateStr;
  renderTasks();
};
