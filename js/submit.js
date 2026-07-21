/* submit.js */

let formSchema = null;
let formId = null;
let isPreviewMode = false;
let currentStepIndex = 0;
let sectionsList = []; // Array of arrays of questions
let userAnswers = {};

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  formId = urlParams.get('id');
  isPreviewMode = urlParams.get('preview') === 'true';

  // 1. Load schema
  if (isPreviewMode) {
    const raw = localStorage.getItem('es_preview_schema');
    if (raw) formSchema = JSON.parse(raw);
    Utils.showToast("You are viewing this form in Live Preview Mode", "info");
  } else if (formId) {
    try {
      formSchema = await window.db.getForm(formId);
      if (formSchema && formSchema.status !== 'archived') {
        // Increment view count in production
        await window.db.incrementFormViews(formId);
      }
    } catch(err) {
      console.error(err);
    }
  }

  if (!formSchema) {
    document.getElementById('closed-status-card').style.display = 'block';
    document.getElementById('closed-status-reason').textContent = "This form could not be found. The form ID might be invalid or stored in a different database.";
    return;
  }

  // 2. Validate states
  if (!isPreviewMode) {
    if (formSchema.status === 'archived') {
      document.getElementById('closed-status-card').style.display = 'block';
      document.getElementById('closed-status-reason').textContent = "This form has been archived or closed by the owner.";
      return;
    }

    // Check response limit
    if (formSchema.responseLimit) {
      try {
        const responses = await window.db.getResponses(formId);
        if (responses && responses.length >= formSchema.responseLimit) {
          document.getElementById('closed-status-card').style.display = 'block';
          document.getElementById('closed-status-reason').textContent = "This form has exceeded its response limit and is no longer accepting submissions.";
          return;
        }
      } catch (err) {
        console.error("Failed to verify response limit:", err);
      }
    }
  }

  // 3. Password Gating check
  if (formSchema.passwordProtected && !isPreviewMode) {
    document.getElementById('password-gate-card').style.display = 'block';
    document.getElementById('password-gate-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const enteredPwd = document.getElementById('gate-password-input').value;
      if (enteredPwd === formSchema.formPassword) {
        document.getElementById('password-gate-card').style.display = 'none';
        initPublicForm();
      } else {
        Utils.showToast("Invalid password! Access denied.", "error");
      }
    });
  } else {
    initPublicForm();
  }
});

