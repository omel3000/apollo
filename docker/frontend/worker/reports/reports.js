let authHeader = '';
let projectsCache = [];
let projectsReady = false;
let pendingWorkDate = null;
let reportsContainer = null;
let mainProjectSelect = null;

// --- Calendar state ---
let calYear = null;   // 4-digit year
let calMonth = null;  // 0-11
const monthNamesPl = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

// Listen for external date changes (e.g., prev/next/today buttons)
document.addEventListener('workdatechange', (e) => {
  try {
    const iso = e && e.detail && e.detail.date ? e.detail.date : null;
    if (!iso) return;
    const [y, m, d] = iso.split('-').map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return;
    const date = new Date(y, m - 1, d);
    if (calYear === null || calMonth === null) {
      calYear = y; calMonth = m - 1;
      renderCalendar();
      return;
    }
    const monthChanged = (calYear !== y) || (calMonth !== (m - 1));
    if (monthChanged) {
      calYear = y; calMonth = m - 1;
      syncMonthYearControls();
      renderCalendar();
    } else {
      // Only re-highlight selected day
      highlightSelectedDay(date);
    }
  } catch (err) {
    console.error('calendar workdatechange listener error:', err);
  }
});

window.handleWorkDateChange = function(newDate) {
  pendingWorkDate = newDate || window.getCurrentWorkDate() || null;
  refreshReportsIfReady();
};

document.addEventListener('DOMContentLoaded', async () => {
  console.log('reports.js: DOMContentLoaded fired');
  
  const rawToken = localStorage.getItem('token');
  const token = rawToken ? rawToken.trim() : '';
  console.log('reports.js: token exists:', !!token);
  
  if (!token) {
    console.warn('reports.js: No token, redirecting');
    handleUnauthorized();
    return;
  }

  authHeader = token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
  reportsContainer = document.getElementById('existingReports');
  mainProjectSelect = document.getElementById('projektSelect');
  
  console.log('reports.js: Elements found - container:', !!reportsContainer, 'select:', !!mainProjectSelect);

  try {
    console.log('reports.js: Starting loadProjects');
    await loadProjects();
    console.log('reports.js: Projects loaded, count:', projectsCache.length);
    projectsReady = true;
    if (!pendingWorkDate) {
      pendingWorkDate = window.getCurrentWorkDate() || toApiDate(new Date());
    }
    console.log('reports.js: Calling refreshReportsIfReady with date:', pendingWorkDate);
    refreshReportsIfReady();
  } catch (error) {
    console.error('reports.js: Error loading projects:', error);
    alert('Nie udało się pobrać listy projektów.');
  }

  setupSaveHandler();

  // Initialize calendar UI
  try {
    initCalendar();
  } catch (err) {
    console.error('Calendar init error:', err);
  }
});

async function loadProjects() {
  console.log('loadProjects: Fetching /user_projects/my_projects');
  
  const response = await fetch('/user_projects/my_projects', {
    headers: {
      'Authorization': authHeader,
      'Accept': 'application/json'
    }
  });

  console.log('loadProjects: Response status:', response.status);

  if (response.status === 401) {
    console.warn('loadProjects: Unauthorized');
    handleUnauthorized();
    return;
  }

  if (!response.ok) {
    const message = await safeReadText(response);
    console.error('loadProjects: Response not OK:', message);
    throw new Error(message || 'Błąd pobierania projektów');
  }

  const data = await response.json();
  console.log('loadProjects: Data received:', data);
  
  if (!Array.isArray(data)) {
    console.error('loadProjects: Data is not an array');
    throw new Error('Błąd API: niepoprawny format odpowiedzi przy pobieraniu projektów');
  }

  projectsCache = data.map(project => ({
    project_id: Number(project.project_id),
    project_name: project.project_name
  }));

  console.log('loadProjects: Projects cached:', projectsCache);

  if (mainProjectSelect) {
    populateProjectSelect(mainProjectSelect);
    if (projectsCache.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'Brak przypisanych projektów';
      option.disabled = true;
      option.selected = true;
      mainProjectSelect.appendChild(option);
    }
  }
}

