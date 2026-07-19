/* builder.js */

let currentForm = null;
let activeCardId = null;
let saveTimeout = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.auth.getCurrentUser();
  if (!user) return; // auth.js handles redirect

  // 1. Fetch form from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const formId = urlParams.get('id');

  if (formId) {
    try {
      currentForm = await window.db.getForm(formId);
      if (!currentForm) {
        Utils.showToast("Form not found. Redirecting...", "error");
        setTimeout(() => window.location.href = 'dashboard.html', 1500);
        return;
      }
    } catch (error) {
      console.error(error);
      window.location.href = 'dashboard.html';
      return;
    }
  } else {
    // No ID, redirect back to dashboard
    window.location.href = 'dashboard.html';
    return;
  }

  // 2. Setup visual metadata inputs
  document.getElementById('builder-form-title-header').value = currentForm.title || 'Untitled Form';
  document.getElementById('builder-form-title').value = currentForm.title || 'Untitled Form';
  document.getElementById('builder-form-desc').value = currentForm.description || '';

  // Header Title link binding
  document.getElementById('builder-form-title-header').addEventListener('input', (e) => {
    document.getElementById('builder-form-title').value = e.target.value;
    currentForm.title = e.target.value;
    triggerAutoSave();
  });

  document.getElementById('builder-form-title').addEventListener('input', (e) => {
    document.getElementById('builder-form-title-header').value = e.target.value;
    currentForm.title = e.target.value;
    triggerAutoSave();
  });

  document.getElementById('builder-form-desc').addEventListener('input', (e) => {
    currentForm.description = e.target.value;
    triggerAutoSave();
  });

  // 3. Load global settings inputs
  initSettingsPanel();

  // 4. Render questions onto canvas
  renderQuestions();

  // 5. Initialize SortableJS Drag & Drop
  const canvasEl = document.getElementById('canvas-dropzone');
  Sortable.create(canvasEl, {
    handle: '.drag-handle',
    animation: 200,
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    onEnd: (evt) => {
      // Re-order forms array based on DOM ordering
      const cardNodes = Array.from(canvasEl.querySelectorAll('.canvas-card'));
      const newQuestions = [];
      cardNodes.forEach(node => {
        const id = node.getAttribute('data-id');
        const q = currentForm.questions.find(item => item.id === id);
        if (q) newQuestions.push(q);
      });
      currentForm.questions = newQuestions;
      triggerAutoSave();
    }
  });

  // 6. Bind toolbox items clicks
  document.querySelectorAll('#toolbox-container .toolbox-item').forEach(item => {
    item.addEventListener('click', () => {
      const type = item.getAttribute('data-type');
      addQuestionToCanvas(type);
    });
  });

  // 7. Bind publish action button
  document.getElementById('publish-form-btn').addEventListener('click', async () => {
    currentForm.status = 'published';
    await window.db.saveForm(currentForm);
    Utils.showToast("Form published! Anyone with link can respond.", "success");
    document.getElementById('save-status-badge').textContent = 'Published';
    document.getElementById('save-status-badge').className = 'badge badge-success';
  });

  // 8. Bind AI Generator submit form
  const aiForm = document.getElementById('ai-generator-form');
  if (aiForm) {
    aiForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const prompt = document.getElementById('ai-prompt-input').value;
      if (prompt) {
        runMockAIGenerator(prompt);
      }
    });
  }

  if (window.lucide) window.lucide.createIcons();
});

