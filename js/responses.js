/* responses.js */

let formSchema = null;
let formResponses = [];
let formId = null;
let currentTab = 'summary';
let individualIndex = 0;
let chartInstances = []; // Keep track of chart instances to destroy on re-render

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.auth.getCurrentUser();
  if (!user) return; // auth.js will redirect to login

  const urlParams = new URLSearchParams(window.location.search);
  formId = urlParams.get('id');

  if (!formId) {
    window.location.href = 'dashboard.html';
    return;
  }

  // Load Form Data
  try {
    formSchema = await window.db.getForm(formId);
    if (!formSchema) {
      Utils.showToast("Form not found", "error");
      setTimeout(() => window.location.href = 'dashboard.html', 1500);
      return;
    }

    document.getElementById('response-form-title').textContent = formSchema.title || 'Untitled Form';
    await fetchResponses();

    // Tab bindings
    document.getElementById('tab-summary-btn').addEventListener('click', () => switchTab('summary'));
    document.getElementById('tab-individual-btn').addEventListener('click', () => switchTab('individual'));

    // Nav individual logs
    document.getElementById('indiv-prev-btn').addEventListener('click', () => navigateIndividual(-1));
    document.getElementById('indiv-next-btn').addEventListener('click', () => navigateIndividual(1));

    // Delete individual response
    document.getElementById('delete-individual-btn').addEventListener('click', deleteActiveResponse);

    // Export binds
    document.getElementById('export-excel-btn').addEventListener('click', exportToExcel);
    document.getElementById('export-pdf-btn').addEventListener('click', exportToPDF);

  } catch (error) {
    console.error(error);
  }
});

// Fetch responses data from DB
async function fetchResponses() {
  formResponses = await window.db.getResponses(formId);
  
  // Sort responses chronologically (newest first)
  formResponses.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  // Render metrics
  const views = formSchema.views || 0;
  const count = formResponses.length;
  const completionRate = views > 0 ? Math.round((count / views) * 100) : 0;

  document.getElementById('total-responses-count').textContent = count;
  document.getElementById('form-views-count').textContent = views;
  document.getElementById('form-completion-rate').textContent = `${completionRate}%`;

  if (count === 0) {
    document.getElementById('summary-empty-state').style.display = 'block';
    document.getElementById('summary-charts-container').style.display = 'none';
  } else {
    document.getElementById('summary-empty-state').style.display = 'none';
    document.getElementById('summary-charts-container').style.display = 'flex';
    renderSummaryView();
    renderIndividualResponse();
  }
}

function switchTab(tabName) {
  currentTab = tabName;
  document.getElementById('tab-summary-btn').classList.toggle('active', tabName === 'summary');
  document.getElementById('tab-individual-btn').classList.toggle('active', tabName === 'individual');

  document.getElementById('panel-summary').style.display = tabName === 'summary' ? 'block' : 'none';
  document.getElementById('panel-individual').style.display = tabName === 'individual' ? 'block' : 'none';
}

function navigateIndividual(direction) {
  const newIndex = individualIndex + direction;
  if (newIndex >= 0 && newIndex < formResponses.length) {
    individualIndex = newIndex;
    renderIndividualResponse();
  }
}

// Summary view stats and charts rendering
function renderSummaryView() {
  const container = document.getElementById('summary-charts-container');
  container.innerHTML = '';
  
  // Clear old chart instances to prevent memory leak
  chartInstances.forEach(chart => chart.destroy());
  chartInstances = [];

  formSchema.questions.forEach(q => {
    if (q.type === 'section-divider') return; // Skip section titles

    const card = document.createElement('div');
    card.className = 'glass-card';
    card.innerHTML = `
      <h3 style="font-size: 15px; margin-bottom: 8px;">${Utils.escapeHTML(q.title)}</h3>
      <span style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase;">${q.type.replace('-', ' ')}</span>
      <div class="question-analytics-body" id="analytics-body-${q.id}" style="margin-top: 14px;">
        <!-- Chart or list table rendering -->
      </div>
    `;
    container.appendChild(card);

    renderQuestionAnalytics(q, `analytics-body-${q.id}`);
  });
}

