/** Utility helpers for FocusFlow */

export function formatCurrency(amount) {
  return '₱' + Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatRelativeDate(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)} week${Math.floor(diff / 7) > 1 ? 's' : ''} ago`;
  return formatDate(dateStr);
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._\- ]/g, '').trim();
}

export function getGoalColor(type) {
  const map = {
    savings: 'var(--goal-savings)',
    milestone: 'var(--goal-milestone)',
    habit: 'var(--goal-habit)',
    project: 'var(--goal-project)',
    custom: 'var(--goal-custom)',
  };
  return map[type] || map.custom;
}

export function getGoalColorDim(type) {
  const map = {
    savings: 'var(--goal-savings-dim)',
    milestone: 'var(--goal-milestone-dim)',
    habit: 'var(--goal-habit-dim)',
    project: 'var(--goal-project-dim)',
    custom: 'var(--goal-custom-dim)',
  };
  return map[type] || map.custom;
}

export function getGoalIcon(type) {
  const icons = {
    savings: '💰',
    milestone: '🏆',
    habit: '📈',
    project: '💻',
    custom: '✨',
  };
  return icons[type] || icons.custom;
}

export function getGoalProgress(goal) {
  if (!goal.targetValue || goal.targetValue <= 0) return 0;
  return Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
}

export function getFileTypeInfo(mimeType, name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  if (mimeType && mimeType.startsWith('image/')) return { category: 'image', badge: null, color: null };
  const badges = {
    pdf: { category: 'pdf', badge: 'PDF', color: 'var(--color-danger)' },
    xls: { category: 'xls', badge: 'XLS', color: 'var(--color-success)' },
    xlsx: { category: 'xls', badge: 'XLS', color: 'var(--color-success)' },
    csv: { category: 'xls', badge: 'CSV', color: 'var(--color-success)' },
    doc: { category: 'doc', badge: 'DOC', color: 'var(--color-info)' },
    docx: { category: 'doc', badge: 'DOC', color: 'var(--color-info)' },
    ppt: { category: 'doc', badge: 'PPT', color: 'var(--color-warning)' },
    pptx: { category: 'doc', badge: 'PPT', color: 'var(--color-warning)' },
    txt: { category: 'doc', badge: 'TXT', color: 'var(--text-muted)' },
    js: { category: 'code', badge: 'JS', color: 'var(--color-warning)' },
    ts: { category: 'code', badge: 'TS', color: 'var(--color-info)' },
    py: { category: 'code', badge: 'PY', color: 'var(--color-success)' },
    json: { category: 'code', badge: 'JSON', color: 'var(--text-muted)' },
  };
  return badges[ext] || { category: 'other', badge: ext?.toUpperCase() || 'FILE', color: 'var(--text-muted)' };
}

// Toast system
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
