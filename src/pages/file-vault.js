/** File Vault Page */
import * as storage from '../services/storage.js';
import { formatFileSize, formatRelativeDate, getFileTypeInfo, showToast, sanitizeFilename } from '../utils/helpers.js';

let currentFolderId = null;
let viewMode = 'grid';
let searchQuery = '';
const MAX_FILE_UPLOAD_MB = 15;
const MAX_FILE_UPLOAD_BYTES = MAX_FILE_UPLOAD_MB * 1024 * 1024;

export function renderFileVault() {
  const folders = storage.getFolders();
  const allFiles = storage.getFiles();
  const rootFolders = folders.filter(f => !f.parentId);

  let displayFiles = allFiles.filter(f => f.folderId === currentFolderId);
  if (searchQuery) {
    displayFiles = allFiles.filter(f =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.tags && f.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
    );
  }

  const currentFolder = currentFolderId ? folders.find(f => f.id === currentFolderId) : null;
  const usageMB = storage.getStorageUsageMB();
  const usagePercent = 100;

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page" id="files-page">
      <!-- Toolbar -->
      <div class="vault-toolbar">
        <div class="vault-breadcrumb">
          <a href="javascript:void(0)" onclick="window.vaultNavigate(null)">All Files</a>
          ${currentFolder ? `<span>›</span><span class="current">${currentFolder.name}</span>` : ''}
        </div>
        <div class="vault-toolbar-right">
          <div class="search-bar" style="width: 220px;">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input type="text" placeholder="Search in Vault..." value="${searchQuery}" oninput="window.vaultSearch(this.value)" />
          </div>
          <div class="view-toggle">
            <button class="view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}" onclick="window.setVaultView('grid')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            </button>
            <button class="view-toggle-btn ${viewMode === 'list' ? 'active' : ''}" onclick="window.setVaultView('list')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
          </div>
          <button class="btn-primary" onclick="document.getElementById('vault-file-input').click()">
            ↑ Upload
          </button>
          <input type="file" id="vault-file-input" style="display:none;" multiple onchange="window.handleVaultUpload(this)" />
        </div>
      </div>

      <!-- Two-panel layout -->
      <div class="vault-layout">
        <!-- Folder Tree -->
        <div class="folder-tree">
          <div class="flex-between" style="margin-bottom: 12px;">
            <span class="folder-tree-label">LIBRARY</span>
            <button style="font-size: 18px; color: var(--text-muted); cursor: pointer;" onclick="window.createNewFolder()" title="New Folder">+</button>
          </div>
          <div class="folder-item ${!currentFolderId && !searchQuery ? 'active' : ''}" onclick="window.vaultNavigate(null)">
            <span class="folder-emoji">📁</span> All Files
          </div>
          ${rootFolders.map(f => {
            const childCount = allFiles.filter(file => file.folderId === f.id).length;
            const nested = folders.filter(cf => cf.parentId === f.id);
            return `
              <div class="folder-item ${currentFolderId === f.id ? 'active' : ''}" onclick="window.vaultNavigate('${f.id}')">
                <span class="folder-emoji">📂</span> ${f.name}
                <span style="margin-left: auto; font-size: 12px; color: var(--text-muted);">(${childCount})</span>
                <button style="font-size: 12px; color: var(--text-muted); margin-left: 8px;" title="Delete folder" onclick="event.stopPropagation(); window.deleteVaultFolder('${f.id}')">🗑</button>
              </div>
              ${nested.map(cf => `
                <div class="folder-item nested ${currentFolderId === cf.id ? 'active' : ''}" onclick="window.vaultNavigate('${cf.id}')">
                  <span class="folder-emoji">📁</span> ${cf.name}
                  <button style="font-size: 12px; color: var(--text-muted); margin-left: auto;" title="Delete folder" onclick="event.stopPropagation(); window.deleteVaultFolder('${cf.id}')">🗑</button>
                </div>
              `).join('')}
            `;
          }).join('')}
        </div>

        <!-- Files Area -->
        <div>
          <!-- File Grid -->
          ${displayFiles.length > 0 ? `
            <div class="${viewMode === 'grid' ? 'file-grid' : ''}" id="file-display">
              ${displayFiles.map(f => viewMode === 'grid' ? renderFileGridCard(f) : renderFileListRow(f)).join('')}
            </div>
          ` : ''}

          ${displayFiles.length === 0 ? `
            <!-- Drop Zone / Empty State -->
            <div class="drop-zone" id="vault-drop-zone" style="min-height: 300px; display: flex; flex-direction: column; align-items: center; justify-content: center;"
              ondragover="event.preventDefault(); this.classList.add('drag-over');"
              ondragleave="this.classList.remove('drag-over');"
              ondrop="event.preventDefault(); this.classList.remove('drag-over'); window.handleVaultDrop(event);">
              <span class="drop-zone-icon" style="font-size: 40px;">☁️</span>
              <span style="font-size: 16px; font-weight: 500; margin-top: 8px;">Drop files to upload</span>
              <span style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Max ${MAX_FILE_UPLOAD_MB}MB per file</span>
            </div>
          ` : `
            <!-- Drop zone below files -->
            <div class="drop-zone mt-24" id="vault-drop-zone"
              ondragover="event.preventDefault(); this.classList.add('drag-over');"
              ondragleave="this.classList.remove('drag-over');"
              ondrop="event.preventDefault(); this.classList.remove('drag-over'); window.handleVaultDrop(event);">
              <span class="drop-zone-icon">📁</span>
              Drop files here to upload
            </div>
          `}

          <!-- Storage Bar -->
          <div class="vault-storage mt-16">
            <span>STORAGE</span>
            <div class="vault-storage-bar">
              <div class="vault-storage-fill" style="width: ${usagePercent}%"></div>
            </div>
            <span>${usageMB} MB used (unlimited total)</span>
            <span style="color: var(--text-muted);">Per-file: ${MAX_FILE_UPLOAD_MB} MB</span>
            <span style="font-weight: 600;">No cap</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Also add drag-over to the entire file area
  setupGlobalDropZone();
}