async function loadReportsForDate(workDate) {
  if (!reportsContainer || !workDate) {
    return;
  }

  setReportsContainerMessage('Ładowanie wpisów...');

  try {
    const response = await fetch(`/work_reports/?work_date=${encodeURIComponent(workDate)}`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    if (!response.ok) {
      const message = await safeReadText(response);
      throw new Error(message || 'Błąd pobierania wpisów');
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Błąd API: niepoprawny format odpowiedzi przy pobieraniu wpisów');
    }

    const sorted = data.slice().sort((a, b) => {
      const aTime = new Date(a.created_at || a.work_date).getTime();
      const bTime = new Date(b.created_at || b.work_date).getTime();
      if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) {
        return aTime - bTime;
      }
      return (a.report_id || 0) - (b.report_id || 0);
    });

    renderReports(sorted);
  } catch (error) {
    console.error(error);
    setReportsContainerMessage('Nie udało się pobrać wpisów.');
  }
}

function renderReports(reports) {
  if (!reportsContainer) {
    return;
  }

  reportsContainer.innerHTML = '';

  if (!reports.length) {
    setReportsContainerMessage('Brak wpisów dla wybranego dnia.');
    updateTotalTime([]);
    return;
  }

  const fragment = document.createDocumentFragment();
  reports.forEach(report => {
    fragment.appendChild(buildReportForm(report));
  });
  reportsContainer.appendChild(fragment);
  updateTotalTime(reports);
}

function updateTotalTime(reports) {
  let totalMinutes = 0;
  reports.forEach(report => {
    const hours = Number(report.hours_spent) || 0;
    const minutes = Number(report.minutes_spent) || 0;
    totalMinutes += (hours * 60) + minutes;
  });

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  const totalTimeElement = document.getElementById('totalTime');
  if (totalTimeElement) {
    totalTimeElement.textContent = `Łącznie: ${totalHours}h ${remainingMinutes}min`;
  }
}