// Setup styles and load pages
function initPublicForm() {
  // Apply theme settings
  if (formSchema.theme) {
    const safeColor = Utils.sanitizeColor(formSchema.theme.color);
    document.documentElement.style.setProperty('--accent-color', safeColor);
    document.documentElement.style.setProperty('--font-sans', formSchema.theme.font || 'var(--font-sans)');
    
    // Extract RGB values dynamically to set --accent-color-rgb CSS custom property
    try {
      const tempDiv = document.createElement('div');
      tempDiv.style.color = safeColor;
      document.body.appendChild(tempDiv);
      const computedColor = window.getComputedStyle(tempDiv).color;
      document.body.removeChild(tempDiv);
      const rgbMatches = computedColor.match(/\d+/g);
      if (rgbMatches && rgbMatches.length >= 3) {
        document.documentElement.style.setProperty('--accent-color-rgb', `${rgbMatches[0]}, ${rgbMatches[1]}, ${rgbMatches[2]}`);
      }
    } catch (e) {
      console.warn("Failed to dynamically compute accent color RGB: ", e);
    }
    
    // Header cards color
    const head = document.getElementById('metadata-header-card');
    if (head) head.style.borderTopColor = safeColor;
    
    // Logo, Banner & Company Name dynamic overlap alignment styling
    const brandArea = document.getElementById('brand-header-area');
    const logoEl = document.getElementById('public-form-logo');
    const companyNameEl = document.getElementById('public-company-name');
    const bannerEl = document.getElementById('public-form-banner');
    
    const hasLogo = !!(formSchema.theme.logo && logoEl);
    const hasCompany = !!(formSchema.theme.companyName && companyNameEl);
    const hasBanner = !!(formSchema.theme.banner && bannerEl);

    // 1. Render Banner
    if (hasBanner) {
      const safeBanner = Utils.sanitizeURL(formSchema.theme.banner);
      bannerEl.style.backgroundImage = `url('${safeBanner.replace(/'/g, "%27")}')`;
      bannerEl.style.display = 'block';
    } else if (bannerEl) {
      bannerEl.style.display = 'none';
    }

    // 2. Render Brand Area
    if (brandArea) {
      if (hasLogo || hasCompany) {
        brandArea.style.display = 'flex';
        
        // Setup logo
        if (hasLogo) {
          logoEl.src = Utils.sanitizeURL(formSchema.theme.logo);
          logoEl.style.display = 'block';
        } else {
          logoEl.style.display = 'none';
        }
        
        // Setup company name
        if (hasCompany) {
          companyNameEl.textContent = formSchema.theme.companyName;
          companyNameEl.style.display = 'inline-block';
        } else {
          companyNameEl.style.display = 'none';
        }
        
        // Setup overlap margins
        if (hasBanner) {
          brandArea.classList.add('overlap-banner');
        } else {
          brandArea.classList.remove('overlap-banner');
        }
      } else {
        brandArea.style.display = 'none';
      }
    }
  }

  // Titles
  document.getElementById('public-form-title').textContent = formSchema.title || 'Untitled Form';
  document.getElementById('public-form-desc').textContent = formSchema.description || '';

  if (formSchema.collectEmails) {
    document.getElementById('collect-email-warning').style.display = 'block';
  }

  // Load saved drafts answers if not in preview
  if (!isPreviewMode) {
    const cached = localStorage.getItem(`es_draft_answers_${formId}`);
    if (cached) {
      userAnswers = JSON.parse(cached);
      Utils.showToast("Restored your unsubmitted answers draft", "info");
    }
  }

  // Parse questions into section pages
  parseSectionsAndPages();

  // Show main form
  document.getElementById('public-main-form').style.display = 'flex';

  // Render first page
  renderCurrentSectionPage();

  // Next Page logic
  document.getElementById('section-next-btn').addEventListener('click', () => {
    if (validateCurrentPageInputs()) {
      currentStepIndex++;
      renderCurrentSectionPage();
    }
  });

  // Back Page logic
  document.getElementById('section-back-btn').addEventListener('click', () => {
    currentStepIndex--;
    renderCurrentSectionPage();
  });

  // Save draft click
  document.getElementById('save-draft-btn').addEventListener('click', () => {
    if (isPreviewMode) {
      Utils.showToast("Draft saving is disabled in preview mode", "warning");
      return;
    }
    localStorage.setItem(`es_draft_answers_${formId}`, JSON.stringify(userAnswers));
    Utils.showToast("Draft saved successfully!", "success");
  });

  // Form submission submit
  document.getElementById('public-main-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateCurrentPageInputs()) return;

    const submitBtn = document.getElementById('form-submit-btn');
    const originalBtnHTML = submitBtn.innerHTML;

    // Prevent duplicate submissions
    submitBtn.disabled = true;
    submitBtn.innerHTML = `Submitting... <i class="loader-spinner"></i>`;

    if (isPreviewMode) {
      Utils.showToast("Submissions are simulated in Preview mode.", "success");
      showThankYouCard();
      // restore button just in case, though thank you page hides it
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHTML;
      return;
    }

    // Compile payload
    const payload = {
      formId: formId,
      email: formSchema.collectEmails ? (userAnswers['user_email'] || 'anonymous@gmail.com') : 'anonymous@domain.com',
      answers: { ...userAnswers },
      submittedAt: new Date().toISOString()
    };

    // Remove user email row from raw question answers if exists
    delete payload.answers['user_email'];

    try {
      await window.db.saveResponse(payload);
      // Clean cache
      localStorage.removeItem(`es_draft_answers_${formId}`);
      showThankYouCard();
    } catch (error) {
      console.error("Form submission failed:", error);
      Utils.showToast(`Submission failed: ${error.message || error}`, "error");
      // Re-enable button and restore label on failure
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHTML;
    }
  });
}