function renderFileGridCard(file) {
  const info = getFileTypeInfo(file.type, file.name);
  const isImage = info.category === 'image';
  const tags = file.tags || [];
  return `
    <div class="file-card" onclick="window.previewFile('${file.id}')">
      <div class="file-card-preview">
        ${isImage && file.data ? `<img src="${file.data}" alt="${file.name}"/>` : `
          <span style="font-size: 40px; color: var(--text-muted);">📄</span>
        `}
        ${info.badge ? `<span class="file-type-badge" style="background: ${info.color}">${info.badge}</span>` : ''}
      </div>
      <div class="file-card-info">
        <div class="file-card-name">${file.name}</div>
        <div class="file-card-meta">${info.badge || ''} · ${formatFileSize(file.size)}${tags.length > 0 ? ' · ' : ''}<span style="color: var(--accent-primary);">${tags[0] || ''}</span></div>
      </div>
    </div>
  `;
}

function renderFileListRow(file) {
  const info = getFileTypeInfo(file.type, file.name);
  return `
    <div class="flex-between" style="padding: 12px 16px; background: var(--bg-surface); border-radius: 10px; margin-bottom: 6px; cursor: pointer;" onclick="window.previewFile('${file.id}')">
      <div class="flex" style="align-items:center; gap: 12px;">
        <span style="font-size: 24px;">📄</span>
        <div>
          <div style="font-size: 14px; font-weight: 500; color: var(--text-primary);">${file.name}</div>
          <div style="font-size: 12px; color: var(--text-muted);">${formatFileSize(file.size)} · ${formatRelativeDate(file.createdAt)}</div>
        </div>
      </div>
      <div class="flex" style="gap: 8px;">
        ${info.badge ? `<span class="file-type-badge" style="background: ${info.color}; position: static;">${info.badge}</span>` : ''}
        <button style="font-size: 14px; color: var(--text-muted);" onclick="event.stopPropagation(); window.deleteFileById('${file.id}')">🗑</button>
      </div>
    </div>
  `;
}