function buildReportForm(report) {
  const card = document.createElement('div');
  card.className = 'card mb-3';
  card.dataset.reportId = report.report_id;

  const cardBody = document.createElement('div');
  cardBody.className = 'card-body';

  const form = document.createElement('form');
  form.addEventListener('submit', (event) => event.preventDefault());

  // Projekt
  const projectGroup = document.createElement('div');
  projectGroup.className = 'mb-3';
  
  const projectLabel = document.createElement('label');
  const projectFieldId = `existing-project-${report.report_id}`;
  projectLabel.setAttribute('for', projectFieldId);
  projectLabel.className = 'form-label';
  projectLabel.textContent = 'Projekt:';
  
  const projectSelect = document.createElement('select');
  projectSelect.id = projectFieldId;
  projectSelect.name = 'project';
  projectSelect.className = 'form-select';
  populateProjectSelect(projectSelect, report.project_id);
  
  projectGroup.appendChild(projectLabel);
  projectGroup.appendChild(projectSelect);

  // Opis
  const descriptionGroup = document.createElement('div');
  descriptionGroup.className = 'mb-3';
  
  const descriptionLabel = document.createElement('label');
  const descriptionId = `existing-description-${report.report_id}`;
  descriptionLabel.setAttribute('for', descriptionId);
  descriptionLabel.className = 'form-label';
  descriptionLabel.textContent = 'Opis (opcjonalny):';
  
  const descriptionArea = document.createElement('textarea');
  descriptionArea.id = descriptionId;
  descriptionArea.name = 'description';
  descriptionArea.className = 'form-control';
  descriptionArea.rows = 3;
  descriptionArea.value = report.description || '';
  
  descriptionGroup.appendChild(descriptionLabel);
  descriptionGroup.appendChild(descriptionArea);

  // Czas pracy
  const timeGroup = document.createElement('div');
  timeGroup.className = 'mb-3';
  
  const timeLabel = document.createElement('label');
  timeLabel.className = 'form-label';
  timeLabel.textContent = 'Czas pracy:';
  
  const timeRow = document.createElement('div');
  timeRow.className = 'row g-2';
  
  // Godziny
  const hoursCol = document.createElement('div');
  hoursCol.className = 'col-6';
  
  const hoursInputGroup = document.createElement('div');
  hoursInputGroup.className = 'input-group';
  
  const hoursInput = document.createElement('input');
  hoursInput.type = 'number';
  hoursInput.name = 'hours';
  hoursInput.min = '0';
  hoursInput.max = '24';
  hoursInput.value = Number(report.hours_spent) || 0;
  hoursInput.className = 'form-control';
  hoursInput.setAttribute('aria-label', 'Godziny');
  
  const hoursSpan = document.createElement('span');
  hoursSpan.className = 'input-group-text';
  hoursSpan.textContent = 'h';
  
  hoursInputGroup.appendChild(hoursInput);
  hoursInputGroup.appendChild(hoursSpan);
  hoursCol.appendChild(hoursInputGroup);
  
  // Minuty
  const minutesCol = document.createElement('div');
  minutesCol.className = 'col-6';
  
  const minutesInputGroup = document.createElement('div');
  minutesInputGroup.className = 'input-group';
  
  const minutesInput = document.createElement('input');
  minutesInput.type = 'number';
  minutesInput.name = 'minutes';
  minutesInput.min = '0';
  minutesInput.max = '59';
  minutesInput.value = Number(report.minutes_spent) || 0;
  minutesInput.className = 'form-control';
  minutesInput.setAttribute('aria-label', 'Minuty');
  
  const minutesSpan = document.createElement('span');
  minutesSpan.className = 'input-group-text';
  minutesSpan.textContent = 'min';
  
  minutesInputGroup.appendChild(minutesInput);
  minutesInputGroup.appendChild(minutesSpan);
  minutesCol.appendChild(minutesInputGroup);
  
  timeRow.appendChild(hoursCol);
  timeRow.appendChild(minutesCol);
  
  timeGroup.appendChild(timeLabel);
  timeGroup.appendChild(timeRow);

  // Przyciski
  const buttonGroup = document.createElement('div');
  buttonGroup.className = 'd-flex gap-2';
  
  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'btn btn-primary';
  saveButton.innerHTML = '<i class="bi bi-save me-1"></i>Zapisz';
  saveButton.addEventListener('click', () => handleUpdateReport(report.report_id, form));
  
  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'btn btn-outline-danger';
  deleteButton.innerHTML = '<i class="bi bi-trash me-1"></i>Usuń';
  deleteButton.addEventListener('click', () => handleDeleteReport(report.report_id));
  
  buttonGroup.appendChild(saveButton);
  buttonGroup.appendChild(deleteButton);

  // Złożenie formularza
  form.appendChild(projectGroup);
  form.appendChild(descriptionGroup);
  form.appendChild(timeGroup);
  form.appendChild(buttonGroup);

  cardBody.appendChild(form);
  card.appendChild(cardBody);

  return card;
}

function populateProjectSelect(selectElement, selectedId) {
  selectElement.innerHTML = '';

  const selectedValue = selectedId !== undefined && selectedId !== null ? Number(selectedId) : null;
  let selectedFound = false;
  projectsCache.forEach(project => {
    const option = document.createElement('option');
    option.value = project.project_id;
    option.textContent = project.project_name;
    if (selectedValue !== null && Number(project.project_id) === selectedValue) {
      option.selected = true;
      selectedFound = true;
    }
    selectElement.appendChild(option);
  });

  if (selectedValue !== null && !selectedFound) {
    const fallback = document.createElement('option');
    fallback.value = String(selectedValue);
    fallback.textContent = `Projekt #${selectedId}`;
    fallback.selected = true;
    selectElement.appendChild(fallback);
  }
}

