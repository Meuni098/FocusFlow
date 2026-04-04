/** Settings Page */
import * as storage from '../services/storage.js';
import { showToast } from '../utils/helpers.js';

export function renderSettings() {
  const settings = storage.getSettings();
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const currentColorTheme = document.documentElement.getAttribute('data-color-theme') || settings.colorTheme || 'default';

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page settings-page" id="settings-page">
      <!-- Appearance -->
      <div class="settings-section">
        <div class="settings-section-title">
          <span class="settings-section-icon">🎨</span>
          <h2>Appearance</h2>
        </div>
        <h4 style="font-size: 14px; color: var(--text-secondary); margin-bottom: 10px;">Display Mode</h4>
        <div class="theme-cards">
          <div class="theme-card ${currentTheme === 'light' ? 'active' : ''}" onclick="window.setAppTheme('light')">
            <div class="theme-card-preview" style="background: #FAFAF8;">☀️</div>
            <div class="theme-card-label">Light</div>
          </div>
          <div class="theme-card ${currentTheme === 'dark' ? 'active' : ''}" onclick="window.setAppTheme('dark')">
            <div class="theme-card-preview" style="background: #1A1A2E; color: white;">🌙</div>
            <div class="theme-card-label">Dark</div>
          </div>
          <div class="theme-card ${settings.theme === 'system' ? 'active' : ''}" onclick="window.setAppTheme('system')">
            <div class="theme-card-preview" style="background: linear-gradient(135deg, #FAFAF8 50%, #1A1A2E 50%);">💻</div>
            <div class="theme-card-label">System</div>
          </div>
        </div>

        <h4 style="font-size: 14px; color: var(--text-secondary); margin: 18px 0 10px;">Color Theme</h4>
        <div class="theme-cards palette-cards">
          <div class="theme-card ${currentColorTheme === 'forest-sage' ? 'active' : ''}" onclick="window.setColorTheme('forest-sage')">
            <div class="theme-card-preview palette-preview">
              <span class="palette-swatch" style="background:#346739"></span>
              <span class="palette-swatch" style="background:#79AE6F"></span>
              <span class="palette-swatch" style="background:#9FCB98"></span>
              <span class="palette-swatch" style="background:#F2EDC2"></span>
            </div>
            <div class="theme-card-label">Forest Sage</div>
          </div>

          <div class="theme-card ${currentColorTheme === 'playful-pop' ? 'active' : ''}" onclick="window.setColorTheme('playful-pop')">
            <div class="theme-card-preview palette-preview">
              <span class="palette-swatch" style="background:#FF5B5B"></span>
              <span class="palette-swatch" style="background:#F0FFC3"></span>
              <span class="palette-swatch" style="background:#9CCFFF"></span>
              <span class="palette-swatch" style="background:#685AFF"></span>
            </div>
            <div class="theme-card-label">Playful Pop</div>
          </div>

          <div class="theme-card ${currentColorTheme === 'ocean-mint' ? 'active' : ''}" onclick="window.setColorTheme('ocean-mint')">
            <div class="theme-card-preview palette-preview">
              <span class="palette-swatch" style="background:#005461"></span>
              <span class="palette-swatch" style="background:#0C7779"></span>
              <span class="palette-swatch" style="background:#249E94"></span>
              <span class="palette-swatch" style="background:#3BC1A8"></span>
            </div>
            <div class="theme-card-label">Ocean Mint</div>
          </div>

          <div class="theme-card ${currentColorTheme === 'sunset-blush' ? 'active' : ''}" onclick="window.setColorTheme('sunset-blush')">
            <div class="theme-card-preview palette-preview">
              <span class="palette-swatch" style="background:#FFF7CD"></span>
              <span class="palette-swatch" style="background:#FDC3A1"></span>
              <span class="palette-swatch" style="background:#FB9B8F"></span>
              <span class="palette-swatch" style="background:#F57799"></span>
            </div>
            <div class="theme-card-label">Sunset Blush</div>
          </div>
        </div>

        <div class="appearance-actions">
          <button class="btn-ghost" onclick="window.resetThemeSettings()">Reset To Default Theme</button>
        </div>
      </div>

      <!-- Data Management -->
      <div class="settings-section">
        <div class="settings-section-title">
          <span class="settings-section-icon">💾</span>
          <h2>Data Management</h2>
        </div>
        <div class="settings-row">
          <div class="settings-row-text">
            <h4>Export Workspace</h4>
            <p>Download your tasks, goals, and vault files as a .json</p>
          </div>
          <button class="btn-secondary" onclick="window.exportData()">Export</button>
        </div>
        <div class="settings-row">
          <div class="settings-row-text">
            <h4>Import Data</h4>
            <p>Migrate tasks from CSV or JSON backups</p>
          </div>
          <button class="btn-secondary" onclick="document.getElementById('import-input').click()">Import</button>
          <input type="file" id="import-input" accept=".json" style="display:none;" onchange="window.importDataFile(this)" />
        </div>

        <div class="danger-zone">
          <h4>Danger Zone</h4>
          <p>Permanently delete your workspace and all files</p>
          <div class="danger-warning">⚠ CLEAR ALL DATA</div>
          <button class="btn-danger" onclick="window.clearAllAppData()">Clear Everything</button>
        </div>
      </div>

      <!-- About -->
      <div class="settings-section">
        <div class="settings-section-title">
          <span class="settings-section-icon">ℹ️</span>
          <h2>About</h2>
        </div>
        <div class="about-card">
          <span class="about-icon">🔗</span>
          <div class="about-version">FocusFlow v1.0.0</div>
          <div class="about-tagline">Built with heart by Eunice</div>
          <div class="about-links mt-16">
            <a href="#">Privacy Policy</a>
            <span style="color: var(--text-muted);">·</span>
            <a href="#">Terms of Service</a>
            <span style="color: var(--text-muted);">·</span>
            <a href="#">Changelog</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Global handlers
window.exportData = function() {
  const data = storage.exportAllData();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `focusflow_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data exported successfully!', 'success');
};

window.importDataFile = function(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      storage.importData(reader.result);
      showToast('Data imported successfully!', 'success');
      renderSettings();
    } catch (e) {
      showToast('Invalid backup file', 'error');
    }
  };
  reader.readAsText(file);
  input.value = '';
};

window.clearAllAppData = function() {
  if (confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
    if (confirm('This is irreversible. Type OK in the next prompt to confirm.')) {
      storage.clearAllData();
      showToast('All data cleared', 'info');
      setTimeout(() => location.reload(), 500);
    }
  }
};

window.resetThemeSettings = function() {
  storage.updateSettings({ theme: 'light', colorTheme: 'default' });
  document.documentElement.setAttribute('data-theme', 'light');
  document.documentElement.setAttribute('data-color-theme', 'default');
  renderSettings();
  showToast('Theme reset to default.', 'success');
};