function setupGlobalDropZone() {
  const mainContent = document.getElementById('main-content');
  mainContent.addEventListener('dragover', (e) => { e.preventDefault(); });
  mainContent.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.target.closest('.drop-zone') || e.target.closest('#vault-drop-zone')) return;
    handleFileDrop(e.dataTransfer.files);
  });
}

function handleFileDrop(fileList) {
  if (!fileList || fileList.length === 0) return;
  for (const file of fileList) {
    processFileUpload(file);
  }
}

function processFileUpload(file) {
  if (file.size > MAX_FILE_UPLOAD_BYTES) {
    showToast(`${file.name} is too large (max ${MAX_FILE_UPLOAD_MB}MB)`, 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    storage.addFile({
      name: sanitizeFilename(file.name),
      type: file.type,
      size: file.size,
      data: reader.result,
      folderId: currentFolderId,
    });
    showToast(`${file.name} uploaded!`, 'success');
    renderFileVault();
  };
  reader.readAsDataURL(file);
}

// Global handlers
window.vaultNavigate = function(folderId) {
  currentFolderId = folderId;
  searchQuery = '';
  renderFileVault();
};

window.vaultSearch = function(query) {
  searchQuery = query;
  renderFileVault();
};

window.setVaultView = function(mode) {
  viewMode = mode;
  renderFileVault();
};

window.handleVaultUpload = function(input) {
  const files = input.files;
  if (!files) return;
  for (const file of files) { processFileUpload(file); }
  input.value = '';
};

window.handleVaultDrop = function(event) {
  handleFileDrop(event.dataTransfer.files);
};

window.deleteFileById = function(id) {
  if (confirm('Delete this file?')) {
    storage.deleteFile(id);
    showToast('File deleted', 'info');
    renderFileVault();
  }
};

window.previewFile = function(id) {
  const file = storage.getFiles().find(f => f.id === id);
  if (!file) return;
  const info = getFileTypeInfo(file.type, file.name);

  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <div class="modal" style="max-width: 640px;">
      <div class="modal-header">
        <h3>${file.name}</h3>
        <button class="modal-close" onclick="window.closeModal()">✕</button>
      </div>
      <div style="margin-bottom: 20px;">
        ${info.category === 'image' && file.data ? `<img src="${file.data}" alt="${file.name}" style="width: 100%; border-radius: 12px;"/>` : `
          <div style="text-align: center; padding: 40px; background: var(--bg-surface-elevated); border-radius: 12px;">
            <span style="font-size: 48px; display: block; margin-bottom: 12px;">📄</span>
            <span style="font-size: 14px; color: var(--text-muted);">Preview not available for this file type</span>
          </div>
        `}
      </div>
      <div style="display: flex; gap: 16px; font-size: 13px; color: var(--text-secondary);">
        <span>Size: ${formatFileSize(file.size)}</span>
        <span>Type: ${file.type || 'Unknown'}</span>
        <span>Added: ${formatRelativeDate(file.createdAt)}</span>
      </div>
      <div class="modal-footer">
        ${file.data ? `<a href="${file.data}" download="${file.name}" class="btn-secondary">↓ Download</a>` : ''}
        <button class="btn-danger" onclick="window.deleteFileById('${file.id}'); window.closeModal();">Delete</button>
      </div>
    </div>
  `;
  overlay.onclick = (e) => { if (e.target === overlay) window.closeModal(); };
};

window.createNewFolder = function() {
  const name = prompt('Folder name:');
  if (!name || !name.trim()) return;
  storage.createFolder(name.trim(), currentFolderId);
  showToast(`Folder "${name}" created`, 'success');
  renderFileVault();
};

window.deleteVaultFolder = function(id) {
  const folder = storage.getFolders().find(f => f.id === id);
  if (!folder) return;

  if (!confirm(`Delete folder "${folder.name}"? Nested folders will also be removed, and files inside will move to All Files.`)) {
    return;
  }

  storage.deleteFolder(id);
  if (currentFolderId === id) currentFolderId = null;
  showToast(`Folder "${folder.name}" deleted`, 'info');
  renderFileVault();
};
