/** Goals List Page */
import * as storage from '../services/storage.js';
import { formatCurrency, getGoalProgress, getGoalColor, getGoalIcon, daysUntil, getGoalColorDim } from '../utils/helpers.js';

let currentFilter = 'all';
let currentType = 'all';

export function renderGoalsList() {
  const goals = storage.getGoals();
  const filtered = filterGoals(goals);
  const savingsGoals = goals.filter(g => g.type === 'savings');
  const activeSavingsGoals = savingsGoals.filter(g => g.status === 'active');
  const totalSaved = savingsGoals.reduce((sum, g) => sum + (g.currentValue || 0), 0);
  const totalTarget = savingsGoals.reduce((sum, g) => sum + (g.targetValue || 0), 0);
  const savingsPercent = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page" id="goals-page">
      <div class="goals-savings-summary">
        <div class="goals-savings-card goals-savings-primary">
          <div class="goals-savings-title">Savings Overview</div>
          <div class="goals-savings-value">${formatCurrency(totalSaved)}</div>
          <div class="goals-savings-sub">of ${formatCurrency(totalTarget)} target</div>
          <div class="goals-savings-progress">
            <div class="goals-savings-progress-fill" style="width: ${Math.min(100, savingsPercent)}%"></div>
          </div>
          <div class="goals-savings-meta">${savingsPercent}% complete across ${savingsGoals.length} savings goal${savingsGoals.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="goals-savings-card">
          <div class="goals-savings-kicker">Active Savings Goals</div>
          <div class="goals-savings-stat">${activeSavingsGoals.length}</div>
          <button class="btn-ghost" style="width: 100%; justify-content: center; margin-top: 10px;" onclick="window.openSavingsGoals()">View Savings Goals</button>
        </div>
        <div class="goals-savings-card">
          <div class="goals-savings-kicker">Quick Action</div>
          <button class="btn-primary" style="width: 100%; justify-content: center; margin-top: 4px;" onclick="window.openLogTransaction()">Log Savings Transaction</button>
          <button class="btn-secondary" style="width: 100%; justify-content: center; margin-top: 8px;" onclick="window.openCreateGoal()">Add Savings Goal</button>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="goals-toolbar">
        <div class="filter-pills">
          ${['all', 'active', 'completed', 'archived'].map(f => `
            <div class="filter-pill ${currentFilter === f ? 'active' : ''}" onclick="window.setGoalFilter('${f}')">${f.charAt(0).toUpperCase() + f.slice(1)}</div>
          `).join('')}
        </div>
        <div class="goals-toolbar-right">
          <select class="toolbar-select" id="type-filter" onchange="window.setTypeFilter(this.value)">
            <option value="all" ${currentType === 'all' ? 'selected' : ''}>Type: All</option>
            <option value="savings" ${currentType === 'savings' ? 'selected' : ''}>Savings</option>
            <option value="milestone" ${currentType === 'milestone' ? 'selected' : ''}>Milestone</option>
            <option value="habit" ${currentType === 'habit' ? 'selected' : ''}>Habit</option>
            <option value="project" ${currentType === 'project' ? 'selected' : ''}>Project</option>
            <option value="custom" ${currentType === 'custom' ? 'selected' : ''}>Custom</option>
          </select>
          <select class="toolbar-select" id="priority-filter">
            <option value="all">Priority</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button class="btn-primary" onclick="window.openCreateGoal()">+ New Goal</button>
        </div>
      </div>

      <!-- Goals Grid -->
      <div class="goals-grid">
        ${filtered.map(goal => renderGoalListCard(goal)).join('')}
      </div>

      ${filtered.length === 0 ? `
        <div style="text-align:center; padding: 60px 20px;">
          <div style="font-size: 48px; margin-bottom: 12px; opacity: 0.3;">🎯</div>
          <p style="font-size: 16px; color: var(--text-secondary); margin-bottom: 4px;">No ${currentFilter !== 'all' ? currentFilter : ''} goals ${currentType !== 'all' ? 'of type ' + currentType : ''} found</p>
          <p style="font-size: 14px; color: var(--text-muted);">Create a new goal to get started</p>
        </div>` : ''}
    </div>
  `;
}

function filterGoals(goals) {
  let result = goals;
  if (currentFilter !== 'all') {
    result = result.filter(g => g.status === currentFilter);
  }
  if (currentType !== 'all') {
    result = result.filter(g => g.type === currentType);
  }
  return result;
}

function renderGoalListCard(goal) {
  const progress = getGoalProgress(goal);
  const days = daysUntil(goal.targetDate);
  const icon = getGoalIcon(goal.type);
  const color = getGoalColor(goal.type);
  const dimColor = getGoalColorDim(goal.type);

  let valueText = '';
  let unitText = '';
  if (goal.type === 'savings') {
    valueText = formatCurrency(goal.currentValue);
    unitText = `/ ${formatCurrency(goal.targetValue)}`;
  } else if (goal.type === 'habit') {
    valueText = String(goal.currentValue);
    unitText = `/ ${goal.targetValue} Days`;
  } else if (goal.type === 'milestone') {
    valueText = String(goal.currentValue);
    unitText = `/ ${goal.targetValue} Tasks`;
  } else {
    valueText = String(goal.currentValue);
    unitText = `/ ${goal.targetValue || 100} ${goal.type === 'project' ? 'Tasks' : 'Units'}`;
  }

  const tags = goal.tags && goal.tags.length > 0 ? goal.tags : [];
  const deadlineText = days !== null ? (days < 0 ? 'Overdue' : `Ends ${new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`) : '';

  return `
    <div class="goal-card" onclick="window.navigateTo('goal-detail', '${goal.id}')" style="padding: 24px;">
      <div class="flex-between" style="margin-bottom: 16px;">
        <div class="flex" style="align-items: center; gap: 12px;">
          <div class="goal-icon-circle" style="background: ${dimColor}; color: ${color};">${icon}</div>
          <div>
            <div class="goal-card-title" style="margin-bottom: 0;">${goal.title}</div>
            <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: ${color};">${goal.type}</div>
          </div>
        </div>
        <div class="goal-card-actions">
          <button class="goal-card-menu" onclick="event.stopPropagation(); window.openGoalMenu('${goal.id}')" title="Goal options">⋯</button>
          <button class="goal-delete-btn" onclick="event.stopPropagation(); window.quickDeleteGoal('${goal.id}')" title="Delete goal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </div>

      <div style="margin-bottom: 12px;">
        <span style="font-family: 'Space Grotesk', sans-serif; font-size: 28px; font-weight: 700; color: var(--text-primary);">${valueText}</span>
        <span style="font-size: 14px; color: var(--text-secondary); margin-left: 4px;">${unitText}</span>
        <span style="float: right; font-size: 16px; font-weight: 600; color: ${color};">${progress}%</span>
      </div>

      <div class="progress-bar" style="height: 8px; margin-bottom: 12px;">
        <div class="progress-bar-fill" style="width: ${progress}%; background: ${color};"></div>
      </div>

      <div class="flex-between" style="flex-wrap: wrap; gap: 6px;">
        <div class="tags-row" style="margin-top: 0;">
          ${tags.map(t => `<span class="tag">${t}</span>`).join('')}
          ${tags.length === 0 && goal.priority ? `<span class="tag">${goal.priority.toUpperCase()}</span>` : ''}
        </div>
        <span style="font-size: 12px; color: var(--text-muted);">${deadlineText}</span>
      </div>
    </div>
  `;

}

// Exposed filter setters
window.setGoalFilter = function(filter) {
  currentFilter = filter;
  renderGoalsList();
};
window.setTypeFilter = function(type) {
  currentType = type;
  renderGoalsList();
};