// Sync properties panels
function initSettingsPanel() {
  const themeColor = document.getElementById('settings-theme-color');
  const bannerUrl = document.getElementById('settings-banner-url');
  const logoUrl = document.getElementById('settings-logo-url');
  const companyName = document.getElementById('settings-company-name');
  const fontStyle = document.getElementById('settings-font-style');
  const acceptRes = document.getElementById('settings-accept-responses');
  const collectEmails = document.getElementById('settings-collect-emails');
  const anonymous = document.getElementById('settings-anonymous');
  const pwdToggle = document.getElementById('settings-password-toggle');
  const limitToggle = document.getElementById('settings-limit-toggle');

  themeColor.value = currentForm.theme.color || '#6366f1';
  document.getElementById('theme-color-hex').textContent = themeColor.value;
  bannerUrl.value = currentForm.theme.banner || '';
  logoUrl.value = currentForm.theme.logo || '';
  if (companyName) companyName.value = currentForm.theme.companyName || '';
  fontStyle.value = currentForm.theme.font || 'var(--font-sans)';
  
  acceptRes.checked = currentForm.status !== 'archived';
  collectEmails.checked = !!currentForm.collectEmails;
  anonymous.checked = !!currentForm.anonymous;

  // Custom colors preview
  updateThemeColorPreview(themeColor.value);

  // Settings action binds
  themeColor.addEventListener('input', (e) => {
    currentForm.theme.color = e.target.value;
    document.getElementById('theme-color-hex').textContent = e.target.value;
    updateThemeColorPreview(e.target.value);
    triggerAutoSave();
  });

  bannerUrl.addEventListener('input', (e) => {
    currentForm.theme.banner = e.target.value.trim();
    updateBannerPreview(e.target.value.trim());
    triggerAutoSave();
  });

  updateBannerPreview(currentForm.theme.banner);

  logoUrl.addEventListener('input', (e) => {
    currentForm.theme.logo = e.target.value.trim();
    triggerAutoSave();
  });

  if (companyName) {
    companyName.addEventListener('input', (e) => {
      currentForm.theme.companyName = e.target.value.trim();
      triggerAutoSave();
    });
  }

  fontStyle.addEventListener('change', (e) => {
    currentForm.theme.font = e.target.value;
    document.documentElement.style.setProperty('--font-sans', e.target.value);
    triggerAutoSave();
  });

  acceptRes.addEventListener('change', (e) => {
    currentForm.status = e.target.checked ? 'draft' : 'archived';
    triggerAutoSave();
  });

  collectEmails.addEventListener('change', (e) => {
    currentForm.collectEmails = e.target.checked;
    triggerAutoSave();
  });

  anonymous.addEventListener('change', (e) => {
    currentForm.anonymous = e.target.checked;
    triggerAutoSave();
  });

  // Password protector toggle
  pwdToggle.checked = !!currentForm.passwordProtected;
  const pwdInputGroup = document.getElementById('password-input-group');
  pwdInputGroup.style.display = pwdToggle.checked ? 'block' : 'none';
  
  pwdToggle.addEventListener('change', (e) => {
    currentForm.passwordProtected = e.target.checked;
    pwdInputGroup.style.display = e.target.checked ? 'block' : 'none';
    if (!e.target.checked) currentForm.formPassword = '';
    triggerAutoSave();
  });
  
  document.getElementById('settings-form-password').value = currentForm.formPassword || '';
  document.getElementById('settings-form-password').addEventListener('input', (e) => {
    currentForm.formPassword = e.target.value;
    triggerAutoSave();
  });

  // Response limits toggle
  limitToggle.checked = !!currentForm.hasLimit;
  const limitInputGroup = document.getElementById('limit-input-group');
  limitInputGroup.style.display = limitToggle.checked ? 'block' : 'none';
  
  limitToggle.addEventListener('change', (e) => {
    currentForm.hasLimit = e.target.checked;
    limitInputGroup.style.display = e.target.checked ? 'block' : 'none';
    if (!e.target.checked) currentForm.responseLimit = null;
    triggerAutoSave();
  });

  document.getElementById('settings-response-limit').value = currentForm.responseLimit || '';
  document.getElementById('settings-response-limit').addEventListener('input', (e) => {
    currentForm.responseLimit = parseInt(e.target.value) || null;
    triggerAutoSave();
  });
}

function updateThemeColorPreview(color) {
  const safeColor = Utils.sanitizeColor(color);
  document.getElementById('form-metadata-card').style.borderTopColor = safeColor;
  document.documentElement.style.setProperty('--accent-color', safeColor);
}

function updateBannerPreview(url) {
  const container = document.getElementById('banner-preview');
  if (url) {
    const safeURL = Utils.sanitizeURL(url);
    container.style.backgroundImage = `url('${safeURL.replace(/'/g, "%27")}')`;
    container.classList.remove('empty');
  } else {
    container.style.backgroundImage = 'none';
    container.classList.add('empty');
  }
}

