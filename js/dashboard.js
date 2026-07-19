/* dashboard.js */

let currentUser = null;
let userForms = [];
let userFolders = [];
let selectedTab = 'all';
let selectedFolderId = null;
let activeShareFormId = null;
let qrCodeInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Wait for db and auth scripts to be loaded
  currentUser = await window.auth.getCurrentUser();
  if (!currentUser) return; // auth.js will redirect to login.html

  // Update profile header
  document.getElementById('username-display').textContent = currentUser.displayName || currentUser.email;
  const avatar = document.getElementById('user-avatar-display');
  if (avatar) avatar.src = currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';

  // Load dashboard data
  await loadFolders();
  await loadTemplates();
  await fetchAndRenderForms();

  // Setup tab events
  document.querySelectorAll('.sidebar-nav-item[data-tab]').forEach(item => {
    item.addEventListener('click', (e) => {
      document.querySelectorAll('.sidebar-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      selectedTab = item.getAttribute('data-tab');
      selectedFolderId = null; // Clear folder filter when clicking tabs
      
      const tabTitleMap = {
        all: 'My Forms',
        draft: 'Draft Forms',
        published: 'Published Forms',
        favorite: 'Favorite Forms',
        archived: 'Archived Forms'
      };
      document.getElementById('section-title').textContent = tabTitleMap[selectedTab] || 'Forms';
      
      renderFormsGrid();
    });
  });

  // Setup search input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderFormsGrid();
    });
  }

  // Setup Create Folder Form
  const folderForm = document.getElementById('create-folder-form');
  if (folderForm) {
    folderForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const folderName = document.getElementById('folder-name-input').value.trim();
      if (folderName) {
        try {
          await window.db.createFolder(folderName, currentUser.uid);
          document.getElementById('folder-name-input').value = '';
          Utils.closeModal('create-folder-modal');
          Utils.showToast("Folder created successfully!", "success");
          await loadFolders();
        } catch (error) {
          Utils.showToast("Failed to create folder", "error");
        }
      }
    });
  }

  // Blank form creator click
  document.getElementById('create-blank-btn').addEventListener('click', async () => {
    await createFormFromTemplate({
      title: 'Untitled Form',
      description: 'Please describe the purpose of this form here.',
      questions: [
        {
          id: Utils.uuid(),
          type: 'short-answer',
          title: 'Untitled Question',
          required: false
        }
      ]
    });
  });
});

// Fetch forms from Database and trigger views
async function fetchAndRenderForms() {
  if (!currentUser) return;
  try {
    userForms = await window.db.getForms(currentUser.uid);
    calculateAndRenderStats();
    renderFormsGrid();
  } catch (error) {
    Utils.showToast("Failed to load forms", "error");
  }
}

// Calculate total views, responses, completion rate
async function calculateAndRenderStats() {
  let totalResponses = 0;
  let totalViews = 0;
  const totalFormsCount = userForms.length;

  for (const form of userForms) {
    totalViews += form.views || 0;
    const responses = await window.db.getResponses(form.id);
    totalResponses += responses.length;
  }

  const completionRate = totalViews > 0 ? Math.round((totalResponses / totalViews) * 100) : 0;

  document.getElementById('stat-total-forms').textContent = totalFormsCount;
  document.getElementById('stat-total-responses').textContent = totalResponses;
  document.getElementById('stat-total-views').textContent = totalViews;
  document.getElementById('stat-completion-rate').textContent = `${completionRate}%`;
}

// Load side-bar folder tree
async function loadFolders() {
  if (!currentUser) return;
  try {
    userFolders = await window.db.getFolders(currentUser.uid);
    const container = document.getElementById('folders-container');
    container.innerHTML = '';

    userFolders.forEach(folder => {
      const el = document.createElement('div');
      el.className = 'folder-item';
      el.innerHTML = `
        <div class="folder-item-left">
          <i data-lucide="folder" style="width: 16px; height: 16px;"></i>
          <span>${Utils.escapeHTML(folder.name)}</span>
        </div>
        <button class="btn-icon delete-folder-btn" style="border: none; background: transparent; padding: 0; width: 16px; height: 16px; display: none;" onclick="deleteFolder(event, '${folder.id}')">
          <i data-lucide="trash-2" style="width: 12px; height: 12px; color: var(--danger);"></i>
        </button>
      `;
      
      // Select folder filter on click
      el.addEventListener('click', (e) => {
        if (e.target.closest('.delete-folder-btn')) return;
        document.querySelectorAll('.sidebar-nav-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.folder-item').forEach(i => i.classList.remove('active'));
        el.classList.add('active');
        
        selectedFolderId = folder.id;
        selectedTab = 'folder';
        document.getElementById('section-title').textContent = folder.name;
        renderFormsGrid();
      });

      // Show delete button on hover
      el.addEventListener('mouseenter', () => { el.querySelector('.delete-folder-btn').style.display = 'block'; });
      el.addEventListener('mouseleave', () => { el.querySelector('.delete-folder-btn').style.display = 'none'; });

      container.appendChild(el);
    });

    if (window.lucide) window.lucide.createIcons();
  } catch (error) {
    console.error("Failed to load folders", error);
  }
}