function renderQuestionAnalytics(q, targetId) {
  const target = document.getElementById(targetId);
  const answersList = formResponses.map(r => r.answers[q.id]).filter(v => v !== undefined && v !== null && v !== '');

  if (answersList.length === 0) {
    target.innerHTML = `<p style="font-size: 13px; color: var(--text-secondary); italic;">No responses entered for this question.</p>`;
    return;
  }

  // 1. Categorical questions (render Chart.js)
  if (['multiple-choice', 'dropdown', 'yes-no', 'rating', 'linear-scale', 'image-choice'].includes(q.type)) {
    // Compile frequencies
    const freq = {};
    
    // Seed possible options for completeness
    if (q.options) {
      q.options.forEach(opt => {
        const label = typeof opt === 'object' ? opt.label : opt;
        freq[label] = 0;
      });
    } else if (q.type === 'yes-no') {
      freq['Yes'] = 0;
      freq['No'] = 0;
    } else if (q.type === 'rating') {
      for (let i = 1; i <= (q.maxStars || 5); i++) freq[String(i)] = 0;
    }

    answersList.forEach(ans => {
      const key = String(ans);
      freq[key] = (freq[key] || 0) + 1;
    });

    const labels = Object.keys(freq);
    const data = Object.values(freq);

    const canvas = document.createElement('canvas');
    canvas.style.maxHeight = '240px';
    target.appendChild(canvas);

    const isPie = ['multiple-choice', 'dropdown', 'yes-no', 'image-choice'].includes(q.type);
    
    // Chart options colors
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#6366f1';
    
    const chart = new Chart(canvas, {
      type: isPie ? 'pie' : 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Answers Frequencies',
          data: data,
          backgroundColor: isPie 
            ? ['rgba(99, 102, 241, 0.75)', 'rgba(16, 185, 129, 0.75)', 'rgba(245, 158, 11, 0.75)', 'rgba(236, 72, 153, 0.75)', 'rgba(168, 85, 247, 0.75)']
            : primaryColor,
          borderColor: isPie ? 'rgba(255, 255, 255, 0.2)' : primaryColor,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: isPie,
            position: 'bottom',
            labels: { color: 'var(--text-primary)' }
          }
        },
        scales: isPie ? {} : {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, color: 'var(--text-secondary)' },
            grid: { color: 'var(--border-light)' }
          },
          x: {
            ticks: { color: 'var(--text-secondary)' },
            grid: { display: false }
          }
        }
      }
    });

    chartInstances.push(chart);
  }
  
  // 2. Checkboxes question (answers are arrays)
  else if (q.type === 'checkbox') {
    const freq = {};
    if (q.options) {
      q.options.forEach(opt => freq[opt] = 0);
    }
    answersList.forEach(arr => {
      if (Array.isArray(arr)) {
        arr.forEach(val => freq[val] = (freq[val] || 0) + 1);
      }
    });

    const labels = Object.keys(freq);
    const data = Object.values(freq);

    const canvas = document.createElement('canvas');
    canvas.style.maxHeight = '240px';
    target.appendChild(canvas);

    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#6366f1';
    
    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Times Selected',
          data: data,
          backgroundColor: primaryColor,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y', // Horizontal bars
        plugins: { legend: { display: false } },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { stepSize: 1, color: 'var(--text-secondary)' },
            grid: { color: 'var(--border-light)' }
          },
          y: {
            ticks: { color: 'var(--text-secondary)' },
            grid: { display: false }
          }
        }
      }
    });

    chartInstances.push(chart);
  }

  // 3. Text & Free-flow answers (Short Answer, Paragraph, Email, URLs, Files)
  else {
    const listHtml = answersList.slice(0, 5).map(ans => {
      // If file upload details
      if (ans && typeof ans === 'object' && ans.name) {
        const safeURL = Utils.sanitizeURL(ans.content);
        return `
          <div style="padding: 10px; border-bottom: 1px solid var(--border-light); font-size: 13px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 500; color: var(--accent-color);">${Utils.escapeHTML(ans.name)}</span>
            <a href="${Utils.escapeHTML(safeURL)}" download="${Utils.escapeHTML(ans.name)}" class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px;">Download</a>
          </div>
        `;
      }
      return `
        <div style="padding: 10px; border-bottom: 1px solid var(--border-light); font-size: 13px; color: var(--text-primary);">
          ${Utils.escapeHTML(String(ans))}
        </div>
      `;
    }).join('');

    target.innerHTML = `
      <div style="border: 1px solid var(--border-light); border-radius: var(--radius-md); max-height: 250px; overflow-y: auto;">
        ${listHtml}
      </div>
      ${answersList.length > 5 ? `<p style="font-size: 11px; color: var(--text-secondary); margin-top: 6px; text-align: right;">+ ${answersList.length - 5} more answers</p>` : ''}
    `;
  }
}

// Individual logs viewer
function renderIndividualResponse() {
  if (formResponses.length === 0) return;

  const currentResp = formResponses[individualIndex];
  document.getElementById('individual-index-label').textContent = `Response ${individualIndex + 1} of ${formResponses.length}`;
  document.getElementById('indiv-email-label').textContent = currentResp.email || 'Anonymous';
  document.getElementById('indiv-time-label').textContent = Utils.formatDate(currentResp.submittedAt);

  const canvas = document.getElementById('individual-answers-canvas');
  canvas.innerHTML = '';

  formSchema.questions.forEach(q => {
    if (q.type === 'section-divider') return;

    const answerVal = currentResp.answers[q.id];
    let outputHtml = '';

    if (answerVal === undefined || answerVal === null || answerVal === '') {
      outputHtml = `<span style="color: var(--text-secondary); font-style: italic;">No response entered.</span>`;
    } else if (answerVal && typeof answerVal === 'object' && answerVal.name) {
      // File download button
      const safeURL = Utils.sanitizeURL(answerVal.content);
      outputHtml = `
        <div style="display: inline-flex; align-items: center; gap: 10px; padding: 6px 12px; border: 1px dashed var(--border-medium); border-radius: var(--radius-sm);">
          <i data-lucide="paperclip" style="width: 16px; height: 16px;"></i>
          <span style="font-size: 13px; font-weight: 500;">${Utils.escapeHTML(answerVal.name)}</span>
          <a href="${Utils.escapeHTML(safeURL)}" download="${Utils.escapeHTML(answerVal.name)}" class="btn btn-secondary" style="padding: 2px 8px; font-size: 11px;">Download</a>
        </div>
      `;
    } else if (Array.isArray(answerVal)) {
      outputHtml = answerVal.map(val => `<span class="badge badge-primary" style="margin-right: 6px; margin-bottom: 6px;">${Utils.escapeHTML(val)}</span>`).join('');
    } else {
      outputHtml = `<p style="font-size: 14px; line-height: 1.5; white-space: pre-wrap;">${Utils.escapeHTML(String(answerVal))}</p>`;
    }

    const row = document.createElement('div');
    row.style.paddingBottom = '16px';
    row.style.borderBottom = '1px solid var(--border-light)';
    row.innerHTML = `
      <div style="font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">${Utils.escapeHTML(q.title)}</div>
      <div>${outputHtml}</div>
    `;
    canvas.appendChild(row);
  });

  if (window.lucide) window.lucide.createIcons();
}