// Render dynamic forms question items on canvas
function renderQuestions() {
  const container = document.getElementById('canvas-dropzone');
  container.innerHTML = '';

  if (currentForm.questions.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-tertiary);" id="empty-builder-state">
        <i data-lucide="layout-template" style="width: 48px; height: 48px; margin-bottom: 12px;"></i>
        <p>Your Form canvas is empty. Select a toolbox block from sidebar to insert.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  currentForm.questions.forEach((q, index) => {
    const el = document.createElement('div');
    el.className = `glass-card canvas-card ${activeCardId === q.id ? 'active' : ''}`;
    el.setAttribute('data-id', q.id);
    
    // Build active properties (e.g. required switcher, type labels, inputs fields, placeholder edits)
    const isActive = activeCardId === q.id;
    
    el.innerHTML = `
      <div class="drag-handle"><i data-lucide="grip-horizontal" style="width: 20px; height: 20px;"></i></div>
      
      <!-- Card main edit zone -->
      <div onclick="selectQuestionCard('${q.id}')">
        <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 10px;">
          <input type="text" class="form-control q-title-input" value="${Utils.escapeHTML(q.title)}" placeholder="Enter Question text..." style="font-weight: 600; font-size: 15px; border: none; background: transparent; padding: 0; outline: none; border-bottom: 1px dashed var(--border-light); border-radius: 0;">
          <span style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; align-self: center;">${q.type.replace('-', ' ')}</span>
        </div>

        <!-- Render specific inputs previews -->
        ${renderInputPreview(q)}

        <!-- Additional active config drawers -->
        ${isActive ? renderActiveControls(q, index) : ''}
      </div>
    `;

    // Bind event listeners for question input updates
    el.querySelector('.q-title-input').addEventListener('input', (e) => {
      q.title = e.target.value;
      triggerAutoSave();
    });

    if (isActive) {
      // Toggle required
      const reqToggle = el.querySelector(`.req-chk-${q.id}`);
      if (reqToggle) {
        reqToggle.addEventListener('change', (e) => {
          q.required = e.target.checked;
          triggerAutoSave();
        });
      }
      
      // Placeholder binder
      const phInput = el.querySelector(`.ph-input-${q.id}`);
      if (phInput) {
        phInput.addEventListener('input', (e) => {
          q.placeholder = e.target.value;
          triggerAutoSave();
        });
      }

      // Help text binder
      const helpInput = el.querySelector(`.help-input-${q.id}`);
      if (helpInput) {
        helpInput.addEventListener('input', (e) => {
          q.helpText = e.target.value;
          triggerAutoSave();
        });
      }
    }

    container.appendChild(el);
  });

  if (window.lucide) window.lucide.createIcons();
}

function selectQuestionCard(id) {
  if (activeCardId === id) return;
  activeCardId = id;
  renderQuestions();
}