// Delete folder helper
async function deleteFolder(event, folderId) {
  event.stopPropagation();
  if (confirm("Are you sure you want to delete this folder? Forms inside will not be deleted.")) {
    try {
      await window.db.deleteFolder(folderId);
      Utils.showToast("Folder deleted", "info");
      await loadFolders();
      // Reset forms listing to 'all' if folder filter was active
      if (selectedFolderId === folderId) {
        document.getElementById('nav-all-forms').click();
      } else {
        await fetchAndRenderForms();
      }
    } catch(err) {
      Utils.showToast("Failed to delete folder", "error");
    }
  }
}

// Load pre-made templates
async function loadTemplates() {
  try {
    const templates = await window.db.getTemplates();
    const container = document.getElementById('templates-list-container');
    container.innerHTML = '';

    templates.forEach(tpl => {
      const el = document.createElement('div');
      el.className = 'template-item';
      const safeColor = Utils.sanitizeColor(tpl.theme?.color);
      el.innerHTML = `
        <div style="background: ${safeColor}; height: 8px; border-radius: var(--radius-sm) var(--radius-sm) 0 0; margin: -16px -16px 12px -16px;"></div>
        <h4 style="font-size: 14px; margin-bottom: 4px;">${Utils.escapeHTML(tpl.title)}</h4>
        <p style="font-size: 11px; color: var(--text-secondary); line-height: 1.4;">${Utils.escapeHTML(tpl.description)}</p>
      `;
      el.addEventListener('click', () => createFormFromTemplate(tpl));
      container.appendChild(el);
    });
  } catch (error) {
    console.error("Failed to load templates", error);
  }
}

// Action to create custom copy of template/blank
async function createFormFromTemplate(tpl) {
  if (!currentUser) return;
  
  const newForm = {
    id: 'f_' + Math.random().toString(36).substr(2, 9),
    userId: currentUser.uid,
    title: tpl.title,
    description: tpl.description || '',
    status: 'draft',
    favorite: false,
    folderId: null,
    theme: tpl.theme || { color: '#6366f1', banner: '', font: 'var(--font-sans)' },
    questions: tpl.questions || []
  };

  try {
    await window.db.saveForm(newForm);
    Utils.closeModal('templates-modal');
    Utils.showToast("Form initialized successfully!", "success");
    setTimeout(() => {
      window.location.href = `create-form.html?id=${newForm.id}`;
    }, 800);
  } catch (error) {
    Utils.showToast("Failed to initialize form", "error");
  }
}

