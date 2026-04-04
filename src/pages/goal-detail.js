/** Goal Detail Page — with Savings Tracker */
import * as storage from '../services/storage.js';
import { formatCurrency, formatDate, getGoalProgress, getGoalColor, getGoalColorDim, getGoalIcon, daysUntil, formatFileSize, getFileTypeInfo, showToast } from '../utils/helpers.js';

export function renderGoalDetail(goalId) {
  const goal = storage.getGoalById(goalId);
  if (!goal) {
    document.getElementById('main-content').innerHTML = `<div class="page" style="text-align:center; padding: 60px;"><p>Goal not found.</p><a href="#goals" class="btn-secondary mt-16">← Back to Goals</a></div>`;
    return;
  }

  const progress = getGoalProgress(goal);
  const color = getGoalColor(goal.type);
  const dimColor = getGoalColorDim(goal.type);
  const icon = getGoalIcon(goal.type);
  const days = daysUntil(goal.targetDate);
  const txns = storage.getTransactionsForGoal(goalId);
  const attachedFiles = storage.getFiles().filter(f => f.goalId === goalId || (goal.attachedFileIds && goal.attachedFileIds.includes(f.id)));

  // Projected completion for savings
  let projectedDate = '—';
  if (goal.type === 'savings' && txns.length > 1) {
    const deposits = txns.filter(t => t.type === 'deposit');
    if (deposits.length > 1) {
      const totalDeposited = deposits.reduce((s, t) => s + t.amount, 0);
      const firstDate = new Date(deposits[deposits.length - 1].date);
      const lastDate = new Date(deposits[0].date);
      const daySpan = Math.max(1, (lastDate - firstDate) / (1000*60*60*24));
      const dailyRate = totalDeposited / daySpan;
      const remaining = goal.targetValue - goal.currentValue;
      if (dailyRate > 0 && remaining > 0) {
        const daysToGo = remaining / dailyRate;
        const proj = new Date();
        proj.setDate(proj.getDate() + daysToGo);
        projectedDate = formatDate(proj.toISOString());
      }
    }
  }

  const remaining = Math.max(0, goal.targetValue - goal.currentValue);

  // Ring parameters
  const ringR = 85;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC * (1 - progress / 100);

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page" id="goal-detail-page">
      <div class="back-link" onclick="window.location.hash='#goals'">← Back to Goals</div>

      <!-- Header Card -->
      <div class="detail-header-card">
        <div class="flex-between">
          <h2 style="font-size: 28px;">${goal.title}</h2>
          <button class="goal-card-menu" onclick="window.openGoalMenu('${goal.id}')">⋯</button>
        </div>
        <div class="detail-badges">
          <span class="chip chip-${goal.type}">● ${goal.type.charAt(0).toUpperCase() + goal.type.slice(1)}</span>
          <span class="chip" style="background: var(--color-warning-dim); color: var(--color-warning);">${goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)} Priority</span>
          <span class="chip" style="background: var(--color-success-dim); color: var(--color-success);">${goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}</span>
        </div>
        ${goal.description ? `<p class="detail-description">${goal.description}</p>` : ''}
        <div class="detail-meta">
          ${goal.targetDate ? `<span class="detail-meta-item">📅 Ends: ${formatDate(goal.targetDate)}</span>` : ''}
          ${days !== null ? `<span class="detail-meta-item">⏱ ${days < 0 ? Math.abs(days) + ' days overdue' : days + ' days left'}</span>` : ''}
          ${goal.tags && goal.tags.length > 0 ? `<span class="detail-meta-item"># ${goal.tags.join(', ')}</span>` : ''}
        </div>
      </div>

      <!-- Progress + Stats -->
      <div class="detail-progress-section">
        <div style="display:flex; flex-direction:column; align-items:center;">
          <div class="savings-ring" style="margin-bottom: 12px;">
            <svg width="200" height="200" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="${ringR}" stroke="var(--bg-surface-elevated)" stroke-width="14" fill="none"/>
              <circle cx="100" cy="100" r="${ringR}" stroke="${color}" stroke-width="14" fill="none"
                stroke-linecap="round"
                stroke-dasharray="${ringC}"
                stroke-dashoffset="${ringOffset}"
                style="transition: stroke-dashoffset 0.8s ease; transform: rotate(-90deg); transform-origin: center;"/>
            </svg>
            <div class="savings-ring-text">
              <span class="savings-ring-percent" style="color: ${color};">${progress}%</span>
              <span style="font-family: 'JetBrains Mono', monospace; font-size: 14px; color: var(--text-secondary); display: block;">${formatCurrency(goal.currentValue)}</span>
            </div>
          </div>
          <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted);">TARGET REACHED</span>
        </div>

        <div class="detail-stats-grid">
          <div class="detail-stat">
            <div class="detail-stat-label">CURRENT BALANCE</div>
            <div class="detail-stat-value" style="color: var(--accent-primary);">${formatCurrency(goal.currentValue)}</div>
          </div>
          <div class="detail-stat">
            <div class="detail-stat-label">TARGET AMOUNT</div>
            <div class="detail-stat-value" style="color: var(--text-primary);">${formatCurrency(goal.targetValue)}</div>
          </div>
          <div class="detail-stat">
            <div class="detail-stat-label">REMAINING</div>
            <div class="detail-stat-value" style="color: var(--color-warning);">${formatCurrency(remaining)}</div>
          </div>
          <div class="detail-stat">
            <div class="detail-stat-label">PROJECTED COMPLETION</div>
            <div class="detail-stat-value" style="font-family: 'Inter', sans-serif; font-size: 16px;">${projectedDate}</div>
          </div>
        </div>
      </div>

      <!-- Transaction History -->
      ${goal.type === 'savings' ? `
      <div class="transaction-section">
        <div class="section-header">
          <h3>Transaction History</h3>
          <button class="btn-secondary" onclick="window.openLogTransaction('${goal.id}')">+ Log Transaction</button>
        </div>
        <div class="transaction-table">
          <div class="transaction-table-header">
            <div>DATE</div>
            <div>TYPE</div>
            <div>AMOUNT</div>
            <div>NOTE</div>
          </div>
          ${txns.map(t => `
            <div class="transaction-row">
              <div class="transaction-date">${formatDate(t.date)}</div>
              <div class="transaction-type ${t.type}">
                ${t.type === 'deposit' ? '↑' : '↓'} ${t.type.charAt(0).toUpperCase() + t.type.slice(1)}
              </div>
              <div class="transaction-amount ${t.type === 'deposit' ? 'positive' : 'negative'}">
                ${t.type === 'deposit' ? '+' : '-'}${formatCurrency(t.amount)}
              </div>
              <div class="transaction-note">${t.note || '—'}</div>
            </div>
          `).join('')}
          ${txns.length === 0 ? `<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 14px;">No transactions yet — make your first deposit!</div>` : ''}
        </div>
      </div>` : ''}

      <!-- Log Progress for non-savings -->
      ${goal.type !== 'savings' ? `
      <div class="section-header">
        <h3>Log Progress</h3>
      </div>
      <div class="card-flat mb-24" style="padding: 24px;">
        <div class="flex" style="gap: 12px; align-items: flex-end;">
          <div class="form-group" style="flex: 1; margin-bottom: 0;">
            <label class="form-label">New Value (current: ${goal.currentValue})</label>
            <input type="number" class="form-input" id="progress-value" value="${goal.currentValue}" min="0" max="${goal.targetValue || 9999}" />
          </div>
          <button class="btn-primary" onclick="window.updateGoalProgress('${goal.id}')">Update Progress</button>
        </div>
      </div>` : ''}

      <!-- Attached Files -->
      <div class="attached-files">
        <div class="section-header">
          <h3>Attached Files</h3>
          <button class="btn-ghost" onclick="document.getElementById('goal-file-input').click()">📎 Attach File</button>
          <input type="file" id="goal-file-input" style="display: none;" onchange="window.attachFileToGoal('${goal.id}', this)" multiple />
        </div>
        <div class="attached-files-grid">
          ${attachedFiles.map(f => {
            const fInfo = getFileTypeInfo(f.type, f.name);
            return `
              <div class="file-card" style="min-width: 140px; max-width: 160px;">
                <div class="file-card-preview" style="height: 80px;">
                  ${fInfo.category === 'image' && f.data ? `<img src="${f.data}" alt="${f.name}"/>` : `<span style="font-size: 28px;">📄</span>`}
                </div>
                <div class="file-card-info">
                  <div class="file-card-name">${f.name}</div>
                  <div class="file-card-meta">${formatFileSize(f.size)}</div>
                </div>
              </div>`;
          }).join('')}
        </div>
        <div class="drop-zone" id="goal-drop-zone"
          ondragover="event.preventDefault(); this.classList.add('drag-over');"
          ondragleave="this.classList.remove('drag-over');"
          ondrop="event.preventDefault(); this.classList.remove('drag-over'); window.handleGoalFileDrop(event, '${goal.id}');">
          <span class="drop-zone-icon">📁</span>
          Drag files here to attach
        </div>
      </div>
    </div>
  `;
}