function setupSaveHandler() {
  const saveButton = document.getElementById('saveBtn');
  if (!saveButton) {
    return;
  }

  saveButton.addEventListener('click', async (event) => {
    event.preventDefault();

    const projectSelectElement = document.getElementById('projektSelect');
    const projectId = parseInt(projectSelectElement.value, 10);
    const description = document.getElementById('opis').value;
    const hours = parseInt(document.getElementById('czas_h').value, 10);
    const minutes = parseInt(document.getElementById('czas_m').value, 10);

    let workDate = window.getCurrentWorkDate ? window.getCurrentWorkDate() : null;
    if (!workDate) {
      workDate = toApiDate(new Date());
    }

    if (!projectId) {
      alert('Wybierz projekt!');
      return;
    }

    if ((hours === 0 && minutes === 0) || hours > 24 || hours < 0 || minutes < 0 || minutes > 59) {
      alert('Podaj poprawny czas pracy (nie może być 0, max 24h)!');
      return;
    }

    try {
      const response = await fetch('/work_reports/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({
          project_id: projectId,
          work_date: workDate,
          hours_spent: hours,
          minutes_spent: minutes,
          description
        })
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        const message = await safeReadText(response);
        throw new Error(message || 'Błąd zapisu wpisu');
      }

      alert('Wpis dodany!');
      const form = document.querySelector('form[action="/worker/addreport"]');
      if (form) {
        form.reset();
      }

      pendingWorkDate = workDate;
      refreshReportsIfReady();
    } catch (error) {
      alert('Błąd: ' + (error && error.message ? error.message : 'Nieznany błąd'));
    }
  });
}

function setReportsContainerMessage(message) {
  if (reportsContainer) {
    reportsContainer.innerHTML = `<p>${message}</p>`;
  }
}

function handleUnauthorized() {
  localStorage.removeItem('token');
  window.location.replace('/');
}

async function safeReadText(response) {
  try {
    return await response.text();
  } catch (error) {
    return '';
  }
}