// Render the grids dynamically with contextual controls
async function renderFormsGrid() {
  const container = document.getElementById('forms-grid-container');
  // Clear other than first card (which is create new button)
  const createCard = container.querySelector('.create-card');
  container.innerHTML = '';
  if (createCard) container.appendChild(createCard);

  const keyword = document.getElementById('search-input').value.toLowerCase().trim();

  // Filter forms list
  let filtered = [...userForms];
  
  if (selectedTab === 'draft') {
    filtered = filtered.filter(f => f.status === 'draft');
  } else if (selectedTab === 'published') {
    filtered = filtered.filter(f => f.status === 'published');
  } else if (selectedTab === 'favorite') {
    filtered = filtered.filter(f => f.favorite);
  } else if (selectedTab === 'archived') {
    filtered = filtered.filter(f => f.status === 'archived');
  } else if (selectedTab === 'folder') {
    filtered = filtered.filter(f => f.folderId === selectedFolderId);
  } else {
    // 'all' tab doesn't show archived forms by default
    filtered = filtered.filter(f => f.status !== 'archived');
  }

  if (keyword) {
    filtered = filtered.filter(f => f.title.toLowerCase().includes(keyword) || f.description.toLowerCase().includes(keyword));
  }

  if (filtered.length === 0) {
    // Render Empty State if no forms
    const empty = document.createElement('div');
    empty.style.gridColumn = '1 / -1';
    empty.style.textAlign = 'center';
    empty.style.padding = '40px';
    empty.style.color = 'var(--text-secondary)';
    empty.innerHTML = `
      <i data-lucide="file-question" style="width: 48px; height: 48px; margin-bottom: 12px; stroke-width: 1.5;"></i>
      <p>No forms found matching current filters.</p>
    `;
    container.appendChild(empty);
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  for (const form of filtered) {
    const responses = await window.db.getResponses(form.id);
    const responseCount = responses.length;

    const el = document.createElement('div');
    el.className = 'glass-card form-card';
    const safeColor = Utils.sanitizeColor(form.theme?.color);
    el.innerHTML = `
      <div>
        <div style="background: ${safeColor}; height: 6px; border-radius: var(--radius-sm) var(--radius-sm) 0 0; margin: -24px -24px 16px -24px;"></div>
        
        <div class="form-card-header">
          <div style="max-width: 80%;">
            <h3 style="font-size: 16px; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${Utils.escapeHTML(form.title || 'Untitled Form')}
            </h3>
            <span class="badge ${form.status === 'published' ? 'badge-success' : form.status === 'archived' ? 'badge-danger' : 'badge-warning'}">
              ${form.status}
            </span>
          </div>
          
          <!-- Favorite button -->
          <button class="btn-icon fav-btn" style="border: none; background: transparent; padding: 4px; width: 24px; height: 24px; cursor: pointer; color: ${form.favorite ? '#fbbf24' : 'var(--text-secondary)'};">
            <i data-lucide="star" style="width: 16px; height: 16px; fill: ${form.favorite ? '#fbbf24' : 'none'};"></i>
          </button>
        </div>

        <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 12px;">
          ${Utils.escapeHTML(form.description || 'No description.')}
        </p>
      </div>

      <div>
        <!-- Stats summary -->
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-secondary); margin-bottom: 12px; border-top: 1px solid var(--border-light); padding-top: 12px;">
          <span>Views: <strong>${form.views || 0}</strong></span>
          <span>Responses: <strong>${responseCount}</strong></span>
        </div>

        <!-- Action Links -->
        <div style="display: flex; gap: 6px; justify-content: flex-end; position: relative;">
          <a href="edit-form.html?id=${form.id}" class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;">Edit</a>
          <a href="responses.html?id=${form.id}" class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;">
            <i data-lucide="bar-chart-2" style="width: 12px; height: 12px;"></i>
          </a>
          
          <button class="form-card-menu-btn" data-toggle="dropdown" data-target="dropdown-${form.id}">
            <i data-lucide="more-vertical" style="width: 16px; height: 16px;"></i>
          </button>

          <!-- Action Context Menu Dropdown -->
          <div class="dropdown-menu glass-panel" id="dropdown-${form.id}">
            <div class="dropdown-item" onclick="duplicateForm('${form.id}')">
              <i data-lucide="copy" style="width: 14px; height: 14px;"></i>
              Duplicate
            </div>
            <div class="dropdown-item" onclick="openShareModal('${form.id}')">
              <i data-lucide="share-2" style="width: 14px; height: 14px;"></i>
              Share
            </div>
            <div class="dropdown-item" onclick="archiveForm('${form.id}', ${form.status === 'archived'})">
              <i data-lucide="archive" style="width: 14px; height: 14px;"></i>
              ${form.status === 'archived' ? 'Restore' : 'Archive'}
            </div>
            <div class="dropdown-item" onclick="openMoveToFolderModal('${form.id}')">
              <i data-lucide="folder-input" style="width: 14px; height: 14px;"></i>
              Move to Folder
            </div>
            <div class="dropdown-item danger" onclick="deleteForm('${form.id}')">
              <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
              Delete Form
            </div>
          </div>
        </div>
      </div>
    `;

    // Bind favorite toggler action
    el.querySelector('.fav-btn').addEventListener('click', async () => {
      form.favorite = !form.favorite;
      await window.db.saveForm(form);
      await fetchAndRenderForms();
    });

    container.appendChild(el);
  }

  if (window.lucide) window.lucide.createIcons();
}

// Context Menu Action Handlers
async function duplicateForm(formId) {
  try {
    const duplicated = await window.db.duplicateForm(formId);
    Utils.showToast(`Duplicated: ${duplicated.title}`, 'success');
    await fetchAndRenderForms();
  } catch(err) {
    Utils.showToast("Failed to duplicate", "error");
  }
}

async function archiveForm(formId, isArchived) {
  try {
    const form = await window.db.getForm(formId);
    form.status = isArchived ? 'draft' : 'archived';
    await window.db.saveForm(form);
    Utils.showToast(isArchived ? "Form restored" : "Form archived", "info");
    await fetchAndRenderForms();
  } catch(err) {
    Utils.showToast("Failed to change state", "error");
  }
}

async function deleteForm(formId) {
  if (confirm("Are you sure you want to delete this form? This will remove all questions and response records. This action is irreversible.")) {
    try {
      await window.db.deleteForm(formId);
      Utils.showToast("Form deleted successfully", "success");
      await fetchAndRenderForms();
    } catch(err) {
      Utils.showToast("Failed to delete", "error");
    }
  }
}

// Sharing Logic & QR code rendering
function openShareModal(formId) {
  activeShareFormId = formId;
  const rootURL = window.location.href.split('?')[0].split('#')[0].replace('dashboard.html', '');
  const shareURL = `${rootURL}form.html?id=${formId}`;
  
  document.getElementById('share-link-input').value = shareURL;
  document.getElementById('share-embed-input').value = `<iframe src="${shareURL}" width="100%" height="800px" frameborder="0" marginheight="0" marginwidth="0">Loading...</iframe>`;
  
  // Set default tab as link
  switchShareTab('link');
  
  // Render QR Code inside sharing card modal
  const qrContainer = document.getElementById('qrcode-container');
  qrContainer.innerHTML = '';
  if (window.QRCode) {
    qrCodeInstance = new QRCode(qrContainer, {
      text: shareURL,
      width: 140,
      height: 140,
      colorDark: "#111827",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  }

  Utils.openModal('share-modal');
}

function switchShareTab(tabName) {
  document.querySelectorAll('.share-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.responses-tabs-header button, .share-panel + div button, [id^="share-tab-"]').forEach(btn => btn.classList.remove('active'));
  
  document.getElementById(`share-panel-${tabName}`).style.display = tabName === 'qr' ? 'block' : 'block';
  if (tabName === 'link') document.getElementById('share-panel-link').style.display = 'block';
  if (tabName === 'embed') document.getElementById('share-panel-embed').style.display = 'block';
  
  document.getElementById(`share-tab-${tabName}-btn`).classList.add('active');
}

function copyShareText(inputId) {
  const inputEl = document.getElementById(inputId);
  if (inputEl) {
    inputEl.select();
    inputEl.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(inputEl.value);
    Utils.showToast("Copied to clipboard!", "success");
  }
}

// Move form to folder handler
function openMoveToFolderModal(formId) {
  // Let's implement move to folder inline:
  const folderNames = userFolders.map(f => f.name);
  if (folderNames.length === 0) {
    Utils.showToast("You don't have any folders. Create one in the sidebar first.", "info");
    return;
  }
  
  const optionsHtml = userFolders.map(f => `<option value="${f.id}">${Utils.escapeHTML(f.name)}</option>`).join('');
  const selectHtml = `
    <div style="padding: 10px 0;">
      <select id="move-folder-select" class="form-control">
        <option value="">-- Remove from Folder --</option>
        ${optionsHtml}
      </select>
    </div>
  `;

  // Create temporary modal alert
  const modalEl = document.createElement('div');
  modalEl.className = 'modal-overlay active';
  modalEl.id = 'move-folder-modal-temp';
  modalEl.innerHTML = `
    <div class="modal-content glass-panel" style="max-width: 320px;">
      <div class="modal-header">
        <h3>Move to Folder</h3>
      </div>
      ${selectHtml}
      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
        <button class="btn btn-secondary close-temp-btn">Cancel</button>
        <button class="btn btn-primary save-temp-btn">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(modalEl);

  modalEl.querySelector('.close-temp-btn').addEventListener('click', () => modalEl.remove());
  modalEl.querySelector('.save-temp-btn').addEventListener('click', async () => {
    const selectedFolder = document.getElementById('move-folder-select').value;
    try {
      const form = await window.db.getForm(formId);
      form.folderId = selectedFolder || null;
      await window.db.saveForm(form);
      Utils.showToast("Form moved successfully", "success");
      modalEl.remove();
      await fetchAndRenderForms();
    } catch(err) {
      Utils.showToast("Failed to move form", "error");
    }
  });
}