// Delete single response
async function deleteActiveResponse() {
  if (formResponses.length === 0) return;
  const currentResp = formResponses[individualIndex];
  if (confirm("Are you sure you want to delete this specific response record? This action is permanent.")) {
    try {
      await window.db.deleteResponse(currentResp.id);
      Utils.showToast("Response deleted successfully", "success");
      
      // Update local index boundaries
      if (individualIndex >= formResponses.length - 1 && individualIndex > 0) {
        individualIndex--;
      }
      
      await fetchResponses();
    } catch(err) {
      Utils.showToast("Failed to delete response", "error");
    }
  }
}

// Export response logs to Excel via SheetJS
function exportToExcel() {
  if (formResponses.length === 0) {
    Utils.showToast("No response data available to export.", "warning");
    return;
  }

  // Compile 2D spreadsheet array
  const data = [];
  const headers = ['Respondent Email', 'Submitted Time'];
  
  formSchema.questions.forEach(q => {
    if (q.type !== 'section-divider') headers.push(q.title);
  });
  data.push(headers);

  formResponses.forEach(r => {
    const row = [r.email || 'Anonymous', Utils.formatDate(r.submittedAt)];
    formSchema.questions.forEach(q => {
      if (q.type === 'section-divider') return;
      const ansVal = r.answers[q.id];
      if (ansVal && typeof ansVal === 'object' && ansVal.name) {
        row.push(ansVal.name); // File name
      } else if (Array.isArray(ansVal)) {
        row.push(ansVal.join(', '));
      } else {
        row.push(ansVal !== undefined ? ansVal : '');
      }
    });
    data.push(row);
  });

  // Call SheetJS exporter
  try {
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Responses Summary");
    XLSX.writeFile(workbook, `${formSchema.title.replace(/\s+/g, '_')}_Responses.xlsx`);
    Utils.showToast("Excel spreadsheet downloaded successfully!", "success");
  } catch(err) {
    Utils.showToast("Failed to compile Excel file", "error");
  }
}

// Export aggregate reports to PDF via jsPDF & AutoTable
function exportToPDF() {
  if (formResponses.length === 0) {
    Utils.showToast("No responses to export", "warning");
    return;
  }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');
    
    // Page metadata header
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.text(formSchema.title, 40, 50);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Report Compiled: ${new Date().toLocaleDateString()}`, 40, 70);
    doc.text(`Total Views: ${formSchema.views || 0}   Total Responses: ${formResponses.length}`, 40, 85);
    doc.line(40, 95, 550, 95);

    // Build AutoTable rows
    const bodyRows = [];
    formResponses.forEach((r, idx) => {
      let answersPreview = '';
      formSchema.questions.forEach(q => {
        if (q.type === 'section-divider') return;
        const val = r.answers[q.id];
        const previewVal = (val && typeof val === 'object') ? val.name : Array.isArray(val) ? val.join(', ') : val;
        if (previewVal !== undefined && previewVal !== '') {
          answersPreview += `${q.title}: ${previewVal}\n`;
        }
      });

      bodyRows.push([
        idx + 1,
        r.email || 'Anonymous',
        new Date(r.submittedAt).toLocaleDateString(),
        answersPreview
      ]);
    });

    doc.autoTable({
      startY: 110,
      head: [['#', 'Respondent', 'Date', 'Question Answers']],
      body: bodyRows,
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
      styles: { cellPadding: 8, fontSize: 9, valign: 'top' },
      columnStyles: {
        0: { width: 30 },
        1: { width: 120 },
        2: { width: 80 },
        3: { width: 300 }
      }
    });

    doc.save(`${formSchema.title.replace(/\s+/g, '_')}_PDF_Report.pdf`);
    Utils.showToast("PDF report exported successfully!", "success");
  } catch (error) {
    console.error(error);
    Utils.showToast("Failed to compile PDF. Open browser printer instead.", "error");
  }
}