function toApiDate(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function refreshReportsIfReady() {
  console.log('refreshReportsIfReady: Checking conditions...');
  console.log('  pendingWorkDate:', pendingWorkDate);
  console.log('  authHeader:', !!authHeader);
  console.log('  projectsReady:', projectsReady);
  console.log('  reportsContainer:', !!reportsContainer);
  
  if (!pendingWorkDate) {
    console.log('refreshReportsIfReady: No pending work date');
    return;
  }
  if (!authHeader) {
    console.log('refreshReportsIfReady: No auth header');
    return;
  }
  if (!projectsReady) {
    console.log('refreshReportsIfReady: Projects not ready');
    return;
  }
  if (!reportsContainer) {
    console.log('refreshReportsIfReady: No reports container');
    return;
  }
  
  console.log('refreshReportsIfReady: All conditions met, loading reports');
  loadReportsForDate(pendingWorkDate);
}

// =====================
// Simple Calendar (PL)
// =====================

function initCalendar() {
  const container = document.getElementById('calendarContainer');
  if (!container) {
    console.warn('Calendar container not found');
    return;
  }

  const monthSelect = document.getElementById('calMonthSelect');
  const yearSelect = document.getElementById('calYearSelect');
  const prevBtn = document.getElementById('calPrevMonth');
  const nextBtn = document.getElementById('calNextMonth');

  if (!monthSelect || !yearSelect || !prevBtn || !nextBtn) {
    console.warn('Calendar controls not found');
    return;
  }

  // Populate month select
  monthSelect.innerHTML = '';
  monthNamesPl.forEach((name, idx) => {
    const opt = document.createElement('option');
    opt.value = String(idx);
    opt.textContent = name;
    monthSelect.appendChild(opt);
  });

  // Populate year select (currentYear-5 .. currentYear+5)
  yearSelect.innerHTML = '';
  const today = new Date(); // Always use current date for initialization
  const baseYear = today.getFullYear();
  for (let y = baseYear - 5; y <= baseYear + 5; y++) {
    const opt = document.createElement('option');
    opt.value = String(y);
    opt.textContent = String(y);
    yearSelect.appendChild(opt);
  }

  // ALWAYS initialize to current month/year
  const initDate = new Date();
  calYear = initDate.getFullYear();
  calMonth = initDate.getMonth();
  
  console.log('Calendar initialized to:', calYear, calMonth);
  
  syncMonthYearControls();
  renderCalendar();

  // Handlers
  monthSelect.addEventListener('change', () => {
    calMonth = parseInt(monthSelect.value, 10);
    console.log('Month changed to:', calMonth);
    renderCalendar();
  });
  yearSelect.addEventListener('change', () => {
    calYear = parseInt(yearSelect.value, 10);
    console.log('Year changed to:', calYear);
    renderCalendar();
  });
  prevBtn.addEventListener('click', () => {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    console.log('Previous month:', calYear, calMonth);
    syncMonthYearControls();
    renderCalendar();
  });
  nextBtn.addEventListener('click', () => {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    console.log('Next month:', calYear, calMonth);
    syncMonthYearControls();
    renderCalendar();
  });
}

function syncMonthYearControls() {
  const monthSelect = document.getElementById('calMonthSelect');
  const yearSelect = document.getElementById('calYearSelect');
  
  if (!monthSelect || !yearSelect) {
    console.warn('Month/Year selects not found in syncMonthYearControls');
    return;
  }
  
  console.log('Syncing controls to:', calYear, calMonth);
  
  if (monthSelect) {
    monthSelect.value = String(calMonth);
  }
  
  if (yearSelect) {
    // Ensure selected year exists in options; if not, extend range
    let yearOption = Array.from(yearSelect.options).some(o => Number(o.value) === calYear);
    if (!yearOption) {
      console.log('Adding year option:', calYear);
      // Extend to include calYear
      const opt = document.createElement('option');
      opt.value = String(calYear);
      opt.textContent = String(calYear);
      yearSelect.appendChild(opt);
    }
    yearSelect.value = String(calYear);
  }
}

function renderCalendar() {
  const grid = document.getElementById('calGrid');
  if (!grid) {
    console.warn('Calendar grid not found');
    return;
  }

  console.log('Rendering calendar for:', calYear, calMonth);

  // Get today's date for highlighting
  const today = new Date();
  const isCurrentMonth = (today.getFullYear() === calYear && today.getMonth() === calMonth);
  const todayDate = today.getDate();

  // Build table
  const table = document.createElement('table');
  table.setAttribute('role', 'grid');

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  const weekDays = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
  weekDays.forEach(d => {
    const th = document.createElement('th');
    th.textContent = d;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const firstOfMonth = new Date(calYear, calMonth, 1);
  const jsDow = firstOfMonth.getDay(); // 0=Sun..6=Sat
  const startOffset = (jsDow + 6) % 7; // 0-based index for Monday start
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  console.log('Days in month:', daysInMonth, 'Start offset:', startOffset);

  let day = 1;
  let rowsNeeded = Math.ceil((daysInMonth + startOffset) / 7);
  
  for (let r = 0; r < rowsNeeded; r++) {
    const tr = document.createElement('tr');
    for (let c = 0; c < 7; c++) {
      const td = document.createElement('td');
      
      if (r === 0 && c < startOffset) {
        td.textContent = '';
      } else if (day > daysInMonth) {
        td.textContent = '';
      } else {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = String(day);
        btn.dataset.day = String(day);
        btn.addEventListener('click', onCalendarDayClick);

        // Highlight if today
        if (isCurrentMonth && day === todayDate) {
          btn.classList.add('today');
        }

        // Highlight if matches currentDate
        const cur = window.currentDate instanceof Date ? window.currentDate : null;
        if (cur && cur.getFullYear() === calYear && cur.getMonth() === calMonth && cur.getDate() === day) {
          btn.classList.add('selected');
        }

        td.appendChild(btn);
        day++;
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  grid.innerHTML = '';
  grid.appendChild(table);
  
  console.log('Calendar rendered successfully');
}

function highlightSelectedDay(dateObj) {
  const grid = document.getElementById('calGrid');
  if (!grid) return;
  const buttons = grid.querySelectorAll('button[data-day]');
  buttons.forEach(btn => {
    btn.classList.remove('selected');
  });
  if (!dateObj) return;
  if (dateObj.getFullYear() !== calYear || dateObj.getMonth() !== calMonth) return;
  const sel = grid.querySelector(`button[data-day="${dateObj.getDate()}"]`);
  if (sel) {
    sel.classList.add('selected');
  }
}

function onCalendarDayClick(ev) {
  const btn = ev.currentTarget;
  const day = parseInt(btn.dataset.day, 10);
  if (!Number.isFinite(day)) return;
  const picked = new Date(calYear, calMonth, day);
  
  // Update global currentDate
  window.currentDate = picked;
  
  // Notify date-navigator to update its internal state
  document.dispatchEvent(new CustomEvent('calendardatechange', {
    detail: { date: picked }
  }));
  
  // Update header (dayName, dateDisplay)
  updateHeaderFromDate(picked);
  
  // Notify the rest of the app
  notifyWorkDateChange(picked);
  
  // Highlight
  highlightSelectedDay(picked);
}

function updateHeaderFromDate(dateObj) {
  const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
  const dayNameEl = document.getElementById('dayName');
  const dateDisplayEl = document.getElementById('dateDisplay');
  if (dayNameEl) dayNameEl.textContent = dayNames[dateObj.getDay()];
  if (dateDisplayEl) dateDisplayEl.textContent = dateObj.toLocaleDateString('pl-PL');
}

function notifyWorkDateChange(dateObj) {
  const isoDate = toApiDate(dateObj);
  document.dispatchEvent(new CustomEvent('workdatechange', { detail: { date: isoDate } }));
  if (typeof window.handleWorkDateChange === 'function') {
    try {
      window.handleWorkDateChange(isoDate);
    } catch (e) {
      console.error('handleWorkDateChange error:', e);
    }
  }
}

async function handleUpdateReport(reportId, formElement) {
  console.log('handleUpdateReport: Updating report', reportId);
  
  const projectSelect = formElement.querySelector('select[name="project"]');
  const descriptionArea = formElement.querySelector('textarea[name="description"]');
  const hoursInput = formElement.querySelector('input[name="hours"]');
  const minutesInput = formElement.querySelector('input[name="minutes"]');

  const projectId = parseInt(projectSelect.value, 10);
  const description = descriptionArea.value;
  const hours = parseInt(hoursInput.value, 10);
  const minutes = parseInt(minutesInput.value, 10);

  if (!projectId) {
    alert('Wybierz projekt!');
    return;
  }

  if ((hours === 0 && minutes === 0) || hours > 24 || hours < 0 || minutes < 0 || minutes > 59) {
    alert('Podaj poprawny czas pracy (nie może być 0, max 24h)!');
    return;
  }

  let workDate = pendingWorkDate || window.getCurrentWorkDate() || toApiDate(new Date());

  try {
    const response = await fetch(`/work_reports/${reportId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        project_id: projectId,
        work_date: workDate,
        hours_spent: hours,
        minutes_spent: minutes,
        description
      })
    });

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    if (!response.ok) {
      const message = await safeReadText(response);
      throw new Error(message || 'Błąd aktualizacji wpisu');
    }

    alert('Wpis zaktualizowany!');
    refreshReportsIfReady();
  } catch (error) {
    alert('Błąd: ' + (error && error.message ? error.message : 'Nieznany błąd'));
  }
}

async function handleDeleteReport(reportId) {
  console.log('handleDeleteReport: Deleting report', reportId);
  
  if (!confirm('Czy na pewno chcesz usunąć ten wpis?')) {
    return;
  }

  try {
    const response = await fetch(`/work_reports/${reportId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader
      }
    });

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    if (!response.ok && response.status !== 204) {
      const message = await safeReadText(response);
      throw new Error(message || 'Błąd usuwania wpisu');
    }

    alert('Wpis usunięty!');
    refreshReportsIfReady();
  } catch (error) {
    alert('Błąd: ' + (error && error.message ? error.message : 'Nieznany błąd'));
  }
}

// Funkcja do pobierania aktualnej daty z nawigacji
window.getCurrentWorkDate = function() {
  if (window.currentDate) {
    const d = window.currentDate;
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  return null;
};