// Add new questions
function addQuestionToCanvas(type) {
  const newQ = {
    id: Utils.uuid(),
    type,
    title: `Untitled ${type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}`,
    required: false,
    placeholder: '',
    helpText: ''
  };

  // Add default properties depending on type
  if (['multiple-choice', 'checkbox', 'dropdown'].includes(type)) {
    newQ.options = ['Option 1', 'Option 2', 'Option 3'];
  }
  if (type === 'rating') {
    newQ.maxStars = 5;
  }
  if (type === 'linear-scale') {
    newQ.min = 1;
    newQ.max = 5;
    newQ.minLabel = 'Not Satisfied';
    newQ.maxLabel = 'Very Satisfied';
  }
  if (type === 'image-choice') {
    newQ.options = [
      { label: 'Choice A', imageURL: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=300&q=80' },
      { label: 'Choice B', imageURL: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=300&q=80' }
    ];
  }

  currentForm.questions.push(newQ);
  activeCardId = newQ.id;
  
  // Switch to canvas tab on mobile views so the user sees the new question instantly
  if (window.innerWidth <= 1024 && typeof switchMobileTab === 'function') {
    switchMobileTab('canvas');
  }

  renderQuestions();
  triggerAutoSave();
  
  // Scroll down to newly added card
  setTimeout(() => {
    const el = document.querySelector(`[data-id="${newQ.id}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
}

// Render the input structures on builder page
function renderInputPreview(q) {
  if (q.type === 'short-answer') {
    return `<input type="text" class="form-control" placeholder="${Utils.escapeHTML(q.placeholder || 'Short answer text')}" disabled style="border-style: dotted;">`;
  }
  if (q.type === 'paragraph') {
    return `<textarea class="form-control" placeholder="${Utils.escapeHTML(q.placeholder || 'Long paragraph answers text')}" disabled rows="2" style="border-style: dotted; resize: none;"></textarea>`;
  }
  if (q.type === 'number') {
    return `<input type="number" class="form-control" placeholder="0" disabled style="border-style: dotted;">`;
  }
  if (q.type === 'email') {
    return `<input type="email" class="form-control" placeholder="name@email.com" disabled style="border-style: dotted;">`;
  }
  if (q.type === 'phone') {
    return `<input type="tel" class="form-control" placeholder="+1 (555) 000-0000" disabled style="border-style: dotted;">`;
  }
  if (q.type === 'url') {
    return `<input type="url" class="form-control" placeholder="https://website.com" disabled style="border-style: dotted;">`;
  }
  if (q.type === 'date') {
    return `<input type="date" class="form-control" disabled style="border-style: dotted;">`;
  }
  if (q.type === 'time') {
    return `<input type="time" class="form-control" disabled style="border-style: dotted;">`;
  }
  if (q.type === 'yes-no') {
    return `
      <div style="display: flex; gap: 16px; margin-top: 8px;">
        <label><input type="radio" disabled> Yes</label>
        <label><input type="radio" disabled> No</label>
      </div>
    `;
  }
  if (q.type === 'file') {
    return `
      <div style="border: 2px dashed var(--border-medium); border-radius: var(--radius-md); padding: 16px; text-align: center; color: var(--text-secondary); background: var(--bg-tertiary); font-size: 13px;">
        <i data-lucide="upload" style="width: 20px; height: 20px; margin-bottom: 6px;"></i>
        <p>File Upload Preview</p>
      </div>
    `;
  }
  if (q.type === 'rating') {
    return `
      <div class="rating-builder-stars" style="margin-top: 8px;">
        <i data-lucide="star"></i>
        <i data-lucide="star"></i>
        <i data-lucide="star"></i>
        <i data-lucide="star"></i>
        <i data-lucide="star"></i>
      </div>
    `;
  }

  // Multi-option selections
  if (['multiple-choice', 'checkbox', 'dropdown'].includes(q.type)) {
    const list = q.options || [];
    const icon = q.type === 'checkbox' ? 'square' : 'circle';
    return `
      <div class="options-builder">
        ${list.map((opt, idx) => `
          <div class="option-row">
            <i data-lucide="${icon}" style="width: 16px; height: 16px; color: var(--text-tertiary);"></i>
            <input type="text" class="form-control option-val-input" value="${Utils.escapeHTML(opt)}" data-idx="${idx}" style="background: transparent; border: none; border-bottom: 1px solid var(--border-light); border-radius: 0; outline: none;" placeholder="Option label">
            <button class="btn-icon delete-opt-btn" onclick="removeOption(event, '${q.id}', ${idx})" style="border: none; background: transparent; padding: 0; width: 24px; height: 24px;">
              <i data-lucide="x" style="width: 14px; height: 14px; color: var(--danger);"></i>
            </button>
          </div>
        `).join('')}
        <button class="btn btn-secondary" onclick="addOption(event, '${q.id}')" style="align-self: flex-start; padding: 4px 10px; font-size: 11px; margin-top: 6px;">
          <i data-lucide="plus" style="width: 12px; height: 12px;"></i> Add Option
        </button>
      </div>
    `;
  }

  if (q.type === 'linear-scale') {
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-tertiary); padding: 12px; border-radius: var(--radius-md); font-size: 13px; margin-top: 8px;">
        <span>${Utils.escapeHTML(q.minLabel || 'Min')} (${q.min})</span>
        <div style="display: flex; gap: 8px;">
          ${Array.from({ length: (q.max - q.min + 1) }).map((_, idx) => `<span style="padding: 4px 8px; background: var(--bg-secondary); border-radius: var(--radius-sm); border: 1px solid var(--border-light);">${q.min + idx}</span>`).join('')}
        </div>
        <span>${Utils.escapeHTML(q.maxLabel || 'Max')} (${q.max})</span>
      </div>
    `;
  }

  if (q.type === 'image-choice') {
    return `
      <div class="image-choice-builder">
        ${(q.options || []).map((opt, idx) => {
          const safeURL = Utils.sanitizeURL(opt.imageURL);
          const escapedURLForStyle = safeURL.replace(/'/g, "%27");
          return `
            <div class="image-choice-card">
              <div class="image-choice-preview" style="background-image: url('${escapedURLForStyle}');"></div>
              <input type="text" class="form-control img-opt-label" value="${Utils.escapeHTML(opt.label)}" data-idx="${idx}" placeholder="Choice Label" style="border: none; background: transparent; border-bottom: 1px solid var(--border-light); padding: 4px 0; border-radius: 0; outline: none; font-size: 12px;">
              <input type="text" class="form-control img-opt-url" value="${Utils.escapeHTML(safeURL)}" data-idx="${idx}" placeholder="Image URL" style="border: none; background: transparent; border-bottom: 1px solid var(--border-light); padding: 4px 0; border-radius: 0; outline: none; font-size: 11px; color: var(--text-secondary);">
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  if (q.type === 'section-divider') {
    return `
      <div class="section-divider-builder">
        <span>Section Break</span>
      </div>
    `;
  }

  return '';
}

// Render card controller actions: Duplicate, Delete, Visibility bindings
function renderActiveControls(q, idx) {
  return `
    <div style="border-top: 1px solid var(--border-light); padding-top: 14px; margin-top: 16px; display: flex; flex-direction: column; gap: 12px;">
      
      <!-- Option details inputs -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
        <div class="form-group" style="margin: 0;">
          <label class="form-label" style="font-size: 12px;">Helper/Help Text</label>
          <input type="text" class="form-control help-input-${q.id}" value="${Utils.escapeHTML(q.helpText || '')}" placeholder="Explain option instructions..." style="font-size: 12px; padding: 6px 10px;">
        </div>
        <div class="form-group" style="margin: 0;">
          <label class="form-label" style="font-size: 12px;">Placeholder</label>
          <input type="text" class="form-control ph-input-${q.id}" value="${Utils.escapeHTML(q.placeholder || '')}" placeholder="Default watermark placeholder..." style="font-size: 12px; padding: 6px 10px;">
        </div>
      </div>

      <!-- Linear Scale Property Settings -->
      ${q.type === 'linear-scale' ? `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; background: var(--bg-tertiary); padding: 10px; border-radius: var(--radius-md);">
          <div class="form-group" style="margin: 0;">
            <label class="form-label" style="font-size: 11px;">Min Label</label>
            <input type="text" class="form-control scale-minlabel-${q.id}" value="${Utils.escapeHTML(q.minLabel || '')}" placeholder="e.g. Disagree" style="font-size: 11px; padding: 4px 8px;">
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label" style="font-size: 11px;">Max Label</label>
            <input type="text" class="form-control scale-maxlabel-${q.id}" value="${Utils.escapeHTML(q.maxLabel || '')}" placeholder="e.g. Agree" style="font-size: 11px; padding: 4px 8px;">
          </div>
        </div>
      ` : ''}

      <!-- Bottom Toolbar: required toggle, duplicate, delete -->
      <div style="display: flex; align-items: center; justify-content: space-between;">
        
        <!-- Conditional Visibility Logic toggle -->
        <button class="btn btn-secondary" onclick="openConditionModal(event, '${q.id}')" style="padding: 6px 12px; font-size: 12px;">
          <i data-lucide="git-branch" style="width: 14px; height: 14px;"></i>
          Logic Rules
        </button>

        <div style="display: flex; align-items: center; gap: 12px;">
          <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; cursor: pointer;">
            Required
            <input type="checkbox" class="req-chk-${q.id}" ${q.required ? 'checked' : ''} style="cursor: pointer;">
          </label>
          <div style="height: 16px; width: 1px; background: var(--border-light);"></div>
          
          <button class="btn-icon" onclick="duplicateQuestion(event, ${idx})" title="Duplicate Question" style="width: 28px; height: 28px;">
            <i data-lucide="copy" style="width: 14px; height: 14px;"></i>
          </button>
          <button class="btn-icon" onclick="deleteQuestion(event, ${idx})" title="Delete Question" style="width: 28px; height: 28px; color: var(--danger); border-color: rgba(239, 68, 68, 0.2);">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

// Add option row to MCQ/Checkbox/Dropdown
function addOption(event, qId) {
  event.stopPropagation();
  const q = currentForm.questions.find(item => item.id === qId);
  if (q) {
    q.options = q.options || [];
    q.options.push(`Option ${q.options.length + 1}`);
    renderQuestions();
    triggerAutoSave();
  }
}

function removeOption(event, qId, optIdx) {
  event.stopPropagation();
  const q = currentForm.questions.find(item => item.id === qId);
  if (q && q.options.length > 1) {
    q.options.splice(optIdx, 1);
    renderQuestions();
    triggerAutoSave();
  } else {
    Utils.showToast("Question must have at least one choice option.", "warning");
  }
}

// Event bindings inside MCQ selections values inputs
document.addEventListener('input', (e) => {
  if (e.target.classList.contains('option-val-input')) {
    const qId = e.target.closest('.canvas-card').getAttribute('data-id');
    const optIdx = parseInt(e.target.getAttribute('data-idx'));
    const q = currentForm.questions.find(item => item.id === qId);
    if (q) {
      q.options[optIdx] = e.target.value;
      triggerAutoSave();
    }
  }

  // Image Choices label updates
  if (e.target.classList.contains('img-opt-label')) {
    const qId = e.target.closest('.canvas-card').getAttribute('data-id');
    const optIdx = parseInt(e.target.getAttribute('data-idx'));
    const q = currentForm.questions.find(item => item.id === qId);
    if (q) {
      q.options[optIdx].label = e.target.value;
      triggerAutoSave();
    }
  }
  if (e.target.classList.contains('img-opt-url')) {
    const qId = e.target.closest('.canvas-card').getAttribute('data-id');
    const optIdx = parseInt(e.target.getAttribute('data-idx'));
    const q = currentForm.questions.find(item => item.id === qId);
    if (q) {
      q.options[optIdx].imageURL = e.target.value;
      triggerAutoSave();
    }
  }

  // Linear Scale labels updates
  if (e.target.className.includes('scale-minlabel-')) {
    const qId = e.target.closest('.canvas-card').getAttribute('data-id');
    const q = currentForm.questions.find(item => item.id === qId);
    if (q) { q.minLabel = e.target.value; triggerAutoSave(); }
  }
  if (e.target.className.includes('scale-maxlabel-')) {
    const qId = e.target.closest('.canvas-card').getAttribute('data-id');
    const q = currentForm.questions.find(item => item.id === qId);
    if (q) { q.maxLabel = e.target.value; triggerAutoSave(); }
  }
});

// Toolbar card utilities
function duplicateQuestion(event, idx) {
  event.stopPropagation();
  const src = currentForm.questions[idx];
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = Utils.uuid();
  copy.title = `${src.title} (Copy)`;
  
  currentForm.questions.splice(idx + 1, 0, copy);
  activeCardId = copy.id;
  renderQuestions();
  triggerAutoSave();
  Utils.showToast("Question duplicated", "success");
}

function deleteQuestion(event, idx) {
  event.stopPropagation();
  currentForm.questions.splice(idx, 1);
  activeCardId = null;
  renderQuestions();
  triggerAutoSave();
  Utils.showToast("Question deleted", "info");
}

// Auto Save mechanism
function triggerAutoSave() {
  document.getElementById('save-status-badge').textContent = 'Saving...';
  document.getElementById('save-status-badge').className = 'badge badge-warning';

  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    try {
      await window.db.saveForm(currentForm);
      document.getElementById('save-status-badge').textContent = 'Saved';
      document.getElementById('save-status-badge').className = 'badge badge-primary';
    } catch(err) {
      document.getElementById('save-status-badge').textContent = 'Failed to Save';
      document.getElementById('save-status-badge').className = 'badge badge-danger';
    }
  }, 1000);
}

// Preview frames resizing
function openPreviewInDevice(device) {
  document.querySelectorAll('.btn-group .btn-icon').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`btn-device-${device}`).classList.add('active');
  
  // Set iframe state size inside preview modal or open new preview frame
  openLivePreviewTab(device);
}

function openLivePreviewTab(device = 'desktop') {
  // Pass configuration object to preview page via localStorage
  localStorage.setItem('es_preview_schema', JSON.stringify(currentForm));
  window.open(`preview.html?device=${device}`, '_blank');
}

// Logic Rule Modal
function openConditionModal(event, qId) {
  event.stopPropagation();
  
  // Check preceding questions which can act as triggers
  const currIdx = currentForm.questions.findIndex(item => item.id === qId);
  const precedingQuestions = currentForm.questions.slice(0, currIdx).filter(q => ['multiple-choice', 'checkbox', 'dropdown', 'yes-no'].includes(q.type));
  
  if (precedingQuestions.length === 0) {
    Utils.showToast("No trigger questions (MCQ/Yes-No) found prior to this question.", "warning");
    return;
  }

  const activeQ = currentForm.questions[currIdx];
  const rule = activeQ.visibilityRule || { triggerId: '', value: '' };

  const selectTriggerHtml = `
    <select id="rule-trigger-select" class="form-control" style="margin-bottom: 12px;">
      <option value="">-- No Rule (Always Show) --</option>
      ${precedingQuestions.map(q => `<option value="${q.id}" ${rule.triggerId === q.id ? 'selected' : ''}>${Utils.escapeHTML(q.title)}</option>`).join('')}
    </select>
  `;

  // Create temporary modal alert
  const modalEl = document.createElement('div');
  modalEl.className = 'modal-overlay active';
  modalEl.id = 'rule-condition-modal';
  modalEl.innerHTML = `
    <div class="modal-content glass-panel" style="max-width: 400px;">
      <div class="modal-header">
        <h3>Visibility Condition Rule</h3>
      </div>
      <div class="form-group">
        <label class="form-label">Show this question ONLY if:</label>
        ${selectTriggerHtml}
      </div>
      <div class="form-group" id="rule-val-container">
        <label class="form-label">Equals value:</label>
        <input type="text" id="rule-trigger-val" class="form-control" value="${Utils.escapeHTML(rule.value)}" placeholder="Value label e.g. Yes">
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
        <button class="btn btn-secondary close-rule-btn">Cancel</button>
        <button class="btn btn-primary save-rule-btn">Save Rule</button>
      </div>
    </div>
  `;
  document.body.appendChild(modalEl);

  modalEl.querySelector('.close-rule-btn').addEventListener('click', () => modalEl.remove());
  modalEl.querySelector('.save-rule-btn').addEventListener('click', () => {
    const triggerId = document.getElementById('rule-trigger-select').value;
    const value = document.getElementById('rule-trigger-val').value.trim();

    if (triggerId && value) {
      activeQ.visibilityRule = { triggerId, value };
    } else {
      delete activeQ.visibilityRule;
    }
    
    modalEl.remove();
    Utils.showToast("Conditional logic rule saved", "success");
    triggerAutoSave();
  });
}

// AI Generator trigger modal
function openAIPromptModal() {
  Utils.openModal('ai-generator-modal');
}

// Mock AI generator logic
function runMockAIGenerator(prompt) {
  Utils.showToast("Analyzing description with AI models...", "info");
  
  setTimeout(() => {
    let generatedQuestions = [];
    const p = prompt.toLowerCase();
    
    // Set appropriate details based on prompts
    if (p.includes('hackathon') || p.includes('developer') || p.includes('coding')) {
      currentForm.title = "Hackathon Developer Registration";
      currentForm.description = "Complete this questionnaire to secure your spot for the developer hackathon challenge.";
      generatedQuestions = [
        { id: Utils.uuid(), type: 'short-answer', title: 'Full Name', required: true },
        { id: Utils.uuid(), type: 'email', title: 'Business Email', required: true },
        { id: Utils.uuid(), type: 'url', title: 'GitHub Portfolio URL', required: false },
        { id: Utils.uuid(), type: 'multiple-choice', title: 'Programming Experience', required: true, options: ['Under 1 year', '1-3 years', '3+ years'] },
        { id: Utils.uuid(), type: 'checkbox', title: 'Technological stack skillsets', required: false, options: ['Frontend (HTML/CSS/JS)', 'Backend (Node/Go/Python)', 'Mobile apps (React Native/Flutter)', 'DevOps & AWS Cloud'] },
        { id: Utils.uuid(), type: 'yes-no', title: 'Are you registering as a team lead?', required: true }
      ];
    } else if (p.includes('customer') || p.includes('feedback') || p.includes('satisfaction')) {
      currentForm.title = "Client Satisfaction Feedback Survey";
      currentForm.description = "We value your input. Share your thoughts on our services and support experience.";
      generatedQuestions = [
        { id: Utils.uuid(), type: 'rating', title: 'How would you rate our customer support?', required: true },
        { id: Utils.uuid(), type: 'multiple-choice', title: 'How long have you been using our platform?', required: true, options: ['Less than a month', '1 to 6 months', 'Over a year'] },
        { id: Utils.uuid(), type: 'linear-scale', title: 'How likely are you to recommend our products to colleagues?', required: true, min: 0, max: 10, minLabel: 'Extremely Unlikely', maxLabel: 'Extremely Likely' },
        { id: Utils.uuid(), type: 'paragraph', title: 'What is one feature we should build next?', required: false }
      ];
    } else {
      // General Template
      currentForm.title = "AI Custom Questionnaires Draft";
      currentForm.description = "AI generated template sheet. Customize properties inside builder panels.";
      generatedQuestions = [
        { id: Utils.uuid(), type: 'short-answer', title: 'Your Full Name', required: true },
        { id: Utils.uuid(), type: 'email', title: 'Email Address', required: true },
        { id: Utils.uuid(), type: 'multiple-choice', title: 'Which category describes you best?', required: false, options: ['Student', 'Freelancer', 'Full-time Employee', 'Enterprise Client'] },
        { id: Utils.uuid(), type: 'paragraph', title: 'Please provide feedback description details', required: false }
      ];
    }

    currentForm.questions = generatedQuestions;
    
    // Sync updates to header inputs
    document.getElementById('builder-form-title-header').value = currentForm.title;
    document.getElementById('builder-form-title').value = currentForm.title;
    document.getElementById('builder-form-desc').value = currentForm.description;
    
    renderQuestions();
    triggerAutoSave();
    
    Utils.closeModal('ai-generator-modal');
    Utils.showToast("Questions successfully generated by AI model!", "success");
  }, 1800);
}

// Mobile Tab Selector Switcher
function switchMobileTab(tabName) {
  const workspace = document.querySelector('.builder-workspace');
  if (!workspace) return;
  
  // Remove tab indicator classes
  workspace.classList.remove('show-toolbox', 'show-canvas', 'show-settings');
  
  // Add target tab indicator class
  if (tabName === 'toolbox') {
    workspace.classList.add('show-toolbox');
  } else if (tabName === 'canvas') {
    workspace.classList.add('show-canvas');
  } else if (tabName === 'settings') {
    workspace.classList.add('show-settings');
  }
  
  // Update active state on navigation buttons
  document.querySelectorAll('.mobile-tab-item').forEach(btn => {
    btn.classList.remove('active');
    const label = btn.querySelector('span').textContent.toLowerCase();
    if (label === tabName) {
      btn.classList.add('active');
    }
  });
}