// Slice questions list by section-divider question blocks
function parseSectionsAndPages() {
  sectionsList = [];
  let currentGroup = [];

  // Check if form collects emails, if so, inject email field dynamically as the first block of page 1
  if (formSchema.collectEmails) {
    currentGroup.push({
      id: 'user_email',
      type: 'email',
      title: 'Email Address',
      required: true,
      placeholder: 'Enter email to receive copy'
    });
  }

  formSchema.questions.forEach(q => {
    if (q.type === 'section-divider') {
      if (currentGroup.length > 0) {
        sectionsList.push(currentGroup);
      }
      currentGroup = [];
    } else {
      currentGroup.push(q);
    }
  });

  if (currentGroup.length > 0) {
    sectionsList.push(currentGroup);
  }

  // Fallback if empty form
  if (sectionsList.length === 0) {
    sectionsList.push([]);
  }
}

// Render dynamic fields on selected index
function renderCurrentSectionPage() {
  const container = document.getElementById('questions-submit-canvas');
  container.innerHTML = '';

  const activeQuestions = sectionsList[currentStepIndex] || [];

  activeQuestions.forEach(q => {
    const card = document.createElement('div');
    card.className = 'glass-card form-question-card';
    card.setAttribute('data-qid', q.id);
    
    // Check conditional visibility initially
    const isVisible = checkQuestionVisibility(q);
    card.style.display = isVisible ? 'block' : 'none';

    card.innerHTML = `
      <div style="margin-bottom: 12px;">
        <span style="font-weight: 600; font-size: 15px;">
          ${Utils.escapeHTML(q.title)} 
          ${q.required ? '<span style="color: var(--danger);">*</span>' : ''}
        </span>
        ${q.helpText ? `<p style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${Utils.escapeHTML(q.helpText)}</p>` : ''}
      </div>
      <div class="question-input-wrapper">
        ${renderSubmissionInputControl(q)}
      </div>
      <span class="error-label" style="color: var(--danger); font-size: 12px; margin-top: 6px; display: none;"></span>
    `;

    container.appendChild(card);
    // Re-bind input triggers to update local answers object
    bindControlChangeEvents(card, q);
  });

  // Update navigations buttons
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === sectionsList.length - 1;

  document.getElementById('section-back-btn').style.visibility = isFirst ? 'hidden' : 'visible';
  document.getElementById('section-next-btn').style.display = isLast ? 'none' : 'inline-flex';
  document.getElementById('form-submit-btn').style.display = isLast ? 'inline-flex' : 'none';

  // Update progress bar
  if (sectionsList.length > 1) {
    document.getElementById('form-progress-indicator-box').style.display = 'block';
    const rate = Math.round(((currentStepIndex + 1) / sectionsList.length) * 100);
    document.getElementById('progress-bar-fill').style.width = `${rate}%`;
    document.getElementById('progress-percentage-label').textContent = `Step ${currentStepIndex + 1} of ${sectionsList.length}`;
  } else {
    document.getElementById('form-progress-indicator-box').style.display = 'none';
  }

  if (window.lucide) window.lucide.createIcons();
}

