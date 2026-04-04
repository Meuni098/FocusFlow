/** Focus Mode Page — Elapsed timer and session history */
import * as storage from '../services/storage.js';
import { showToast, formatRelativeDate } from '../utils/helpers.js';

let focusTickTimer = null;
let lastClockValue = '';
let ambientContext = null;
let ambientNodes = [];
let ambientMasterGain = null;
let isAmbientPlaying = false;

const AMBIENT_TYPES = ['rain', 'cafe', 'white'];

function getAmbientPrefs() {
  const settings = storage.getSettings();
  const type = AMBIENT_TYPES.includes(settings.focusAmbientType) ? settings.focusAmbientType : 'rain';
  const volume = Number.isFinite(settings.focusAmbientVolume) ? settings.focusAmbientVolume : 0.35;
  return {
    type,
    volume: Math.min(1, Math.max(0, volume)),
    enabled: !!settings.focusAmbientEnabled,
  };
}

function saveAmbientPrefs(updates) {
  storage.updateSettings(updates);
}

function formatDuration(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = String(Math.floor(safe / 3600)).padStart(2, '0');
  const m = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
  const s = String(safe % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function getElapsedSeconds(startedAt) {
  if (!startedAt) return 0;
  const diffMs = Date.now() - new Date(startedAt).getTime();
  return Math.max(0, Math.floor(diffMs / 1000));
}

function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getStartOfWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const start = new Date(now.getFullYear(), now.getMonth(), diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function computeSummary(sessions) {
  const todayKey = getTodayKey();
  const weekStart = getStartOfWeek();

  let totalSeconds = 0;
  let todaySeconds = 0;
  let thisWeekSeconds = 0;
  let longestSeconds = 0;

  for (const session of sessions) {
    const duration = Number(session.durationSeconds) || 0;
    const start = new Date(session.startedAt);
    totalSeconds += duration;

    if (session.dateKey === todayKey) todaySeconds += duration;
    if (start >= weekStart) thisWeekSeconds += duration;
    if (duration > longestSeconds) longestSeconds = duration;
  }

  return {
    totalSessions: sessions.length,
    totalSeconds,
    todaySeconds,
    thisWeekSeconds,
    longestSeconds,
  };
}

function ensureAmbientContext() {
  if (ambientContext) return ambientContext;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  ambientContext = new AudioCtx();
  ambientMasterGain = ambientContext.createGain();
  ambientMasterGain.gain.value = 0;
  ambientMasterGain.connect(ambientContext.destination);
  return ambientContext;
}

function createNoiseBuffer(ctx, color = 'white') {
  const duration = 2;
  const frameCount = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (color === 'brown') {
    let last = 0;
    for (let i = 0; i < frameCount; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  } else {
    for (let i = 0; i < frameCount; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  return buffer;
}

function stopAmbientInternal() {
  for (const node of ambientNodes) {
    try {
      if (node.stop) node.stop();
      node.disconnect?.();
    } catch {
      // Ignore disconnect errors during teardown.
    }
  }
  ambientNodes = [];
  isAmbientPlaying = false;
}

function buildRainSound(ctx) {
  const source = ctx.createBufferSource();
  source.buffer = createNoiseBuffer(ctx, 'white');
  source.loop = true;

  const highPass = ctx.createBiquadFilter();
  highPass.type = 'highpass';
  highPass.frequency.value = 700;

  const lowPass = ctx.createBiquadFilter();
  lowPass.type = 'lowpass';
  lowPass.frequency.value = 6800;

  const gain = ctx.createGain();
  gain.gain.value = 0.22;

  source.connect(highPass);
  highPass.connect(lowPass);
  lowPass.connect(gain);
  gain.connect(ambientMasterGain);

  source.start();
  ambientNodes.push(source, highPass, lowPass, gain);
}

function buildCafeSound(ctx) {
  const murmur = ctx.createBufferSource();
  murmur.buffer = createNoiseBuffer(ctx, 'brown');
  murmur.loop = true;

  const bandPass = ctx.createBiquadFilter();
  bandPass.type = 'bandpass';
  bandPass.frequency.value = 780;
  bandPass.Q.value = 0.75;

  const presence = ctx.createBiquadFilter();
  presence.type = 'highpass';
  presence.frequency.value = 1500;

  const murmurGain = ctx.createGain();
  murmurGain.gain.value = 0.15;

  const hum = ctx.createOscillator();
  hum.type = 'sine';
  hum.frequency.value = 132;
  const humGain = ctx.createGain();
  humGain.gain.value = 0.012;

  murmur.connect(bandPass);
  bandPass.connect(murmurGain);
  murmurGain.connect(ambientMasterGain);

  murmur.connect(presence);
  presence.connect(ambientMasterGain);

  hum.connect(humGain);
  humGain.connect(ambientMasterGain);

  murmur.start();
  hum.start();
  ambientNodes.push(murmur, bandPass, presence, murmurGain, hum, humGain);
}

function buildWhiteNoiseSound(ctx) {
  const source = ctx.createBufferSource();
  source.buffer = createNoiseBuffer(ctx, 'white');
  source.loop = true;

  const gain = ctx.createGain();
  gain.gain.value = 0.2;

  source.connect(gain);
  gain.connect(ambientMasterGain);

  source.start();
  ambientNodes.push(source, gain);
}

async function startAmbient(type, volume) {
  const ctx = ensureAmbientContext();
  if (!ctx || !ambientMasterGain) {
    showToast('Ambient sound is not supported on this browser', 'error');
    return false;
  }

  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  stopAmbientInternal();

  if (type === 'cafe') buildCafeSound(ctx);
  else if (type === 'white') buildWhiteNoiseSound(ctx);
  else buildRainSound(ctx);

  ambientMasterGain.gain.setTargetAtTime(volume, ctx.currentTime, 0.08);
  isAmbientPlaying = true;
  return true;
}

function stopAmbient() {
  if (!ambientContext || !ambientMasterGain) {
    stopAmbientInternal();
    return;
  }

  ambientMasterGain.gain.setTargetAtTime(0, ambientContext.currentTime, 0.06);
  setTimeout(() => stopAmbientInternal(), 240);
}

function renderFlipClock(nextValue) {
  const elapsedEl = document.getElementById('focus-elapsed');
  if (!elapsedEl) return;

  const previous = lastClockValue || nextValue;
  const html = nextValue.split('').map((char, index) => {
    if (char === ':') {
      return '<span class="focus-separator">:</span>';
    }

    const shouldFlip = previous[index] && previous[index] !== char;
    return `<span class="focus-digit ${shouldFlip ? 'flip' : ''}">${char}</span>`;
  }).join('');

  elapsedEl.innerHTML = html;
  lastClockValue = nextValue;
}

function updateAmbientToggleText() {
  const btn = document.getElementById('ambient-toggle-btn');
  if (!btn) return;
  btn.textContent = isAmbientPlaying ? 'Pause Ambience' : 'Play Ambience';
}

function updateFullscreenButtonText() {
  const btn = document.getElementById('focus-fullscreen-btn');
  if (!btn) return;
  const active = !!document.fullscreenElement;
  btn.textContent = active ? 'Exit Fullscreen' : 'Enter Fullscreen';
}

function syncFullscreenClass() {
  const isFullscreen = !!document.fullscreenElement;
  document.body.classList.toggle('focus-fullscreen-active', isFullscreen);

  const page = document.getElementById('focus-page');
  if (page) {
    page.classList.remove('focus-fs-enter', 'focus-fs-exit');
    // Force reflow so the same animation can replay on repeated toggles.
    // eslint-disable-next-line no-unused-expressions
    page.offsetHeight;
    page.classList.add(isFullscreen ? 'focus-fs-enter' : 'focus-fs-exit');
    setTimeout(() => page.classList.remove('focus-fs-enter', 'focus-fs-exit'), 420);
  }

  updateFullscreenButtonText();
}

function updateLiveTimerUI() {
  if (!window.location.hash.startsWith('#focus')) {
    if (focusTickTimer) {
      clearInterval(focusTickTimer);
      focusTickTimer = null;
    }
    stopAmbient();
    document.body.classList.remove('focus-fullscreen-active');
    return;
  }

  const active = storage.getActiveFocusSession();
  const elapsed = active ? getElapsedSeconds(active.startedAt) : 0;

  const elapsedEl = document.getElementById('focus-elapsed');
  const statusEl = document.getElementById('focus-status');
  if (elapsedEl) renderFlipClock(formatDuration(elapsed));
  if (statusEl) {
    statusEl.textContent = active
      ? `In progress · Started ${new Date(active.startedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
      : 'Idle · Start when you are ready';
  }
}

function ensureFocusTicker() {
  if (focusTickTimer) return;
  focusTickTimer = setInterval(updateLiveTimerUI, 1000);
}

function renderHistoryRows(sessions) {
  if (sessions.length === 0) {
    return `
      <div class="focus-empty-state">
        <div class="focus-empty-icon">⏱</div>
        <p>No focus sessions yet</p>
        <small>Start Focus Mode to begin tracking your deep work.</small>
      </div>
    `;
  }

  return sessions.slice(0, 12).map((session, idx) => {
    const started = new Date(session.startedAt);
    const ended = new Date(session.endedAt);
    const dayLabel = started.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeRange = `${started.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${ended.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;

    return `
      <div class="focus-history-row">
        <div class="focus-history-index">#${sessions.length - idx}</div>
        <div class="focus-history-when">
          <strong>${dayLabel}</strong>
          <span>${timeRange}</span>
        </div>
        <div class="focus-history-relative">${formatRelativeDate(session.startedAt)}</div>
        <div class="focus-history-duration">${formatDuration(session.durationSeconds)}</div>
      </div>
    `;
  }).join('');
}

export function renderFocusMode() {
  ensureFocusTicker();

  const active = storage.getActiveFocusSession();
  const sessions = storage.getFocusSessions();
  const summary = computeSummary(sessions);
  const elapsedSeconds = active ? getElapsedSeconds(active.startedAt) : 0;
  lastClockValue = '';

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page" id="focus-page">
      <div class="focus-layout">
        <section class="focus-hero ${active ? 'is-live' : ''}">
          <div class="focus-hero-bg focus-hero-bg-a"></div>
          <div class="focus-hero-bg focus-hero-bg-b"></div>
          <div class="focus-hero-grid"></div>

          <div class="focus-timer-card">
            <div class="focus-timer-header">
              <h2>Focus Mode</h2>
              <span class="focus-chip ${active ? 'live' : ''}">${active ? 'LIVE' : 'READY'}</span>
            </div>
            <p class="focus-status" id="focus-status">
              ${active ? `In progress · Started ${new Date(active.startedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : 'Idle · Start when you are ready'}
            </p>

            <div class="focus-dial-wrap">
              <div class="focus-dial-ring focus-dial-ring-outer"></div>
              <div class="focus-dial-ring focus-dial-ring-inner"></div>
              <div class="focus-elapsed" id="focus-elapsed">${formatDuration(elapsedSeconds)}</div>
            </div>

            <div class="focus-actions">
              ${active
                ? '<button class="btn-danger" onclick="window.stopFocusMode()">■ Stop Session</button>'
                : '<button class="btn-primary" onclick="window.startFocusMode()">▶ Start Focus Session</button>'}
            </div>

            <div class="focus-hero-controls">
              <div class="focus-screen-controls">
                <button class="btn-ghost" id="focus-fullscreen-btn" onclick="window.toggleFocusFullscreen()">Enter Fullscreen</button>
              </div>
            </div>

            <p class="focus-caption">Track real elapsed deep-work time and build your streak.</p>
          </div>
        </section>

        <section class="focus-summary-grid">
          <article class="focus-summary-card">
            <p>Today</p>
            <strong>${formatDuration(summary.todaySeconds)}</strong>
          </article>
          <article class="focus-summary-card">
            <p>This Week</p>
            <strong>${formatDuration(summary.thisWeekSeconds)}</strong>
          </article>
          <article class="focus-summary-card">
            <p>Total Focus</p>
            <strong>${formatDuration(summary.totalSeconds)}</strong>
          </article>
          <article class="focus-summary-card">
            <p>Total Sessions</p>
            <strong>${summary.totalSessions}</strong>
          </article>
          <article class="focus-summary-card">
            <p>Longest Session</p>
            <strong>${formatDuration(summary.longestSeconds)}</strong>
          </article>
        </section>

        <section class="focus-history-card">
          <div class="focus-history-header">
            <h3>Session History</h3>
            <span class="focus-history-sub">Last ${Math.min(sessions.length, 12)} of ${sessions.length}</span>
          </div>
          <div class="focus-history-list">
            ${renderHistoryRows(sessions)}
          </div>
        </section>
      </div>
    </div>
  `;

  if (!window.__focusFullscreenBound) {
    document.addEventListener('fullscreenchange', syncFullscreenClass);
    window.__focusFullscreenBound = true;
  }

  stopAmbient();

  updateLiveTimerUI();
  updateAmbientToggleText();
  updateFullscreenButtonText();
}

window.startFocusMode = function() {
  const active = storage.getActiveFocusSession();
  if (active) {
    showToast('Focus session is already running', 'info');
    return;
  }

  storage.startFocusSession();
  showToast('Focus session started. Stay locked in.', 'success');
  renderFocusMode();
};

window.stopFocusMode = function() {
  const active = storage.getActiveFocusSession();
  if (!active) {
    showToast('No active focus session to stop', 'error');
    return;
  }

  const session = storage.stopFocusSession();
  if (!session) {
    showToast('Unable to stop focus session', 'error');
    return;
  }

  showToast(`Session saved: ${formatDuration(session.durationSeconds)}`, 'success');
  renderFocusMode();
};

window.toggleFocusFullscreen = async function() {
  const root = document.getElementById('main-content');
  if (!root) return;

  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await root.requestFullscreen();
    }
    syncFullscreenClass();
  } catch {
    showToast('Fullscreen is not available in this browser', 'error');
  }
};