// Global handlers
window.updateGoalProgress = function(goalId) {
  const input = document.getElementById('progress-value');
  if (!input) return;
  const val = Number(input.value);
  const goal = storage.getGoalById(goalId);
  if (!goal) return;
  storage.updateGoal(goalId, { currentValue: val });
  if (goal.targetValue > 0 && val >= goal.targetValue) {
    storage.updateGoal(goalId, { status: 'completed' });
    showToast('🎉 Goal completed! Congratulations!', 'success');
  } else {
    showToast('Progress updated!', 'success');
  }
  renderGoalDetail(goalId);
};

window.attachFileToGoal = async function(goalId, input) {
  const files = input.files;
  if (!files || files.length === 0) return;
  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) {
      showToast(`${file.name} is too large (max 5MB)`, 'error');
      continue;
    }
    const reader = new FileReader();
    reader.onload = () => {
      storage.addFile({
        name: file.name,
        type: file.type,
        size: file.size,
        data: reader.result,
        goalId: goalId,
      });
      showToast(`${file.name} attached!`, 'success');
      renderGoalDetail(goalId);
    };
    reader.readAsDataURL(file);
  }
};

window.handleGoalFileDrop = function(event, goalId) {
  const files = event.dataTransfer.files;
  if (!files || files.length === 0) return;
  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) {
      showToast(`${file.name} is too large (max 5MB)`, 'error');
      continue;
    }
    const reader = new FileReader();
    reader.onload = () => {
      storage.addFile({
        name: file.name,
        type: file.type,
        size: file.size,
        data: reader.result,
        goalId: goalId,
      });
      showToast(`${file.name} attached!`, 'success');
      renderGoalDetail(goalId);
    };
    reader.readAsDataURL(file);
  }
};