// Generate the input fields elements depending on the types
function renderSubmissionInputControl(q) {
  const currentVal = userAnswers[q.id] || '';

  if (q.type === 'short-answer') {
    return `<input type="text" class="form-control" name="q-${q.id}" value="${Utils.escapeHTML(currentVal)}" placeholder="${Utils.escapeHTML(q.placeholder || 'Your answer')}" ${q.required ? 'required' : ''}>`;
  }
  if (q.type === 'paragraph') {
    return `<textarea class="form-control" name="q-${q.id}" rows="3" placeholder="${Utils.escapeHTML(q.placeholder || 'Your answer')}" ${q.required ? 'required' : ''}>${Utils.escapeHTML(currentVal)}</textarea>`;
  }
  if (q.type === 'number') {
    return `<input type="number" class="form-control" name="q-${q.id}" value="${Utils.escapeHTML(currentVal)}" placeholder="0" ${q.required ? 'required' : ''}>`;
  }
  if (q.type === 'email') {
    return `<input type="email" class="form-control" name="q-${q.id}" value="${Utils.escapeHTML(currentVal)}" placeholder="name@domain.com" ${q.required ? 'required' : ''}>`;
  }
  if (q.type === 'phone') {
    return `<input type="tel" class="form-control" name="q-${q.id}" value="${Utils.escapeHTML(currentVal)}" placeholder="+1 (555) 000-0000" ${q.required ? 'required' : ''}>`;
  }
  if (q.type === 'url') {
    return `<input type="url" class="form-control" name="q-${q.id}" value="${Utils.escapeHTML(currentVal)}" placeholder="https://..." ${q.required ? 'required' : ''}>`;
  }
  if (q.type === 'date') {
    return `<input type="date" class="form-control" name="q-${q.id}" value="${Utils.escapeHTML(currentVal)}" ${q.required ? 'required' : ''}>`;
  }
  if (q.type === 'time') {
    return `<input type="time" class="form-control" name="q-${q.id}" value="${Utils.escapeHTML(currentVal)}" ${q.required ? 'required' : ''}>`;
  }
  
  if (q.type === 'yes-no') {
    return `
      <div class="choice-card-wrapper" style="display: flex; gap: 16px; margin-top: 8px;">
        <label class="choice-card ${currentVal === 'Yes' ? 'selected' : ''}" style="flex: 1; justify-content: center;">
          <input type="radio" name="q-${q.id}" value="Yes" ${currentVal === 'Yes' ? 'checked' : ''}>
          <span>Yes</span>
        </label>
        <label class="choice-card ${currentVal === 'No' ? 'selected' : ''}" style="flex: 1; justify-content: center;">
          <input type="radio" name="q-${q.id}" value="No" ${currentVal === 'No' ? 'checked' : ''}>
          <span>No</span>
        </label>
      </div>
    `;
  }

  if (q.type === 'multiple-choice') {
    return `
      <div class="choice-card-wrapper" style="display: flex; flex-direction: column; gap: 10px; margin-top: 8px;">
        ${(q.options || []).map(opt => `
          <label class="choice-card ${currentVal === opt ? 'selected' : ''}">
            <input type="radio" name="q-${q.id}" value="${Utils.escapeHTML(opt)}" ${currentVal === opt ? 'checked' : ''}>
            <span>${Utils.escapeHTML(opt)}</span>
          </label>
        `).join('')}
      </div>
    `;
  }

  if (q.type === 'checkbox') {
    const list = Array.isArray(currentVal) ? currentVal : [];
    return `
      <div class="choice-card-wrapper" style="display: flex; flex-direction: column; gap: 10px; margin-top: 8px;">
        ${(q.options || []).map(opt => `
          <label class="choice-card ${list.includes(opt) ? 'selected' : ''}">
            <input type="checkbox" name="q-${q.id}" value="${Utils.escapeHTML(opt)}" ${list.includes(opt) ? 'checked' : ''}>
            <span>${Utils.escapeHTML(opt)}</span>
          </label>
        `).join('')}
      </div>
    `;
  }

  if (q.type === 'dropdown') {
    return `
      <select class="form-control" name="q-${q.id}">
        <option value="">-- Choose Option --</option>
        ${(q.options || []).map(opt => `<option value="${Utils.escapeHTML(opt)}" ${currentVal === opt ? 'selected' : ''}>${Utils.escapeHTML(opt)}</option>`).join('')}
      </select>
    `;
  }

  if (q.type === 'file') {
    return `
      <input type="file" class="form-control file-input-control" name="q-${q.id}">
      ${currentVal ? `<p style="font-size: 11px; color: var(--success); margin-top: 6px;">Loaded: ${Utils.escapeHTML(currentVal.name || 'document uploaded')}</p>` : ''}
    `;
  }

  if (q.type === 'rating') {
    const ratingVal = parseInt(currentVal) || 0;
    return `
      <div class="submit-rating-stars" data-qid="${q.id}">
        ${Array.from({ length: q.maxStars || 5 }).map((_, idx) => `
          <i data-lucide="star" class="${idx < ratingVal ? 'active' : ''}" data-score="${idx + 1}"></i>
        `).join('')}
      </div>
    `;
  }

  if (q.type === 'linear-scale') {
    const rangeVal = parseInt(currentVal);
    const minVal = q.min || 1;
    const maxVal = q.max || 5;
    
    return `
      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-secondary);">
          <span>${Utils.escapeHTML(q.minLabel || 'Min')}</span>
          <span>${Utils.escapeHTML(q.maxLabel || 'Max')}</span>
        </div>
        <div class="linear-scale-group" style="display: flex; gap: 12px; justify-content: space-between;">
          ${Array.from({ length: (maxVal - minVal + 1) }).map((_, idx) => {
            const score = minVal + idx;
            return `
              <label class="choice-card ${rangeVal === score ? 'selected' : ''}" style="display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; flex-grow: 1; text-align: center; padding: 10px; border: 1px solid var(--border-light); border-radius: var(--radius-md); background: var(--glass-bg);">
                <input type="radio" name="q-${q.id}" value="${score}" ${rangeVal === score ? 'checked' : ''}>
                <span style="font-size: 13px; font-weight: 600;">${score}</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  if (q.type === 'image-choice') {
    return `
      <div class="image-choice-grid">
        ${(q.options || []).map((opt, idx) => {
          const safeURL = Utils.sanitizeURL(opt.imageURL);
          const escapedURLForStyle = safeURL.replace(/'/g, "%27");
          return `
            <div class="image-choice-option ${currentVal === opt.label ? 'selected' : ''}" data-label="${Utils.escapeHTML(opt.label)}">
              <div class="img-option-frame" style="background-image: url('${escapedURLForStyle}');"></div>
              <div class="img-option-label">${Utils.escapeHTML(opt.label)}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  return '';
}

// Capture and update answers dynamically
function bindControlChangeEvents(cardEl, q) {
  // Star rating handler
  const starsContainer = cardEl.querySelector('.submit-rating-stars');
  if (starsContainer) {
    const stars = starsContainer.querySelectorAll('[data-score]');
    
    const updateStarsDisplay = (score) => {
      stars.forEach((s, idx) => {
        if (idx < score) {
          s.classList.add('active');
          s.style.color = '#fbbf24';
          s.style.fill = '#fbbf24';
        } else {
          s.classList.remove('active');
          s.style.color = 'var(--text-tertiary)';
          s.style.fill = 'none';
        }
      });
    };

    starsContainer.addEventListener('click', (e) => {
      const star = e.target.closest('[data-score]');
      if (star) {
        const score = parseInt(star.getAttribute('data-score'));
        userAnswers[q.id] = score;
        updateStarsDisplay(score);
        checkConditionalVisibilityRulesCascade();
      }
    });

    stars.forEach(star => {
      star.addEventListener('mouseenter', () => {
        const score = parseInt(star.getAttribute('data-score'));
        updateStarsDisplay(score);
      });
    });

    starsContainer.addEventListener('mouseleave', () => {
      const currentScore = parseInt(userAnswers[q.id]) || 0;
      updateStarsDisplay(currentScore);
    });
  }

  // Image choices click
  cardEl.querySelectorAll('.image-choice-option').forEach(item => {
    item.addEventListener('click', () => {
      const label = item.getAttribute('data-label');
      userAnswers[q.id] = label;
      
      // Update selected class
      cardEl.querySelectorAll('.image-choice-option').forEach(el => el.classList.remove('selected'));
      item.classList.add('selected');
      
      checkConditionalVisibilityRulesCascade();
    });
  });

  // File picker upload converter base64
  const fileInput = cardEl.querySelector('.file-input-control');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
          userAnswers[q.id] = {
            name: file.name,
            size: file.size,
            type: file.type,
            content: evt.target.result // base64 string
          };
          Utils.showToast("File uploaded", "success");
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Regular input inputs binding
  cardEl.querySelectorAll('input[type="text"], input[type="number"], input[type="email"], input[type="tel"], input[type="url"], input[type="date"], input[type="time"], textarea, select').forEach(input => {
    input.addEventListener('input', (e) => {
      userAnswers[q.id] = e.target.value;
      checkConditionalVisibilityRulesCascade();
    });
    input.addEventListener('change', (e) => {
      userAnswers[q.id] = e.target.value;
      checkConditionalVisibilityRulesCascade();
    });
  });

  // Multiple checkboxes updates (stores arrays)
  cardEl.querySelectorAll('input[type="checkbox"]').forEach(box => {
    box.addEventListener('change', () => {
      // Toggle selected class on closest choice-card wrapper
      const choiceCard = box.closest('.choice-card');
      if (choiceCard) {
        if (box.checked) {
          choiceCard.classList.add('selected');
        } else {
          choiceCard.classList.remove('selected');
        }
      }

      userAnswers[q.id] = userAnswers[q.id] || [];
      const checkedVals = Array.from(cardEl.querySelectorAll('input[type="checkbox"]:checked')).map(el => el.value);
      userAnswers[q.id] = checkedVals;
      checkConditionalVisibilityRulesCascade();
    });
  });

  // MCQ / Yes-No / Linear Scale Radio choices
  cardEl.querySelectorAll('input[type="radio"]').forEach(rad => {
    rad.addEventListener('change', (e) => {
      if (e.target.checked) {
        // Remove selected class from all option siblings in same radio card group
        const wrapper = rad.closest('.choice-card-wrapper') || rad.closest('.linear-scale-group');
        if (wrapper) {
          wrapper.querySelectorAll('.choice-card').forEach(cc => cc.classList.remove('selected'));
        }
        
        // Add selected class to the active choice-card label
        const choiceCard = rad.closest('.choice-card');
        if (choiceCard) {
          choiceCard.classList.add('selected');
        }

        userAnswers[q.id] = e.target.value;
        checkConditionalVisibilityRulesCascade();
      }
    });
  });
}

// Logic Rules checker
function checkQuestionVisibility(q) {
  if (!q.visibilityRule || !q.visibilityRule.triggerId) return true;
  
  const triggerVal = userAnswers[q.visibilityRule.triggerId];
  const targetVal = q.visibilityRule.value;
  
  // Support check within array values for checkbox questions
  if (Array.isArray(triggerVal)) {
    return triggerVal.includes(targetVal);
  }
  
  return String(triggerVal || '').toLowerCase() === String(targetVal || '').toLowerCase();
}

// Recheck conditions for all items cascade (run on input changes)
function checkConditionalVisibilityRulesCascade() {
  const activeQuestions = sectionsList[currentStepIndex] || [];
  activeQuestions.forEach(q => {
    const card = document.querySelector(`[data-qid="${q.id}"]`);
    if (card) {
      const isVisible = checkQuestionVisibility(q);
      const isCurrentlyShown = card.style.display !== 'none';
      
      if (isVisible !== isCurrentlyShown) {
        card.style.display = isVisible ? 'block' : 'none';
        // If question is hidden, flush answers
        if (!isVisible) {
          delete userAnswers[q.id];
        }
      }
    }
  });
}

// Check standard validations
function validateCurrentPageInputs() {
  const activeQuestions = sectionsList[currentStepIndex] || [];
  let isValid = true;

  activeQuestions.forEach(q => {
    const card = document.querySelector(`[data-qid="${q.id}"]`);
    if (!card || card.style.display === 'none') return; // Skip hidden logic cards

    const errorEl = card.querySelector('.error-label');
    errorEl.style.display = 'none';

    const val = userAnswers[q.id];
    let err = null;

    // Check required constraints
    if (q.required && (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0))) {
      err = 'This field is required';
    }

    // Specific emails url regex matching
    if (!err && val) {
      if (q.type === 'email') {
        const error = Utils.validateInput(val, { email: true });
        if (error) err = error;
      }
      if (q.type === 'url') {
        const error = Utils.validateInput(val, { url: true });
        if (error) err = error;
      }
      if (q.type === 'phone') {
        const error = Utils.validateInput(val, { phone: true });
        if (error) err = error;
      }
    }

    if (err) {
      isValid = false;
      errorEl.textContent = err;
      errorEl.style.display = 'block';
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  return isValid;
}

function showThankYouCard() {
  document.getElementById('public-main-form').style.display = 'none';
  document.getElementById('public-form-banner').style.display = 'none';
  document.getElementById('public-form-logo').style.display = 'none';
  document.getElementById('submission-success-card').style.display = 'block';
  
  if (window.lucide) window.lucide.createIcons();
}
